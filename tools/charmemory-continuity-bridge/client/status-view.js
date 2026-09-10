import { BridgeStatus } from './diagnostics.js';

function duration(value) {
    return Number.isFinite(value) ? `${value} ms` : '—';
}

export function describeStatus(snapshot) {
    switch (snapshot.status) {
    case BridgeStatus.INJECTED:
        return { tone: 'success', text: `Injected ${snapshot.injectedCount} of ${snapshot.matchedCount} matching ${snapshot.matchedCount === 1 ? 'memory' : 'memories'} · ${snapshot.rerankerApplied ? 'reranked' : 'FTS order'} · sync ${duration(snapshot.syncElapsedMs)} · retrieval ${duration(snapshot.retrievalElapsedMs)}` };
    case BridgeStatus.NO_MATCHES:
        return { tone: 'neutral', text: `No matching continuity · sync ${duration(snapshot.syncElapsedMs)} · retrieval ${duration(snapshot.retrievalElapsedMs)}` };
    case BridgeStatus.NO_SOURCE:
        return { tone: 'warning', text: 'Continuity unavailable · no memory source found' };
    case BridgeStatus.NO_QUERY:
        return { tone: 'neutral', text: 'Continuity waiting · no chat query yet' };
    case BridgeStatus.WAITING_FOR_HANDOFF:
        return { tone: 'warning', text: 'Continuity waiting · Data Bank handoff required' };
    case BridgeStatus.RETRIEVING:
        return { tone: 'neutral', text: `Retrieving continuity · ${snapshot.sourceName || 'memory source'}` };
    case BridgeStatus.REFUSED:
        return { tone: 'warning', text: `Continuity refused · ${snapshot.refusalReason || 'unsafe operation'}` };
    case BridgeStatus.ERROR:
        return { tone: 'error', text: `Continuity error · ${snapshot.lastError || 'retrieval failed'}` };
    case BridgeStatus.DISABLED:
        return { tone: 'neutral', text: 'Continuity bridge disabled' };
    default:
        return { tone: 'neutral', text: 'Continuity waiting for next reply' };
    }
}
