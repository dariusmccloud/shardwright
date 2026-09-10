import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getStoragePaths, stableStringify } from './core.js';
import { rebuildDurableTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { registerTranscriptCandidateWindowAssemblyRoute } from './transcript-candidate-window-assembly-route.js';

const hash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const textHash = (value) => `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
function router() { const routes = new Map(); return { routes, post(route, handler) { routes.set(route, handler); } }; }
async function invoke(handler, request) { let statusCode = 200; let payload = null; const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } }; await handler(request, response); return { statusCode, payload }; }
function prepare() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-assembly-route-')); const paths = getStoragePaths(root); fs.mkdirSync(paths.storageRoot, { recursive: true }); const sourceRevisionHash = 'sha256:current';
    const rows = ['First anchor context', 'Second anchor context'].map((completeContent, sourceLocalOrder) => ({ messageRecordId: `row-${sourceLocalOrder}`, characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash, sourceLocalOrder, nativeMessageId: null, shardwrightMessageId: null, senderName: 'Jeep', senderIsUser: false, timestampValue: null, timestampTier: 'UNAVAILABLE', completeContent, contentHash: textHash(completeContent) }));
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, byteLength: 1 }; const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, rows }; const projection = { rows: rows.map((row) => ({ messageRecordId: row.messageRecordId, visibilityState: 'VISIBLE' })), tombstones: [] };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'revision', operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt })}\n`); fs.writeFileSync(paths.transcriptMessageLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message', batchHash: hash(batch), batch })}\n`); fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${JSON.stringify({ sequence: 1, entryId: 'visibility', sourceRevisionHash, projectionHash: hash(projection), projection })}\n`); rebuildDurableTranscriptFtsDocuments(paths, 'character:jeep');
    const candidates = rows.map((row) => ({ documentId: `transcript_fts:character:jeep:${row.contentHash}:ORDINARY`, contentHash: row.contentHash, admissionScope: 'ORDINARY', occurrenceLinks: [{ messageRecordId: row.messageRecordId, sourceLogicalId: 'source', sourceRevisionHash, sourceLocalOrder: row.sourceLocalOrder, visibilityState: 'VISIBLE', admissionScope: 'ORDINARY' }] }));
    return { root, selection: { state: 'CANDIDATES', characterInstanceId: 'character:jeep', posture: 'CONTINUITY', candidateLimit: 2, availableCandidateCount: 2, truncated: false, candidates } };
}
test('authenticated route returns separately anchored windows', async () => { const r = router(); registerTranscriptCandidateWindowAssemblyRoute(r); const { root, selection } = prepare(); const result = await invoke(r.routes.get('/transcript-recall/window-assembly'), { user: { directories: { root } }, body: { selection, anchors: selection.candidates.map((candidate, index) => ({ documentId: candidate.documentId, anchorMessageRecordId: `row-${index}` })), before: 0, after: 0 } }); assert.equal(result.statusCode, 200); assert.equal(result.payload.ok, true); assert.equal(result.payload.state, 'WINDOWS'); assert.deepEqual(result.payload.windows.map((entry) => entry.window.rows[0].messageRecordId), ['row-0', 'row-1']); });
test('route refuses missing explicit anchors without choosing replacements', async () => { const r = router(); registerTranscriptCandidateWindowAssemblyRoute(r); const { root, selection } = prepare(); const result = await invoke(r.routes.get('/transcript-recall/window-assembly'), { user: { directories: { root } }, body: { selection, anchors: [{ documentId: selection.candidates[0].documentId, anchorMessageRecordId: 'row-0' }], before: 0, after: 0 } }); assert.equal(result.statusCode, 409); assert.equal(result.payload.code, 'TIR_ASSEMBLY_ANCHOR_REQUIRED'); });
