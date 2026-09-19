import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { appendCharacterAssociationAudit, readCharacterAssociationAuditLedger } from './character-association-audit.js';
export function registerCharacterAssociationAuditRoute(router) {
    router.post('/transcript-recall/character-association-audit', async (request, response) => {
        try { const paths = getStoragePaths(getAuthenticatedUserRoot(request)); return response.send({ ok: true, ...appendCharacterAssociationAudit(paths, request.body) }); } catch (error) { return handleError(response, error); }
    });
    router.post('/transcript-recall/character-association-audit/read', async (request, response) => {
        try { const paths = getStoragePaths(getAuthenticatedUserRoot(request)); return response.send({ ok: true, entries: readCharacterAssociationAuditLedger(paths) }); } catch (error) { return handleError(response, error); }
    });
}
