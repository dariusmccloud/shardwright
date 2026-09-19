export async function requestTranscriptCoverage(characterInstanceId, fetchImpl = globalThis.fetch) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim() || typeof fetchImpl !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'COVERAGE_INPUT_INVALID' });
    try {
        const csrf = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrf.ok ? await csrf.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/projection/coverage', { method: 'POST', headers, body: JSON.stringify({ characterInstanceId }) });
        const result = await response.json();
        if (response.ok && result?.ok === true) {
            const { ok, ...payload } = result;
            return Object.freeze(payload);
        }
        return Object.freeze({ state: 'REFUSED', reason: 'COVERAGE_ROUTE_REFUSED' });
    } catch { return Object.freeze({ state: 'REFUSED', reason: 'COVERAGE_ROUTE_UNAVAILABLE' }); }
}
