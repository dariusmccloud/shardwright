import assert from 'node:assert/strict';
import test from 'node:test';
import { clearCharacterIdentityAlias, getCharacterIdentityAlias, setCharacterIdentityAlias } from './character-identity-aliases.js';

const id = 'transcript_character_123';
const base = { transcriptRecall: { characterIdentityAliases: {} } };

test('records and resolves an alias by authoritative identity', () => {
    const result = setCharacterIdentityAlias(base, id, 'Jeep (primary)');
    assert.equal(result.state, 'RECORDED');
    assert.equal(getCharacterIdentityAlias(result.settings, id), 'Jeep (primary)');
    assert.equal(getCharacterIdentityAlias(result.settings, 'transcript_character_other'), 'transcript_character_other');
});

test('aliases do not change the identity key or mutate input settings', () => {
    const result = setCharacterIdentityAlias(base, id, 'Display label');
    assert.equal(result.characterInstanceId, id);
    assert.deepEqual(base.transcriptRecall.characterIdentityAliases, {});
});

test('malformed aliases refuse closed', () => {
    assert.equal(setCharacterIdentityAlias(base, '', 'x').reason, 'CHARACTER_INSTANCE_ID_UNAVAILABLE');
    assert.equal(setCharacterIdentityAlias(base, id, '').reason, 'ALIAS_UNAVAILABLE');
    assert.equal(setCharacterIdentityAlias(base, id, 'x'.repeat(101)).reason, 'ALIAS_TOO_LONG');
});

test('clearing removes only the display alias and falls back to the opaque id', () => {
    const recorded = setCharacterIdentityAlias(base, id, 'Jeep');
    const cleared = clearCharacterIdentityAlias(recorded.settings, id);
    assert.equal(cleared.state, 'RECORDED');
    assert.equal(getCharacterIdentityAlias(cleared.settings, id), id);
});
