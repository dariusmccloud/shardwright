// Read-only lexical candidate selection. It accepts one generation query and one
// declared posture, then returns only FTS document identity and occurrence custody.
// It never returns source text, creates an index, reranks, assembles windows, injects,
// or changes family/visibility disposition.

import fs from 'node:fs';

import { createAdapter, createError } from './core.js';
import { TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';

export const TranscriptRetrievalPosture = Object.freeze({
    CONTINUITY: 'CONTINUITY',
    ARCHAEOLOGY: 'ARCHAEOLOGY',
});

export const TRANSCRIPT_CANDIDATE_LIMIT_DEFAULT = 50;
export const TRANSCRIPT_CANDIDATE_LIMIT_MAX = 256;

function scopesForPosture(posture) {
    if (posture === TranscriptRetrievalPosture.CONTINUITY) return [TranscriptFtsAdmissionScope.ORDINARY];
    if (posture === TranscriptRetrievalPosture.ARCHAEOLOGY) return [TranscriptFtsAdmissionScope.ORDINARY, TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY];
    throw createError(400, 'A declared continuity or archaeology posture is required.', 'TIR_FTS_POSTURE_INVALID');
}

export function normalizeTranscriptRecallQuery(queryText) {
    let normalized = String(queryText ?? '').normalize('NFKC');
    // Host-added display envelopes are metadata, not retrieval terms. Only
    // remove one or more balanced envelopes at the beginning; bracketed prose
    // elsewhere remains searchable. A backtick-led query explicitly protects
    // its leading envelope as literal canonical content.
    if (/^\s*`/u.test(normalized)) {
        return normalized.trim();
    }
    while (true) {
        const match = normalized.match(/^\s*\[([A-Za-z][\w:-]*)\][\s\S]*?\[\/\1\]\s*/iu);
        if (!match) break;
        normalized = normalized.slice(match[0].length);
    }
    return normalized.trim();
}

function buildFtsMatchQuery(queryText) {
    const terms = normalizeTranscriptRecallQuery(queryText).match(/[\p{L}\p{N}_]+/gu) || [];
    return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(' OR ');
}

function assertRequest(request) {
    if (!request || typeof request.characterInstanceId !== 'string' || request.characterInstanceId.trim() === '') {
        throw createError(400, 'A character instance identity is required for FTS selection.', 'TIR_FTS_CHARACTER_REQUIRED');
    }
    if (!Number.isInteger(request.candidateLimit) || request.candidateLimit < 1 || request.candidateLimit > TRANSCRIPT_CANDIDATE_LIMIT_MAX) {
        throw createError(400, `Candidate selection requires an integer limit from 1 to ${TRANSCRIPT_CANDIDATE_LIMIT_MAX}.`, 'TIR_FTS_LIMIT_INVALID');
    }
    const sourceLogicalIds = request.sourceLogicalIds == null ? null : request.sourceLogicalIds;
    const sourceScopes = request.sourceScopes == null ? null : request.sourceScopes;
    if (sourceLogicalIds !== null && (!Array.isArray(sourceLogicalIds) || sourceLogicalIds.length === 0 || sourceLogicalIds.some((id) => typeof id !== 'string' || id.trim() === ''))) {
        throw createError(400, 'Branch retrieval requires a non-empty explicit source scope.', 'TIR_FTS_SOURCE_SCOPE_INVALID');
    }
    if (sourceScopes !== null && (!Array.isArray(sourceScopes) || sourceScopes.length === 0 || sourceScopes.some((scope) => !scope || typeof scope.sourceLogicalId !== 'string' || !scope.sourceLogicalId.trim() || (scope.maxSourceLocalOrder != null && (!Number.isInteger(scope.maxSourceLocalOrder) || scope.maxSourceLocalOrder < 0))))) throw createError(400, 'Branch retrieval source ranges are malformed.', 'TIR_FTS_SOURCE_SCOPE_INVALID');
    if (sourceLogicalIds !== null && sourceScopes !== null) throw createError(400, 'Branch retrieval must provide source IDs or source ranges, not both.', 'TIR_FTS_SOURCE_SCOPE_INVALID');
    return Object.freeze({
        characterInstanceId: request.characterInstanceId,
        posture: request.posture,
        candidateLimit: request.candidateLimit,
        ftsQuery: buildFtsMatchQuery(request.queryText),
        sourceLogicalIds: sourceLogicalIds ? Object.freeze(sourceLogicalIds.map((id) => id.trim())) : null,
        sourceScopes: sourceScopes ? Object.freeze(sourceScopes.map((scope) => Object.freeze({ sourceLogicalId: scope.sourceLogicalId.trim(), maxSourceLocalOrder: scope.maxSourceLocalOrder ?? null }))) : null,
    });
}

function linksForDocuments(adapter, documentIds) {
    if (documentIds.length === 0) return new Map();
    const placeholders = documentIds.map(() => '?').join(', ');
    const links = adapter.all(
        `SELECT document_id, message_record_id, source_logical_id, source_revision_hash, source_local_order, visibility_state, admission_scope
         FROM transcript_fts_occurrence_links
         WHERE document_id IN (${placeholders})
         ORDER BY document_id, source_logical_id, source_revision_hash, source_local_order, message_record_id`,
        documentIds,
    );
    const byDocument = new Map(documentIds.map((documentId) => [documentId, []]));
    for (const link of links) {
        byDocument.get(link.document_id).push(Object.freeze({
            messageRecordId: link.message_record_id,
            sourceLogicalId: link.source_logical_id,
            sourceRevisionHash: link.source_revision_hash,
            sourceLocalOrder: Number(link.source_local_order),
            visibilityState: link.visibility_state,
            admissionScope: link.admission_scope,
        }));
    }
    return byDocument;
}

export function selectTranscriptFtsCandidates(paths, request) {
    const normalized = assertRequest(request);
    const rawQueryText = String(request.queryText ?? '').normalize('NFKC');
    const normalizedQueryText = normalizeTranscriptRecallQuery(request.queryText);
    const scopes = scopesForPosture(normalized.posture);
    if (normalized.ftsQuery === '') {
        return Object.freeze({ state: 'NO_QUERY', posture: normalized.posture, characterInstanceId: normalized.characterInstanceId, rawQueryText, normalizedQueryText, candidates: Object.freeze([]), availableCandidateCount: 0, candidateLimit: normalized.candidateLimit, truncated: false });
    }
    if (!fs.existsSync(paths.transcriptIndexDbPath)) {
        throw createError(409, 'Transcript FTS projection is unavailable for this character.', 'TIR_FTS_INDEX_UNAVAILABLE');
    }
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        if (!adapter.verifyIntegrity()) throw createError(409, 'Transcript FTS projection failed integrity verification.', 'TIR_FTS_INDEX_INVALID');
        const scopePlaceholders = scopes.map(() => '?').join(', ');
        const branchScope = normalized.sourceScopes
            ? `AND EXISTS (SELECT 1 FROM transcript_fts_occurrence_links branch_scope WHERE branch_scope.document_id = transcript_fts_search.document_id AND (${normalized.sourceScopes.map(() => '(branch_scope.source_logical_id = ? AND (? IS NULL OR branch_scope.source_local_order <= ?))').join(' OR ')}))`
            : normalized.sourceLogicalIds
                ? `AND EXISTS (SELECT 1 FROM transcript_fts_occurrence_links branch_scope WHERE branch_scope.document_id = transcript_fts_search.document_id AND branch_scope.source_logical_id IN (${normalized.sourceLogicalIds.map(() => '?').join(', ')}))`
                : '';
        const where = `
            transcript_fts_search.character_instance_id = ?
            AND transcript_fts_search.admission_scope IN (${scopePlaceholders})
            AND transcript_fts_search MATCH ? ${branchScope}`;
        const scopedParams = normalized.sourceScopes ? normalized.sourceScopes.flatMap((scope) => [scope.sourceLogicalId, scope.maxSourceLocalOrder, scope.maxSourceLocalOrder]) : (normalized.sourceLogicalIds || []);
        const queryParams = [normalized.characterInstanceId, ...scopes, normalized.ftsQuery, ...scopedParams];
        let availableCandidateCount;
        let documents;
        try {
            availableCandidateCount = Number(adapter.scalar(`SELECT COUNT(*) FROM transcript_fts_search WHERE ${where}`, queryParams));
            documents = adapter.all(
                `SELECT transcript_fts_search.document_id, transcript_fts_documents.content_hash, transcript_fts_search.admission_scope
                 FROM transcript_fts_search
                 JOIN transcript_fts_documents ON transcript_fts_documents.document_id = transcript_fts_search.document_id
                 WHERE ${where}
                 ORDER BY bm25(transcript_fts_search), transcript_fts_search.document_id
                 LIMIT ?`,
                [...queryParams, normalized.candidateLimit],
            );
        } catch (error) {
            if (error?.code) throw error;
            throw createError(409, 'Transcript FTS projection is structurally unavailable.', 'TIR_FTS_INDEX_INVALID');
        }
        const linksByDocument = linksForDocuments(adapter, documents.map((document) => document.document_id));
        return Object.freeze({
            state: documents.length === 0 ? 'NO_MATCH' : 'CANDIDATES',
            posture: normalized.posture,
            characterInstanceId: normalized.characterInstanceId,
            rawQueryText,
            normalizedQueryText,
            candidateLimit: normalized.candidateLimit,
            availableCandidateCount,
            truncated: availableCandidateCount > documents.length,
            candidates: Object.freeze(documents.map((document) => Object.freeze({
                documentId: document.document_id,
                contentHash: document.content_hash,
                admissionScope: document.admission_scope,
                occurrenceLinks: Object.freeze(linksByDocument.get(document.document_id)),
            }))),
        });
    } finally {
        adapter.close();
    }
}
