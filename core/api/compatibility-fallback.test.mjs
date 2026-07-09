import assert from 'node:assert/strict';
import test from 'node:test';

import { runCompatibilityFallback } from './compatibility-fallback.js';

test('remove-stop mode tries no-stop first and falls back once to default-stop', async () => {
    const calls = [];

    const result = await runCompatibilityFallback({
        removeStopStrings: true,
        hasStops: true,
        defaultBody: { stop: ['\n'] },
        noStopBody: { stop: [] },
        runAttempt: async (label, body) => {
            calls.push({ label, body });
            if (label === 'no-stop') {
                throw new Error('no-stop failed');
            }
            return 'default success';
        },
    });

    assert.equal(result, 'default success');
    assert.deepEqual(calls, [
        { label: 'no-stop', body: { stop: [] } },
        { label: 'default-stop', body: { stop: ['\n'] } },
    ]);
});

test('default-stop path remains single-shot when no stop strings are present', async () => {
    const calls = [];

    const result = await runCompatibilityFallback({
        removeStopStrings: true,
        hasStops: false,
        defaultBody: { stop: [] },
        noStopBody: { stop: [] },
        runAttempt: async (label, body) => {
            calls.push({ label, body });
            return 'ok';
        },
    });

    assert.equal(result, 'ok');
    assert.deepEqual(calls, [
        { label: 'default-stop', body: { stop: [] } },
    ]);
});

test('default path remains single-shot when remove-stop mode is disabled', async () => {
    const calls = [];

    await assert.rejects(
        () => runCompatibilityFallback({
            removeStopStrings: false,
            hasStops: true,
            defaultBody: { stop: ['\n'] },
            noStopBody: { stop: [] },
            runAttempt: async (label, body) => {
                calls.push({ label, body });
                throw new Error('default failed');
            },
        }),
        /default failed/,
    );

    assert.deepEqual(calls, [
        { label: 'default-stop', body: { stop: ['\n'] } },
    ]);
});

test('both bounded attempts bubble a combined error when fallback also fails', async () => {
    await assert.rejects(
        () => runCompatibilityFallback({
            removeStopStrings: true,
            hasStops: true,
            defaultBody: { stop: ['\n'] },
            noStopBody: { stop: [] },
            runAttempt: async (label) => {
                throw new Error(`${label} failed`);
            },
        }),
        /no-stop failed\. default-stop failed/,
    );
});
