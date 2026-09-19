import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTranscriptRerankerInputs } from './transcript-reranker-input.js';

test('projects only selected window content into deterministic reranker inputs', () => {
    const result = buildTranscriptRerankerInputs({ windows: [{ documentId: 'doc:1', anchorMessageRecordId: 'msg:1', window: { rows: [
        { contentIncluded: true, completeContent: 'first' }, { contentIncluded: false, completeContent: 'must omit' }, { contentIncluded: true, completeContent: 'second' },
    ] } }] });
    assert.equal(result.state, 'RERANK_INPUTS_READY');
    assert.deepEqual(result.inputs[0], { windowId: 'doc:1', anchorMessageRecordId: 'msg:1', text: 'first\n\nsecond', rowCount: 2 });
});

test('refuses windows without custody or included content', () => {
    assert.equal(buildTranscriptRerankerInputs({ windows: [{ documentId: 'doc:1', window: { rows: [] } }] }).reason, 'WINDOW_CUSTODY_INVALID');
    assert.equal(buildTranscriptRerankerInputs({ windows: [{ documentId: 'doc:1', anchorMessageRecordId: 'msg:1', window: { rows: [{ contentIncluded: false }] } }] }).reason, 'WINDOW_CONTENT_UNAVAILABLE');
});
