import assert from 'node:assert/strict';
import test from 'node:test';

import { registerTranscriptAnchorResolutionRoute } from './transcript-anchor-resolution-route.js';

function makeRouter() {
    const routes = new Map();
    return { routes, post(routePath, handler) { routes.set(routePath, handler); } };
}

async function invoke(handler, request) {
    let statusCode = 200;
    let payload = null;
    const response = {
        status(code) { statusCode = code; return this; },
        send(value) { payload = value; return value; },
    };
    await handler(request, response);
    return { statusCode, payload };
}

function occurrence(messageRecordId, admissionScope = 'ORDINARY') {
    return { messageRecordId, sourceLogicalId: `source:${messageRecordId}`, sourceRevisionHash: `sha256:${messageRecordId}`, sourceLocalOrder: 0, visibilityState: admissionScope === 'ORDINARY' ? 'VISIBLE' : 'ARCHIVED', admissionScope };
}

function selection(occurrences) {
    return { state: 'CANDIDATES', characterInstanceId: 'character:jeep', posture: 'CONTINUITY', candidates: [{ documentId: 'document:one', contentHash: 'sha256:family', occurrenceLinks: occurrences }] };
}

test('authenticated route returns a sole eligible anchor without transcript text', async () => {
    const router = makeRouter();
    registerTranscriptAnchorResolutionRoute(router);
    const result = await invoke(router.routes.get('/transcript-recall/anchors'), {
        user: { directories: { root: 'C:/test-root' } },
        body: { selection: selection([occurrence('visible'), occurrence('archived', 'ARCHAEOLOGY_ONLY')]), anchorOccurrenceLimit: 2 },
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.resolutions[0].state, 'SOLE_ANCHOR');
    assert.deepEqual(result.payload.resolutions[0].occurrences.map((entry) => entry.messageRecordId), ['visible']);
    assert.equal(Object.hasOwn(result.payload.resolutions[0], 'completeContent'), false);
});

test('route reports ambiguity instead of choosing an over-bound continuity anchor', async () => {
    const router = makeRouter();
    registerTranscriptAnchorResolutionRoute(router);
    const result = await invoke(router.routes.get('/transcript-recall/anchors'), {
        user: { directories: { root: 'C:/test-root' } },
        body: { selection: selection([occurrence('a'), occurrence('b'), occurrence('c')]), anchorOccurrenceLimit: 2 },
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.resolutions[0].state, 'AMBIGUOUS_ANCHORS');
    assert.equal(result.payload.resolutions[0].eligibleOccurrenceCount, 3);
});

test('route refuses malformed candidate custody instead of inferring an anchor', async () => {
    const router = makeRouter();
    registerTranscriptAnchorResolutionRoute(router);
    const result = await invoke(router.routes.get('/transcript-recall/anchors'), {
        user: { directories: { root: 'C:/test-root' } },
        body: { selection: { state: 'CANDIDATES', characterInstanceId: 'character:jeep', posture: 'CONTINUITY', candidates: [{ documentId: 'document:one', contentHash: 'sha256:family', occurrenceLinks: [{}] }] }, anchorOccurrenceLimit: 2 },
    });
    assert.equal(result.statusCode, 409);
    assert.equal(result.payload.code, 'TIR_ANCHOR_CANDIDATE_INVALID');
});
