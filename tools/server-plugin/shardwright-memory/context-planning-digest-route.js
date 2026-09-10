import {
    getAuthenticatedUserRoot,
    handleError,
    hashContextPlanningCanonicalPayload,
} from './core.js';

export function registerContextPlanningDigestRoute(router) {
    router.post('/context-planning/canonical-sha256', async (request, response) => {
        try {
            // Authentication is intentional even though this operation creates no storage state.
            getAuthenticatedUserRoot(request);
            const digest = hashContextPlanningCanonicalPayload(request.body?.canonicalPayload);
            return response.send({ ok: true, algorithm: 'sha256', digest });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
