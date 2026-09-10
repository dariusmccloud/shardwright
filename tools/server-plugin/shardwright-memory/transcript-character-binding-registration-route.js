import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { createTranscriptCharacterInstance } from './transcript-character-binding.js';
export function registerTranscriptCharacterBindingRegistrationRoute(router) {
    router.post('/transcript-recall/character-binding/register', async (request, response) => {
        try {
            const userRoot = getAuthenticatedUserRoot(request); const body = request.body || {};
            const result = createTranscriptCharacterInstance(getStoragePaths(userRoot), { bindingToken: body.bindingToken, operatorActionId: body.operatorActionId, recordedAt: new Date().toISOString() });
            return response.send({ ok: true, characterInstanceId: result.entry.payload.characterInstanceId, bindingToken: body.bindingToken });
        } catch (error) { return handleError(response, error); }
    });
}
