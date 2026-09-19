import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { admitTranscriptSourceToIndex } from './transcript-source-intake.js';

export function registerTranscriptSourceIntakeRoute(router) {
    router.post('/transcript-recall/sources/intake', async (request, response) => {
        try {
            const sourceLogicalId = request.body?.sourceLogicalId;
            if (typeof sourceLogicalId !== 'string' || !sourceLogicalId.trim()) {
                return response.status(400).send({ ok: false, code: 'TIR_INTAKE_SOURCE_REQUIRED' });
            }
            const result = admitTranscriptSourceToIndex(getStoragePaths(getAuthenticatedUserRoot(request)), request, sourceLogicalId, { observedAt: request.body?.observedAt });
            return response.send({ ok: true, ...result });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
