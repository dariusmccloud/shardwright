import assert from 'node:assert/strict';
import test from 'node:test';

import { runWithOneTransientRetry } from './transient-retry.js';

test('retries one transient failure with the identical operation', async () => {
    let calls = 0;
    const waits = [];
    const result = await runWithOneTransientRetry({
        run: async () => {
            calls += 1;
            if (calls === 1) {
                throw Object.assign(new Error('connection reset'), { status: 502, code: 'ECONNRESET' });
            }
            return 'ok';
        },
        shouldRetry: error => error?.status === 502,
        delayMs: 250,
        wait: async delay => waits.push(delay),
    });

    assert.equal(result, 'ok');
    assert.equal(calls, 2);
    assert.deepEqual(waits, [250]);
});

test('does not retry a non-transient failure', async () => {
    let calls = 0;
    await assert.rejects(
        () => runWithOneTransientRetry({
            run: async () => {
                calls += 1;
                throw Object.assign(new Error('bad request'), { status: 400 });
            },
            shouldRetry: error => error?.status === 502,
            wait: async () => assert.fail('wait should not run'),
        }),
        /bad request/u,
    );
    assert.equal(calls, 1);
});

test('stops after the single retry also fails', async () => {
    let calls = 0;
    await assert.rejects(
        () => runWithOneTransientRetry({
            run: async () => {
                calls += 1;
                throw Object.assign(new Error(`reset ${calls}`), { status: 502 });
            },
            shouldRetry: error => error?.status === 502,
            delayMs: 0,
        }),
        /reset 2/u,
    );
    assert.equal(calls, 2);
});
