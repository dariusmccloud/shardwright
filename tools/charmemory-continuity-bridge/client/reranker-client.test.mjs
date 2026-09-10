import assert from 'node:assert/strict';
import test from 'node:test';
import { adoptShardwrightReranker, rerankCandidates } from './reranker-client.js';

const sourceReranker = {
    enabled: true,
    provider: 'similharity',
    apiUrl: 'http://localhost:8008/v1/rerank',
    model: 'bge-reranker-v2-m3',
    secretId: 'secret-reference',
};

test("adopts Shardwright's active reranker reference once without exposing its value", () => {
    const bridge = {};
    const result = adoptShardwrightReranker(bridge, { sharderMode: true, rag: { reranker: sourceReranker } });
    assert.equal(result.adopted, true);
    assert.equal(bridge.reranker.secretId, 'secret-reference');
    assert.equal(bridge.reranker.adoptedFrom, 'shardwright-once');
    assert.equal(adoptShardwrightReranker(bridge, { rag: { reranker: { ...sourceReranker, apiUrl: 'changed' } } }).changed, false);
});

test('reranks candidates while preserving their stable identity', async () => {
    const requests = [];
    const fetchImpl = async (url, request) => {
        requests.push({ url, request });
        if (url === '/api/secrets/find') return { ok: true, json: async () => ({ value: 'not-exposed-to-diagnostics' }) };
        return { ok: true, json: async () => ({ results: [{ index: 1, score: 0.9 }, { index: 0, score: 0.2 }] }) };
    };
    const candidates = [{ stableId: 'origin', content: 'CSP origin' }, { stableId: 'formalization', content: 'CSP formalization' }];
    const result = await rerankCandidates('CSP origins', candidates, sourceReranker, { fetchImpl });
    assert.equal(result.applied, true);
    assert.deepEqual(result.candidates.map(candidate => candidate.stableId), ['formalization', 'origin']);
    assert.equal(requests.length, 2);
    assert.doesNotMatch(requests[1].request.body, /secret-reference/);
});

test('fails open to FTS order when reranking is unavailable', async () => {
    const candidates = [{ stableId: 'first', content: 'first' }, { stableId: 'second', content: 'second' }];
    const result = await rerankCandidates('question', candidates, sourceReranker, {
        fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
    });
    assert.equal(result.applied, false);
    assert.deepEqual(result.candidates.map(candidate => candidate.stableId), ['first', 'second']);
});
