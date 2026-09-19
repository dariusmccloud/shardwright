// Generation-scoped coordinator for the host-owned recall dispatch seam.
// It does not select, rewrite, or persist recall material; injected callbacks
// remain responsible for the already-governed planner/materializer boundaries.

export const HostRecallDispatchState = Object.freeze({
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    REFUSED: 'REFUSED',
    DISPATCHED: 'DISPATCHED',
});

function result(state, reason, extra = {}) {
    return Object.freeze({ state, reason, ...extra });
}

export async function composeHostRecallDispatch({
    invocation,
    prepare,
    materialize,
    recordSnapshot,
    dispatch,
} = {}) {
    if (invocation?.state === 'NOT_APPLICABLE') return result(HostRecallDispatchState.NOT_APPLICABLE, invocation.reason || 'GENERATION_NOT_APPLICABLE');
    if (invocation?.state !== 'ELIGIBLE') return result(HostRecallDispatchState.REFUSED, invocation?.reason || 'INVOCATION_CONTEXT_UNAVAILABLE');
    if (typeof prepare !== 'function' || typeof materialize !== 'function' || typeof dispatch !== 'function') {
        return result(HostRecallDispatchState.REFUSED, 'COMPOSITION_CALLBACK_UNAVAILABLE');
    }

    let prepared;
    try { prepared = await prepare(invocation.context); } catch { return result(HostRecallDispatchState.REFUSED, 'PLANNING_FAILED'); }
    if (!prepared || prepared.state !== 'APPROVED' || !prepared.request || !prepared.proposal) {
        return result(HostRecallDispatchState.REFUSED, prepared?.reason || 'PLANNING_NOT_APPROVED');
    }

    let materialized;
    try { materialized = await materialize(prepared); } catch { return result(HostRecallDispatchState.REFUSED, 'DISPATCH_MATERIALIZATION_FAILED', { requestId: prepared.request.requestId || '' }); }
    if (!materialized || materialized.state !== 'MATERIALIZED' || !Array.isArray(materialized.prompt)) {
        return result(HostRecallDispatchState.REFUSED, materialized?.reason || 'DISPATCH_MATERIALIZATION_REFUSED', { requestId: prepared.request.requestId || '' });
    }

    if (typeof recordSnapshot === 'function') {
        try { await recordSnapshot({ prepared, materialized }); } catch { return result(HostRecallDispatchState.REFUSED, 'DISPATCH_SNAPSHOT_FAILED', { requestId: prepared.request.requestId || '' }); }
    }

    try {
        await dispatch(materialized.prompt, { invocation: invocation.context, request: prepared.request });
        return result(HostRecallDispatchState.DISPATCHED, 'EXACT_APPROVED_BUNDLE_DISPATCHED', { requestId: prepared.request.requestId || '' });
    } catch {
        return result(HostRecallDispatchState.REFUSED, 'PROVIDER_DISPATCH_FAILED', { requestId: prepared.request.requestId || '' });
    }
}
