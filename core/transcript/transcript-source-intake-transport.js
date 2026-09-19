export async function intakeTranscriptSource(sourceLogicalId, fetchImpl = globalThis.fetch) {
    if (typeof sourceLogicalId !== 'string' || !sourceLogicalId.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_INTAKE_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/sources/intake', { method: 'POST', headers, body: JSON.stringify({ sourceLogicalId, observedAt: new Date().toISOString() }) });
        const result = await response.json();
        return response.ok && result?.ok === true ? Object.freeze(result) : Object.freeze({ state: 'REFUSED', reason: result?.code || 'SOURCE_INTAKE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'SOURCE_INTAKE_ROUTE_UNAVAILABLE' }); }
}
