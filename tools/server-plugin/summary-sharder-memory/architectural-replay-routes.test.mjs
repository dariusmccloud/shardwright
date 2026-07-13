import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createArchitecturalSemanticReplayArtifact } from './lib/core/summarization/architectural-semantic-replay-artifact.js';
import { renderFinalizedArchitecturalPayload } from './lib/core/summarization/architectural-finalized-semantic.js';
import { init } from './index.js';

function createMockRouter() {
    const routes = { get: new Map(), post: new Map() };
    return {
        routes,
        get(pathname, handler) { routes.get.set(pathname, handler); },
        post(pathname, handler) { routes.post.set(pathname, handler); },
    };
}

function request(userRoot, overrides = {}) {
    return {
        user: { directories: { root: userRoot } },
        body: {}, params: {}, query: {},
        ...overrides,
    };
}

async function invoke(handler, requestValue) {
    const state = { statusCode: 200, payload: null };
    const response = {
        status(code) { state.statusCode = code; return this; },
        send(payload) { state.payload = payload; return this; },
    };
    await handler(requestValue, response);
    return state;
}

async function artifact() {
    const sourceManifest = {
        manifestId: 'manifest:system-shard:route-test',
        sourceIdentityHash: `sha256:${'3'.repeat(64)}`,
        sourceRevisionHash: `sha256:${'4'.repeat(64)}`,
        sourceStartPositionAtCreation: 4,
        sourceEndPositionAtCreation: 4,
    };
    const semanticPayload = {
        schemaVersion: 1,
        profile: 'architectural-memory-finalized',
        generationContext: {
            rangeStart: 4,
            rangeEnd: 4,
            messageIds: ['msg_a'],
            currentManifestId: sourceManifest.manifestId,
        },
        sourceManifests: [sourceManifest],
        sections: {
            timeline: [{
                sourceRef: 'S4:1',
                summary: 'Authenticated replay route proven',
                weight: 4,
                provenance: {
                    originManifestId: sourceManifest.manifestId,
                    authorityRecordId: null,
                    referenceBindings: [{ reference: 'S4:1', manifestId: sourceManifest.manifestId }],
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

test('authenticated routes persist and reload exact portable replay authority after route reinitialization', async () => {
    const userRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-replay-routes-'));
    const replayArtifact = await artifact();
    const firstRouter = createMockRouter();
    await init(firstRouter);

    const written = await invoke(
        firstRouter.routes.post.get('/architectural/replay-artifacts'),
        request(userRoot, { body: { artifact: replayArtifact, now: 100 } }),
    );
    assert.equal(written.statusCode, 200);
    assert.equal(written.payload.ok, true);
    assert.equal(written.payload.created, true);

    const reopenedRouter = createMockRouter();
    await init(reopenedRouter);
    const loaded = await invoke(
        reopenedRouter.routes.get.get('/architectural/replay-artifacts/:artifactId'),
        request(userRoot, { params: { artifactId: replayArtifact.artifactId } }),
    );
    assert.equal(loaded.statusCode, 200);
    assert.equal(loaded.payload.ok, true);
    assert.deepEqual(loaded.payload.artifact, replayArtifact);
    assert.deepEqual(loaded.payload.replay.semanticPayload, replayArtifact.semanticPayload);
    assert.equal(loaded.payload.replay.canonicalOutput, replayArtifact.canonicalOutput);
    assert.equal(loaded.payload.replay.canonicalOutputHash, replayArtifact.canonicalOutputHash);
});

test('authenticated routes preserve exact invalid-write and missing-artifact refusal codes', async () => {
    const userRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-replay-routes-'));
    const router = createMockRouter();
    await init(router);

    const invalid = await invoke(
        router.routes.post.get('/architectural/replay-artifacts'),
        request(userRoot, { body: { artifact: null } }),
    );
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.payload.code, 'ARCH_SEMANTIC_REPLAY_ARTIFACT_INVALID');

    const missing = await invoke(
        router.routes.get.get('/architectural/replay-artifacts/:artifactId'),
        request(userRoot, { params: { artifactId: `archreplay_${'0'.repeat(64)}` } }),
    );
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.payload.code, 'ARCH_REPLAY_ARTIFACT_NOT_FOUND');
});
