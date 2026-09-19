import assert from 'node:assert/strict';
import test from 'node:test';
import { CHARACTER_ASSOCIATION_DECISIONS, createCharacterIdentityMarker } from './character-identity-marker.js';
import { applyCharacterIdentityAssociation } from './character-identity-association.js';

function uuids() { let n = 0; return () => `uuid-${++n}`; }
const base = { characterId: 2, operatorActionId: 'operator-1', basis: 'operator confirmed same character', recordedAt: '2026-09-12T12:00:00Z' };

test('explicit association writes a valid marker and audits the decision', async () => {
    const writes = []; const audits = [];
    const result = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.ADOPT_EXISTING, targetCharacterInstanceId: 'transcript_character_existing', createMarker: () => createCharacterIdentityMarker({ randomUUID: uuids() }), writeExtensionField: async (...args) => writes.push(args), auditDecision: async (value) => { audits.push(value); return { state: 'RECORDED' }; } });
    assert.equal(result.state, 'APPLIED_AND_AUDITED');
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], 2); assert.equal(writes[0][1], 'shardwright');
    assert.equal(writes[0][2].characterInstanceId, 'transcript_character_existing');
    assert.equal(audits.length, 1);
});

test('create-new, unresolved, and reset remain explicit and fail closed', async () => {
    const writes = []; const cleared = []; const audits = []; const audit = async (value) => { audits.push(value); };
    const unresolved = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.LEAVE_UNRESOLVED, writeExtensionField: async () => writes.push(1), auditDecision: audit });
    assert.equal(unresolved.state, 'UNRESOLVED'); assert.equal(writes.length, 0);
    assert.equal(audits.length, 1);
    const reset = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.RESET_MARKER, writeExtensionField: async () => {}, clearExtensionField: async (...args) => cleared.push(args), auditDecision: async () => ({ state: 'RECORDED' }) });
    assert.equal(reset.state, 'APPLIED_AND_AUDITED'); assert.deepEqual(cleared, [[2, 'shardwright']]);
    const refused = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.ADOPT_EXISTING, writeExtensionField: async () => {}, auditDecision: audit });
    assert.equal(refused.reason, 'ASSOCIATION_TARGET_REQUIRED');
});

test('marker persistence refusal does not submit an audit decision', async () => {
    let audited = false;
    const result = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.CREATE_NEW, createMarker: () => createCharacterIdentityMarker({ randomUUID: uuids() }), writeExtensionField: async () => { throw new Error('write failed'); }, auditDecision: async () => { audited = true; return { state: 'RECORDED' }; } });
    assert.equal(result.state, 'REFUSED_NOT_APPLIED');
    assert.equal(audited, false);
});

test('successful marker persistence with audit refusal is explicitly pending', async () => {
    const result = await applyCharacterIdentityAssociation({ ...base, decision: CHARACTER_ASSOCIATION_DECISIONS.CREATE_NEW, createMarker: () => createCharacterIdentityMarker({ randomUUID: uuids() }), writeExtensionField: async () => {}, auditDecision: async () => { throw new Error('audit unavailable'); } });
    assert.equal(result.state, 'MARKER_APPLIED_AUDIT_PENDING');
});
