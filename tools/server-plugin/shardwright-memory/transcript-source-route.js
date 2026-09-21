import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { registerTranscriptSource } from './transcript-source-registry.js';
import { readTranscriptSourceRegistryLedger } from './transcript-source-registry.js';
import { observeRegisteredTranscriptSource } from './transcript-source-observer.js';
import { previewTranscriptSource } from './transcript-source-preview.js';

export function registerTranscriptSourceRoute(router) {
    router.post('/transcript-recall/sources/list', async (request, response) => {
        try {
            const entries = readTranscriptSourceRegistryLedger(getStoragePaths(getAuthenticatedUserRoot(request)));
            return response.send({ ok: true, entries: entries.map((entry) => entry.payload) });
        } catch (error) { return handleError(response, error); }
    });
    router.post('/transcript-recall/sources/register', async (request, response) => {
        try {
            const result = registerTranscriptSource(getStoragePaths(getAuthenticatedUserRoot(request)), request.body);
            return response.send({ ok: true, ...result });
        } catch (error) { return handleError(response, error); }
    });

    router.post('/transcript-recall/sources/preview', async (request, response) => {
        try {
            return response.send({ ok: true, ...previewTranscriptSource(request.body, request) });
        } catch (error) { return handleError(response, error); }
    });

    router.post('/transcript-recall/sources/observe', async (request, response) => {
        try {
            const result = observeRegisteredTranscriptSource(getStoragePaths(getAuthenticatedUserRoot(request)), request, request.body?.sourceLogicalId, { observedAt: request.body?.observedAt });
            return response.send({ ok: true, ...result });
        } catch (error) { return handleError(response, error); }
    });
}
