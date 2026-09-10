// Disposable, read-only exact-content projection. It groups only byte-exact
// complete message text after durable occurrence custody and visibility are present.
// It never writes, chooses a representative, changes eligibility, or builds FTS.

import crypto from 'node:crypto';

import { createError } from './core.js';
import { readTranscriptMessageLedger } from './transcript-message-ledger.js';
import { readTranscriptSourceRevisionLedger } from './transcript-source-revision.js';
import { readTranscriptVisibilityLedger } from './transcript-visibility-ledger.js';
import { TranscriptVisibilityState } from './transcript-visibility-projection.js';

export const TranscriptFtsAdmissionScope = Object.freeze({
    ORDINARY: 'ORDINARY',
    ARCHAEOLOGY_ONLY: 'ARCHAEOLOGY_ONLY',
    EXCLUDED: 'EXCLUDED',
});

function contentHash(content) {
    return `sha256:${crypto.createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function scopeForVisibility(visibilityState) {
    if (visibilityState === TranscriptVisibilityState.VISIBLE) return TranscriptFtsAdmissionScope.ORDINARY;
    if (visibilityState === TranscriptVisibilityState.HIDDEN || visibilityState === TranscriptVisibilityState.ARCHIVED) return TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY;
    if (visibilityState === TranscriptVisibilityState.DELETED_OR_UNAVAILABLE || visibilityState === TranscriptVisibilityState.UNRESOLVED) return TranscriptFtsAdmissionScope.EXCLUDED;
    throw createError(409, 'Visibility state is not eligible for exact-content projection.', 'TIR_EQUIVALENCE_VISIBILITY_INVALID');
}

function visibilityByRevision(visibilityEntries) {
    const byRevision = new Map();
    for (const entry of visibilityEntries) {
        if (!entry?.sourceRevisionHash || !Array.isArray(entry.projection?.rows)) {
            throw createError(409, 'Visibility ledger entry is incomplete.', 'TIR_EQUIVALENCE_VISIBILITY_INVALID');
        }
        if (byRevision.has(entry.sourceRevisionHash)) {
            throw createError(409, 'Visibility ledger has ambiguous source-revision state.', 'TIR_EQUIVALENCE_VISIBILITY_AMBIGUOUS');
        }
        const rows = new Map();
        for (const row of entry.projection.rows) {
            if (!row?.messageRecordId || !row.visibilityState || rows.has(row.messageRecordId)) {
                throw createError(409, 'Visibility row is incomplete or ambiguous.', 'TIR_EQUIVALENCE_VISIBILITY_INVALID');
            }
            rows.set(row.messageRecordId, row.visibilityState);
        }
        byRevision.set(entry.sourceRevisionHash, rows);
    }
    return byRevision;
}

export function projectTranscriptExactContentEquivalence(messageEntries, visibilityEntries) {
    if (!Array.isArray(messageEntries) || !Array.isArray(visibilityEntries)) {
        throw createError(400, 'Durable message and visibility ledger entries are required.', 'TIR_EQUIVALENCE_INPUT_INVALID');
    }
    const visibility = visibilityByRevision(visibilityEntries);
    const families = new Map();
    for (const entry of messageEntries) {
        const batch = entry?.batch;
        if (!batch?.sourceRevisionHash || !Array.isArray(batch.rows)) {
            throw createError(409, 'Message ledger entry is incomplete.', 'TIR_EQUIVALENCE_MESSAGE_INVALID');
        }
        const stateByRecord = visibility.get(batch.sourceRevisionHash);
        if (!stateByRecord) {
            throw createError(409, 'Message custody has no durable visibility projection.', 'TIR_EQUIVALENCE_VISIBILITY_UNAVAILABLE');
        }
        for (const row of batch.rows) {
            if (!row?.messageRecordId || typeof row.completeContent !== 'string' || typeof row.contentHash !== 'string') {
                throw createError(409, 'Message row lacks complete exact-content custody.', 'TIR_EQUIVALENCE_MESSAGE_INVALID');
            }
            const expectedHash = contentHash(row.completeContent);
            if (row.contentHash !== expectedHash) {
                throw createError(409, 'Message content hash does not match complete content.', 'TIR_EQUIVALENCE_CONTENT_HASH_MISMATCH');
            }
            const visibilityState = stateByRecord.get(row.messageRecordId);
            if (!visibilityState) {
                throw createError(409, 'Message row has no visibility state.', 'TIR_EQUIVALENCE_VISIBILITY_UNAVAILABLE');
            }
            const admissionScope = scopeForVisibility(visibilityState);
            const occurrence = Object.freeze({
                messageRecordId: row.messageRecordId,
                characterInstanceId: row.characterInstanceId,
                sourceLogicalId: row.sourceLogicalId,
                sourceRevisionHash: row.sourceRevisionHash,
                sourceLocalOrder: row.sourceLocalOrder,
                nativeMessageId: row.nativeMessageId ?? null,
                shardwrightMessageId: row.shardwrightMessageId ?? null,
                visibilityState,
                admissionScope,
            });
            const family = families.get(expectedHash);
            if (family && family.completeContent !== row.completeContent) {
                throw createError(409, 'Distinct complete text shares a content hash.', 'TIR_EQUIVALENCE_HASH_COLLISION');
            }
            if (family) family.occurrences.push(occurrence);
            else families.set(expectedHash, { contentHash: expectedHash, completeContent: row.completeContent, occurrences: [occurrence] });
        }
    }
    return Object.freeze({
        families: Object.freeze([...families.values()].map((family) => {
            const scopes = new Set(family.occurrences.map((occurrence) => occurrence.admissionScope));
            return Object.freeze({
                contentHash: family.contentHash,
                completeContent: family.completeContent,
                occurrenceCount: family.occurrences.length,
                mixedEligibility: scopes.size > 1,
                occurrences: Object.freeze(family.occurrences),
            });
        })),
    });
}

export function projectDurableTranscriptExactContentEquivalence(paths) {
    const sourceRevisions = readTranscriptSourceRevisionLedger(paths);
    const knownRevisions = new Set(sourceRevisions.map((entry) => `${entry.receipt.sourceLogicalId}\u0000${entry.receipt.sourceRevisionHash}`));
    const currentBySource = new Map();
    for (const entry of sourceRevisions) currentBySource.set(entry.receipt.sourceLogicalId, entry.receipt.sourceRevisionHash);
    const currentMessageEntries = readTranscriptMessageLedger(paths).filter((entry) => {
        const batch = entry.batch;
        const key = `${batch.sourceLogicalId}\u0000${batch.sourceRevisionHash}`;
        if (!knownRevisions.has(key)) {
            throw createError(409, 'Message custody has no durable source revision.', 'TIR_EQUIVALENCE_SOURCE_REVISION_UNAVAILABLE');
        }
        return currentBySource.get(batch.sourceLogicalId) === batch.sourceRevisionHash;
    });
    return projectTranscriptExactContentEquivalence(currentMessageEntries, readTranscriptVisibilityLedger(paths));
}
