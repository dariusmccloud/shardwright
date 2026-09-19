import assert from 'node:assert/strict';
import test from 'node:test';
import { requestShardwrightTranscriptPolicy } from './shardwright-context-planning.js';

test('transports frozen selection and anchor custody to policy route', async () => {
    const selection = Object.freeze({ state: 'CANDIDATES', posture: 'CONTINUITY', characterInstanceId: 'character:jeep' });
    const anchors = Object.freeze({ resolutions: [] });
    const calls = [];
    const result = await requestShardwrightTranscriptPolicy({ selection, anchors, fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'POLICY_EVALUATED', adequacy: 'ADEQUATE', sufficiency: 'SUFFICIENT' }; } };
    } });
    assert.equal(result.state, 'POLICY_EVALUATED');
    assert.equal(calls[1].url, '/api/plugins/shardwright-memory/transcript-recall/policy');
    assert.deepEqual(JSON.parse(calls[1].options.body), { selection, anchors });
});

test('refuses mutable or unavailable policy inputs without a request', async () => {
    assert.equal((await requestShardwrightTranscriptPolicy({ selection: {}, anchors: Object.freeze({ resolutions: [] }) })).reason, 'POLICY_INPUT_INVALID');
    const selection = Object.freeze({ state: 'CANDIDATES' });
    const anchors = Object.freeze({ resolutions: [] });
    assert.equal((await requestShardwrightTranscriptPolicy({ selection, anchors, fetchImpl: async () => { throw new Error('offline'); } })).reason, 'POLICY_ROUTE_UNAVAILABLE');
});
