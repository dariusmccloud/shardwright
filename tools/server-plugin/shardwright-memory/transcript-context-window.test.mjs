import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths, stableStringify } from './core.js';
import { rebuildDurableTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { selectTranscriptFtsCandidates, TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';
import { reconstructTranscriptContextWindow } from './transcript-context-window.js';

const ledgerHash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const contentHash = (value) => `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
function sourceRevisionEntry(sourceRevisionHash) {
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, byteLength: 1 };
    return { ledgerVersion: 1, sequence: 1, entryId: 'revision', operation: 'OBSERVED_REVISION', receiptHash: ledgerHash(receipt), receipt };
}
function readyPaths() {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-window-')));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const sourceRevisionHash = 'sha256:current';
    const values = ['Visible before', 'Hidden secret context', 'Anchor topic CSP', 'Deleted unavailable context', 'Visible after'];
    const rows = values.map((completeContent, sourceLocalOrder) => ({
        messageRecordId: `row-${sourceLocalOrder}`, characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash, sourceLocalOrder,
        nativeMessageId: null, shardwrightMessageId: null, senderName: 'Jeep', senderIsUser: false, timestampValue: null, timestampTier: 'UNAVAILABLE', completeContent, contentHash: contentHash(completeContent),
    }));
    const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, rows };
    const projection = { rows: [
        { messageRecordId: 'row-0', visibilityState: 'VISIBLE' },
        { messageRecordId: 'row-1', visibilityState: 'HIDDEN' },
        { messageRecordId: 'row-2', visibilityState: 'VISIBLE' },
        { messageRecordId: 'row-3', visibilityState: 'DELETED_OR_UNAVAILABLE' },
        { messageRecordId: 'row-4', visibilityState: 'VISIBLE' },
    ], tombstones: [] };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify(sourceRevisionEntry(sourceRevisionHash))}\n`);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message', batchHash: ledgerHash(batch), batch })}\n`);
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${JSON.stringify({ sequence: 1, entryId: 'visibility', sourceRevisionHash, projectionHash: ledgerHash(projection), projection })}\n`);
    rebuildDurableTranscriptFtsDocuments(paths, 'character:jeep');
    return paths;
}
function candidate(paths, posture, queryText) {
    return selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture, queryText, candidateLimit: 4 }).candidates[0];
}

test('continuity reconstructs a source-local window while preserving hidden and deleted omissions', () => {
    const paths = readyPaths();
    const selected = candidate(paths, TranscriptRetrievalPosture.CONTINUITY, 'Anchor CSP');
    const window = reconstructTranscriptContextWindow(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, documentId: selected.documentId, anchorMessageRecordId: 'row-2', before: 2, after: 2 });
    assert.equal(window.state, 'WINDOW');
    assert.equal(window.rows.length, 5);
    assert.equal(window.rows[1].contentIncluded, false);
    assert.equal(Object.hasOwn(window.rows[1], 'completeContent'), false);
    assert.equal(window.rows[3].contentIncluded, false);
    assert.equal(window.rows[2].completeContent, 'Anchor topic CSP');
    assert.equal(window.omittedCount, 2);
});

test('explicit archaeology may reconstruct hidden retained content but not deleted content', () => {
    const paths = readyPaths();
    const selected = candidate(paths, TranscriptRetrievalPosture.ARCHAEOLOGY, 'Hidden secret');
    const window = reconstructTranscriptContextWindow(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.ARCHAEOLOGY, documentId: selected.documentId, anchorMessageRecordId: 'row-1', before: 0, after: 2 });
    assert.equal(window.rows[0].completeContent, 'Hidden secret context');
    assert.equal(window.rows[2].visibilityState, 'DELETED_OR_UNAVAILABLE');
    assert.equal(window.rows[2].contentIncluded, false);
});

test('refuses a selected FTS occurrence when a newer source revision exists', () => {
    const paths = readyPaths();
    const selected = candidate(paths, TranscriptRetrievalPosture.CONTINUITY, 'Anchor CSP');
    const newer = sourceRevisionEntry('sha256:newer');
    newer.sequence = 2;
    newer.entryId = 'revision-2';
    newer.receiptHash = ledgerHash(newer.receipt);
    fs.appendFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify(newer)}\n`);
    assert.throws(() => reconstructTranscriptContextWindow(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, documentId: selected.documentId, anchorMessageRecordId: 'row-2', before: 0, after: 0 }), (error) => error?.code === 'TIR_WINDOW_SOURCE_NOT_CURRENT');
});
