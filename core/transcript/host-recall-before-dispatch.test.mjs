import test from 'node:test';
import assert from 'node:assert/strict';
import { handleHostRecallBeforeDispatch } from './host-recall-before-dispatch.js';
import { TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

const invocation = Object.freeze({ state: 'ELIGIBLE', context: Object.freeze({ generationId: 'g1' }) });

test('injects approved bundle and verifies the live payload postcondition', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: `before ${TRANSCRIPT_RECALL_SENTINEL}` }] }, dryRun: false };
    const result = await handleHostRecallBeforeDispatch(payload, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'g1', bundleText: 'recall', bundleHash: 'sha256:x' }) });
    assert.equal(result.state, 'INJECTED');
    assert.equal(payload.generateData.prompt[0].content, 'before recall');
});

test('skips dry runs without planning', async () => {
    const result = await handleHostRecallBeforeDispatch({ generateData: {}, dryRun: true }, { prepare: async () => { throw new Error('must not plan'); } });
    assert.deepEqual(result, { state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
});

test('refuses when planner does not approve', async () => {
    const result = await handleHostRecallBeforeDispatch({ generateData: {}, dryRun: false }, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'DECLINED', reason: 'NO_SHARDWRIGHT_PLANNER' }) });
    assert.deepEqual(result, { state: 'REFUSED', reason: 'NO_SHARDWRIGHT_PLANNER', requestId: '' });
});

test('refuses when sentinel postcondition cannot be verified', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: 'no sentinel' }] }, dryRun: false };
    const result = await handleHostRecallBeforeDispatch(payload, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'g1', bundleText: 'recall' }) });
    assert.equal(result.state, 'REFUSED');
    assert.equal(result.reason, 'SENTINEL_NOT_FOUND');
});
