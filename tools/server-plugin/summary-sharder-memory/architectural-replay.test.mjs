import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    createArchitecturalSemanticReplayArtifact,
} from './lib/core/summarization/architectural-semantic-replay-artifact.js';
import { renderFinalizedArchitecturalPayload } from './lib/core/summarization/architectural-finalized-semantic.js';
import {
    loadArchitecturalReplayArtifact,
    persistArchitecturalReplayArtifact,
} from './architectural-replay.js';
import { getStoragePaths } from './core.js';

function makeUserRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-replay-authority-'));
}

async function makeArtifact() {
    const sourceManifest = {
        manifestId: 'manifest:system-shard:artifact-test',
        sourceIdentityHash: `sha256:${'1'.repeat(64)}`,
        sourceRevisionHash: `sha256:${'2'.repeat(64)}`,
        sourceStartPositionAtCreation: 3,
        sourceEndPositionAtCreation: 3,
    };
    const semanticPayload = {
        schemaVersion: 1,
        profile: 'architectural-memory-finalized',
        generationContext: {
            rangeStart: 3,
            rangeEnd: 3,
            messageIds: ['msg_a'],
            currentManifestId: sourceManifest.manifestId,
        },
        sourceManifests: [sourceManifest],
        sections: {
            timeline: [{
                sourceRef: 'S3:1',
                summary: 'Portable authority survives restart',
                weight: 4,
                provenance: {
                    originManifestId: sourceManifest.manifestId,
                    authorityRecordId: null,
                    referenceBindings: [{ reference: 'S3:1', manifestId: sourceManifest.manifestId }],
                },
            }],
            decisions: [], events: [], developments: [], dialogue: [], threads: [], current: [],
        },
    };
    const rendered = await renderFinalizedArchitecturalPayload(semanticPayload);
    return await createArchitecturalSemanticReplayArtifact({
        semanticPayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: 1,
        semanticRendererVersion: rendered.rendererVersion,
    });
}

test('portable replay authority survives store reopen and duplicate registration is idempotent', async () => {
    const userRoot = makeUserRoot();
    const artifact = await makeArtifact();
    const first = await persistArchitecturalReplayArtifact(userRoot, artifact, { now: 100 });
    const second = await persistArchitecturalReplayArtifact(userRoot, artifact, { now: 200 });

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    const paths = getStoragePaths(userRoot);
    assert.equal(fs.readFileSync(paths.architecturalReplayLedgerPath, 'utf8').trim().split('\n').length, 1);

    const reopened = await loadArchitecturalReplayArtifact(userRoot, artifact.artifactId);
    assert.deepEqual(reopened.artifact, artifact);
    assert.deepEqual(reopened.replay.semanticPayload, artifact.semanticPayload);
    assert.equal(reopened.replay.canonicalOutput, artifact.canonicalOutput);
    assert.equal(reopened.replay.canonicalOutputHash, artifact.canonicalOutputHash);
});

test('portable replay authority returns explicit not-found without regeneration', async () => {
    const userRoot = makeUserRoot();
    await assert.rejects(
        loadArchitecturalReplayArtifact(userRoot, `archreplay_${'0'.repeat(64)}`),
        (error) => error.code === 'ARCH_REPLAY_ARTIFACT_NOT_FOUND',
    );
});

test('portable replay authority refuses tampered registered content', async () => {
    const userRoot = makeUserRoot();
    const artifact = await makeArtifact();
    await persistArchitecturalReplayArtifact(userRoot, artifact);
    const paths = getStoragePaths(userRoot);
    const artifactPath = path.join(paths.architecturalReplayArtifactsRoot, `${artifact.artifactId}.json`);
    const tampered = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    tampered.canonicalOutput = tampered.canonicalOutput.replace('survives restart', 'was altered');
    fs.writeFileSync(artifactPath, JSON.stringify(tampered), 'utf8');

    await assert.rejects(
        loadArchitecturalReplayArtifact(userRoot, artifact.artifactId),
        (error) => error.code === 'ARCH_SEMANTIC_REPLAY_OUTPUT_HASH_MISMATCH',
    );
});

test('portable replay authority refuses unsupported artifact versions before writing', async () => {
    const userRoot = makeUserRoot();
    const artifact = await makeArtifact();
    artifact.artifactSchemaVersion = 3;

    await assert.rejects(
        persistArchitecturalReplayArtifact(userRoot, artifact),
        (error) => error.code === 'ARCH_SEMANTIC_REPLAY_VERSION_UNSUPPORTED',
    );
    assert.equal(fs.existsSync(getStoragePaths(userRoot).architecturalReplayLedgerPath), false);
});
