// Read-only policy evaluation over proven candidate and anchor-resolution results.
// This module classifies retrieval completeness; it does not rank, merge custody,
// persist preferences, assemble windows, or inject prompt material.

import { createError } from './core.js';
import { TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';

function assertResolutionShape(resolutions) {
    if (!Array.isArray(resolutions)) {
        throw createError(400, 'Anchor resolutions are required for policy evaluation.', 'TIR_POLICY_RESOLUTIONS_REQUIRED');
    }
    for (const resolution of resolutions) {
        if (!resolution || typeof resolution.contentHash !== 'string' || !Array.isArray(resolution.occurrences)) {
            throw createError(409, 'Anchor resolution custody is incomplete.', 'TIR_POLICY_RESOLUTION_INVALID');
        }
    }
}

export function evaluateTranscriptCandidatePolicy(selection, anchorResult) {
    if (!selection || typeof selection.characterInstanceId !== 'string' || !selection.posture) {
        throw createError(400, 'A valid candidate selection is required for policy evaluation.', 'TIR_POLICY_SELECTION_INVALID');
    }
    if (selection.state === 'NO_QUERY' || selection.state === 'NO_MATCH') {
        return Object.freeze({
            state: selection.state,
            posture: selection.posture,
            characterInstanceId: selection.characterInstanceId,
            adequacy: 'INSUFFICIENT',
            sufficiency: 'INSUFFICIENT',
            resolutions: Object.freeze([]),
        });
    }
    if (selection.state !== 'CANDIDATES' || !Number.isInteger(selection.availableCandidateCount) || !Array.isArray(selection.candidates)) {
        throw createError(400, 'A complete candidate selection is required for policy evaluation.', 'TIR_POLICY_SELECTION_INVALID');
    }
    assertResolutionShape(anchorResult?.resolutions);
    const resolutions = anchorResult.resolutions;
    const ambiguous = resolutions.some((resolution) => resolution.state === 'AMBIGUOUS_ANCHORS');
    const hasEligibleEvidence = resolutions.some((resolution) => resolution.occurrences.length > 0);
    const truncated = selection.truncated === true || selection.availableCandidateCount > selection.candidates.length;
    const adequacy = hasEligibleEvidence ? 'ADEQUATE' : 'INSUFFICIENT';
    let sufficiency = 'INSUFFICIENT';
    let state = 'POLICY_EVALUATED';
    if (ambiguous) {
        state = 'AMBIGUOUS_ANCHORS';
    } else if (selection.posture === TranscriptRetrievalPosture.ARCHAEOLOGY && truncated) {
        state = 'INSUFFICIENT_EVIDENCE';
    } else if (hasEligibleEvidence && !truncated) {
        sufficiency = 'SUFFICIENT';
    }
    return Object.freeze({
        state,
        posture: selection.posture,
        characterInstanceId: selection.characterInstanceId,
        adequacy,
        sufficiency,
        candidateCount: selection.candidates.length,
        availableCandidateCount: selection.availableCandidateCount,
        truncated,
        resolutions: Object.freeze(resolutions),
    });
}
