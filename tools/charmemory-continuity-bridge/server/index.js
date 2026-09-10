import path from 'node:path';
import { ContinuityBridgeError, ContinuityStore } from './continuity-store.js';

export const info = {
    id: 'charmemory-continuity-bridge',
    name: 'CharMemory Continuity Bridge',
    description: 'Read-only current-memory retrieval for CharMemory Markdown sources.',
};

function getUserRoot(request) {
    const root = request?.user?.directories?.root || request?.user?.directories?.chats && path.resolve(request.user.directories.chats, '..');
    if (!root || typeof root !== 'string') {
        throw new ContinuityBridgeError('CONTINUITY_USER_ROOT_UNAVAILABLE', 'Authenticated user storage is unavailable.');
    }
    return path.resolve(root);
}

function withStore(request, operation) {
    const store = new ContinuityStore(path.join(getUserRoot(request), 'charmemory-continuity-bridge'));
    try {
        return operation(store);
    } finally {
        store.close();
    }
}

function sendError(response, error) {
    const status = error instanceof ContinuityBridgeError ? 400 : 500;
    return response.status(status).send({ ok: false, code: error.code || 'CONTINUITY_UNEXPECTED', message: error.message });
}

export async function init(router) {
    router.post('/sync', async (request, response) => {
        try {
            const result = withStore(request, (store) => store.sync(request.body?.sourceId, request.body?.content));
            return response.send({ ok: true, ...result });
        } catch (error) {
            return sendError(response, error);
        }
    });

    router.post('/search', async (request, response) => {
        try {
            const results = withStore(request, (store) => store.search(request.body?.sourceId, request.body?.query, request.body?.limit));
            return response.send({ ok: true, results });
        } catch (error) {
            return sendError(response, error);
        }
    });

    router.post('/inspect', async (request, response) => {
        try {
            const source = withStore(request, (store) => store.describeSource(request.body?.sourceId));
            return response.send({ ok: true, source });
        } catch (error) {
            return sendError(response, error);
        }
    });

    router.get('/health', async (request, response) => {
        try {
            const dbPath = withStore(request, (store) => store.dbPath);
            return response.send({ ok: true, storage: 'local-user', dbPath });
        } catch (error) {
            return sendError(response, error);
        }
    });
}
