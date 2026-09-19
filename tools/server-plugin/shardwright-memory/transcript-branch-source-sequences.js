// Read-only custody projection for historical branch comparison.
// It consumes only the current durable source revision and message ledgers.

import { createError } from './core.js';
import { readTranscriptMessageLedger } from './transcript-message-ledger.js';
import { readTranscriptSourceRevisionLedger } from './transcript-source-revision.js';

function currentSourceRevisions(paths) {
    const current = new Map();
    for (const entry of readTranscriptSourceRevisionLedger(paths)) {
        const receipt = entry.receipt;
        if (!receipt?.sourceLogicalId || !receipt.sourceRevisionHash) throw createError(409, 'Source revision custody is incomplete.', 'TIR_BRANCH_REVISION_INVALID');
        current.set(receipt.sourceLogicalId, receipt);
    }
    return current;
}

export function projectTranscriptBranchSourceSequences(paths, sourceLogicalIds = null) {
    const revisions = currentSourceRevisions(paths);
    const requested = sourceLogicalIds == null ? null : new Set(sourceLogicalIds);
    if (requested && [...requested].some((id) => typeof id !== 'string' || !id.trim())) throw createError(400, 'Source IDs must be non-empty strings.', 'TIR_BRANCH_SOURCE_IDS_INVALID');
    const rowsBySource = new Map();
    for (const entry of readTranscriptMessageLedger(paths)) {
        const batch = entry.batch;
        const receipt = revisions.get(batch?.sourceLogicalId);
        if (!receipt || receipt.sourceRevisionHash !== batch.sourceRevisionHash) continue;
        if (requested && !requested.has(batch.sourceLogicalId)) continue;
        if (!Array.isArray(batch.rows)) throw createError(409, 'Message custody batch is incomplete.', 'TIR_BRANCH_MESSAGE_INVALID');
        const rows = rowsBySource.get(batch.sourceLogicalId) || [];
        for (const row of batch.rows) {
            if (!Number.isInteger(row.sourceLocalOrder) || typeof row.contentHash !== 'string' || !row.contentHash.trim()) throw createError(409, 'Message custody row lacks ordered content identity.', 'TIR_BRANCH_MESSAGE_INVALID');
            rows.push({ messageIndex: row.sourceLocalOrder, contentHash: row.contentHash, sourceRevisionHash: batch.sourceRevisionHash, messageRecordId: row.messageRecordId });
        }
        rowsBySource.set(batch.sourceLogicalId, rows);
    }
    const sources = [];
    for (const [sourceLogicalId, receipt] of revisions) {
        if (requested && !requested.has(sourceLogicalId)) continue;
        const rows = rowsBySource.get(sourceLogicalId) || [];
        rows.sort((left, right) => left.messageIndex - right.messageIndex);
        const seen = new Set();
        if (rows.some((row) => seen.has(row.messageIndex) || !seen.add(row.messageIndex))) throw createError(409, 'Source message order is ambiguous.', 'TIR_BRANCH_MESSAGE_ORDER_AMBIGUOUS');
        sources.push(Object.freeze({
            sourceLogicalId,
            characterInstanceId: receipt.characterInstanceId,
            sourceRevisionHash: receipt.sourceRevisionHash,
            createdAtMs: receipt.sourceCreationAtMs,
            creationTimestampTier: receipt.sourceCreationTimestampTier || 'UNAVAILABLE',
            lineageHints: receipt.lineageHints || Object.freeze({ mainChat: null, bookmarkLinks: Object.freeze([]) }),
            messages: Object.freeze(rows.map((row) => Object.freeze(row))),
        }));
    }
    return Object.freeze({ state: 'PROJECTED', sources: Object.freeze(sources) });
}
