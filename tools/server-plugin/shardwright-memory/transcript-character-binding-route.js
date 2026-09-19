// Authenticated read-only resolution of an operator-recorded binding token.
// The token is the only accepted lookup key; display names and locators are ignored.

import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { listTranscriptCharacterInstances, resolveTranscriptCharacterInstance } from './transcript-character-binding.js';

export function registerTranscriptCharacterBindingRoute(router) {
    router.post('/transcript-recall/character-binding', async (request, response) => {
        try {
            const userRoot = getAuthenticatedUserRoot(request);
            const characterInstanceId = resolveTranscriptCharacterInstance(getStoragePaths(userRoot), request.body?.bindingToken);
            if (!characterInstanceId) return response.status(404).send({ ok: false, code: 'TIR_BINDING_UNRESOLVED', error: 'Recorded character binding is unavailable.' });
            return response.send({ ok: true, characterInstanceId });
        } catch (error) {
            return handleError(response, error);
        }
    });
    router.post('/transcript-recall/character-binding/list', async (request, response) => {
        try { return response.send({ ok: true, characterInstances: listTranscriptCharacterInstances(getStoragePaths(getAuthenticatedUserRoot(request))) }); }
        catch (error) { return handleError(response, error); }
    });
}
