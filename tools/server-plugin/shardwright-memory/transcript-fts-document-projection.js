// Rebuildable FTS-document projection. Durable message and visibility ledgers remain
// authoritative; this character-scoped SQLite database is a disposable lexical view.
// It performs no FTS query, reranking, family disposition, prompt assembly, or UI work.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createAdapter, createError, ensureStorageRoot, stableStringify } from './core.js';
import { projectDurableTranscriptExactContentEquivalence, TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';

const hash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const INDEXABLE_SCOPES = new Set([TranscriptFtsAdmissionScope.ORDINARY, TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY]);

function assertCharacterInstanceId(characterInstanceId) {
    if (typeof characterInstanceId !== 'string' || characterInstanceId.trim() === '') {
        throw createError(400, 'A character instance identity is required for transcript FTS projection.', 'TIR_FTS_CHARACTER_REQUIRED');
    }
    return characterInstanceId;
}

export function buildTranscriptFtsDocuments(equivalence, characterInstanceId) {
    const characterId = assertCharacterInstanceId(characterInstanceId);
    if (!Array.isArray(equivalence?.families)) {
        throw createError(400, 'An exact-content equivalence projection is required.', 'TIR_FTS_EQUIVALENCE_REQUIRED');
    }
    const documents = [];
    const links = [];
    for (const family of equivalence.families) {
        if (!family?.contentHash || typeof family.completeContent !== 'string' || !Array.isArray(family.occurrences)) {
            throw createError(409, 'Exact-content family is incomplete.', 'TIR_FTS_EQUIVALENCE_INVALID');
        }
        const occurrences = family.occurrences.filter((occurrence) => occurrence.characterInstanceId === characterId);
        const scopes = [...new Set(occurrences.map((occurrence) => occurrence.admissionScope).filter((scope) => INDEXABLE_SCOPES.has(scope)))];
        for (const admissionScope of scopes) {
            const documentId = `transcript_fts:${characterId}:${family.contentHash}:${admissionScope}`;
            documents.push(Object.freeze({ documentId, characterInstanceId: characterId, contentHash: family.contentHash, admissionScope, completeContent: family.completeContent }));
            for (const occurrence of occurrences) {
                links.push(Object.freeze({
                    documentId,
                    messageRecordId: occurrence.messageRecordId,
                    sourceLogicalId: occurrence.sourceLogicalId,
                    sourceRevisionHash: occurrence.sourceRevisionHash,
                    sourceLocalOrder: occurrence.sourceLocalOrder,
                    visibilityState: occurrence.visibilityState,
                    admissionScope: occurrence.admissionScope,
                }));
            }
        }
    }
    return Object.freeze({
        characterInstanceId: characterId,
        documents: Object.freeze(documents),
        occurrenceLinks: Object.freeze(links),
        projectionHash: hash({ characterInstanceId: characterId, documents, occurrenceLinks: links }),
    });
}

export function initializeTranscriptFtsDocumentProjection(adapter) {
    adapter.exec(`
        CREATE TABLE IF NOT EXISTS transcript_fts_documents (
            document_id TEXT PRIMARY KEY,
            character_instance_id TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            admission_scope TEXT NOT NULL,
            complete_content TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS transcript_fts_search USING fts5(
            document_id UNINDEXED,
            character_instance_id UNINDEXED,
            admission_scope UNINDEXED,
            complete_content
        );
        CREATE TABLE IF NOT EXISTS transcript_fts_occurrence_links (
            document_id TEXT NOT NULL,
            message_record_id TEXT NOT NULL,
            source_logical_id TEXT NOT NULL,
            source_revision_hash TEXT NOT NULL,
            source_local_order INTEGER NOT NULL,
            visibility_state TEXT NOT NULL,
            admission_scope TEXT NOT NULL,
            PRIMARY KEY (document_id, message_record_id)
        );
        CREATE TABLE IF NOT EXISTS transcript_fts_projection_state (
            character_instance_id TEXT PRIMARY KEY,
            projection_hash TEXT NOT NULL
        );
    `);
}

function lock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try {
        fs.mkdirSync(paths.transcriptIndexLockPath);
    } catch (error) {
        if (error?.code === 'EEXIST') throw createError(409, 'Transcript FTS projection is already rebuilding.', 'TIR_FTS_LOCK_HELD');
        throw error;
    }
}

function unlock(paths) {
    fs.rmSync(paths.transcriptIndexLockPath, { recursive: true, force: true });
}

export function materializeTranscriptFtsDocuments(paths, projection) {
    if (!projection?.characterInstanceId || !projection?.projectionHash || !Array.isArray(projection.documents) || !Array.isArray(projection.occurrenceLinks)) {
        throw createError(400, 'A complete transcript FTS document projection is required.', 'TIR_FTS_PROJECTION_INVALID');
    }
    lock(paths);
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        initializeTranscriptFtsDocumentProjection(adapter);
        const existing = adapter.get('SELECT projection_hash FROM transcript_fts_projection_state WHERE character_instance_id = ?', [projection.characterInstanceId]);
        if (existing?.projection_hash === projection.projectionHash && adapter.verifyIntegrity()) {
            return Object.freeze({ rebuilt: false, documentCount: projection.documents.length, occurrenceLinkCount: projection.occurrenceLinks.length, projectionHash: projection.projectionHash });
        }
        adapter.transaction(() => {
            adapter.run('DELETE FROM transcript_fts_search WHERE character_instance_id = ?', [projection.characterInstanceId]);
            adapter.run('DELETE FROM transcript_fts_occurrence_links WHERE document_id IN (SELECT document_id FROM transcript_fts_documents WHERE character_instance_id = ?)', [projection.characterInstanceId]);
            adapter.run('DELETE FROM transcript_fts_documents WHERE character_instance_id = ?', [projection.characterInstanceId]);
            for (const document of projection.documents) {
                adapter.run('INSERT INTO transcript_fts_documents (document_id, character_instance_id, content_hash, admission_scope, complete_content) VALUES (?, ?, ?, ?, ?)', [document.documentId, document.characterInstanceId, document.contentHash, document.admissionScope, document.completeContent]);
                adapter.run('INSERT INTO transcript_fts_search (document_id, character_instance_id, admission_scope, complete_content) VALUES (?, ?, ?, ?)', [document.documentId, document.characterInstanceId, document.admissionScope, document.completeContent]);
            }
            for (const link of projection.occurrenceLinks) {
                adapter.run('INSERT INTO transcript_fts_occurrence_links (document_id, message_record_id, source_logical_id, source_revision_hash, source_local_order, visibility_state, admission_scope) VALUES (?, ?, ?, ?, ?, ?, ?)', [link.documentId, link.messageRecordId, link.sourceLogicalId, link.sourceRevisionHash, link.sourceLocalOrder, link.visibilityState, link.admissionScope]);
            }
            adapter.run('DELETE FROM transcript_fts_projection_state WHERE character_instance_id = ?', [projection.characterInstanceId]);
            adapter.run('INSERT INTO transcript_fts_projection_state (character_instance_id, projection_hash) VALUES (?, ?)', [projection.characterInstanceId, projection.projectionHash]);
        });
        return Object.freeze({ rebuilt: true, documentCount: projection.documents.length, occurrenceLinkCount: projection.occurrenceLinks.length, projectionHash: projection.projectionHash });
    } finally {
        try { adapter.close(); } finally { unlock(paths); }
    }
}

export function rebuildDurableTranscriptFtsDocuments(paths, characterInstanceId) {
    return materializeTranscriptFtsDocuments(paths, buildTranscriptFtsDocuments(projectDurableTranscriptExactContentEquivalence(paths), characterInstanceId));
}
