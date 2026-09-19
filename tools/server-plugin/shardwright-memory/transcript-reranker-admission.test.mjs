import assert from 'node:assert/strict';
import test from 'node:test';

import { admitTranscriptRerankerResult } from './transcript-reranker-admission.js';

const selection = {
    state: 'CANDIDATES', posture: 'CONTINUITY', characterInstanceId: 'character:jeep',
    candidateLimit: 3, availableCandidateCount: 2, truncated: false,
    candidates: [
        { documentId: 'doc:a', contentHash: 'sha256:a', occurrenceLinks: [{ messageRecordId: 'msg:a' }] },
        { documentId: 'doc:b', contentHash: 'sha256:b', occurrenceLinks: [{ messageRecordId: 'msg:b' }] },
    ],
};

test('admits scores and orders deterministically while preserving custody', () => {
    const result = admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: 0.2 }, { documentId: 'doc:b', score: 0.9 }]);
    assert.equal(result.state, 'RERANKED');
    assert.deepEqual(result.candidates.map((candidate) => candidate.documentId), ['doc:b', 'doc:a']);
    assert.deepEqual(result.candidates[0].occurrenceLinks, selection.candidates[1].occurrenceLinks);
});

test('equal scores retain selector order', () => {
    const result = admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: 1 }, { documentId: 'doc:b', score: 1 }]);
    assert.deepEqual(result.candidates.map((candidate) => candidate.documentId), ['doc:a', 'doc:b']);
});

test('refuses incomplete, unknown, duplicate, and non-finite score sets', () => {
    assert.throws(() => admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: 1 }]), (error) => error?.code === 'TIR_RERANK_SCORE_SET_INCOMPLETE');
    assert.throws(() => admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: 1 }, { documentId: 'doc:x', score: 0 }]), (error) => error?.code === 'TIR_RERANK_UNKNOWN_CANDIDATE');
    assert.throws(() => admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: 1 }, { documentId: 'doc:a', score: 0 }]), (error) => error?.code === 'TIR_RERANK_DUPLICATE_CANDIDATE');
    assert.throws(() => admitTranscriptRerankerResult(selection, [{ documentId: 'doc:a', score: Number.NaN }, { documentId: 'doc:b', score: 0 }]), (error) => error?.code === 'TIR_RERANK_SCORE_INVALID');
});
