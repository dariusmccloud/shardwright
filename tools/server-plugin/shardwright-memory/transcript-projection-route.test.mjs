import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { registerTranscriptProjectionRoute } from './transcript-projection-route.js';

function router() { const routes = new Map(); return { routes, post(route, handler) { routes.set(route, handler); } }; }
async function invoke(handler, request) { let statusCode = 200; let payload = null; const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } }; await handler(request, response); return { statusCode, payload }; }

test('registers service-owned catch-up and status seams', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-projection-route-'));
    const paths = getStoragePaths(root);
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const r = router(); registerTranscriptProjectionRoute(r);
    assert.equal(r.routes.has('/transcript-recall/projection/catch-up'), true);
    assert.equal(r.routes.has('/transcript-recall/projection/status'), true);
    const missing = await invoke(r.routes.get('/transcript-recall/projection/status'), { user: { directories: { root } }, body: {} });
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.payload.code, 'TIR_PROJECTION_CHARACTER_REQUIRED');
    assert.deepEqual(await invoke(r.routes.get('/transcript-recall/projection/status'), { user: { directories: { root } }, body: { characterInstanceId: 'character:jeep' } }), { statusCode: 200, payload: { ok: true, state: null } });
});
