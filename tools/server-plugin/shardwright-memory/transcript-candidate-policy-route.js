// Authenticated, read-only policy evaluation transport. It composes already
// authenticated custody results and emits no source text, preference, or prompt.

import { getAuthenticatedUserRoot, handleError } from './core.js';
import { evaluateTranscriptCandidatePolicy } from './transcript-candidate-policy.js';

export function registerTranscriptCandidatePolicyRoute(router) {
    router.post('/transcript-recall/policy', async (request, response) => {
        try {
            getAuthenticatedUserRoot(request);
            return response.send({ ok: true, ...evaluateTranscriptCandidatePolicy(request.body?.selection, request.body?.anchors) });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
