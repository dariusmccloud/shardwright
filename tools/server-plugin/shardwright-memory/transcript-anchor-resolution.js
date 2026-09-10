// Read-only posture-filtered anchor resolution. It groups FTS documents by exact
// content family without merging occurrence custody and never writes preferences.

import { createError } from './core.js';
import { TranscriptRetrievalPosture } from './transcript-fts-candidate-selection.js';
import { TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';

function eligible(posture, occurrence) {
    if (posture === TranscriptRetrievalPosture.CONTINUITY) return occurrence.admissionScope === TranscriptFtsAdmissionScope.ORDINARY;
    if (posture === TranscriptRetrievalPosture.ARCHAEOLOGY) return occurrence.admissionScope === TranscriptFtsAdmissionScope.ORDINARY || occurrence.admissionScope === TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY;
    throw createError(400, 'A declared continuity or archaeology posture is required.', 'TIR_ANCHOR_POSTURE_INVALID');
}

export function resolveTranscriptCandidateAnchors(selection, options = {}) {
    if (selection?.state === 'NO_QUERY' || selection?.state === 'NO_MATCH') return Object.freeze({ state: selection.state, resolutions: Object.freeze([]) });
    if (selection?.state !== 'CANDIDATES' || !Array.isArray(selection.candidates) || !Number.isInteger(options.anchorOccurrenceLimit) || options.anchorOccurrenceLimit < 1) {
        throw createError(400, 'Candidate selection and a positive explicit anchor-occurrence limit are required.', 'TIR_ANCHOR_REQUEST_INVALID');
    }
    const families = new Map();
    for (const candidate of selection.candidates) {
        if (!candidate?.contentHash || !candidate?.documentId || !Array.isArray(candidate.occurrenceLinks)) throw createError(409, 'Candidate custody is incomplete.', 'TIR_ANCHOR_CANDIDATE_INVALID');
        const family = families.get(candidate.contentHash) || { contentHash: candidate.contentHash, documentIds: [], occurrences: new Map() };
        family.documentIds.push(candidate.documentId);
        for (const occurrence of candidate.occurrenceLinks) {
            if (!occurrence?.messageRecordId) throw createError(409, 'Candidate occurrence custody is incomplete.', 'TIR_ANCHOR_CANDIDATE_INVALID');
            const existing = family.occurrences.get(occurrence.messageRecordId);
            if (existing && (existing.sourceLogicalId !== occurrence.sourceLogicalId || existing.sourceRevisionHash !== occurrence.sourceRevisionHash || existing.sourceLocalOrder !== occurrence.sourceLocalOrder || existing.visibilityState !== occurrence.visibilityState || existing.admissionScope !== occurrence.admissionScope)) {
                throw createError(409, 'Candidate occurrence custody is ambiguous.', 'TIR_ANCHOR_CUSTODY_AMBIGUOUS');
            }
            family.occurrences.set(occurrence.messageRecordId, occurrence);
        }
        families.set(candidate.contentHash, family);
    }
    return Object.freeze({
        state: 'ANCHOR_RESOLUTIONS', posture: selection.posture, characterInstanceId: selection.characterInstanceId,
        resolutions: Object.freeze([...families.values()].map((family) => {
            const eligibleOccurrences = [...family.occurrences.values()].filter((occurrence) => eligible(selection.posture, occurrence));
            let state = 'NO_ELIGIBLE_ANCHOR';
            if (eligibleOccurrences.length === 1) state = 'SOLE_ANCHOR';
            else if (eligibleOccurrences.length > 1 && selection.posture === TranscriptRetrievalPosture.ARCHAEOLOGY) state = 'ELIGIBLE_BUNDLE';
            else if (eligibleOccurrences.length > 1 && eligibleOccurrences.length <= options.anchorOccurrenceLimit) state = 'ELIGIBLE_BUNDLE';
            else if (eligibleOccurrences.length > options.anchorOccurrenceLimit) state = 'AMBIGUOUS_ANCHORS';
            return Object.freeze({
                state, contentHash: family.contentHash, documentIds: Object.freeze(family.documentIds),
                eligibleOccurrenceCount: eligibleOccurrences.length, anchorOccurrenceLimit: options.anchorOccurrenceLimit,
                occurrences: Object.freeze(eligibleOccurrences),
            });
        })),
    });
}
