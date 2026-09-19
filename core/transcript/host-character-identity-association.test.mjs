import assert from 'node:assert/strict';
import test from 'node:test';
import { CHARACTER_ASSOCIATION_DECISIONS, installHostCharacterIdentityAssociationCapability } from './host-character-identity-association.js';

test('host capability binds the active character index and delegates explicit association', async () => {
    const writes = []; const audits = []; const target = {};
    assert.equal(installHostCharacterIdentityAssociationCapability({ target, contextResolver: () => ({ characterId: '1', characters: [{}, { data: { extensions: { shardwright: null } } }] }), writeExtensionField: async (...args) => writes.push(args), auditDecision: async (value) => { audits.push(value); return { state: 'RECORDED' }; } }), true);
    const result = await target.Shardwright.transcript.associateCurrentCharacterIdentity({ decision: CHARACTER_ASSOCIATION_DECISIONS.CREATE_NEW, operatorActionId: 'op-1', basis: 'operator confirmed card', recordedAt: '2026-09-12T12:00:00Z', createMarker: () => ({ schemaVersion: 1, characterInstanceId: 'transcript_character_new', copyUuid: 'copy-new' }) });
    assert.equal(result.state, 'APPLIED_AND_AUDITED'); assert.equal(writes[0][0], 1); assert.equal(audits.length, 1);
});

test('missing host persistence primitives fail closed', async () => {
    const target = {};
    assert.equal(installHostCharacterIdentityAssociationCapability({ target, contextResolver: () => ({ characterId: 0 }), auditDecision: async () => {} }), true);
    assert.equal((await target.Shardwright.transcript.associateCurrentCharacterIdentity({ decision: CHARACTER_ASSOCIATION_DECISIONS.CREATE_NEW })).reason, 'ASSOCIATION_HOST_PRIMITIVES_UNAVAILABLE');
});

test('host clear capability is used for reset without sentinel guessing', async () => {
    const cleared = []; const target = {};
    installHostCharacterIdentityAssociationCapability({ target, contextResolver: () => ({ characterId: 0, clearExtensionField: async (...args) => cleared.push(args), characters: [{ data: { extensions: { shardwright: { schemaVersion: 1, characterInstanceId: 'x', copyUuid: 'y' } } } }] }), writeExtensionField: async () => {}, auditDecision: async () => ({ state: 'RECORDED' }) });
    const result = await target.Shardwright.transcript.associateCurrentCharacterIdentity({ decision: CHARACTER_ASSOCIATION_DECISIONS.RESET_MARKER, operatorActionId: 'reset-1', basis: 'operator reset', recordedAt: '2026-09-12T12:00:00Z' });
    assert.equal(result.state, 'APPLIED_AND_AUDITED');
    assert.deepEqual(cleared, [[0, 'shardwright']]);
});
