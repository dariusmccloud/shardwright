// Read-only source-local context reconstruction. It starts from an FTS document and
// occurrence link, then re-derives content from durable current source, message, and
// visibility ledgers. It never uses cached prompt material or changes eligibility.

import fs from 'node:fs';

import { createAdapter, createError } from './core.js';
import { readTranscriptMessageLedger } from './transcript-message-ledger.js';
import { readTranscriptSourceRevisionLedger } from './transcript-source-revision.js';
import { readTranscriptVisibilityLedger } from './transcript-visibility-ledger.js';
import { TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';
import { TranscriptVisibilityState } from './transcript-visibility-projection.js';

function assertRequest(request) {
    if (!request || typeof request.characterInstanceId !== 'string' || request.characterInstanceId.trim() === '' || typeof request.documentId !== 'string' || typeof request.anchorMessageRecordId !== 'string') {
        throw createError(400, 'Character, selected document, and anchor occurrence are required for context reconstruction.', 'TIR_WINDOW_REQUEST_INVALID');
    }
    if (!Number.isInteger(request.before) || request.before < 0 || !Number.isInteger(request.after) || request.after < 0) {
        throw createError(400, 'Context reconstruction requires non-negative explicit before and after counts.', 'TIR_WINDOW_RANGE_INVALID');
    }
    if (request.posture !== TranscriptRetrievalPosture.CONTINUITY && request.posture !== TranscriptRetrievalPosture.ARCHAEOLOGY) {
        throw createError(400, 'A declared continuity or archaeology posture is required.', 'TIR_WINDOW_POSTURE_INVALID');
    }
    return request;
}

function readSelectedOccurrence(paths, request) {
    if (!fs.existsSync(paths.transcriptIndexDbPath)) throw createError(409, 'Transcript FTS projection is unavailable for context reconstruction.', 'TIR_WINDOW_INDEX_UNAVAILABLE');
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        if (!adapter.verifyIntegrity()) throw createError(409, 'Transcript FTS projection failed integrity verification.', 'TIR_WINDOW_INDEX_INVALID');
        const selected = adapter.get(
            `SELECT document.character_instance_id, document.admission_scope AS document_admission_scope,
                    link.message_record_id, link.source_logical_id, link.source_revision_hash, link.source_local_order,
                    link.visibility_state AS link_visibility_state
             FROM transcript_fts_documents AS document
             JOIN transcript_fts_occurrence_links AS link ON link.document_id = document.document_id
             WHERE document.document_id = ? AND document.character_instance_id = ? AND link.message_record_id = ?`,
            [request.documentId, request.characterInstanceId, request.anchorMessageRecordId],
        );
        if (!selected) throw createError(409, 'Selected document and anchor occurrence are not linked by durable projection custody.', 'TIR_WINDOW_ANCHOR_UNKNOWN');
        if (request.posture === TranscriptRetrievalPosture.CONTINUITY && selected.document_admission_scope !== 'ORDINARY') {
            throw createError(409, 'Continuity cannot reconstruct an archaeology-only document.', 'TIR_WINDOW_POSTURE_MISMATCH');
        }
        return selected;
    } catch (error) {
        if (error?.code) throw error;
        throw createError(409, 'Transcript FTS projection is structurally unavailable.', 'TIR_WINDOW_INDEX_INVALID');
    } finally {
        adapter.close();
    }
}

function currentRevisionForSource(paths, sourceLogicalId) {
    const revisions = readTranscriptSourceRevisionLedger(paths).filter((entry) => entry.receipt.sourceLogicalId === sourceLogicalId);
    return revisions.length === 0 ? null : revisions[revisions.length - 1].receipt.sourceRevisionHash;
}

function visibilityForRevision(paths, sourceRevisionHash) {
    const entry = readTranscriptVisibilityLedger(paths).find((candidate) => candidate.sourceRevisionHash === sourceRevisionHash);
    if (!entry) throw createError(409, 'Current message custody has no durable visibility projection.', 'TIR_WINDOW_VISIBILITY_UNAVAILABLE');
    return new Map(entry.projection.rows.map((row) => [row.messageRecordId, row.visibilityState]));
}

function includeContent(posture, visibilityState) {
    if (visibilityState === TranscriptVisibilityState.VISIBLE) return true;
    return posture === TranscriptRetrievalPosture.ARCHAEOLOGY && (visibilityState === TranscriptVisibilityState.HIDDEN || visibilityState === TranscriptVisibilityState.ARCHIVED);
}

export function reconstructTranscriptContextWindow(paths, request) {
    const normalized = assertRequest(request);
    const selected = readSelectedOccurrence(paths, normalized);
    const currentRevision = currentRevisionForSource(paths, selected.source_logical_id);
    if (currentRevision !== selected.source_revision_hash) {
        throw createError(409, 'Selected occurrence is not from the current durable source revision.', 'TIR_WINDOW_SOURCE_NOT_CURRENT');
    }
    const batch = readTranscriptMessageLedger(paths).map((entry) => entry.batch).find((candidate) => candidate.sourceLogicalId === selected.source_logical_id && candidate.sourceRevisionHash === selected.source_revision_hash);
    if (!batch) throw createError(409, 'Selected occurrence has no durable complete-message batch.', 'TIR_WINDOW_MESSAGE_UNAVAILABLE');
    const visibility = visibilityForRevision(paths, selected.source_revision_hash);
    const rows = [...batch.rows].sort((left, right) => left.sourceLocalOrder - right.sourceLocalOrder);
    const anchorIndex = rows.findIndex((row) => row.messageRecordId === selected.message_record_id);
    if (anchorIndex < 0) throw createError(409, 'Selected occurrence is absent from its durable message batch.', 'TIR_WINDOW_ANCHOR_UNKNOWN');
    const anchorVisibility = visibility.get(selected.message_record_id);
    if (!anchorVisibility || !includeContent(normalized.posture, anchorVisibility)) {
        throw createError(409, 'Selected anchor is not eligible for the declared reconstruction posture.', 'TIR_WINDOW_ANCHOR_INELIGIBLE');
    }
    const start = Math.max(0, anchorIndex - normalized.before);
    const end = Math.min(rows.length, anchorIndex + normalized.after + 1);
    const windowRows = rows.slice(start, end).map((row) => {
        const visibilityState = visibility.get(row.messageRecordId);
        if (!visibilityState) throw createError(409, 'Window row has no durable visibility state.', 'TIR_WINDOW_VISIBILITY_UNAVAILABLE');
        const contentIncluded = includeContent(normalized.posture, visibilityState);
        return Object.freeze({
            messageRecordId: row.messageRecordId,
            sourceLogicalId: row.sourceLogicalId,
            sourceRevisionHash: row.sourceRevisionHash,
            sourceLocalOrder: row.sourceLocalOrder,
            senderName: row.senderName,
            senderIsUser: row.senderIsUser,
            timestampValue: row.timestampValue,
            timestampTier: row.timestampTier,
            visibilityState,
            contentIncluded,
            ...(contentIncluded ? { completeContent: row.completeContent } : {}),
        });
    });
    return Object.freeze({
        state: 'WINDOW', posture: normalized.posture, documentId: normalized.documentId,
        anchorMessageRecordId: normalized.anchorMessageRecordId, sourceLogicalId: selected.source_logical_id,
        sourceRevisionHash: selected.source_revision_hash, rows: Object.freeze(windowRows),
        omittedCount: windowRows.filter((row) => !row.contentIncluded).length,
    });
}
