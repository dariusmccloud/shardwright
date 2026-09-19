// Incremental transcript projection coordinator.
// Durable transcript ledgers remain authoritative; SQLite is a rebuildable read model.
// The coordinator advances independent ledger cursors and diffs the affected projection
// rows inside one SQLite transaction. It does not perform retrieval or injection.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { createAdapter, createError, ensureStorageRoot, stableStringify } from './core.js';
import { buildTranscriptFtsDocuments, initializeTranscriptFtsDocumentProjection } from './transcript-fts-document-projection.js';
import { projectDurableTranscriptExactContentEquivalence } from './transcript-exact-content-equivalence.js';

export const TRANSCRIPT_PROJECTOR_VERSION = 'transcript-projector-v1';
export const TRANSCRIPT_PROJECTION_SCHEMA_VERSION = 1;
const LEDGERS = Object.freeze([
    ['sourceRegistry', 'transcript-source-registry-ledger.jsonl', 'transcriptSourceRegistryLedgerPath'],
    ['sourceRevision', 'transcript-source-revision-ledger.jsonl', 'transcriptSourceRevisionLedgerPath'],
    ['message', 'transcript-message-ledger.jsonl', 'transcriptMessageLedgerPath'],
    ['visibility', 'transcript-visibility-ledger.jsonl', 'transcriptVisibilityLedgerPath'],
]);

const hashBytes = (value) => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
const hashJson = (value) => hashBytes(stableStringify(value));

function readLedger(paths, [, filename, pathKey]) {
    const ledgerPath = paths[pathKey] || path.join(paths.storageRoot, filename);
    if (!fs.existsSync(ledgerPath)) return { ledgerPath, entries: [], lines: [] };
    const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter((line) => line.trim() !== '');
    const entries = lines.map((line, index) => {
        let entry;
        try { entry = JSON.parse(line); } catch { throw createError(409, `${filename} contains malformed JSON.`, 'TIR_PROJECTION_LEDGER_MALFORMED'); }
        if (!Number.isInteger(entry.sequence) || entry.sequence !== index + 1) {
            throw createError(409, `${filename} contains a sequence gap or regression.`, 'TIR_PROJECTION_SEQUENCE_GAP');
        }
        return entry;
    });
    return { ledgerPath, entries, lines };
}

function cursorRows(adapter) {
    return adapter.all('SELECT ledger_name, ledger_filename, ledger_schema_version, applied_sequence, applied_entry_hash FROM transcript_projection_cursors ORDER BY ledger_name');
}

function assertCursorPrefix(ledger, cursor) {
    const applied = Number(cursor?.applied_sequence || 0);
    if (applied < 0 || applied > ledger.lines.length) {
        throw createError(409, `${ledger.ledgerPath} cursor is outside the available prefix.`, 'TIR_PROJECTION_CURSOR_INVALID');
    }
    if (applied > 0 && hashBytes(ledger.lines[applied - 1]) !== cursor.applied_entry_hash) {
        throw createError(409, `${ledger.ledgerPath} changed at or before its cursor.`, 'TIR_PROJECTION_PREFIX_CHANGED');
    }
    return applied;
}

function projectionGeneration(cursors, projectionHash) {
    return hashJson({
        projectorVersion: TRANSCRIPT_PROJECTOR_VERSION,
        projectionSchemaVersion: TRANSCRIPT_PROJECTION_SCHEMA_VERSION,
        appliedHighWaterMarks: cursors.map((cursor) => ({
            ledgerName: cursor.ledgerName,
            ledgerFilename: cursor.ledgerFilename,
            ledgerSchemaVersion: cursor.ledgerSchemaVersion,
            appliedSequence: cursor.appliedSequence,
            appliedEntryHash: cursor.appliedEntryHash,
        })),
        projectionContentHash: projectionHash,
    });
}

export function ensureTables(adapter) {
    initializeTranscriptFtsDocumentProjection(adapter);
    adapter.exec(`
        CREATE TABLE IF NOT EXISTS transcript_projection_cursors (
            ledger_name TEXT PRIMARY KEY,
            ledger_filename TEXT NOT NULL,
            ledger_schema_version INTEGER NOT NULL,
            applied_sequence INTEGER NOT NULL,
            applied_entry_hash TEXT,
            UNIQUE (ledger_filename)
        );
        CREATE TABLE IF NOT EXISTS transcript_projection_generations (
            character_instance_id TEXT PRIMARY KEY,
            projector_version TEXT NOT NULL,
            projection_schema_version INTEGER NOT NULL,
            projection_hash TEXT NOT NULL,
            generation TEXT NOT NULL,
            status TEXT NOT NULL
        );
    `);
}

function currentDocuments(adapter, characterInstanceId) {
    const documents = adapter.all('SELECT document_id, character_instance_id, content_hash, admission_scope, complete_content FROM transcript_fts_documents WHERE character_instance_id = ?', [characterInstanceId]);
    const links = adapter.all(`SELECT document_id, message_record_id, source_logical_id, source_revision_hash, source_local_order, visibility_state, admission_scope
        FROM transcript_fts_occurrence_links WHERE document_id IN (SELECT document_id FROM transcript_fts_documents WHERE character_instance_id = ?)
        ORDER BY document_id, message_record_id`, [characterInstanceId]);
    return { documents, links };
}

function materializeDiff(adapter, characterInstanceId, projection) {
    const existing = currentDocuments(adapter, characterInstanceId);
    const existingDocs = new Map(existing.documents.map((row) => [row.document_id, row]));
    const nextDocs = new Map(projection.documents.map((row) => [row.documentId, row]));
    const existingLinks = new Map(existing.links.map((row) => [`${row.document_id}\u0000${row.message_record_id}`, row]));
    const nextLinks = new Map(projection.occurrenceLinks.map((row) => [`${row.documentId}\u0000${row.messageRecordId}`, row]));
    let changedDocuments = 0;
    let changedLinks = 0;

    for (const [id, row] of existingDocs) {
        const next = nextDocs.get(id);
        if (!next || row.content_hash !== next.contentHash || row.admission_scope !== next.admissionScope || row.complete_content !== next.completeContent) {
            adapter.run('DELETE FROM transcript_fts_search WHERE document_id = ?', [id]);
            adapter.run('DELETE FROM transcript_fts_occurrence_links WHERE document_id = ?', [id]);
            adapter.run('DELETE FROM transcript_fts_documents WHERE document_id = ?', [id]);
            changedDocuments += 1;
        }
    }
    for (const [id, row] of nextDocs) {
        const prior = existingDocs.get(id);
        if (!prior || prior.content_hash !== row.contentHash || prior.admission_scope !== row.admissionScope || prior.complete_content !== row.completeContent) {
            adapter.run('INSERT INTO transcript_fts_documents (document_id, character_instance_id, content_hash, admission_scope, complete_content) VALUES (?, ?, ?, ?, ?)', [row.documentId, row.characterInstanceId, row.contentHash, row.admissionScope, row.completeContent]);
            adapter.run('INSERT INTO transcript_fts_search (document_id, character_instance_id, admission_scope, complete_content) VALUES (?, ?, ?, ?)', [row.documentId, row.characterInstanceId, row.admissionScope, row.completeContent]);
            changedDocuments += 1;
        }
    }
    for (const [key, row] of existingLinks) {
        if (!nextLinks.has(key)) {
            adapter.run('DELETE FROM transcript_fts_occurrence_links WHERE document_id = ? AND message_record_id = ?', [row.document_id, row.message_record_id]);
            changedLinks += 1;
        }
    }
    for (const [key, row] of nextLinks) {
        const prior = existingLinks.get(key);
        if (!prior || stableStringify(prior) !== stableStringify({
            document_id: row.documentId, message_record_id: row.messageRecordId, source_logical_id: row.sourceLogicalId,
            source_revision_hash: row.sourceRevisionHash, source_local_order: row.sourceLocalOrder, visibility_state: row.visibilityState,
            admission_scope: row.admissionScope,
        })) {
            adapter.run('INSERT OR REPLACE INTO transcript_fts_occurrence_links (document_id, message_record_id, source_logical_id, source_revision_hash, source_local_order, visibility_state, admission_scope) VALUES (?, ?, ?, ?, ?, ?, ?)', [row.documentId, row.messageRecordId, row.sourceLogicalId, row.sourceRevisionHash, row.sourceLocalOrder, row.visibilityState, row.admissionScope]);
            changedLinks += 1;
        }
    }
    return { changedDocuments, changedLinks };
}

function cursorSnapshot(ledgers) {
    return ledgers.map((ledger, index) => {
        const entry = ledger.entries.at(-1);
        return {
            ledgerName: LEDGERS[index][0], ledgerFilename: LEDGERS[index][1],
            ledgerSchemaVersion: Number(entry?.ledgerVersion || 1), appliedSequence: ledger.entries.length,
            appliedEntryHash: entry ? hashBytes(ledger.lines.at(-1)) : null,
        };
    });
}

export function projectTranscriptIncrementally(paths, characterInstanceId, options = {}) {
    if (typeof characterInstanceId !== 'string' || characterInstanceId.trim() === '') throw createError(400, 'A character instance identity is required.', 'TIR_PROJECTION_CHARACTER_REQUIRED');
    ensureStorageRoot(paths.storageRoot);
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        ensureTables(adapter);
        const ledgers = LEDGERS.map((spec) => readLedger(paths, spec));
        const previous = new Map(cursorRows(adapter).map((row) => [row.ledger_name, row]));
        const consumed = ledgers.map((ledger, index) => {
            const spec = LEDGERS[index];
            const prior = previous.get(spec[0]);
            return { ledger, spec, applied: assertCursorPrefix(ledger, prior), prior };
        });
        const hasProjection = Boolean(adapter.get('SELECT character_instance_id FROM transcript_projection_generations WHERE character_instance_id = ?', [characterInstanceId]));
        const projection = buildTranscriptFtsDocuments(projectDurableTranscriptExactContentEquivalence(paths), characterInstanceId);
        const cursors = cursorSnapshot(ledgers);
        const generation = projectionGeneration(cursors, projection.projectionHash);
        const oldGeneration = adapter.get('SELECT generation, projection_hash, status FROM transcript_projection_generations WHERE character_instance_id = ?', [characterInstanceId]);
        if (hasProjection && oldGeneration?.generation === generation && oldGeneration.status === 'CURRENT' && adapter.verifyIntegrity()) {
            return Object.freeze({ state: 'CURRENT', changedDocuments: 0, changedLinks: 0, generation, projectionHash: projection.projectionHash, cursors });
        }
        if (options.failBeforeCommit) throw createError(500, 'Injected projector failure before commit.', 'TIR_PROJECTION_TEST_FAILURE');
        let diff;
        adapter.transaction(() => {
            diff = materializeDiff(adapter, characterInstanceId, projection);
            if (options.failInsideTransaction) throw createError(500, 'Injected projector failure inside transaction.', 'TIR_PROJECTION_TEST_FAILURE');
            for (const cursor of cursors) {
                adapter.run('INSERT OR REPLACE INTO transcript_projection_cursors (ledger_name, ledger_filename, ledger_schema_version, applied_sequence, applied_entry_hash) VALUES (?, ?, ?, ?, ?)', [cursor.ledgerName, cursor.ledgerFilename, cursor.ledgerSchemaVersion, cursor.appliedSequence, cursor.appliedEntryHash]);
            }
            adapter.run('INSERT OR REPLACE INTO transcript_projection_generations (character_instance_id, projector_version, projection_schema_version, projection_hash, generation, status) VALUES (?, ?, ?, ?, ?, ?)', [characterInstanceId, TRANSCRIPT_PROJECTOR_VERSION, TRANSCRIPT_PROJECTION_SCHEMA_VERSION, projection.projectionHash, generation, 'CURRENT']);
        });
        return Object.freeze({ state: 'CURRENT', changedDocuments: diff.changedDocuments, changedLinks: diff.changedLinks, generation, projectionHash: projection.projectionHash, cursors, consumedSuffixes: consumed.map(({ spec, ledger, applied }) => ({ ledgerName: spec[0], fromSequence: applied + 1, toSequence: ledger.entries.length })) });
    } finally {
        adapter.close();
    }
}

export function readTranscriptProjectionState(paths, characterInstanceId) {
    if (!fs.existsSync(paths.transcriptIndexDbPath)) return null;
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        ensureTables(adapter);
        return Object.freeze({
            generation: adapter.get('SELECT * FROM transcript_projection_generations WHERE character_instance_id = ?', [characterInstanceId]),
            cursors: Object.freeze(cursorRows(adapter)),
        });
    } finally { adapter.close(); }
}
