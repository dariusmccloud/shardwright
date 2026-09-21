export async function registerTranscriptSource({ characterInstanceId, sourceClass = 'DIRECT', avatarUrl, chatLocator, operatorActionId, recordedAt = new Date().toISOString(), fetchImpl = globalThis.fetch } = {}) {
    if (sourceClass !== 'DIRECT' || ![characterInstanceId, avatarUrl, chatLocator, operatorActionId].every((value) => typeof value === 'string' && value.trim()) || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_REGISTRATION_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/sources/register', { method: 'POST', headers, body: JSON.stringify({ characterInstanceId, sourceClass: 'DIRECT', hostLocator: `${avatarUrl}:${chatLocator}`, sourceResolutionLocator: { kind: 'DIRECT', avatarUrl, chatLocator }, operatorActionId, recordedAt }) });
        const result = await response.json();
        return response.ok && result?.ok === true ? Object.freeze({ state: 'REGISTERED', ...result }) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'SOURCE_REGISTRATION_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_REGISTRATION_ROUTE_UNAVAILABLE' }); }
}

export async function registerCurrentTranscriptSource(input = {}) {
    const context = globalThis.SillyTavern?.getContext?.() || {};
    const character = context.characters?.[context.characterId];
    const marker = character?.data?.extensions?.shardwright;
    return registerTranscriptSource({ ...input, characterInstanceId: marker?.characterInstanceId, avatarUrl: character?.avatar, chatLocator: context.chatId });
}

export async function observeTranscriptSource(sourceLogicalId, fetchImpl = globalThis.fetch) {
    if (typeof sourceLogicalId !== 'string' || !sourceLogicalId.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_OBSERVATION_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/sources/observe', { method: 'POST', headers, body: JSON.stringify({ sourceLogicalId, observedAt: new Date().toISOString() }) });
        const result = await response.json();
        return response.ok && result?.ok === true ? Object.freeze(result) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'SOURCE_OBSERVATION_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_OBSERVATION_ROUTE_UNAVAILABLE' }); }
}

export async function previewTranscriptSource(input, fetchImpl = globalThis.fetch) {
    if (!input || typeof input !== 'object' || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_PREVIEW_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/sources/preview', { method: 'POST', headers, body: JSON.stringify(input) });
        const result = await response.json();
        return response.ok && result?.ok === true ? Object.freeze(result) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'SOURCE_PREVIEW_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_PREVIEW_ROUTE_UNAVAILABLE' }); }
}

export async function listTranscriptSources(fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_LIST_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/sources/list', { method: 'POST', headers, body: '{}' });
        const result = await response.json();
        return response.ok && result?.ok === true ? Object.freeze({ state: 'LISTED', entries: Object.freeze((result.entries || []).map((entry) => Object.freeze(entry))) }) : Object.freeze({ state: 'REFUSED', reason: 'SOURCE_LIST_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_LIST_ROUTE_UNAVAILABLE' }); }
}
