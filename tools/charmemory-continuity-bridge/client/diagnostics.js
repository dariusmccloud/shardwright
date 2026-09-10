export const BridgeStatus = Object.freeze({
    DISABLED: 'DISABLED',
    NO_SOURCE: 'NO_SOURCE',
    NO_QUERY: 'NO_QUERY',
    WAITING_FOR_HANDOFF: 'WAITING_FOR_HANDOFF',
    RETRIEVING: 'RETRIEVING',
    NO_MATCHES: 'NO_MATCHES',
    INJECTED: 'INJECTED',
    REFUSED: 'REFUSED',
    ERROR: 'ERROR',
});

export function createDiagnostics() {
    return {
        // No lookup has occurred at startup. Do not present this as a failed source
        // resolution; the status line renderer treats null as "waiting for next reply".
        status: null,
        sourceIdentity: null,
        sourceName: null,
        sourceHash: null,
        sourceRevisionCount: null,
        queryPresent: false,
        matchedCount: 0,
        injectedCount: 0,
        syncElapsedMs: null,
        retrievalElapsedMs: null,
        rerankerApplied: false,
        rerankerReason: null,
        rerankerElapsedMs: null,
        lastError: null,
        refusalReason: null,
    };
}

export function updateDiagnostics(current, patch) {
    Object.assign(current, patch);
    return Object.freeze({ ...current });
}

export function isBridgeRefusal(error) {
    return typeof error?.code === 'string'
        && error.code.startsWith('CONTINUITY_')
        && error.code !== 'CONTINUITY_UNEXPECTED';
}
