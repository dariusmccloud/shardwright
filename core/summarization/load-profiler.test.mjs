import assert from 'node:assert/strict';
import test from 'node:test';

import {
    announceLoadProfilingBypass,
    beginLoadTrace,
    clearLoadTraces,
    finishLoadTrace,
    getLoadTraces,
} from './load-profiler.js';

test.afterEach(() => {
    clearLoadTraces();
});

test('load profiler sanitizes cyclic structures without throwing', () => {
    const meta = {};
    meta.self = meta;
    const extra = { nested: meta };
    extra.loop = extra;

    const trace = beginLoadTrace(meta);
    finishLoadTrace(trace, extra);

    const [saved] = getLoadTraces();
    assert.equal(saved.meta.self, '[Circular]');
    assert.equal(saved.extra.loop, '[Circular]');
    assert.equal(saved.extra.nested.self, '[Circular]');
});

test('profiling bypass identifies Shardwright rather than its upstream in operator diagnostics', () => {
    const warnings = [];
    const target = { localStorage: { getItem: () => '1' } };
    assert.equal(announceLoadProfilingBypass({ warn: (message) => warnings.push(message) }, target), true);
    assert.deepEqual(warnings, [
        '[Shardwright] Profiling bypass active. CHAT_CHANGED load processing will be skipped for measurement.',
    ]);
});
