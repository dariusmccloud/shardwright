import assert from 'node:assert/strict';
import test from 'node:test';

import { rerankShardwrightTranscriptRecallWindows } from './shardwright-context-planning.js';

test('planning seam delegates transcript reranking without owning provider transport', async () => {
    const result = await rerankShardwrightTranscriptRecallWindows({
        query: 'CSP',
        windows: [{ windowId: 'w1', text: 'one' }, { windowId: 'w2', text: 'two' }],
        rerankDocuments: async () => ({ success: true, mode: 'similharity', target: 'existing-client', ranked: [{ index: 1, score: 2 }, { index: 0, score: 1 }] }),
        settings: {},
    });
    assert.equal(result.state, 'RERANKED');
    assert.deepEqual(result.windows.map((window) => window.windowId), ['w2', 'w1']);
});
