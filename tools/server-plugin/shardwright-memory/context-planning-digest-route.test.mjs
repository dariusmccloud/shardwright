import assert from 'node:assert/strict';
import test from 'node:test';
import { registerContextPlanningDigestRoute } from './context-planning-digest-route.js';

function makeRouter() {
    const routes = new Map();
    return { routes, post(path, handler) { routes.set(path, handler); } };
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

test('authenticated route returns the exact SHA-256 digest without persistence', async () => {
    const router = makeRouter();
    registerContextPlanningDigestRoute(router);
    const result = await invoke(router.routes.get('/context-planning/canonical-sha256'), {
        user: { directories: { root: 'C:/test-root' } },
        body: { canonicalPayload: 'abc' },
    });
    assert.deepEqual(result, {
        statusCode: 200,
        payload: { ok: true, algorithm: 'sha256', digest: 'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    });
});

test('route refuses missing and oversize payloads without hashing a substitute', async () => {
    const router = makeRouter();
    registerContextPlanningDigestRoute(router);
    const handler = router.routes.get('/context-planning/canonical-sha256');
    const base = { user: { directories: { root: 'C:/test-root' } } };
    const invalid = await invoke(handler, { ...base, body: { canonicalPayload: '' } });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.payload.code, 'CONTEXT_PLANNING_PAYLOAD_INVALID');
    const oversize = await invoke(handler, { ...base, body: { canonicalPayload: 'x'.repeat(524289) } });
    assert.equal(oversize.statusCode, 413);
    assert.equal(oversize.payload.code, 'CONTEXT_PLANNING_PAYLOAD_TOO_LARGE');
});
