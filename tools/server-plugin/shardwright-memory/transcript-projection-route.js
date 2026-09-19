// Authenticated service-owned catch-up seam for the rebuildable transcript projection.
// Retrieval routes do not invoke this implicitly; callers must establish CURRENT state
// through this service boundary before advertising a projection as current.

import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { projectTranscriptIncrementally, readTranscriptProjectionState } from './transcript-incremental-projector.js';

function characterId(body) {
    const value = body?.characterInstanceId;
    if (typeof value !== 'string' || value.trim() === '') {
        const error = new Error('A character instance identity is required for transcript projection catch-up.');
        error.status = 400;
        error.code = 'TIR_PROJECTION_CHARACTER_REQUIRED';
        throw error;
    }
    return value;
}

export function registerTranscriptProjectionRoute(router) {
    router.post('/transcript-recall/projection/catch-up', async (request, response) => {
        try {
            const paths = getStoragePaths(getAuthenticatedUserRoot(request));
            const result = projectTranscriptIncrementally(paths, characterId(request.body));
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/transcript-recall/projection/status', async (request, response) => {
        try {
            const paths = getStoragePaths(getAuthenticatedUserRoot(request));
            return response.send({ ok: true, state: readTranscriptProjectionState(paths, characterId(request.body)) });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
