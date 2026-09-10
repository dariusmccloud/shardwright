import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths, stableStringify } from './core.js';
import { rebuildDurableTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { selectTranscriptFtsCandidates } from './transcript-fts-candidate-selection.js';
import { registerTranscriptContextWindowRoute } from './transcript-context-window-route.js';

const ledgerHash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
const contentHash = (value) => `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;

function makeRouter() {
    const routes = new Map();
    return { routes, post(routePath, handler) { routes.set(routePath, handler); } };
}

async function invoke(handler, request) {
    let statusCode = 200;
    let payload = null;
    const response = {
        status(code) { statusCode = code; return this; },
        send(value) { payload = value; return value; },
    };
    await handler(request, response);
    return { statusCode, payload };
}

function prepareRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-window-route-'));
    const paths = getStoragePaths(root);
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const sourceRevisionHash = 'sha256:current';
    const values = ['Visible before', 'Hidden secret context', 'Anchor topic CSP', 'Deleted unavailable context', 'Visible after'];
    const rows = values.map((completeContent, sourceLocalOrder) => ({
        messageRecordId: `row-${sourceLocalOrder}`, characterInstanceId: 'character:jeep', sourceLogicalId: 'source', sourceRevisionHash, sourceLocalOrder,
        nativeMessageId: null, shardwrightMessageId: null, senderName: 'Jeep', senderIsUser: false, timestampValue: null, timestampTier: 'UNAVAILABLE', completeContent, contentHash: contentHash(completeContent),
    }));
    const receipt = { observationState: 'OBSERVED', sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, byteLength: 1 };
    const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash, rows };
    const projection = { rows: [
        { messageRecordId: 'row-0', visibilityState: 'VISIBLE' }, { messageRecordId: 'row-1', visibilityState: 'HIDDEN' },
        { messageRecordId: 'row-2', visibilityState: 'VISIBLE' }, { messageRecordId: 'row-3', visibilityState: 'DELETED_OR_UNAVAILABLE' },
        { messageRecordId: 'row-4', visibilityState: 'VISIBLE' },
    ], tombstones: [] };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'revision', operation: 'OBSERVED_REVISION', receiptHash: ledgerHash(receipt), receipt })}\n`);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, `${JSON.stringify({ ledgerVersion: 1, sequence: 1, entryId: 'message', batchHash: ledgerHash(batch), batch })}\n`);
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${JSON.stringify({ sequence: 1, entryId: 'visibility', sourceRevisionHash, projectionHash: ledgerHash(projection), projection })}\n`);
    rebuildDurableTranscriptFtsDocuments(paths, 'character:jeep');
    const candidate = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', queryText: 'Anchor CSP', candidateLimit: 4 }).candidates[0];
    return { root, candidate };
}

test('authenticated window route returns one explicitly anchored continuity window with omissions', async () => {
    const router = makeRouter();
    registerTranscriptContextWindowRoute(router);
    const { root, candidate } = prepareRoot();
    const result = await invoke(router.routes.get('/transcript-recall/windows'), {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', documentId: candidate.documentId, anchorMessageRecordId: 'row-2', before: 2, after: 2 },
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.state, 'WINDOW');
    assert.equal(result.payload.rows[2].completeContent, 'Anchor topic CSP');
    assert.equal(Object.hasOwn(result.payload.rows[1], 'completeContent'), false);
    assert.equal(Object.hasOwn(result.payload.rows[3], 'completeContent'), false);
    assert.equal(result.payload.omittedCount, 2);
});

test('route refuses an implicit or unknown anchor without selecting a replacement', async () => {
    const router = makeRouter();
    registerTranscriptContextWindowRoute(router);
    const { root, candidate } = prepareRoot();
    const handler = router.routes.get('/transcript-recall/windows');
    const absent = await invoke(handler, {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', documentId: candidate.documentId, before: 0, after: 0 },
    });
    assert.equal(absent.statusCode, 400);
    assert.equal(absent.payload.code, 'TIR_WINDOW_REQUEST_INVALID');
    const unknown = await invoke(handler, {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', documentId: candidate.documentId, anchorMessageRecordId: 'row-unknown', before: 0, after: 0 },
    });
    assert.equal(unknown.statusCode, 409);
    assert.equal(unknown.payload.code, 'TIR_WINDOW_ANCHOR_UNKNOWN');
});
