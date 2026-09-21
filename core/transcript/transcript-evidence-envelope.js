export const TranscriptEvidenceState = Object.freeze({
    EVIDENCE_PRESENT: 'EVIDENCE_PRESENT',
    NO_MATCH: 'NO_MATCH',
    INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
    SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
    AMBIGUOUS: 'AMBIGUOUS',
    CAPACITY_UNAVAILABLE: 'CAPACITY_UNAVAILABLE',
});

const COMPLETE_BUNDLE_CAPACITY_REASONS = new Set([
    'EXACT_CAPACITY_EXCEEDED',
    'BUNDLE_OVER_CAPACITY',
    'TIR_MATERIALIZATION_CHARACTER_CEILING_EXCEEDED',
]);

function reasonCode(reason) {
    return String(reason || 'EVIDENCE_UNAVAILABLE').replace(/[^A-Z0-9_:-]/giu, '_').slice(0, 120);
}

export function classifyTranscriptEvidenceState(result = {}) {
    const reason = String(result.reason || '').toUpperCase();
    if (reason.includes('NO_MATCH')) return TranscriptEvidenceState.NO_MATCH;
    if (reason.includes('INSUFFICIENT_EVIDENCE')) return TranscriptEvidenceState.INSUFFICIENT_EVIDENCE;
    if (reason.includes('AMBIGUOUS')) return TranscriptEvidenceState.AMBIGUOUS;
    if (COMPLETE_BUNDLE_CAPACITY_REASONS.has(reason)) return TranscriptEvidenceState.CAPACITY_UNAVAILABLE;
    return TranscriptEvidenceState.SOURCE_UNAVAILABLE;
}

export function buildTranscriptEvidenceEnvelope(result = {}) {
    const state = classifyTranscriptEvidenceState(result);
    return `[Transcript Recall Evidence | state ${state} | no material supplied | reason ${reasonCode(result.reason)}]`;
}
