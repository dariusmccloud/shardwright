import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getStoragePaths } from './core.js';
import { createTranscriptCharacterInstance } from './transcript-character-binding.js';
import { registerTranscriptCharacterBindingRoute } from './transcript-character-binding-route.js';

function router() { const routes = new Map(); return { routes, post(route, handler) { routes.set(route, handler); } }; }
async function invoke(handler, request) { let statusCode = 200; let payload = null; const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } }; await handler(request, response); return { statusCode, payload }; }

test('resolves only an explicitly recorded binding token', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-binding-route-')); const paths = getStoragePaths(root);
    const created = createTranscriptCharacterInstance(paths, { bindingToken: 'operator:jeep', operatorActionId: 'bind-jeep', recordedAt: '2026-09-09T12:00:00.000Z' });
    const r = router(); registerTranscriptCharacterBindingRoute(r);
    const result = await invoke(r.routes.get('/transcript-recall/character-binding'), { user: { directories: { root } }, body: { bindingToken: 'operator:jeep' } });
    assert.deepEqual(result, { statusCode: 200, payload: { ok: true, characterInstanceId: created.entry.payload.characterInstanceId } });
});

test('unknown or missing tokens refuse without display-locator fallback', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-binding-route-missing-')); const r = router(); registerTranscriptCharacterBindingRoute(r); const handler = r.routes.get('/transcript-recall/character-binding');
    const unknown = await invoke(handler, { user: { directories: { root } }, body: { bindingToken: 'Jeep.png' } });
    assert.equal(unknown.statusCode, 404); assert.equal(unknown.payload.code, 'TIR_BINDING_UNRESOLVED');
    const missing = await invoke(handler, { user: { directories: { root } }, body: {} });
    assert.equal(missing.statusCode, 400); assert.equal(missing.payload.code, 'TIR_BINDING_INVALID_INPUT');
});
