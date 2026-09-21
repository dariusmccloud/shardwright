import { retrieveTranscriptRecall } from './transcript-recall-orchestrator.js';

// Read-only diagnostic composition over the same transports used by live recall.
// It reports expected disposition; it never approves, injects, or persists authority.
export async function diagnoseTranscriptRecall({ request, posture = 'CONTINUITY', candidateLimit = 50, anchorOccurrenceLimit = 1, before = 2, after = 2, materializationCeilingCharacters, preferenceResolver, transports = {} } = {}) {
    if (!request || !Object.isFrozen(request)) return Object.freeze({ state: 'REFUSED', reason: 'DIAGNOSTIC_REQUEST_INVALID' });
    const retrieval = await retrieveTranscriptRecall({ request, posture, candidateLimit, anchorOccurrenceLimit, before, after, materializationCeilingCharacters, preferenceResolver, transports });
    const expectedDisposition = retrieval.state === 'RETRIEVAL_READY'
        ? 'READY_FOR_PLANNING'
        : String(retrieval.reason || 'RETRIEVAL_UNAVAILABLE');
    return Object.freeze({
        state: 'DIAGNOSTIC',
        diagnosticId: request.requestId || null,
        request,
        projection: retrieval.projection || null,
        retrieval,
        expectedDisposition,
    });
}
