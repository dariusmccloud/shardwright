import { retrieveTranscriptRecall } from './transcript-recall-orchestrator.js';
import { createShardwrightTranscriptRecallProposal } from './shardwright-context-planning.js';

// Converts the already-proven read-only retrieval transports into the planner's
// bound proposal shape. It does not approve capacity or mutate a host payload.
export async function planHostTranscriptRecall({ request, transports, posture = 'CONTINUITY', candidateLimit = 50, capacityProfile, materializationCeilingCharacters, preferenceResolver, cryptoApi, serverDigest } = {}) {
    if (!request || !Object.isFrozen(request) || !transports || typeof transports !== 'object') {
        return Object.freeze({ state: 'DECLINED', reason: 'PLANNER_INPUT_INVALID', requestId: request?.requestId || '' });
    }
    const retrieval = await retrieveTranscriptRecall({ request, posture, candidateLimit, materializationCeilingCharacters, preferenceResolver, transports });
    if (retrieval.state !== 'RETRIEVAL_READY') {
        return Object.freeze({ state: 'DECLINED', reason: retrieval.reason || 'RETRIEVAL_UNAVAILABLE', requestId: request.requestId });
    }
    const bundle = retrieval.bundle;
    if (!bundle || typeof bundle.bundleText !== 'string' || !bundle.bundleText.length) {
        return Object.freeze({ state: 'DECLINED', reason: 'BUNDLE_UNAVAILABLE', requestId: request.requestId });
    }
    return createShardwrightTranscriptRecallProposal({ request, bundleText: bundle.bundleText, capacityProfile, cryptoApi, serverDigest });
}
