import { createShardwrightPlanningRequest } from './shardwright-context-planning.js';

export function createHostRecallPlanningRequest({ invocation, hostContext = {}, requestId = invocation?.context?.generationId } = {}) {
    if (invocation?.state !== 'ELIGIBLE' || !invocation.context) return Object.freeze({ state: 'REFUSED', reason: invocation?.reason || 'INVOCATION_CONTEXT_UNAVAILABLE' });
    const context = invocation.context;
    const request = createShardwrightPlanningRequest({
        requestId,
        api: hostContext.mainApi,
        tokenizerModel: hostContext.tokenizerModel,
        contextWindowTokens: hostContext.maxContext,
        characterInstanceId: context.characterInstanceId,
        queryText: context.queryText,
    });
    if (!request) return Object.freeze({ state: 'REFUSED', reason: 'PLANNING_REQUEST_UNAVAILABLE' });
    return Object.freeze({ state: 'READY', request });
}
