import assert from 'node:assert/strict';
import test from 'node:test';

import { registerTranscriptCandidatePolicyRoute } from './transcript-candidate-policy-route.js';

function router() { const routes = new Map(); return { routes, post(path, handler) { routes.set(path, handler); } }; }
async function invoke(handler, request) {
    let statusCode = 200; let payload;
    const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } };
    await handler(request, response); return { statusCode, payload };
}
const selection = { state: 'CANDIDATES', posture: 'CONTINUITY', characterInstanceId: 'character:jeep', candidates: [{ documentId: 'doc:1' }], availableCandidateCount: 1, truncated: false };
const anchors = { resolutions: [{ state: 'SOLE_ANCHOR', contentHash: 'sha256:one', occurrences: [{ messageRecordId: 'message:one' }] }] };

test('authenticated policy route returns adequacy and sufficiency without source text', async () => {
    const r = router(); registerTranscriptCandidatePolicyRoute(r);
    const result = await invoke(r.routes.get('/transcript-recall/policy'), { user: { directories: { root: 'C:/test-root' } }, body: { selection, anchors } });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.adequacy, 'ADEQUATE');
    assert.equal(result.payload.sufficiency, 'SUFFICIENT');
    assert.equal(Object.hasOwn(result.payload, 'completeContent'), false);
});

test('policy route refuses unauthenticated requests', async () => {
    const r = router(); registerTranscriptCandidatePolicyRoute(r);
    const result = await invoke(r.routes.get('/transcript-recall/policy'), { body: { selection, anchors } });
    assert.equal(result.statusCode, 500);
    assert.equal(result.payload.code, 'ARCH_USER_ROOT_UNAVAILABLE');
});
