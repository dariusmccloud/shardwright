import assert from 'node:assert/strict';
import test from 'node:test';
import { handleHostRecallAfterData, installHostRecallAfterDataCompatibility } from './host-recall-after-data.js';
import { TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

test('materializes an approved bundle in the live payload and records a snapshot', async () => {
    const data = { prompt: `baseline ${TRANSCRIPT_RECALL_SENTINEL}` };
    const snapshots = [];
    const result = await handleHostRecallAfterData(data, {
        prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'r1', bundleHash: 'sha256:h', bundleText: 'RECALL' }),
        recordSnapshot: async (value) => snapshots.push(value),
    });
    assert.equal(result.state, 'MATERIALIZED');
    assert.equal(data.prompt, 'baseline RECALL');
    assert.equal(snapshots.length, 1);
});

test('skips preparation and mutation on dry runs', async () => {
    let prepared = false;
    const data = { prompt: TRANSCRIPT_RECALL_SENTINEL };
    const result = await handleHostRecallAfterData(data, { dryRun: true, prepare: async () => { prepared = true; } });
    assert.deepEqual(result, { state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
    assert.equal(prepared, false);
    assert.equal(data.prompt, TRANSCRIPT_RECALL_SENTINEL);
});

test('refuses when preparation declines or sentinel is absent', async () => {
    const declined = await handleHostRecallAfterData({ prompt: TRANSCRIPT_RECALL_SENTINEL }, { prepare: async () => Object.freeze({ state: 'DECLINED', reason: 'NO_TRANSCRIPT_PROPOSAL' }) });
    assert.deepEqual(declined, { state: 'REFUSED', reason: 'NO_TRANSCRIPT_PROPOSAL', requestId: '' });
    const absent = await handleHostRecallAfterData({ prompt: 'baseline' }, { prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'r2', bundleText: 'RECALL' }) });
    assert.deepEqual(absent, { state: 'REFUSED', reason: 'SENTINEL_NOT_FOUND', requestId: 'r2' });
});

test('registers through makeLast when the host provides it', async () => {
    const calls = [];
    const eventSource = { makeLast: (event, handler) => calls.push({ event, handler }) };
    assert.equal(installHostRecallAfterDataCompatibility({ eventSource, eventType: 'generate_after_data', prepare: async () => ({ state: 'DECLINED' }) }), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, 'generate_after_data');
});
