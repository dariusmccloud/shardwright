import assert from 'node:assert/strict';
import test from 'node:test';
import { rerankSelectedTranscriptWindows, rerankTranscriptWindows } from './transcript-reranker-adapter.js';

const windows = [{ windowId: 'w1', text: 'first window' }, { windowId: 'w2', text: 'second window' }];

test('reuses caller reranker and binds scores to selected window identity', async () => {
    let received;
    const result = await rerankTranscriptWindows('CSP', windows, async (query, docs) => {
        received = { query, docs };
        return { success: true, mode: 'similharity', target: '/api/plugins/similharity/rerank', ranked: [{ index: 1, score: 0.9 }, { index: 0, score: 0.2 }] };
    }, { reranker: { enabled: true } });
    assert.deepEqual(received, { query: 'CSP', docs: ['first window', 'second window'] });
    assert.deepEqual(result.windows.map((window) => window.windowId), ['w2', 'w1']);
    assert.equal(result.windows[0].rerankScore, 0.9);
});

test('refuses lossy reranker output without partial reorder', async () => {
    const result = await rerankTranscriptWindows('CSP', windows, async () => ({ success: true, ranked: [{ index: 0, score: 1 }] }), {});
    assert.equal(result.state, 'RERANK_UNAVAILABLE');
    assert.equal(result.reason, 'RERANKER_FAILED');
    assert.deepEqual(result.windows, windows);
});

test('does not invent a reranker when input is absent', async () => {
    const result = await rerankTranscriptWindows('CSP', [], async () => { throw new Error('must not call'); }, {});
    assert.deepEqual(result, { state: 'RERANK_UNAVAILABLE', reason: 'INPUT_INVALID', windows: [] });
});

test('invokes the existing provider only after selected-window projection', async () => {
    const result = await rerankSelectedTranscriptWindows({
        query: 'CSP',
        assembly: { windows: [{ documentId: 'doc:1', anchorMessageRecordId: 'msg:1', window: { rows: [{ contentIncluded: true, completeContent: 'selected text' }] } }] },
        rerankDocuments: async (query, docs) => { assert.deepEqual([query, docs], ['CSP', ['selected text']]); return { success: true, ranked: [{ index: 0, score: 0.8 }] }; },
        settings: {},
    });
    assert.equal(result.state, 'RERANKED');
    assert.equal(result.windows[0].windowId, 'doc:1');
});
