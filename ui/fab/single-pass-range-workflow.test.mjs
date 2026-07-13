import assert from 'node:assert/strict';
import test from 'node:test';

import { runSinglePassRangeWorkflow } from './single-pass-range-workflow.js';

test('Go Back returns to range selection and revised range starts generation exactly once', async () => {
    const requestedDefaults = [];
    const submittedRanges = ['10-20', '21-30'];
    const selectionRuns = [];
    let generations = 0;

    const result = await runSinglePassRangeWorkflow({
        maxIndex: 40,
        requestRange: async (defaultRange) => {
            requestedDefaults.push(defaultRange);
            return submittedRanges.shift();
        },
        parseRange: (text) => {
            const [startIdx, endIdx] = text.split('-').map(Number);
            return { startIdx, endIdx };
        },
        runSinglePass: async (startIdx, endIdx) => {
            selectionRuns.push([startIdx, endIdx]);
            if (selectionRuns.length === 1) {
                return { requestRangeRevision: true };
            }
            generations += 1;
            return { status: 'completed' };
        },
    });

    assert.deepEqual(requestedDefaults, ['0-40', '10-20']);
    assert.deepEqual(selectionRuns, [[10, 20], [21, 30]]);
    assert.equal(generations, 1);
    assert.deepEqual(result, { status: 'completed' });
});

test('canceling the range prompt exits without starting a run', async () => {
    let runs = 0;
    const result = await runSinglePassRangeWorkflow({
        maxIndex: 40,
        requestRange: async () => null,
        parseRange: () => null,
        runSinglePass: async () => { runs += 1; },
    });

    assert.deepEqual(result, { status: 'cancelled' });
    assert.equal(runs, 0);
});
