import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES,
    finalizeArchitecturalReviewForSave,
    persistArchitecturalReplayForSavedShard,
    registerAndPersistArchitecturalReplay,
} from './architectural-live-finalization.js';
import { createArchitecturalPostReviewPlan } from './architectural-post-review-finalization.js';

const currentManifest = Object.freeze({
    manifestId: 'manifest:system-shard:live-finalization',
    sourceIdentityHash: `sha256:${'1'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'2'.repeat(64)}`,
    sourceStartPositionAtCreation: 5,
    sourceEndPositionAtCreation: 5,
});

function generationPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: { rangeStart: 5, rangeEnd: 5, messageIds: ['msg_live'] },
        sections: {
            timeline: [{ sourceRef: 'S5:1', summary: 'Live finalization is manifest-bound', weight: 4 }],
            decisions: [], events: [], developments: [], dialogue: [], threads: [], current: [],
        },
    };
}

test('review intent finalizes exact output and persists only after matching manifest registration', async () => {
    const plan = createArchitecturalPostReviewPlan({ generationPayload: generationPayload(), currentManifest });
    const pipelineResult = {
        metadata: {
            architecturalPostReviewPlan: plan,
            semanticPromptVersion: 1,
        },
    };
    const review = {
        resultMetadata: {
            architecturalReviewIntent: {
                selectedRecordIds: plan.records.map((entry) => entry.recordId),
                editedRecords: [],
            },
        },
    };
    const prepared = await finalizeArchitecturalReviewForSave({ pipelineResult, review, currentManifest });
    let persisted = null;
    await persistArchitecturalReplayForSavedShard({
        currentManifest,
        replayArtifact: prepared.resultMetadata.architecturalReplayArtifact,
        integrityResult: { registeredManifests: [{ ...currentManifest, outputUID: 'saved-output' }] },
    }, {
        persistReplayArtifact: async (artifact) => {
            persisted = artifact;
            return { ok: true };
        },
    });

    assert.equal(prepared.finalOutput, prepared.resultMetadata.architecturalReplayArtifact.canonicalOutput);
    assert.deepEqual(persisted, prepared.resultMetadata.architecturalReplayArtifact);
});

test('missing pre-save or post-save manifest identity refuses before replay persistence', async () => {
    await assert.rejects(
        finalizeArchitecturalReviewForSave({}),
        (error) => error.code === ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES.CURRENT_MANIFEST_MISSING,
    );
    let called = false;
    await assert.rejects(
        persistArchitecturalReplayForSavedShard({
            currentManifest,
            replayArtifact: {},
            integrityResult: { registeredManifests: [] },
        }, {
            persistReplayArtifact: async () => { called = true; },
        }),
        (error) => error.code === ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES.MANIFEST_REGISTRATION_MISSING,
    );
    assert.equal(called, false);
});

test('saved shard registers its pre-save manifest before governed replay persistence', async () => {
    const calls = [];
    await registerAndPersistArchitecturalReplay({
        outputUID: 'saved-output',
        currentManifest,
        replayArtifact: { artifactId: 'archreplay_live' },
        artifactKind: 'system-shard',
        startIndex: 5,
        endIndex: 5,
    }, {
        refreshIntegrity: async (request) => {
            calls.push(['register', request]);
            return { registeredManifests: [{ ...currentManifest, outputUID: 'saved-output' }] };
        },
        persistReplayArtifact: async (artifact) => {
            calls.push(['persist', artifact]);
            return { ok: true };
        },
    });

    assert.deepEqual(calls.map(([operation]) => operation), ['register', 'persist']);
    assert.equal(calls[0][1].registerOutput.manifestId, currentManifest.manifestId);
    assert.equal(calls[1][1].artifactId, 'archreplay_live');
});
