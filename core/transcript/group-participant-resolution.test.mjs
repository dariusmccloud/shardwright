import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroupParticipantOptions } from './group-participant-resolution.js';

test('resolves explicit group members to marked character cards without choosing a speaker', () => {
    const result = resolveGroupParticipantOptions({
        groupId: 'group-1',
        groups: [{ id: 'group-1', members: ['Jeep.png', 'Lyra.png'] }],
        characters: [
            { avatar: 'Jeep.png', name: 'Jeep', data: { extensions: { shardwright: { schemaVersion: 1, characterInstanceId: 'character-jeep', copyUuid: 'copy-jeep' } } } },
            { avatar: 'Lyra.png', name: 'Lyra' },
        ],
    });
    assert.equal(result.state, 'PARTICIPANTS');
    assert.deepEqual(result.participants.map((entry) => [entry.name, entry.state]), [['Jeep', 'RESOLVED'], ['Lyra', 'UNRESOLVED']]);
});

test('refuses group participant resolution when the host group record is unavailable', () => {
    assert.deepEqual(resolveGroupParticipantOptions({ groupId: 'group-1', groups: [] }), { state: 'REFUSED', reason: 'GROUP_PARTICIPANTS_UNAVAILABLE' });
});
