import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths, stableStringify } from './core.js';
import { assembleTranscriptCandidateWindows } from './transcript-candidate-window-assembly.js';
import { rebuildDurableTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { selectTranscriptFtsCandidates, TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';

const ledgerHash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const contentHash = (value) => `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
function sourceRevisionEntry(sourceRevisionHash) {
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, byteLength: 1 };
    return { ledgerVersion: 1, sequence: 1, entryId: 'revision', operation: 'OBSERVED_REVISION', receiptHash: ledgerHash(receipt), receipt };
}
function ready() {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-assembly-')));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const sourceRevisionHash = 'sha256:current';
    const rows = ['Nearby context', 'CSP origin one', 'Between candidates', 'CSP origin two'].map((completeContent, sourceLocalOrder) => ({
        messageRecordId: `row-${sourceLocalOrder}`, characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash, sourceLocalOrder,
        nativeMessageId: null, shardwrightMessageId: null, senderName: 'Jeep', senderIsUser: false, timestampValue: null, timestampTier: 'UNAVAILABLE', completeContent, contentHash: contentHash(completeContent),
    }));
    const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, rows };
    const projection = { rows: rows.map((row) => ({ messageRecordId: row.messageRecordId, visibilityState: 'VISIBLE' })), tombstones: [] };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify(sourceRevisionEntry(sourceRevisionHash))}\n`);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message', batchHash: ledgerHash(batch), batch })}\n`);
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${JSON.stringify({ sequence: 1, entryId: 'visibility', sourceRevisionHash, projectionHash: ledgerHash(projection), projection })}\n`);
    rebuildDurableTranscriptFtsDocuments(paths, 'character:jeep');
    const selection = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP origin', candidateLimit: 4 });
    return { paths, selection };
}

test('assembles explicitly anchored candidate windows without collapsing selected sources', () => {
    const { paths, selection } = ready();
    const result = assembleTranscriptCandidateWindows(paths, {
        selection,
        anchors: selection.candidates.map((candidate) => ({ documentId: candidate.documentId, anchorMessageRecordId: candidate.occurrenceLinks[0].messageRecordId })),
        before: 1,
        after: 1,
    });
    assert.equal(result.state, 'WINDOWS');
    assert.equal(result.windows.length, 2);
    assert.deepEqual(result.windows.map((window) => window.anchorMessageRecordId).sort(), ['row-1', 'row-3']);
    assert.equal(result.windows.every((window) => window.window.rows.length >= 2), true);
});

test('refuses to choose an occurrence anchor implicitly', () => {
    const { paths, selection } = ready();
    assert.throws(() => assembleTranscriptCandidateWindows(paths, { selection, anchors: [], before: 0, after: 0 }), (error) => error?.code === 'TIR_ASSEMBLY_ANCHOR_REQUIRED');
});

test('preserves no-query state without requiring any source or index work', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-assembly-no-query-')));
    const result = assembleTranscriptCandidateWindows(paths, { selection: { state: 'NO_QUERY', characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY }, anchors: [], before: 0, after: 0 });
    assert.equal(result.state, 'NO_QUERY');
    assert.equal(result.windows.length, 0);
});
