import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createAdapter, getStoragePaths, stableStringify } from './core.js';
import { buildTranscriptFtsDocuments, materializeTranscriptFtsDocuments, rebuildDurableTranscriptFtsDocuments } from './transcript-fts-document-projection.js';

const ledgerHash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
function sourceRevisionEntry(sourceLogicalId, characterInstanceId, sourceRevisionHash) {
    const receipt = { observationState: 'OBSERVED', sourceLogicalId, characterInstanceId, sourceRevisionHash, byteLength: 1 };
    return { ledgerVersion: 1, sequence: 1, entryId: 'revision', operation: 'OBSERVED_REVISION', receiptHash: ledgerHash(receipt), receipt };
}

function occurrence(messageRecordId, characterInstanceId, visibilityState, admissionScope, sourceLogicalId = 'source') {
    return { messageRecordId, characterInstanceId, sourceLogicalId, sourceRevisionHash: `sha256:${messageRecordId}`, sourceLocalOrder: 0, visibilityState, admissionScope };
}
function equivalence() {
    return {
        families: [
            { contentHash: 'sha256:shared', completeContent: 'exact shared source text', occurrences: [
                occurrence('visible', 'character:jeep', 'VISIBLE', 'ORDINARY', 'branch-a'),
                occurrence('archived', 'character:jeep', 'ARCHIVED', 'ARCHAEOLOGY_ONLY', 'branch-b'),
                occurrence('deleted', 'character:jeep', 'DELETED_OR_UNAVAILABLE', 'EXCLUDED', 'branch-c'),
                occurrence('other-character', 'character:other', 'VISIBLE', 'ORDINARY'),
            ] },
            { contentHash: 'sha256:deleted-only', completeContent: 'unrecoverable text', occurrences: [
                occurrence('deleted-only', 'character:jeep', 'DELETED_OR_UNAVAILABLE', 'EXCLUDED'),
            ] },
        ],
    };
}

test('builds character-scoped ordinary and archaeology documents while retaining sibling occurrence links', () => {
    const projection = buildTranscriptFtsDocuments(equivalence(), 'character:jeep');
    assert.equal(projection.documents.length, 2);
    assert.deepEqual(projection.documents.map((document) => document.admissionScope).sort(), ['ARCHAEOLOGY_ONLY', 'ORDINARY']);
    assert.equal(projection.occurrenceLinks.length, 6);
    assert.equal(projection.documents.some((document) => document.completeContent === 'unrecoverable text'), false);
    assert.equal(projection.occurrenceLinks.some((link) => link.messageRecordId === 'deleted'), true);
    assert.equal(projection.occurrenceLinks.some((link) => link.messageRecordId === 'other-character'), false);
});

test('materializes only declared documents into a disposable isolated SQLite projection and makes an identical rebuild a no-op', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-')));
    const projection = buildTranscriptFtsDocuments(equivalence(), 'character:jeep');
    const first = materializeTranscriptFtsDocuments(paths, projection);
    const second = materializeTranscriptFtsDocuments(paths, projection);
    assert.equal(first.rebuilt, true);
    assert.equal(second.rebuilt, false);
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_documents'), 2);
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_search'), 2);
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_occurrence_links'), 6);
        assert.equal(adapter.scalar("SELECT COUNT(*) FROM transcript_fts_documents WHERE complete_content = 'unrecoverable text'"), 0);
        assert.equal(adapter.scalar("SELECT COUNT(*) FROM transcript_fts_search WHERE complete_content = 'unrecoverable text'"), 0);
    } finally {
        adapter.close();
    }
});

test('rebuilds FTS documents from validated durable message and visibility ledgers', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-durable-')));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const completeContent = 'durable ordinary content';
    const durableRow = {
        messageRecordId: 'durable-row', characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash: 'sha256:revision', sourceLocalOrder: 0,
        nativeMessageId: null, shardwrightMessageId: null, completeContent,
        contentHash: `sha256:${crypto.createHash('sha256').update(completeContent, 'utf8').digest('hex')}`,
    };
    const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash: 'sha256:revision', rows: [durableRow] };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify(sourceRevisionEntry(batch.sourceLogicalId, batch.characterInstanceId, batch.sourceRevisionHash))}\n`);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message', batchHash: ledgerHash(batch), batch })}\n`);
    const projection = { rows: [{ messageRecordId: durableRow.messageRecordId, visibilityState: 'VISIBLE' }], tombstones: [] };
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${JSON.stringify({ sequence: 1, entryId: 'visibility', sourceRevisionHash: batch.sourceRevisionHash, projectionHash: ledgerHash(projection), projection })}\n`);
    const result = rebuildDurableTranscriptFtsDocuments(paths, 'character:jeep');
    assert.equal(result.rebuilt, true);
    assert.equal(result.documentCount, 1);
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_documents'), 1);
    } finally {
        adapter.close();
    }
});
