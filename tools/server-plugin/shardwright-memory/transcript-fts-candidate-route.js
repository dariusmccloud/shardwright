// Authenticated, read-only route for the already-proven lexical candidate selector.
// It returns document identity and occurrence custody only: never transcript text,
// contextual windows, ranking beyond FTS order, prompt material, or persistent state.

import {
    getAuthenticatedUserRoot,
    getStoragePaths,
    handleError,
} from './core.js';
import { selectTranscriptFtsCandidates } from './transcript-fts-candidate-selection.js';

export function registerTranscriptFtsCandidateRoute(router) {
    router.post('/transcript-recall/candidates', async (request, response) => {
        try {
            const userRoot = getAuthenticatedUserRoot(request);
            const result = selectTranscriptFtsCandidates(getStoragePaths(userRoot), request.body);
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
