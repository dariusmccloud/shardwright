import assert from 'node:assert/strict';
import test from 'node:test';
import { composeHostRecallDispatch } from './host-recall-dispatch-composition.js';

const invocation = Object.freeze({
    state: 'ELIGIBLE',
    context: Object.freeze({ generationId: 'generation-1', characterInstanceId: 'character-1', chatId: 'chat-1' }),
});

test('dispatches one approved materialization in order and passes the immutable context through', async () => {
    const calls = [];
    const prepared = { state: 'APPROVED', request: Object.freeze({ requestId: 'request-1' }), proposal: Object.freeze({ bundleHash: 'sha256:test' }) };
    const materialized = { state: 'MATERIALIZED', prompt: [{ role: 'system', content: 'recall' }] };
    const result = await composeHostRecallDispatch({
        invocation,
        prepare: async (context) => { calls.push(['prepare', context]); return prepared; },
        materialize: async (value) => { calls.push(['materialize', value]); return materialized; },
        recordSnapshot: async (value) => { calls.push(['snapshot', value]); },
        dispatch: async (prompt, context) => { calls.push(['dispatch', prompt, context]); },
    });
    assert.equal(result.state, 'DISPATCHED');
    assert.deepEqual(calls.map(([name]) => name), ['prepare', 'materialize', 'snapshot', 'dispatch']);
    assert.equal(calls[0][1], invocation.context);
    assert.equal(calls[3][2].request, prepared.request);
});

test('does not dispatch when planning is declined', async () => {
    let dispatched = false;
    const result = await composeHostRecallDispatch({
        invocation,
        prepare: async () => Object.freeze({ state: 'DECLINED', reason: 'NO_TRANSCRIPT_PROPOSAL' }),
        materialize: async () => { throw new Error('must not materialize'); },
        dispatch: async () => { dispatched = true; },
    });
    assert.deepEqual(result, { state: 'REFUSED', reason: 'NO_TRANSCRIPT_PROPOSAL' });
    assert.equal(dispatched, false);
});

test('does not dispatch ineligible or dry-run invocations', async () => {
    let prepared = false;
    const result = await composeHostRecallDispatch({
        invocation: Object.freeze({ state: 'NOT_APPLICABLE', reason: 'DRY_RUN' }),
        prepare: async () => { prepared = true; },
        materialize: async () => {},
        dispatch: async () => {},
    });
    assert.deepEqual(result, { state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
    assert.equal(prepared, false);
});

test('refuses when materialization fails and never dispatches', async () => {
    let dispatched = false;
    const result = await composeHostRecallDispatch({
        invocation,
        prepare: async () => ({ state: 'APPROVED', request: Object.freeze({ requestId: 'request-2' }), proposal: Object.freeze({}) }),
        materialize: async () => Object.freeze({ state: 'REFUSED', reason: 'DISPATCH_TARGET_RESTORE_FAILED' }),
        dispatch: async () => { dispatched = true; },
    });
    assert.deepEqual(result, { state: 'REFUSED', reason: 'DISPATCH_TARGET_RESTORE_FAILED', requestId: 'request-2' });
    assert.equal(dispatched, false);
});
