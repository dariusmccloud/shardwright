import assert from 'node:assert/strict';
import test from 'node:test';

import { runWithOneTransientRetry } from './transient-retry.js';

test('retries one transient failure with the identical operation', async () => {
    let calls = 0;
    const waits = [];
    const diagnostics = [];
    const times = [1000, 38700, 38950, 225050];
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
        now: () => times.shift(),
        onRetryDiagnostic: diagnostic => diagnostics.push(diagnostic),
    });

    assert.equal(result, 'ok');
    assert.equal(calls, 2);
    assert.deepEqual(waits, [250]);
    assert.deepEqual(diagnostics, [{
        outcome: 'RECOVERED',
        delayMs: 250,
        firstFailure: {
            attempt: 1,
            status: 502,
            code: 'ECONNRESET',
            elapsedMs: 37700,
        },
        retry: {
            attempt: 2,
            status: null,
            code: null,
            elapsedMs: 186100,
        },
    }]);
    assert.equal(JSON.stringify(diagnostics).includes('connection reset'), false);
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
    const diagnostics = [];
    await assert.rejects(
        () => runWithOneTransientRetry({
            run: async () => {
                calls += 1;
                throw Object.assign(new Error(`reset ${calls}`), { status: 502 });
            },
            shouldRetry: error => error?.status === 502,
            delayMs: 0,
            onRetryDiagnostic: diagnostic => diagnostics.push(diagnostic),
        }),
        /reset 2/u,
    );
    assert.equal(calls, 2);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].outcome, 'FAILED');
    assert.equal(diagnostics[0].firstFailure.status, 502);
    assert.equal(diagnostics[0].retry.status, 502);
    assert.equal(Object.hasOwn(diagnostics[0].firstFailure, 'message'), false);
    assert.equal(Object.hasOwn(diagnostics[0].retry, 'message'), false);
});
