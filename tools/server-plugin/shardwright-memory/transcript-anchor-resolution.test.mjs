import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTranscriptCandidateAnchors } from './transcript-anchor-resolution.js';
import { TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';

function occurrence(messageRecordId, admissionScope = 'ORDINARY') { return { messageRecordId, sourceLogicalId: `source:${messageRecordId}`, sourceRevisionHash: `sha256:${messageRecordId}`, sourceLocalOrder: 0, visibilityState: admissionScope === 'ORDINARY' ? 'VISIBLE' : 'ARCHIVED', admissionScope }; }
function selection(posture, candidates) { return { state: 'CANDIDATES', characterInstanceId: 'character:jeep', posture, candidates }; }

test('uses a sole posture-eligible occurrence without treating a hidden sibling as an anchor', () => {
    const result = resolveTranscriptCandidateAnchors(selection(TranscriptRetrievalPosture.CONTINUITY, [{ documentId: 'ordinary', contentHash: 'sha256:x', occurrenceLinks: [occurrence('visible'), occurrence('archived', 'ARCHAEOLOGY_ONLY')] }]), { anchorOccurrenceLimit: 2 });
    assert.equal(result.resolutions[0].state, 'SOLE_ANCHOR');
    assert.deepEqual(result.resolutions[0].occurrences.map((value) => value.messageRecordId), ['visible']);
});

test('bundles continuity anchors only within its explicit occurrence bound and otherwise refuses ambiguity', () => {
    const within = resolveTranscriptCandidateAnchors(selection(TranscriptRetrievalPosture.CONTINUITY, [{ documentId: 'one', contentHash: 'sha256:x', occurrenceLinks: [occurrence('a'), occurrence('b')] }]), { anchorOccurrenceLimit: 2 });
    const over = resolveTranscriptCandidateAnchors(selection(TranscriptRetrievalPosture.CONTINUITY, [{ documentId: 'one', contentHash: 'sha256:x', occurrenceLinks: [occurrence('a'), occurrence('b'), occurrence('c')] }]), { anchorOccurrenceLimit: 2 });
    assert.equal(within.resolutions[0].state, 'ELIGIBLE_BUNDLE');
    assert.equal(over.resolutions[0].state, 'AMBIGUOUS_ANCHORS');
    assert.equal(over.resolutions[0].eligibleOccurrenceCount, 3);
});

test('archaeology expands all eligible occurrences and coalesces duplicate FTS documents without merging custody', () => {
    const result = resolveTranscriptCandidateAnchors(selection(TranscriptRetrievalPosture.ARCHAEOLOGY, [
        { documentId: 'ordinary', contentHash: 'sha256:x', occurrenceLinks: [occurrence('visible'), occurrence('archived', 'ARCHAEOLOGY_ONLY')] },
        { documentId: 'archaeology', contentHash: 'sha256:x', occurrenceLinks: [occurrence('visible'), occurrence('archived', 'ARCHAEOLOGY_ONLY')] },
    ]), { anchorOccurrenceLimit: 1 });
    assert.equal(result.resolutions.length, 1);
    assert.equal(result.resolutions[0].state, 'ELIGIBLE_BUNDLE');
    assert.equal(result.resolutions[0].documentIds.length, 2);
    assert.deepEqual(result.resolutions[0].occurrences.map((value) => value.messageRecordId).sort(), ['archived', 'visible']);
});
