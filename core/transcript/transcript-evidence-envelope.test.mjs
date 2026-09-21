import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTranscriptEvidenceEnvelope, classifyTranscriptEvidenceState } from './transcript-evidence-envelope.js';

test('classifies refusal states without treating ranking as authority', () => {
    assert.equal(classifyTranscriptEvidenceState({ reason: 'CANDIDATE_SELECTION:NO_MATCH:REFUSED' }), 'NO_MATCH');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'INSUFFICIENT_EVIDENCE' }), 'INSUFFICIENT_EVIDENCE');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'AMBIGUOUS_ANCHORS' }), 'AMBIGUOUS');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'EXACT_CAPACITY_EXCEEDED' }), 'CAPACITY_UNAVAILABLE');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'TIR_MATERIALIZATION_CHARACTER_CEILING_EXCEEDED' }), 'CAPACITY_UNAVAILABLE');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'BUDGET_UNAVAILABLE' }), 'SOURCE_UNAVAILABLE');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'HOST_TOKENIZER_UNAVAILABLE' }), 'SOURCE_UNAVAILABLE');
    assert.equal(classifyTranscriptEvidenceState({ reason: 'PROJECTION_NOT_CURRENT' }), 'SOURCE_UNAVAILABLE');
});

test('builds a concise pre-dispatch envelope with no recalled material', () => {
    assert.equal(buildTranscriptEvidenceEnvelope({ reason: 'INSUFFICIENT_EVIDENCE' }), '[Transcript Recall Evidence | state INSUFFICIENT_EVIDENCE | no material supplied | reason INSUFFICIENT_EVIDENCE]');
});
