// Authenticated, read-only bundle presentation transport. It creates no proposal
// authority; the host still supplies request, target, profile, and canonical hash.

import { getAuthenticatedUserRoot, handleError } from './core.js';
import { buildTranscriptRecallBundle } from './transcript-recall-bundle.js';

export function registerTranscriptRecallBundleRoute(router) {
    router.post('/transcript-recall/bundle', async (request, response) => {
        try {
            getAuthenticatedUserRoot(request);
            return response.send({ ok: true, ...buildTranscriptRecallBundle(request.body?.assembly) });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
