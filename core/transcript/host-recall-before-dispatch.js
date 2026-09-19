import { replaceTranscriptRecallSentinel, verifyTranscriptRecallReplacement, TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

export const HostRecallBeforeDispatchState = Object.freeze({
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    REFUSED: 'REFUSED',
    INJECTED: 'INJECTED',
});

function result(state, reason, extra = {}) {
    return Object.freeze({ state, reason, ...extra });
}

export async function handleHostRecallBeforeDispatch(payload, {
    dryRun = payload?.dryRun,
    getInvocation,
    prepare,
    recordResult,
    sentinel = TRANSCRIPT_RECALL_SENTINEL,
} = {}) {
    if (dryRun === true) return result(HostRecallBeforeDispatchState.NOT_APPLICABLE, 'DRY_RUN');
    if (!payload || typeof payload !== 'object' || !payload.generateData) return result(HostRecallBeforeDispatchState.REFUSED, 'DISPATCH_PAYLOAD_UNAVAILABLE');
    const invocation = typeof getInvocation === 'function' ? getInvocation() : null;
    if (!invocation || invocation.state !== 'ELIGIBLE') return result(HostRecallBeforeDispatchState.REFUSED, invocation?.reason || 'INVOCATION_CONTEXT_UNAVAILABLE');
    if (typeof prepare !== 'function') return result(HostRecallBeforeDispatchState.REFUSED, 'PLANNER_UNAVAILABLE');
    let prepared;
    try { prepared = await prepare({ invocation, payload }); } catch { prepared = null; }
    if (!prepared || prepared.state !== 'APPROVED' || typeof prepared.bundleText !== 'string' || !prepared.bundleText.length) {
        const refused = result(HostRecallBeforeDispatchState.REFUSED, prepared?.reason || 'PLANNING_NOT_APPROVED', { requestId: prepared?.requestId || '' });
        try { recordResult?.(refused); } catch { /* diagnostics are best effort */ }
        return refused;
    }
    const replacement = replaceTranscriptRecallSentinel(payload.generateData, { sentinel, bundleText: prepared.bundleText });
    if (replacement.state !== 'REPLACED') {
        const refused = result(HostRecallBeforeDispatchState.REFUSED, replacement.reason, { requestId: prepared.requestId || '' });
        try { recordResult?.(refused); } catch { /* diagnostics are best effort */ }
        return refused;
    }
    const postcondition = verifyTranscriptRecallReplacement(payload.generateData, { sentinel, bundleText: prepared.bundleText });
    if (postcondition.state !== 'VERIFIED') {
        const refused = result(HostRecallBeforeDispatchState.REFUSED, postcondition.reason, { requestId: prepared.requestId || '' });
        try { recordResult?.(refused); } catch { /* diagnostics are best effort */ }
        return refused;
    }
    const injected = result(HostRecallBeforeDispatchState.INJECTED, 'SENTINEL_REPLACED_AND_VERIFIED', { requestId: prepared.requestId || '', bundleHash: prepared.bundleHash || null });
    try { recordResult?.(injected); } catch { /* diagnostics are best effort */ }
    return injected;
}

export function installHostRecallBeforeDispatch({ eventSource, eventType, getInvocation, prepare, recordResult, sentinel = TRANSCRIPT_RECALL_SENTINEL } = {}) {
    if (!eventSource || typeof eventSource.on !== 'function' || !eventType) return false;
    const handler = (payload) => handleHostRecallBeforeDispatch(payload, { getInvocation, prepare, recordResult, sentinel });
    if (typeof eventSource.makeLast === 'function') eventSource.makeLast(eventType, handler);
    else eventSource.on(eventType, handler);
    return true;
}
