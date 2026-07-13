import assert from 'node:assert/strict';
import test from 'node:test';

import { renderFinalizedArchitecturalPayload } from './architectural-finalized-semantic.js';
import {
    ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES,
    createArchitecturalSemanticReplayArtifact,
    replayArchitecturalSemanticArtifact,
} from './architectural-semantic-replay-artifact.js';

const sourceManifests = Object.freeze([{
    manifestId: 'manifest:system-shard:replay-test',
    sourceIdentityHash: `sha256:${'1'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'2'.repeat(64)}`,
    sourceStartPositionAtCreation: 10,
    sourceEndPositionAtCreation: 10,
}]);

function payload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory-finalized',
        generationContext: {
            rangeStart: 10,
            rangeEnd: 10,
            messageIds: ['msg_a'],
            currentManifestId: sourceManifests[0].manifestId,
        },
        sourceManifests,
        sections: {
            timeline: [{
                sourceRef: 'S10:1',
                summary: 'Replay contract established',
                weight: 4,
                provenance: {
                    originManifestId: sourceManifests[0].manifestId,
                    authorityRecordId: null,
                    referenceBindings: [{ reference: 'S10:1', manifestId: sourceManifests[0].manifestId }],
                },
            }],
            decisions: [], events: [], developments: [], dialogue: [], threads: [], current: [],
        },
    };
}

async function artifact() {
    const semanticPayload = payload();
    const rendered = await renderFinalizedArchitecturalPayload(semanticPayload);
    return await createArchitecturalSemanticReplayArtifact({
        semanticPayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: 1,
        semanticRendererVersion: rendered.rendererVersion,
    });
}

test('replay restores the identical multi-source semantic payload, canonical shard, and hashes', async () => {
    const persisted = JSON.parse(JSON.stringify(await artifact()));
    const replayed = await replayArchitecturalSemanticArtifact(persisted);

    assert.deepEqual(replayed.semanticPayload, payload());
    assert.equal(replayed.canonicalOutput, persisted.canonicalOutput);
    assert.equal(replayed.semanticPayloadHash, persisted.semanticPayloadHash);
    assert.equal(replayed.canonicalOutputHash, persisted.canonicalOutputHash);
    assert.match(replayed.sourceManifestSetHash, /^sha256:[0-9a-f]{64}$/u);
    assert.match(replayed.artifactId, /^archreplay_[0-9a-f]{64}$/u);
    assert.deepEqual(replayed.sourceManifests, sourceManifests);
});

test('artifact identity is deterministic and binds the normalized source-manifest set', async () => {
    const first = await artifact();
    const second = await artifact();

    assert.equal(first.artifactId, second.artifactId);
    assert.equal(first.artifactHash, second.artifactHash);
    assert.equal(first.artifactSchemaVersion, 2);
    assert.equal(first.generationContractVersion, 1);
    assert.equal(first.normalizationContractVersion, 1);
    assert.equal(first.semanticRendererVersion, 1);
    assert.deepEqual(first.sourceManifests, sourceManifests);
});

test('artifact creation normalizes manifest order before hashing and remains replayable', async () => {
    const historicalManifest = {
        manifestId: 'manifest:system-shard:historical-replay-test',
        sourceIdentityHash: `sha256:${'3'.repeat(64)}`,
        sourceRevisionHash: `sha256:${'4'.repeat(64)}`,
        sourceStartPositionAtCreation: 1,
        sourceEndPositionAtCreation: 2,
    };
    const forwardPayload = payload();
    forwardPayload.sourceManifests = [sourceManifests[0], historicalManifest];
    const reversePayload = payload();
    reversePayload.sourceManifests = [historicalManifest, sourceManifests[0]];
    const rendered = await renderFinalizedArchitecturalPayload(forwardPayload);
    const first = await createArchitecturalSemanticReplayArtifact({
        semanticPayload: forwardPayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: 1,
        semanticRendererVersion: rendered.rendererVersion,
    });
    const second = await createArchitecturalSemanticReplayArtifact({
        semanticPayload: reversePayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: 1,
        semanticRendererVersion: rendered.rendererVersion,
    });

    assert.deepEqual(second, first);
    assert.deepEqual((await replayArchitecturalSemanticArtifact(second)).semanticPayload, first.semanticPayload);
});

test('replay refuses a modified persisted semantic payload', async () => {
    const persisted = await artifact();
    persisted.semanticPayload.sections.timeline[0].summary = 'Tampered payload';

    await assert.rejects(
        replayArchitecturalSemanticArtifact(persisted),
        (error) => error.code === ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.PAYLOAD_HASH_MISMATCH,
    );
});

test('replay refuses modified persisted canonical output', async () => {
    const persisted = await artifact();
    persisted.canonicalOutput = persisted.canonicalOutput.replace('Replay contract established', 'Tampered output');

    await assert.rejects(
        replayArchitecturalSemanticArtifact(persisted),
        (error) => error.code === ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.OUTPUT_HASH_MISMATCH,
    );
});

test('replay refuses an unsupported artifact contract version', async () => {
    const persisted = await artifact();
    persisted.artifactSchemaVersion = 3;

    await assert.rejects(
        replayArchitecturalSemanticArtifact(persisted),
        (error) => error.code === ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.VERSION_UNSUPPORTED,
    );
});
