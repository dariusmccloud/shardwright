// Read-only host retrieval orchestration. Each transport remains independently
// authenticated and custody-bound; this function only sequences their results.

function refused(result, expectedStates) {
    const states = Array.isArray(expectedStates) ? expectedStates : [expectedStates];
    return !result || (states.length > 0 && !states.includes(result.state));
}

function flattenAnchors(selection, resolutions, preferenceResolver) {
    if (!Array.isArray(resolutions)) return null;
    if (!Array.isArray(selection?.candidates)) return resolutions;
    const byDocument = new Map();
    for (const resolution of resolutions) {
        const occurrences = Array.isArray(resolution?.occurrences) ? resolution.occurrences : [];
        let occurrence = occurrences.length === 1 ? occurrences[0] : null;
        if (occurrences.length > 1 && selection?.posture === 'CONTINUITY' && typeof preferenceResolver === 'function') {
            const preference = preferenceResolver({
                characterInstanceId: selection.characterInstanceId,
                contentHash: resolution.contentHash,
                eligibleMessageRecordIds: occurrences.map((item) => item.messageRecordId),
                posture: selection.posture,
            });
            if (preference?.state === 'PREFERRED') occurrence = occurrences.find((item) => item.messageRecordId === preference.messageRecordId) || null;
        }
        if (!occurrence?.messageRecordId) continue;
        for (const documentId of resolution.documentIds || []) byDocument.set(documentId, { documentId, anchorMessageRecordId: occurrence.messageRecordId });
    }
    const anchors = selection.candidates.map((candidate) => byDocument.get(candidate.documentId));
    return anchors.every(Boolean) ? Object.freeze(anchors.map((anchor) => Object.freeze(anchor))) : null;
}

export async function retrieveTranscriptRecall({ request, posture = 'CONTINUITY', candidateLimit = 50, anchorOccurrenceLimit = 1, before = 2, after = 2, materializationCeilingCharacters, preferenceResolver, transports = {} } = {}) {
    const { ensureProjectionCurrent, requestCandidates, requestAnchors, requestWindowAssembly, requestPolicy, requestBundle } = transports;
    if (!request || !Object.isFrozen(request) || typeof requestCandidates !== 'function' || typeof requestAnchors !== 'function' || typeof requestWindowAssembly !== 'function' || typeof requestPolicy !== 'function' || typeof requestBundle !== 'function') {
        return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'ORCHESTRATION_INPUT_INVALID' });
    }
    let projection = null;
    if (typeof ensureProjectionCurrent === 'function') {
        projection = await ensureProjectionCurrent({ request, posture });
        if (!projection || projection.state !== 'CURRENT') {
            return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: projection?.reason || 'PROJECTION_NOT_CURRENT', projection });
        }
    }
    const selection = await requestCandidates({ request, posture, candidateLimit });
    const candidateStateAccepted = selection?.state === 'CANDIDATES'
        || selection?.state === 'CANDIDATES_RETRIEVED'
        || selection?.state === 'CANDIDATES_AVAILABLE'
        || (Array.isArray(selection?.candidates) && typeof selection.state === 'string' && selection.state.length > 0);
    if (!candidateStateAccepted) return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: `CANDIDATE_SELECTION:${selection?.state || 'UNAVAILABLE'}:${selection?.reason || 'REFUSED'}`, projection, selection });
    const anchorSelection = selection.state === 'CANDIDATES'
        ? selection
        : Object.freeze({ ...selection, state: 'CANDIDATES' });
    // Candidate occurrence links are custody-complete for each selected family;
    // use the safe-integer bound when resolving operator preferences so the
    // preference lookup cannot silently truncate eligible occurrences.
    const effectiveAnchorOccurrenceLimit = posture === 'CONTINUITY' && typeof preferenceResolver === 'function'
        ? Number.MAX_SAFE_INTEGER
        : anchorOccurrenceLimit;
    const anchors = await requestAnchors({ selection: anchorSelection, anchorOccurrenceLimit: effectiveAnchorOccurrenceLimit });
    if (refused(anchors, 'ANCHOR_RESOLUTIONS')) return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: `ANCHOR_RESOLUTION:${anchors?.state || 'UNAVAILABLE'}:${anchors?.reason || 'REFUSED'}`, projection, selection, anchors });
    const assemblyAnchors = flattenAnchors(anchorSelection, anchors.resolutions, preferenceResolver);
    if (!assemblyAnchors) return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'AMBIGUOUS_ANCHORS', projection, selection, anchors });
    const assembly = await requestWindowAssembly({ selection: anchorSelection, anchors: assemblyAnchors, before, after });
    if (refused(assembly, ['WINDOWS_ASSEMBLED', 'WINDOWS'])) return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: `WINDOW_ASSEMBLY:${assembly?.state || 'UNAVAILABLE'}:${assembly?.reason || 'REFUSED'}`, projection, selection, anchors, assembly });
    const policy = await requestPolicy({ selection: anchorSelection, anchors });
    if (!policy || typeof policy !== 'object' || typeof policy.state !== 'string' || !['POLICY_EVALUATED', 'EVALUATED'].includes(policy.state) || !['SUFFICIENT', 'INSUFFICIENT'].includes(policy.sufficiency)) {
        if (policy?.state === 'AMBIGUOUS_ANCHORS') return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'AMBIGUOUS_ANCHORS', projection, selection, anchors, assembly, policy });
        if (policy?.state === 'INSUFFICIENT_EVIDENCE' && policy?.sufficiency === 'INSUFFICIENT') return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'INSUFFICIENT_EVIDENCE', projection, selection, anchors, assembly, policy });
        return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'POLICY_EVALUATION_UNAVAILABLE', projection, selection, anchors, assembly, policy });
    }
    if (policy.sufficiency !== 'SUFFICIENT') return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: 'INSUFFICIENT_EVIDENCE', projection, selection, anchors, assembly, policy });
    const bundle = await requestBundle({ assembly, materializationCeilingCharacters });
    if (refused(bundle, 'BUNDLE_PRESENTED') && refused(bundle, 'BUNDLE')) return Object.freeze({ state: 'RETRIEVAL_UNAVAILABLE', reason: bundle?.reason || 'BUNDLE_PRESENTATION_REFUSED', projection, selection, anchors, assembly, policy, bundle });
    return Object.freeze({ state: 'RETRIEVAL_READY', projection, selection, anchors, assembly, policy, bundle });
}
