import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { registerCharacterAssociationAuditRoute } from './character-association-audit-route.js';

function router() { const routes = new Map(); return { routes, post(route, handler) { routes.set(route, handler); } }; }
async function invoke(handler, request) { let statusCode = 200; let payload = null; const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } }; await handler(request, response); return { statusCode, payload }; }

test('authenticated audit route appends and reads back a decision', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-association-route-')); const r = router(); registerCharacterAssociationAuditRoute(r);
    const request = { user: { directories: { root } }, body: { decision: 'CREATE_NEW', characterSelector: { hostCharacterId: 'host:jeep:card-1' }, idempotencyKey: 'op-1', basis: 'operator confirmed', recordedAt: '2026-09-12T12:00:00Z' } };
    const appended = await invoke(r.routes.get('/transcript-recall/character-association-audit'), request);
    assert.equal(appended.statusCode, 200); assert.equal(appended.payload.ok, true); assert.equal(appended.payload.appended, true);
    const read = await invoke(r.routes.get('/transcript-recall/character-association-audit/read'), { user: { directories: { root } }, body: {} });
    assert.equal(read.statusCode, 200); assert.equal(read.payload.entries.length, 1); assert.equal(read.payload.entries[0].eventId, appended.payload.entry.eventId);
});

test('route propagates idempotency collision as refusal', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-association-route-collision-')); const r = router(); registerCharacterAssociationAuditRoute(r); const handler = r.routes.get('/transcript-recall/character-association-audit');
    const base = { decision: 'CREATE_NEW', characterSelector: { hostCharacterId: 'host:jeep:card-1' }, idempotencyKey: 'op-1', basis: 'operator confirmed', recordedAt: '2026-09-12T12:00:00Z' };
    await invoke(handler, { user: { directories: { root } }, body: base }); const result = await invoke(handler, { user: { directories: { root } }, body: { ...base, basis: 'changed' } });
    assert.equal(result.statusCode, 409); assert.equal(result.payload.code, 'ASSOCIATION_AUDIT_IDEMPOTENCY_COLLISION');
});
