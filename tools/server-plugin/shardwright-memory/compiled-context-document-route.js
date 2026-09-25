import { compileDocumentRegistry } from './lib/core/compiled-context/document-compiler.js';
import { loadCompiledContextDocumentRegistry } from './lib/core/compiled-context/document-source-loader.js';
import {
    createAdapter,
    getAuthenticatedUserRoot,
    getStoragePaths,
    handleError,
    ensureStorageRoot,
} from './core.js';
import {
    getCompiledContextProjectionStatus,
    buildCompiledContextProjectionPlan,
    listCompiledContextDocuments,
    listCompiledContextReferences,
    materializeCompiledContextProjection,
} from './compiled-context-document-projection.js';

function registryFromBody(body) {
    if (!Array.isArray(body?.documents) || body.documents.length === 0) {
        const error = new Error('A non-empty compiled-context document registry is required.');
        error.status = 400;
        error.code = 'TIR_COMPILED_CONTEXT_DOCUMENTS_REQUIRED';
        throw error;
    }
    return compileDocumentRegistry(body.documents);
}

function sourceRegistryFromBody(body) {
    if (!Array.isArray(body?.sources) || body.sources.length === 0) {
        const error = new Error('A non-empty explicit compiled-context source descriptor list is required.');
        error.status = 400;
        error.code = 'TIR_COMPILED_CONTEXT_SOURCES_REQUIRED';
        throw error;
    }
    return loadCompiledContextDocumentRegistry(body.sources);
}

function withProjection(request, callback) {
    const registry = registryFromBody(request.body);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    ensureStorageRoot(paths.storageRoot);
    const adapter = createAdapter(paths.compiledContextIndexDbPath);
    try {
        return callback(adapter, registry);
    } finally {
        adapter.close();
    }
}

function withSourceProjection(request, callback) {
    const loaded = sourceRegistryFromBody(request.body);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    ensureStorageRoot(paths.storageRoot);
    const adapter = createAdapter(paths.compiledContextIndexDbPath);
    try {
        return callback(adapter, loaded.registry, loaded.sources);
    } finally {
        adapter.close();
    }
}

export function registerCompiledContextDocumentRoute(router) {
    router.post('/compiled-context/projection/materialize-sources', async (request, response) => {
        try {
            return response.send({ ok: true, ...withSourceProjection(request, (adapter, registry, sources) => ({ ...materializeCompiledContextProjection(adapter, registry), sources })) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/plan-sources', async (request, response) => {
        try {
            return response.send({ ok: true, ...withSourceProjection(request, (adapter, registry, sources) => ({ ...buildCompiledContextProjectionPlan(adapter, registry, { taskText: request.body?.taskText }), sources })) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/materialize', async (request, response) => {
        try {
            return response.send({ ok: true, ...withProjection(request, (adapter, registry) => materializeCompiledContextProjection(adapter, registry)) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/status', async (request, response) => {
        try {
            return response.send({ ok: true, ...withProjection(request, (adapter, registry) => getCompiledContextProjectionStatus(adapter, registry)) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/documents', async (request, response) => {
        try {
            return response.send({ ok: true, ...withProjection(request, (adapter, registry) => listCompiledContextDocuments(adapter, registry)) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/references', async (request, response) => {
        try {
            return response.send({ ok: true, ...withProjection(request, (adapter, registry) => listCompiledContextReferences(adapter, registry, request.body?.documentLogicalId || null)) });
        } catch (error) {
            return handleError(response, error);
        }
    });

    router.post('/compiled-context/projection/plan', async (request, response) => {
        try {
            return response.send({ ok: true, ...withProjection(request, (adapter, registry) => buildCompiledContextProjectionPlan(adapter, registry, { taskText: request.body?.taskText })) });
        } catch (error) {
            return handleError(response, error);
        }
    });
}
