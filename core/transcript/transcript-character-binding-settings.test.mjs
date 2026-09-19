import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createHostCharacterIdentifier,
    recordTranscriptCharacterBindingSetting,
    resolveTranscriptCharacterBindingSetting,
} from './transcript-character-binding-settings.js';

const base = { transcriptRecall: { characterBindingTokens: {} } };
const id = createHostCharacterIdentifier('host-id-Jeep-1');

test('records and resolves only an explicit structured host identifier', () => {
    const recorded = recordTranscriptCharacterBindingSetting(base, id, 'operator:jeep');
    assert.equal(recorded.state, 'RECORDED');
    assert.deepEqual(resolveTranscriptCharacterBindingSetting(recorded.settings, id), { state: 'BOUND', hostCharacterId: 'host-id-Jeep-1', bindingToken: 'operator:jeep' });
    assert.equal(resolveTranscriptCharacterBindingSetting(recorded.settings, { kind: 'host-character-id', value: 'Jeep.png' }).state, 'UNRESOLVED');
});

test('missing or malformed identifiers remain unresolved', () => {
    assert.equal(resolveTranscriptCharacterBindingSetting(base, null).reason, 'HOST_IDENTIFIER_UNAVAILABLE');
    assert.equal(resolveTranscriptCharacterBindingSetting(base, { kind: 'host-character-id', value: '' }).reason, 'HOST_IDENTIFIER_UNAVAILABLE');
    assert.equal(recordTranscriptCharacterBindingSetting(base, { kind: 'display-name', value: 'Jeep' }, 'operator:jeep').reason, 'HOST_IDENTIFIER_UNAVAILABLE');
});

test('conflicting mapping refuses rather than overwriting the recorded binding', () => {
    const first = recordTranscriptCharacterBindingSetting(base, id, 'operator:jeep');
    const conflict = recordTranscriptCharacterBindingSetting(first.settings, id, 'operator:other');
    assert.equal(conflict.state, 'REFUSED');
    assert.equal(conflict.reason, 'BINDING_MAPPING_AMBIGUOUS');
    assert.deepEqual(resolveTranscriptCharacterBindingSetting(conflict.settings, id), { state: 'BOUND', hostCharacterId: 'host-id-Jeep-1', bindingToken: 'operator:jeep' });
});
