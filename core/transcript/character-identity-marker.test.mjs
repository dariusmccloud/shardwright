import assert from 'node:assert/strict';
import test from 'node:test';
import { CHARACTER_ASSOCIATION_DECISIONS, classifyCharacterIdentityMarkers, createCharacterAssociationDecision, createCharacterIdentityMarker, createDuplicateCharacterIdentityMarker, validateCharacterIdentityMarker } from './character-identity-marker.js';

function uuids() { let n = 0; return () => `uuid-${++n}`; }

test('creates a fresh marker and duplicate marker with separate active identity plus lineage', () => {
    const randomUUID = uuids();
    const original = createCharacterIdentityMarker({ randomUUID });
    const duplicate = createDuplicateCharacterIdentityMarker(original, { randomUUID });
    assert.equal(validateCharacterIdentityMarker(original).state, 'VALID');
    assert.equal(duplicate.state, 'DUPLICATE_MARKER_CREATED');
    assert.notEqual(duplicate.marker.characterInstanceId, original.characterInstanceId);
    assert.equal(duplicate.marker.copiedFromCharacterInstanceId, original.characterInstanceId);
});

test('missing or malformed markers remain unresolved', () => {
    assert.equal(validateCharacterIdentityMarker(null).reason, 'MARKER_MISSING_OR_MALFORMED');
    assert.equal(validateCharacterIdentityMarker({ schemaVersion: 1, characterInstanceId: 'x', copyUuid: '' }).state, 'REVIEW_REQUIRED');
    assert.equal(classifyCharacterIdentityMarkers([{ schemaVersion: 1, characterInstanceId: 'x', copyUuid: 'a' }, null]).state, 'UNRESOLVED');
});

test('duplicate or shared active identities refuse instead of merging', () => {
    const first = createCharacterIdentityMarker({ randomUUID: uuids() });
    assert.equal(classifyCharacterIdentityMarkers([first, first]).reason, 'DUPLICATE_MARKER_COLLISION');
    const secondCopy = { ...first, copyUuid: 'different-copy' };
    assert.equal(classifyCharacterIdentityMarkers([first, secondCopy].map((marker) => ({ ...marker, copyUuid: marker === first ? 'a' : 'b' })).map((marker) => ({ ...marker, characterInstanceId: first.characterInstanceId }))).reason, 'LOGICAL_ID_MULTIPLE_CARD_INCARNATIONS');
});

test('stripped copy metadata becomes reviewable, not an automatic new identity', () => {
    const marker = createCharacterIdentityMarker({ randomUUID: uuids() });
    assert.equal(validateCharacterIdentityMarker({ ...marker, copyUuid: undefined }).state, 'REVIEW_REQUIRED');
    assert.equal(classifyCharacterIdentityMarkers([{ ...marker, copyUuid: undefined }]).reason, 'MARKER_COPY_METADATA_MISSING');
});

test('operator association decisions are explicit and auditable', () => {
    const result = createCharacterAssociationDecision({ decision: CHARACTER_ASSOCIATION_DECISIONS.ADOPT_EXISTING, targetCharacterInstanceId: 'transcript_character_existing', operatorActionId: 'repair-1', basis: 'same base card confirmed by operator', recordedAt: '2026-09-11T12:00:00Z' });
    assert.equal(result.state, 'RECORDED');
    assert.equal(result.decision, 'ADOPT_EXISTING');
    assert.equal(createCharacterAssociationDecision({ decision: 'MERGE', operatorActionId: 'x', basis: 'x', recordedAt: 'x' }).reason, 'ASSOCIATION_DECISION_INVALID');
});
