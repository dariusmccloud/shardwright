import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';
import { buildTranscriptFtsDocuments, materializeTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { registerTranscriptFtsCandidateRoute } from './transcript-fts-candidate-route.js';

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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-candidate-route-'));
    const paths = getStoragePaths(root);
    const occurrence = {
        messageRecordId: 'message:one', characterInstanceId: 'character:jeep',
        sourceLogicalId: 'source:one', sourceRevisionHash: 'sha256:source-one',
        sourceLocalOrder: 3, visibilityState: 'ACTIVE', admissionScope: TranscriptFtsAdmissionScope.ORDINARY,
    };
    const equivalence = { families: [{ contentHash: 'sha256:one', completeContent: 'CSP Angela origin record', occurrences: [occurrence] }] };
    materializeTranscriptFtsDocuments(paths, buildTranscriptFtsDocuments(equivalence, 'character:jeep'));
    return root;
}

test('authenticated candidate route returns only FTS document and occurrence custody', async () => {
    const router = makeRouter();
    registerTranscriptFtsCandidateRoute(router);
    const result = await invoke(router.routes.get('/transcript-recall/candidates'), {
        user: { directories: { root: prepareRoot() } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', queryText: 'CSP Angela', candidateLimit: 4 },
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.state, 'CANDIDATES');
    assert.equal(result.payload.candidates.length, 1);
    assert.equal(result.payload.candidates[0].documentId.startsWith('transcript_fts:'), true);
    assert.equal(result.payload.candidates[0].occurrenceLinks[0].messageRecordId, 'message:one');
    assert.equal(JSON.stringify(result.payload).includes('CSP Angela origin record'), false);
});

test('no-query route result does not create an index', async () => {
    const router = makeRouter();
    registerTranscriptFtsCandidateRoute(router);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-candidate-route-no-query-'));
    const result = await invoke(router.routes.get('/transcript-recall/candidates'), {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', queryText: '   ', candidateLimit: 4 },
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.state, 'NO_QUERY');
    assert.equal(fs.existsSync(getStoragePaths(root).transcriptIndexDbPath), false);
});

test('route refuses malformed request and unavailable projection without substituting text', async () => {
    const router = makeRouter();
    registerTranscriptFtsCandidateRoute(router);
    const handler = router.routes.get('/transcript-recall/candidates');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-candidate-route-refusal-'));
    const malformed = await invoke(handler, {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', queryText: 'CSP', candidateLimit: 0 },
    });
    assert.equal(malformed.statusCode, 400);
    assert.equal(malformed.payload.code, 'TIR_FTS_LIMIT_INVALID');
    const unavailable = await invoke(handler, {
        user: { directories: { root } },
        body: { characterInstanceId: 'character:jeep', posture: 'CONTINUITY', queryText: 'CSP', candidateLimit: 4 },
    });
    assert.equal(unavailable.statusCode, 409);
    assert.equal(unavailable.payload.code, 'TIR_FTS_INDEX_UNAVAILABLE');
});
