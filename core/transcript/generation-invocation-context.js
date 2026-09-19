// Host generation-boundary adapter. It captures immutable invocation context at
// GENERATION_AFTER_COMMANDS before any asynchronous Shardwright work begins.

import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';

export const TranscriptGenerationState = Object.freeze({
    ELIGIBLE: 'ELIGIBLE',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    REFUSED: 'REFUSED',
});
let latestInvocation = null;
let latestDispatchInvocation = null;

function freezeContext(value) {
    const context = {
        generationId: value.generationId,
        generationType: value.generationType,
        characterInstanceId: value.characterInstanceId,
        sourceMessageId: value.sourceMessageId,
        chatId: value.chatId,
    };
    if (typeof value.queryText === 'string' && value.queryText.trim()) context.queryText = value.queryText.trim();
    return Object.freeze(context);
}

export function captureTranscriptGenerationInvocation({ eventType, options, dryRun = false, resolveContext, isEligible } = {}) {
    if (dryRun) return Object.freeze({ state: TranscriptGenerationState.NOT_APPLICABLE, reason: 'DRY_RUN' });
    if (typeof isEligible !== 'function' || isEligible(options) !== true) {
        return Object.freeze({ state: TranscriptGenerationState.NOT_APPLICABLE, reason: 'GENERATION_TYPE_NOT_ELIGIBLE' });
    }
    if (typeof resolveContext !== 'function') return Object.freeze({ state: TranscriptGenerationState.REFUSED, reason: 'INVOCATION_CONTEXT_RESOLVER_UNAVAILABLE' });
    let resolved;
    try { resolved = resolveContext(options); } catch { return Object.freeze({ state: TranscriptGenerationState.REFUSED, reason: 'INVOCATION_CONTEXT_RESOLUTION_FAILED' }); }
    if (!resolved || typeof resolved !== 'object') return Object.freeze({ state: TranscriptGenerationState.REFUSED, reason: 'INVOCATION_CONTEXT_UNAVAILABLE' });
    if (resolved.state === TranscriptGenerationState.REFUSED) return Object.freeze({ state: TranscriptGenerationState.REFUSED, reason: resolved.reason || 'INVOCATION_CONTEXT_UNAVAILABLE' });
    if (resolved.context && typeof resolved.context === 'object') resolved = resolved.context;
    const required = ['generationId', 'generationType', 'characterInstanceId', 'sourceMessageId', 'chatId'];
    if (required.some((key) => typeof resolved[key] !== 'string' || resolved[key].trim() === '')) {
        return Object.freeze({ state: TranscriptGenerationState.REFUSED, reason: 'INVOCATION_CONTEXT_INCOMPLETE' });
    }
    return Object.freeze({ state: TranscriptGenerationState.ELIGIBLE, eventType: String(eventType || ''), context: freezeContext(resolved) });
}

export function getLatestTranscriptGenerationInvocation() { return latestInvocation; }
export function getLatestTranscriptGenerationDispatchInvocation() { return latestDispatchInvocation; }
export function clearLatestTranscriptGenerationInvocation() { latestInvocation = null; latestDispatchInvocation = null; }

export function installTranscriptGenerationInvocationCapability(target = globalThis) {
    const namespace = ensureShardwrightNamespace('transcript', target);
    namespace.getLastGenerationInvocation = getLatestTranscriptGenerationInvocation;
    namespace.getLastGenerationDispatchInvocation = getLatestTranscriptGenerationDispatchInvocation;
    namespace.clearLastGenerationInvocation = clearLatestTranscriptGenerationInvocation;
    return namespace;
}

export function installTranscriptGenerationInvocationAdapter({ eventSource, eventType, resolveContext, isEligible, onInvocation } = {}) {
    if (!eventSource || typeof eventSource.on !== 'function' || typeof onInvocation !== 'function' || !eventType) return false;
    eventSource.on(eventType, (type, options, dryRun) => {
        // Capture happens synchronously in the event callback; only the handler may await.
        const invocation = captureTranscriptGenerationInvocation({ eventType: type || eventType, options, dryRun, resolveContext, isEligible });
        latestInvocation = invocation;
        if (dryRun !== true) latestDispatchInvocation = invocation;
        try { return onInvocation(invocation); } catch { return undefined; }
    });
    return true;
}
