// Deterministic projection of already-assembled windows into reranker documents.
// Only content explicitly present in the selected window is exposed; custody remains
// attached to each input and no unselected corpus text is fetched.

export function buildTranscriptRerankerInputs(assembly) {
    if (!assembly || !Array.isArray(assembly.windows) || assembly.windows.length === 0) return Object.freeze({ state: 'RERANK_INPUT_UNAVAILABLE', reason: 'ASSEMBLY_INVALID', inputs: Object.freeze([]) });
    const inputs = [];
    for (const entry of assembly.windows) {
        if (!entry?.documentId || !entry.anchorMessageRecordId || !entry.window || !Array.isArray(entry.window.rows)) return Object.freeze({ state: 'RERANK_INPUT_UNAVAILABLE', reason: 'WINDOW_CUSTODY_INVALID', inputs: Object.freeze([]) });
        const includedRows = entry.window.rows.filter((row) => row?.contentIncluded === true && typeof row.completeContent === 'string');
        if (includedRows.length === 0) return Object.freeze({ state: 'RERANK_INPUT_UNAVAILABLE', reason: 'WINDOW_CONTENT_UNAVAILABLE', inputs: Object.freeze([]) });
        inputs.push(Object.freeze({
            windowId: entry.documentId,
            anchorMessageRecordId: entry.anchorMessageRecordId,
            text: includedRows.map((row) => row.completeContent).join('\n\n'),
            rowCount: includedRows.length,
        }));
    }
    return Object.freeze({ state: 'RERANK_INPUTS_READY', inputs: Object.freeze(inputs) });
}
