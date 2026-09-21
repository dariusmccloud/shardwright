import test from 'node:test';
import assert from 'node:assert/strict';
import { observeTranscriptSource, registerTranscriptSource } from './transcript-source-registration-transport.js';

function fetchMock(calls) {
    return async (url, options) => {
        calls.push({ url, options });
        return url === '/csrf-token'
            ? { ok: true, json: async () => ({ token: 'csrf' }) }
            : url.endsWith('/observe')
                ? { ok: true, json: async () => ({ ok: true, state: 'OBSERVED', sourceLogicalId: 'source-1', byteLength: 10 }) }
                : { ok: true, json: async () => ({ ok: true, entry: { payload: { sourceLogicalId: 'source-1' } } }) };
    };
}

test('explicit source registration transport sends structured locator and operator action', async () => {
    const calls = [];
    const result = await registerTranscriptSource({ characterInstanceId: 'character-1', avatarUrl: 'Jeep.png', chatLocator: 'branch', operatorActionId: 'operator-1', fetchImpl: fetchMock(calls) });
    assert.equal(result.state, 'REGISTERED');
    const body = JSON.parse(calls[1].options.body);
    assert.deepEqual(body.sourceResolutionLocator, { kind: 'DIRECT', avatarUrl: 'Jeep.png', chatLocator: 'branch' });
    assert.equal(body.characterInstanceId, 'character-1');
    assert.equal(body.operatorActionId, 'operator-1');
});

test('group registration transport sends the structured group locator and participant basis', async () => {
    const calls = [];
    const result = await registerTranscriptSource({ sourceClass: 'GROUP', characterInstanceId: 'character-1', groupId: 'group-1', chatLocator: 'chat-1', historicalParticipantBasis: { groupSourceId: 'group-1', participantId: 'Jeep.png', evidenceHash: 'sha256:evidence' }, operatorActionId: 'operator-2', fetchImpl: fetchMock(calls) });
    assert.equal(result.state, 'REGISTERED');
    const body = JSON.parse(calls[1].options.body);
    assert.deepEqual(body.sourceResolutionLocator, { kind: 'GROUP', groupId: 'group-1', chatLocator: 'chat-1' });
    assert.deepEqual(body.historicalParticipantBasis, { groupSourceId: 'group-1', participantId: 'Jeep.png', evidenceHash: 'sha256:evidence' });
});

test('registration transport refuses incomplete direct or group admission input', async () => {
    assert.equal((await registerTranscriptSource({ sourceClass: 'GROUP' })).reason, 'SOURCE_REGISTRATION_INPUT_INVALID');
    assert.equal((await registerTranscriptSource({ characterInstanceId: 'character-1', avatarUrl: 'Jeep.png', chatLocator: 'branch' })).reason, 'SOURCE_REGISTRATION_INPUT_INVALID');
});

test('observation remains an explicit follow-up and preserves the source id', async () => {
    const calls = [];
    const result = await observeTranscriptSource('source-1', fetchMock(calls));
    assert.equal(result.state, 'OBSERVED');
    assert.equal(JSON.parse(calls[1].options.body).sourceLogicalId, 'source-1');
});
