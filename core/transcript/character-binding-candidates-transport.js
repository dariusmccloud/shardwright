export async function requestCharacterBindingCandidates(fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'CANDIDATE_TRANSPORT_UNAVAILABLE', candidates: Object.freeze([]) });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } }); const token = (await csrf.json())?.token; const headers = {};
        if (token && token !== 'disabled') headers['x-csrf-token'] = token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/character-binding/list', { method: 'POST', headers }); const body = await response.json();
        if (!response.ok || body?.ok !== true || !Array.isArray(body.characterInstances)) return Object.freeze({ state: 'REFUSED', reason: body?.code || 'CANDIDATE_TRANSPORT_FAILED', candidates: Object.freeze([]) });
        return Object.freeze({ state: 'CANDIDATES', candidates: Object.freeze(body.characterInstances.map((candidate) => Object.freeze({ ...candidate }))) });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'CANDIDATE_TRANSPORT_FAILED', candidates: Object.freeze([]) }); }
}

export async function registerCharacterBinding({ bindingToken = `operator:${crypto.randomUUID()}`, operatorActionId = crypto.randomUUID(), fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'BINDING_REGISTRATION_TRANSPORT_UNAVAILABLE' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } }); const token = (await csrf.json())?.token; const headers = { 'Content-Type': 'application/json' }; if (token && token !== 'disabled') headers['x-csrf-token'] = token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/character-binding/register', { method: 'POST', headers, body: JSON.stringify({ bindingToken, operatorActionId, recordedAt: new Date().toISOString() }) }); const body = await response.json();
        if (!response.ok || body?.ok !== true || typeof body.characterInstanceId !== 'string') return Object.freeze({ state: 'REFUSED', reason: body?.code || `BINDING_REGISTRATION_HTTP_${response.status || 'ERROR'}` });
        return Object.freeze({ state: 'REGISTERED', bindingToken, characterInstanceId: body.characterInstanceId });
    } catch (error) { return Object.freeze({ state: 'REFUSED', reason: error?.name === 'TypeError' ? 'BINDING_REGISTRATION_NETWORK_FAILED' : 'BINDING_REGISTRATION_TRANSPORT_FAILED' }); }
}
