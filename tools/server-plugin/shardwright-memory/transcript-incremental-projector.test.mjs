import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createAdapter, getStoragePaths, stableStringify } from './core.js';
import { projectTranscriptIncrementally, readTranscriptProjectionState } from './transcript-incremental-projector.js';
import { selectTranscriptFtsCandidates, TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';

const hash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const textHash = (value) => `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;

function fixture() {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-incremental-')));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const row = {
        messageRecordId: 'message:1', characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash: 'sha256:revision', sourceLocalOrder: 0,
        nativeMessageId: 'native:1', shardwrightMessageId: 'sw:1', completeContent: 'original continuity evidence',
    };
    row.contentHash = textHash(row.completeContent);
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash: row.sourceRevisionHash, byteLength: 1 };
    const batch = { sourceLogicalId: 'source', characterInstanceId: row.characterInstanceId, sourceRevisionHash: row.sourceRevisionHash, rows: [row] };
    const visibility = { rows: [{ messageRecordId: row.messageRecordId, visibilityState: 'VISIBLE' }], tombstones: [] };
    fs.writeFileSync(paths.transcriptSourceRegistryLedgerPath, '');
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'revision:1', operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt }) + '\n');
    fs.writeFileSync(paths.transcriptMessageLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message:1', batchHash: hash(batch), batch }) + '\n');
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'visibility:1', sourceRevisionHash: row.sourceRevisionHash, projectionHash: hash(visibility), projection: visibility }) + '\n');
    return { paths, row };
}

test('initial projection records independent cursors and deterministic generation', () => {
    const { paths } = fixture();
    const result = projectTranscriptIncrementally(paths, 'character:jeep');
    assert.equal(result.state, 'CURRENT');
    assert.equal(result.changedDocuments, 1);
    assert.equal(result.cursors.length, 4);
    assert.match(result.generation, /^sha256:/);
    const state = readTranscriptProjectionState(paths, 'character:jeep');
    assert.equal(state.generation.status, 'CURRENT');
});

test('repeated suffix application is idempotent and changes no projection rows', () => {
    const { paths } = fixture();
    const first = projectTranscriptIncrementally(paths, 'character:jeep');
    const second = projectTranscriptIncrementally(paths, 'character:jeep');
    assert.equal(second.changedDocuments, 0);
    assert.equal(second.changedLinks, 0);
    assert.equal(second.generation, first.generation);
});

test('a changed prefix refuses without changing the verified projection', () => {
    const { paths } = fixture();
    const first = projectTranscriptIncrementally(paths, 'character:jeep');
    const before = readTranscriptProjectionState(paths, 'character:jeep');
    const lines = fs.readFileSync(paths.transcriptMessageLedgerPath, 'utf8').trim().split(/\r?\n/);
    const altered = JSON.parse(lines[0]);
    altered.batch.rows[0].completeContent = 'tampered';
    lines[0] = JSON.stringify(altered);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, lines.join('\n') + '\n');
    assert.throws(() => projectTranscriptIncrementally(paths, 'character:jeep'), { code: 'TIR_PROJECTION_PREFIX_CHANGED' });
    const after = readTranscriptProjectionState(paths, 'character:jeep');
    assert.equal(after.generation.generation, before.generation.generation);
    assert.equal(first.generation, before.generation.generation);
});

test('an interrupted transaction exposes neither partial rows nor an advanced cursor', () => {
    const { paths } = fixture();
    assert.throws(() => projectTranscriptIncrementally(paths, 'character:jeep', { failInsideTransaction: true }), { code: 'TIR_PROJECTION_TEST_FAILURE' });
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_documents'), 0);
        assert.equal(adapter.scalar('SELECT COUNT(*) FROM transcript_projection_cursors'), 0);
    } finally { adapter.close(); }
});

test('a new authoritative suffix changes only the affected current projection and retrieval stays SQLite-only', () => {
    const { paths, row } = fixture();
    projectTranscriptIncrementally(paths, 'character:jeep');
    const nextRow = { ...row, messageRecordId: 'message:2', sourceRevisionHash: 'sha256:revision-2', nativeMessageId: 'native:2', shardwrightMessageId: 'sw:2', completeContent: 'new suffix evidence' };
    nextRow.contentHash = textHash(nextRow.completeContent);
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash: nextRow.sourceRevisionHash, byteLength: 2 };
    const batch = { sourceLogicalId: 'source', characterInstanceId: nextRow.characterInstanceId, sourceRevisionHash: nextRow.sourceRevisionHash, rows: [nextRow] };
    const visibility = { rows: [{ messageRecordId: nextRow.messageRecordId, visibilityState: 'VISIBLE' }], tombstones: [] };
    fs.appendFileSync(paths.transcriptSourceRevisionLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 2, entryId: 'revision:2', operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt }) + '\n');
    fs.appendFileSync(paths.transcriptMessageLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 2, entryId: 'message:2', batchHash: hash(batch), batch }) + '\n');
    fs.appendFileSync(paths.transcriptVisibilityLedgerPath, JSON.stringify({ ledgerVersion: 1, sequence: 2, entryId: 'visibility:2', sourceRevisionHash: nextRow.sourceRevisionHash, projectionHash: hash(visibility), projection: visibility }) + '\n');
    const result = projectTranscriptIncrementally(paths, 'character:jeep');
    assert.equal(result.consumedSuffixes.find((entry) => entry.ledgerName === 'message').fromSequence, 2);
    assert.equal(result.changedDocuments, 2);
    assert.equal(result.changedLinks, 2);
    fs.appendFileSync(paths.transcriptMessageLedgerPath, '{not consulted by retrieval}\n');
    const selected = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, candidateLimit: 5, queryText: 'new suffix evidence' });
    assert.equal(selected.state, 'CANDIDATES');
});

test('deleting the projection and rebuilding reproduces the verified generation', () => {
    const { paths } = fixture();
    const first = projectTranscriptIncrementally(paths, 'character:jeep');
    fs.rmSync(paths.transcriptIndexDbPath, { force: true });
    const rebuilt = projectTranscriptIncrementally(paths, 'character:jeep');
    assert.equal(rebuilt.generation, first.generation);
    assert.equal(rebuilt.projectionHash, first.projectionHash);
});
