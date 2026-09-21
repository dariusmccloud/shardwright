async function requestJson(path, body, fetchImpl) {
    const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
    const csrfPayload = csrf.ok ? await csrf.json() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
    const response = await fetchImpl(path, { method: 'POST', headers, body: JSON.stringify(body) });
    return { response, result: await response.json() };
}

export async function listBranchLineageDecisions(fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_LIST_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/transcript-recall/branches/lineage/list', {}, fetchImpl);
        return response.ok && result?.ok === true
            ? Object.freeze({ state: 'LISTED', entries: Object.freeze(result.entries || []) })
            : Object.freeze({ state: 'REFUSED', reason: result?.code || 'LINEAGE_LIST_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_LIST_ROUTE_UNAVAILABLE' }); }
}

export async function resolveBranchLineageScope(activeSourceLogicalId, fetchImpl = globalThis.fetch) {
    if (typeof activeSourceLogicalId !== 'string' || !activeSourceLogicalId.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_SCOPE_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/transcript-recall/branches/lineage/scope', { activeSourceLogicalId }, fetchImpl);
        if (!response.ok || result?.ok !== true || !Array.isArray(result.sourceLogicalIds)) return Object.freeze({ state: 'REFUSED', reason: result?.code || result?.reason || 'LINEAGE_SCOPE_ROUTE_REFUSED' });
        return Object.freeze({ state: result.state, reason: result.reason, activeSourceLogicalId: result.activeSourceLogicalId, sourceLogicalIds: Object.freeze([...result.sourceLogicalIds]), sourceScopes: Object.freeze((result.sourceScopes || []).map((scope) => Object.freeze({ ...scope }))), decisionEntryIds: Object.freeze([...(result.decisionEntryIds || [])]) });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_SCOPE_ROUTE_UNAVAILABLE' }); }
}

export async function appendBranchLineageDecision(decisionRecord, fetchImpl = globalThis.fetch) {
    if (!decisionRecord || decisionRecord.state !== 'DECISION_READY' || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_APPEND_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/transcript-recall/branches/lineage/append', { decisionRecord }, fetchImpl);
        return response.ok && result?.ok === true
            ? Object.freeze({ state: result.appended ? 'APPENDED' : 'IDEMPOTENT', ...result })
            : Object.freeze({ state: 'REFUSED', reason: result?.code || 'LINEAGE_APPEND_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'LINEAGE_APPEND_ROUTE_UNAVAILABLE' }); }
}

export async function suggestBranchLineage(sourceLogicalIds, fetchImpl = globalThis.fetch) {
    if (!Array.isArray(sourceLogicalIds) || sourceLogicalIds.length < 2 || sourceLogicalIds.some((id) => typeof id !== 'string' || !id.trim()) || typeof fetchImpl !== 'function') {
        return Object.freeze({ state: 'REFUSED', reason: 'FORK_SUGGESTION_INPUT_INVALID' });
    }
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/transcript-recall/branches/suggest', { sourceLogicalIds }, fetchImpl);
        return response.ok && result?.ok === true ? Object.freeze({ ...result }) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'FORK_SUGGESTION_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'FORK_SUGGESTION_ROUTE_UNAVAILABLE' }); }
}

export async function discoverBranchLineage(characterInstanceId, fetchImpl = globalThis.fetch) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'BRANCH_DISCOVERY_INPUT_INVALID' });
    try {
        const { response, result } = await requestJson('/api/plugins/shardwright-memory/transcript-recall/branches/discover', { characterInstanceId }, fetchImpl);
        return response.ok && result?.ok === true ? Object.freeze({ ...result }) : Object.freeze({ state: 'REFUSED', reason: result?.code || result?.reason || 'BRANCH_DISCOVERY_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'BRANCH_DISCOVERY_ROUTE_UNAVAILABLE' }); }
}
