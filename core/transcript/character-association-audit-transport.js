export async function recordCharacterAssociationAudit({ decision, characterSelector, idempotencyKey, basis, recordedAt, cardMarkerBefore = null, targetCharacterInstanceId = null, fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function' || !decision || !characterSelector?.hostCharacterId || !idempotencyKey || !basis || !recordedAt) return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_AUDIT_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfBody = await csrf.json(); const headers = { 'Content-Type': 'application/json' };
        if (csrfBody?.token && csrfBody.token !== 'disabled') headers['x-csrf-token'] = csrfBody.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/character-association-audit', { method: 'POST', headers, body: JSON.stringify({ decision, characterSelector, idempotencyKey, basis, recordedAt, cardMarkerBefore, targetCharacterInstanceId }) });
        const body = await response.json();
        if (!response.ok || body?.ok !== true) return Object.freeze({ state: 'REFUSED', reason: body?.code || 'ASSOCIATION_AUDIT_REQUEST_FAILED' });
        return Object.freeze({ state: 'RECORDED', appended: body.appended === true, entry: body.entry });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_AUDIT_TRANSPORT_FAILED' }); }
}

export async function requestCharacterAssociationAuditEntries(fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_AUDIT_READ_UNAVAILABLE', entries: Object.freeze([]) });
    try { const csrf = await fetchImpl('/csrf-token'); const token = (await csrf.json())?.token; const headers = {}; if (token && token !== 'disabled') headers['x-csrf-token'] = token; const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/character-association-audit/read', { method: 'POST', headers, body: '{}' }); const body = await response.json(); if (!response.ok || body?.ok !== true || !Array.isArray(body.entries)) return Object.freeze({ state: 'REFUSED', reason: body?.code || 'ASSOCIATION_AUDIT_READ_FAILED', entries: Object.freeze([]) }); return Object.freeze({ state: 'ENTRIES', entries: Object.freeze(body.entries.map((entry) => Object.freeze({ ...entry }))) }); } catch { return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_AUDIT_READ_FAILED', entries: Object.freeze([]) }); }
}
