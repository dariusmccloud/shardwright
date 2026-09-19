// Host-side adapter for the existing RAG reranker client. The caller supplies
// selected window text and the existing rerankDocuments function; this module
// only binds scores back to stable window identities and refuses lossy output.

export async function rerankTranscriptWindows(query, windows, rerankDocuments, settings, options = {}) {
    if (typeof rerankDocuments !== 'function' || !Array.isArray(windows) || windows.length === 0) {
        return Object.freeze({ state: 'RERANK_UNAVAILABLE', reason: 'INPUT_INVALID', windows: Object.freeze([]) });
    }
    const documents = windows.map((window) => String(window?.text ?? ''));
    const result = await rerankDocuments(query, documents, settings, { topK: documents.length, ...options });
    if (!result?.success || !Array.isArray(result.ranked) || result.ranked.length !== windows.length) {
        return Object.freeze({ state: 'RERANK_UNAVAILABLE', reason: result?.error || 'RERANKER_FAILED', windows: Object.freeze(windows) });
    }
    const seen = new Set();
    const ranked = [];
    for (const row of result.ranked) {
        if (!Number.isInteger(row?.index) || row.index < 0 || row.index >= windows.length || seen.has(row.index)) {
            return Object.freeze({ state: 'RERANK_UNAVAILABLE', reason: 'RERANK_RESULT_INVALID', windows: Object.freeze(windows) });
        }
        seen.add(row.index);
        ranked.push(Object.freeze({ ...windows[row.index], rerankScore: Number.isFinite(Number(row.score)) ? Number(row.score) : null }));
    }
    if (seen.size !== windows.length) return Object.freeze({ state: 'RERANK_UNAVAILABLE', reason: 'RERANK_RESULT_INCOMPLETE', windows: Object.freeze(windows) });
    return Object.freeze({ state: 'RERANKED', mode: result.mode || 'unknown', target: result.target || '', windows: Object.freeze(ranked) });
}

export async function rerankSelectedTranscriptWindows({ query, assembly, rerankDocuments, settings, options = {} } = {}) {
    const projected = buildTranscriptRerankerInputs(assembly);
    if (projected.state !== 'RERANK_INPUTS_READY') return Object.freeze({ state: 'RERANK_UNAVAILABLE', reason: projected.reason, windows: Object.freeze([]) });
    return rerankTranscriptWindows(query, projected.inputs, rerankDocuments, settings, options);
}
import { buildTranscriptRerankerInputs } from './transcript-reranker-input.js';
