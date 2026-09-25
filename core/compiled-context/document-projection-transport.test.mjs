import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeCompiledContextSources, planCompiledContextSources } from './document-projection-transport.js';

function fetchStub(expectedUrl, body, result, ok = true) {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') return { ok: true, async json() { return { token: 'csrf-test' }; } };
        assert.equal(url, expectedUrl);
        assert.deepEqual(JSON.parse(options.body), body);
        return { ok, async json() { return result; } };
    };
    return { fetchImpl, calls };
}

const sources = [{ documentLogicalId: 'style', canonicalName: 'EICF - Documentation Style Guide', filePath: 'C:/docs/style.md' }];

test('materializes explicit sources through the server route', async () => {
    const stub = fetchStub('/api/plugins/shardwright-memory/compiled-context/projection/materialize-sources', { sources }, { ok: true, state: 'CURRENT', sources: [] });
    const result = await materializeCompiledContextSources({ sources, fetchImpl: stub.fetchImpl });
    assert.equal(result.state, 'CURRENT');
    assert.equal(stub.calls.length, 2);
    assert.equal(stub.calls[1].options.headers['x-csrf-token'], 'csrf-test');
});

test('plans explicit sources and fails closed for malformed input or route failure', async () => {
    const stub = fetchStub('/api/plugins/shardwright-memory/compiled-context/projection/plan-sources', { sources, taskText: 'Draft a document.' }, { ok: true, state: 'PLAN', documents: [] });
    assert.equal((await planCompiledContextSources({ sources, taskText: 'Draft a document.', fetchImpl: stub.fetchImpl })).state, 'PLAN');
    assert.deepEqual(await planCompiledContextSources({ sources: [], taskText: 'Draft a document.', fetchImpl: stub.fetchImpl }), { state: 'REFUSED', reason: 'COMPILED_CONTEXT_PLAN_INPUT_INVALID' });
    const failed = fetchStub('/api/plugins/shardwright-memory/compiled-context/projection/plan-sources', { sources, taskText: 'Draft a document.' }, { code: 'TIR_COMPILED_CONTEXT_PROJECTION_STALE' }, false);
    assert.deepEqual(await planCompiledContextSources({ sources, taskText: 'Draft a document.', fetchImpl: failed.fetchImpl }), { state: 'REFUSED', reason: 'TIR_COMPILED_CONTEXT_PROJECTION_STALE' });
});
