// Disposable cross-revision projection. Native IDs connect rows only within one
// source; absence of that host identity remains unresolved by design.

import { readTranscriptMessageLedger } from './transcript-message-ledger.js';

export const TranscriptMessageResolution = Object.freeze({ NATIVE_ID: 'NATIVE_ID', UNRESOLVED: 'UNRESOLVED' });

export function reconcileTranscriptMessages(paths) {
    const resolved = new Map(); const unresolved = [];
    for (const entry of readTranscriptMessageLedger(paths)) {
        for (const row of entry.batch.rows) {
            if (row.nativeMessageId == null) { unresolved.push(Object.freeze({ messageRecordId: row.messageRecordId, resolution: TranscriptMessageResolution.UNRESOLVED })); continue; }
            const key = `${row.sourceLogicalId}\u0000${row.nativeMessageId}`;
            const existing = resolved.get(key) || { logicalMessageId: `native:${row.sourceLogicalId}:${row.nativeMessageId}`, sourceLogicalId: row.sourceLogicalId, nativeMessageId: row.nativeMessageId, resolution: TranscriptMessageResolution.NATIVE_ID, revisions: [] };
            existing.revisions.push(Object.freeze({ messageRecordId: row.messageRecordId, sourceRevisionHash: row.sourceRevisionHash, sourceLocalOrder: row.sourceLocalOrder }));
            resolved.set(key, existing);
        }
    }
    return Object.freeze({ resolved: Object.freeze([...resolved.values()].map((value) => Object.freeze({ ...value, revisions: Object.freeze(value.revisions) }))), unresolved: Object.freeze(unresolved) });
}
