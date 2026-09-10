// Authenticated, read-only transport for explicitly anchored candidate windows.
// It delegates all custody and visibility checks to the proven assembly module.

import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { assembleTranscriptCandidateWindows } from './transcript-candidate-window-assembly.js';

export function registerTranscriptCandidateWindowAssemblyRoute(router) {
    router.post('/transcript-recall/window-assembly', async (request, response) => {
        try {
            const result = assembleTranscriptCandidateWindows(getStoragePaths(getAuthenticatedUserRoot(request)), request.body);
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
