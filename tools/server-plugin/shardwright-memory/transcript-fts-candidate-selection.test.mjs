import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';
import { buildTranscriptFtsDocuments, materializeTranscriptFtsDocuments } from './transcript-fts-document-projection.js';
import { normalizeTranscriptRecallQuery, selectTranscriptFtsCandidates, TranscriptRetrievalPosture, TRANSCRIPT_CANDIDATE_LIMIT_DEFAULT, TRANSCRIPT_CANDIDATE_LIMIT_MAX } from './transcript-fts-candidate-selection.js';

function occurrence(messageRecordId, visibilityState, admissionScope) {
    return { messageRecordId, characterInstanceId: 'character:jeep', sourceLogicalId: `source:${messageRecordId}`, sourceRevisionHash: `sha256:${messageRecordId}`, sourceLocalOrder: 0, visibilityState, admissionScope };
}
function rangedOccurrence(messageRecordId, sourceLogicalId, sourceLocalOrder) {
    return { messageRecordId, characterInstanceId: 'character:jeep', sourceLogicalId, sourceRevisionHash: `sha256:${sourceLogicalId}`, sourceLocalOrder, visibilityState: 'VISIBLE', admissionScope: TranscriptFtsAdmissionScope.ORDINARY };
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

test('declares the bounded retrieval profile', () => {
    assert.equal(TRANSCRIPT_CANDIDATE_LIMIT_DEFAULT, 50);
    assert.equal(TRANSCRIPT_CANDIDATE_LIMIT_MAX, 256);
});

test('returns NO_QUERY without requiring or touching an FTS database', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-no-query-')));
    const result = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: '   ', candidateLimit: 4 });
    assert.equal(result.state, 'NO_QUERY');
    assert.equal(fs.existsSync(paths.transcriptIndexDbPath), false);
});

test('removes only leading balanced host envelopes and preserves the actual query', () => {
    assert.equal(normalizeTranscriptRecallQuery('[TD] Saturday Sep 19, 2026 16:55 [/TD]\nbolt cutters'), 'bolt cutters');
    assert.equal(normalizeTranscriptRecallQuery('[QR] quick reply [/QR] [TD] stamp [/TD] CSP'), 'CSP');
    assert.equal(normalizeTranscriptRecallQuery('Use [literal]brackets[/literal] in the evidence'), 'Use [literal]brackets[/literal] in the evidence');
    assert.equal(normalizeTranscriptRecallQuery('[OTHER] metadata [/OTHER] CSP'), 'CSP');
    assert.equal(normalizeTranscriptRecallQuery('`[TD] canonical [/TD]` CSP'), '`[TD] canonical [/TD]` CSP');
});

test('candidate diagnostics retain raw and normalized query text', () => {
    const result = selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: '[TD] stamp [/TD] CSP Angela', candidateLimit: 4 });
    assert.equal(result.rawQueryText, '[TD] stamp [/TD] CSP Angela');
    assert.equal(result.normalizedQueryText, 'CSP Angela');
});

test('continuity returns ordinary document identity and occurrence custody without source text', () => {
    const result = selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP Angela', candidateLimit: 4 });
    assert.equal(result.state, 'CANDIDATES');
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].admissionScope, TranscriptFtsAdmissionScope.ORDINARY);
    assert.equal(Object.hasOwn(result.candidates[0], 'completeContent'), false);
    assert.deepEqual(result.candidates[0].occurrenceLinks.map((link) => link.messageRecordId).sort(), ['archived', 'deleted', 'ordinary']);
});

test('explicit branch source scope limits candidates without changing custody links', () => {
    const result = selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP Angela', candidateLimit: 4, sourceLogicalIds: ['source:ordinary'] });
    assert.equal(result.state, 'CANDIDATES');
    assert.equal(result.availableCandidateCount, 1);
    assert.deepEqual(result.candidates[0].occurrenceLinks.map((link) => link.messageRecordId).sort(), ['archived', 'deleted', 'ordinary']);
});

test('invalid branch source scope refuses instead of inferring a branch', () => {
    assert.throws(() => selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP', candidateLimit: 4, sourceLogicalIds: [] }), (error) => error?.code === 'TIR_FTS_SOURCE_SCOPE_INVALID');
});

test('accepted fork ranges exclude a parent divergent suffix while retaining links', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fts-range-')));
    const equivalence = { families: [{ contentHash: 'sha256:parent-suffix', completeContent: 'parent divergent suffix', occurrences: [rangedOccurrence('parent-2', 'source:parent', 2)] }] };
    materializeTranscriptFtsDocuments(paths, buildTranscriptFtsDocuments(equivalence, 'character:jeep'));
    const excluded = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'parent divergent', candidateLimit: 4, sourceScopes: [{ sourceLogicalId: 'source:parent', maxSourceLocalOrder: 1 }] });
    assert.equal(excluded.state, 'NO_MATCH');
    const included = selectTranscriptFtsCandidates(paths, { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'parent divergent', candidateLimit: 4, sourceScopes: [{ sourceLogicalId: 'source:parent', maxSourceLocalOrder: 2 }] });
    assert.equal(included.state, 'CANDIDATES');
    assert.deepEqual(included.candidates[0].occurrenceLinks.map((link) => link.messageRecordId), ['parent-2']);
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

test('refuses a candidate limit above the explicit ceiling', () => {
    assert.throws(() => selectTranscriptFtsCandidates(readyPaths(), { characterInstanceId: 'character:jeep', posture: TranscriptRetrievalPosture.CONTINUITY, queryText: 'CSP', candidateLimit: TRANSCRIPT_CANDIDATE_LIMIT_MAX + 1 }), (error) => error?.code === 'TIR_FTS_LIMIT_INVALID');
});
