import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateTranscriptCandidatePolicy } from './transcript-candidate-policy.js';

function selection(posture = 'CONTINUITY', extra = {}) {
    return { state: 'CANDIDATES', posture, characterInstanceId: 'character:jeep', candidates: [{ documentId: 'doc:1' }], availableCandidateCount: 1, truncated: false, ...extra };
}
function resolution(state = 'SOLE_ANCHOR', count = 1) {
    return { state, contentHash: 'sha256:one', occurrences: Array.from({ length: count }, (_, index) => ({ messageRecordId: `message:${index}` })) };
}

test('distinguishes adequacy from sufficiency for a complete Continuity result', () => {
    const result = evaluateTranscriptCandidatePolicy(selection(), { resolutions: [resolution()] });
    assert.equal(result.adequacy, 'ADEQUATE');
    assert.equal(result.sufficiency, 'SUFFICIENT');
    assert.equal(result.state, 'POLICY_EVALUATED');
});

test('refuses ambiguous Continuity anchors without truncating or selecting one', () => {
    const result = evaluateTranscriptCandidatePolicy(selection(), { resolutions: [resolution('AMBIGUOUS_ANCHORS', 3)] });
    assert.equal(result.state, 'AMBIGUOUS_ANCHORS');
    assert.equal(result.sufficiency, 'INSUFFICIENT');
    assert.equal(result.resolutions[0].occurrences.length, 3);
});

test('marks truncated Archaeology candidates insufficient while preserving eligible custody', () => {
    const result = evaluateTranscriptCandidatePolicy(selection('ARCHAEOLOGY', { availableCandidateCount: 2, truncated: true }), { resolutions: [resolution('ELIGIBLE_BUNDLE', 2)] });
    assert.equal(result.adequacy, 'ADEQUATE');
    assert.equal(result.sufficiency, 'INSUFFICIENT');
    assert.equal(result.state, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.resolutions[0].occurrences.length, 2);
});

test('keeps no-query and no-match distinct from policy insufficiency', () => {
    for (const state of ['NO_QUERY', 'NO_MATCH']) {
        const result = evaluateTranscriptCandidatePolicy({ state, posture: 'CONTINUITY', characterInstanceId: 'character:jeep' });
        assert.equal(result.state, state);
        assert.equal(result.adequacy, 'INSUFFICIENT');
    }
});
