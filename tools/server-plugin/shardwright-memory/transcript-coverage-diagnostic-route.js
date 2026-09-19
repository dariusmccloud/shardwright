import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { readTranscriptCoverage } from './transcript-coverage-diagnostic.js';

export function registerTranscriptCoverageDiagnosticRoute(router) {
    router.post('/transcript-recall/projection/coverage', async (request, response) => {
        try {
            const result = readTranscriptCoverage(getStoragePaths(getAuthenticatedUserRoot(request)), request.body?.characterInstanceId);
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
