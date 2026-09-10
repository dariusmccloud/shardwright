// Authenticated, read-only transport for one explicitly anchored source window.
// The caller must choose the document and occurrence first; this route never selects,
// combines, ranks, persists, or turns source text into a prompt contribution.

import {
    getAuthenticatedUserRoot,
    getStoragePaths,
    handleError,
} from './core.js';
import { reconstructTranscriptContextWindow } from './transcript-context-window.js';

export function registerTranscriptContextWindowRoute(router) {
    router.post('/transcript-recall/windows', async (request, response) => {
        try {
            const userRoot = getAuthenticatedUserRoot(request);
            const result = reconstructTranscriptContextWindow(getStoragePaths(userRoot), request.body);
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
