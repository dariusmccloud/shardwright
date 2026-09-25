async function requestJson(url, body, fetchImpl) {
    const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
    const csrfPayload = csrf.ok ? await csrf.json() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
    const response = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const result = await response.json();
    return { response, result };
}

function validSources(sources) {
    return Array.isArray(sources) && sources.length > 0 && sources.every((source) => source && typeof source === 'object' && typeof source.filePath === 'string' && source.filePath.trim() && typeof source.documentLogicalId === 'string' && source.documentLogicalId.trim() && typeof source.canonicalName === 'string' && source.canonicalName.trim());
}

export async function materializeCompiledContextSources({ sources, fetchImpl = globalThis.fetch } = {}) {
    if (!validSources(sources) || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_SOURCE_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/compiled-context/projection/materialize-sources', { sources }, fetchImpl);
        return response.ok && result?.ok === true ? Object.freeze({ state: result.state || 'CURRENT', ...result }) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'COMPILED_CONTEXT_SOURCE_MATERIALIZATION_REFUSED' });
    } catch {
        return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_SOURCE_ROUTE_UNAVAILABLE' });
    }
}

export async function planCompiledContextSources({ sources, taskText, fetchImpl = globalThis.fetch } = {}) {
    if (!validSources(sources) || typeof taskText !== 'string' || !taskText.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PLAN_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/compiled-context/projection/plan-sources', { sources, taskText }, fetchImpl);
        return response.ok && result?.ok === true ? Object.freeze({ state: result.state || 'PLAN', ...result }) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'COMPILED_CONTEXT_PLAN_REFUSED' });
    } catch {
        return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PLAN_ROUTE_UNAVAILABLE' });
    }
}
