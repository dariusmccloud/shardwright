// Read-only admission of an external semantic reranker result. The reranker is
// disposable preference data: candidate identity, custody, and eligibility remain
// owned by the upstream selector and anchor resolver.

import { createError } from './core.js';

export function admitTranscriptRerankerResult(selection, scores) {
    if (!selection || selection.state !== 'CANDIDATES' || !Array.isArray(selection.candidates)) {
        throw createError(400, 'A candidate selection is required for reranker admission.', 'TIR_RERANK_SELECTION_INVALID');
    }
    if (!Array.isArray(scores) || scores.length !== selection.candidates.length) {
        throw createError(409, 'Reranker output must score every candidate exactly once.', 'TIR_RERANK_SCORE_SET_INCOMPLETE');
    }
    const known = new Map(selection.candidates.map((candidate, index) => [candidate?.documentId, { candidate, index }]));
    const seen = new Set();
    const admitted = [];
    for (const scored of scores) {
        if (!scored || typeof scored.documentId !== 'string' || !known.has(scored.documentId)) {
            throw createError(409, 'Reranker output references unknown candidate custody.', 'TIR_RERANK_UNKNOWN_CANDIDATE');
        }
        if (seen.has(scored.documentId)) {
            throw createError(409, 'Reranker output scores a candidate more than once.', 'TIR_RERANK_DUPLICATE_CANDIDATE');
        }
        if (typeof scored.score !== 'number' || !Number.isFinite(scored.score)) {
            throw createError(409, 'Reranker scores must be finite numbers.', 'TIR_RERANK_SCORE_INVALID');
        }
        seen.add(scored.documentId);
        const { candidate, index } = known.get(scored.documentId);
        admitted.push({ candidate: Object.freeze({ ...candidate, rerankScore: scored.score }), index });
    }
    if (seen.size !== known.size) throw createError(409, 'Reranker output omitted candidate custody.', 'TIR_RERANK_SCORE_SET_INCOMPLETE');
    admitted.sort((left, right) => right.candidate.rerankScore - left.candidate.rerankScore || left.index - right.index || left.candidate.documentId.localeCompare(right.candidate.documentId));
    return Object.freeze({
        state: 'RERANKED',
        posture: selection.posture,
        characterInstanceId: selection.characterInstanceId,
        candidateLimit: selection.candidateLimit,
        availableCandidateCount: selection.availableCandidateCount,
        truncated: selection.truncated === true,
        candidates: Object.freeze(admitted.map(({ candidate }) => candidate)),
    });
}
