import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';
import { buildTranscriptFtsDocuments, materializeTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { selectTranscriptFtsCandidates, TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';

function occurrence(messageRecordId, visibilityState, admissionScope) {
    return { messageRecordId, characterInstanceId: 'character:jeep', sourceLogicalId: `source:${messageRecordId}`, sourceRevisionHash: `sha256:${messageRecordId}`, sourceLocalOrder: 0, visibilityState, admissionScope };
}
function readyPaths() {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-select-')));
    const equivalence = { families: [
        { contentHash: 'sha256:shared', completeContent: 'CSP Angela origin record', occurrences: [
            occurrence('ordinary', 'VISIBLE', TranscriptFtsAdmissionScope.ORDINARY),
            occurrence('archived', 'ARCHIVED', TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY),
            occurrence('deleted', 'DELETED_OR_UNAVAILABLE', TranscriptFtsAdmissionScope.EXCLUDED),
        ] },
        { contentHash: 'sha256:excluded', completeContent: 'Sawyer unrecoverable record', occurrences: [
            occurrence('excluded', 'DELETED_OR_UNAVAILABLE', TranscriptFtsAdmissionScope.EXCLUDED),
        ] },
    ] };
    materializeTranscriptFtsDocuments(paths, buildTranscriptFtsDocuments(equivalence, 'character:jeep'));
    return paths;
}

test('returns NO_QUERY without requiring or touching an FTS database', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-no-query-')));
    const result = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: '   ', candidateLimit: 4 });
    assert.equal(result.state, 'NO_QUERY');
    assert.equal(fs.existsSync(paths.transcriptIndexDbPath), false);
});

test('continuity returns ordinary document identity and occurrence custody without source text', () => {
    const result = selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP Angela', candidateLimit: 4 });
    assert.equal(result.state, 'CANDIDATES');
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].admissionScope, TranscriptFtsAdmissionScope.ORDINARY);
    assert.equal(Object.hasOwn(result.candidates[0], 'completeContent'), false);
    assert.deepEqual(result.candidates[0].occurrenceLinks.map((link) => link.messageRecordId).sort(), ['archived', 'deleted', 'ordinary']);
});

test('archaeology exposes ordinary and archaeology-only candidates while excluded-only text never matches', () => {
    const paths = readyPaths();
    const archaeology = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.ARCHAEOLOGY, queryText: 'CSP Angela', candidateLimit: 4 });
    const excluded = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.ARCHAEOLOGY, queryText: 'Sawyer', candidateLimit: 4 });
    assert.equal(archaeology.availableCandidateCount, 2);
    assert.deepEqual(archaeology.candidates.map((candidate) => candidate.admissionScope).sort(), ['ARCHAEOLOGY_ONLY', 'ORDINARY']);
    assert.equal(excluded.state, 'NO_MATCH');
});

test('refuses candidate selection when the FTS projection does not exist', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-missing-')));
    assert.throws(() => selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP', candidateLimit: 4 }), (error) => error?.code === 'TIR_FTS_INDEX_UNAVAILABLE');
});
