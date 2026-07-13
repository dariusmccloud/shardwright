import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
