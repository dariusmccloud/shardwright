// Authenticated, custody-only anchor-resolution transport. It operates on an already
// returned candidate-selection result and never creates a preference or selects among
// ambiguous occurrences.

import {
    getAuthenticatedUserRoot,
    handleError,
} from './core.js';
import { resolveTranscriptCandidateAnchors } from './transcript-anchor-resolution.js';

export function registerTranscriptAnchorResolutionRoute(router) {
    router.post('/transcript-recall/anchors', async (request, response) => {
        try {
            // Authentication is retained for a uniform Transcript Recall API boundary.
            // This operation reads no server storage and emits no source text.
            getAuthenticatedUserRoot(request);
            const result = resolveTranscriptCandidateAnchors(request.body?.selection, {
                anchorOccurrenceLimit: request.body?.anchorOccurrenceLimit,
            });
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
