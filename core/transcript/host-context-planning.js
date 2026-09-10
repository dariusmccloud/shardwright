import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';

export const TRANSCRIPT_RECALL_PLANNING_TARGET = Object.freeze({
    kind: 'extension_prompt',
    tag: '5_shardwright_transcript_recall',
});

let latestPlanResult = Object.freeze({ state: 'NOT_REQUESTED' });
let latestDispatchSnapshot = null;

function isMatchingPlanningRequest(request) {
    return Boolean(request
        && typeof request === 'object'
        && Object.isFrozen(request)
        && request.measurementStage === 'PRE_DISPATCH_PLAN'
        && typeof request.requestId === 'string'
        && request.requestId.trim().length > 0
        && request.injectionTarget?.kind === TRANSCRIPT_RECALL_PLANNING_TARGET.kind
        && request.injectionTarget?.tag === TRANSCRIPT_RECALL_PLANNING_TARGET.tag);
}

export function declineTranscriptRecallPlan(request, reason = 'NO_TRANSCRIPT_PROPOSAL') {
    if (!isMatchingPlanningRequest(request)) {
        latestPlanResult = Object.freeze({ state: 'PROPOSAL_INVALID', reason: 'PLANNING_REQUEST_INVALID' });
        return latestPlanResult;
    }
    latestPlanResult = Object.freeze({
        state: 'DECLINED',
        reason,
        requestId: request.requestId,
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
    });
    return latestPlanResult;
}

export function getLatestTranscriptRecallPlanResult() {
    return latestPlanResult;
}

function freezeClone(value) {
    if (typeof structuredClone !== 'function') throw new TypeError('STRUCTURED_CLONE_UNAVAILABLE');
    const copy = structuredClone(value);
    const visit = (entry) => {
        if (!entry || typeof entry !== 'object' || Object.isFrozen(entry)) return entry;
        for (const child of Object.values(entry)) visit(child);
        return Object.freeze(entry);
    };
    return visit(copy);
}

export function getLatestTranscriptRecallDispatchSnapshot() {
    return latestDispatchSnapshot;
}

export function clearTranscriptRecallDispatchSnapshot() {
    latestDispatchSnapshot = null;
    return latestDispatchSnapshot;
}

export function recordHostTranscriptRecallDispatchSnapshot({ context, prompt, promptTokens = null } = {}) {
    const validContext = context && Object.isFrozen(context)
        && typeof context.requestId === 'string' && context.requestId.trim()
        && context.injectionTarget?.kind === TRANSCRIPT_RECALL_PLANNING_TARGET.kind
        && context.injectionTarget?.tag === TRANSCRIPT_RECALL_PLANNING_TARGET.tag
        && /^sha256:[0-9a-f]{64}$/u.test(context.bundleHash || '')
        && typeof context.bundleText === 'string' && context.bundleText.length;
    if (!validContext || !Array.isArray(prompt)) {
        latestDispatchSnapshot = Object.freeze({ state: 'SNAPSHOT_UNAVAILABLE', reason: 'DISPATCH_SNAPSHOT_INPUT_INVALID' });
        return latestDispatchSnapshot;
    }
    try {
        const snapshotPrompt = freezeClone(prompt);
        const bundlePresent = snapshotPrompt.some((message) => typeof message?.content === 'string'
            && message.content.includes(context.bundleText));
        if (!bundlePresent) {
            latestDispatchSnapshot = Object.freeze({ state: 'SNAPSHOT_UNAVAILABLE', reason: 'BUNDLE_NOT_IN_FINAL_PROMPT' });
            return latestDispatchSnapshot;
        }
        latestDispatchSnapshot = Object.freeze({
            state: 'DISPATCH_SNAPSHOT',
            requestId: context.requestId,
            injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
            bundleHash: context.bundleHash,
            promptTokens: Number.isSafeInteger(promptTokens) && promptTokens >= 0 ? promptTokens : null,
            bundlePresent: true,
            prompt: snapshotPrompt,
        });
        return latestDispatchSnapshot;
    } catch {
        latestDispatchSnapshot = Object.freeze({ state: 'SNAPSHOT_UNAVAILABLE', reason: 'DISPATCH_SNAPSHOT_CLONE_FAILED' });
        return latestDispatchSnapshot;
    }
}

export function recordHostTranscriptRecallPlanResult(result) {
    const validState = result?.state === 'DECLINED'
        || result?.state === 'PROPOSAL_INVALID'
        || result?.state === 'BUDGET_UNAVAILABLE'
        || result?.state === 'PROPOSAL'
        || result?.state === 'BUNDLE_OVER_CAPACITY'
        || result?.state === 'APPROVED';
    const validTarget = result?.injectionTarget?.kind === TRANSCRIPT_RECALL_PLANNING_TARGET.kind
        && result?.injectionTarget?.tag === TRANSCRIPT_RECALL_PLANNING_TARGET.tag;
    if (!Object.isFrozen(result) || !validState || !validTarget) {
        latestPlanResult = Object.freeze({
            state: 'PROPOSAL_INVALID',
            reason: 'HOST_PLANNING_RESULT_INVALID',
        });
        return latestPlanResult;
    }
    latestPlanResult = result;
    return latestPlanResult;
}

export function installTranscriptRecallPlanningDeclineCapability(target = globalThis) {
    const namespace = ensureShardwrightNamespace('contextPlanning', target);
    if (namespace.plan !== undefined && namespace.plan !== declineTranscriptRecallPlan) {
        throw new Error('Shardwright context-planning capability is already owned by an incompatible handler.');
    }
    if (namespace.getLastResult !== undefined && namespace.getLastResult !== getLatestTranscriptRecallPlanResult) {
        throw new Error('Shardwright context-planning diagnostics are already owned by an incompatible handler.');
    }
    if ((namespace.getLastDispatchSnapshot !== undefined && namespace.getLastDispatchSnapshot !== getLatestTranscriptRecallDispatchSnapshot)
        || (namespace.recordHostDispatchSnapshot !== undefined && namespace.recordHostDispatchSnapshot !== recordHostTranscriptRecallDispatchSnapshot)
        || (namespace.clearLastDispatchSnapshot !== undefined && namespace.clearLastDispatchSnapshot !== clearTranscriptRecallDispatchSnapshot)) {
        throw new Error('Shardwright context-planning dispatch diagnostics are already owned by an incompatible handler.');
    }
    namespace.plan = declineTranscriptRecallPlan;
    namespace.getLastResult = getLatestTranscriptRecallPlanResult;
    namespace.recordHostResult = recordHostTranscriptRecallPlanResult;
    namespace.getLastDispatchSnapshot = getLatestTranscriptRecallDispatchSnapshot;
    namespace.recordHostDispatchSnapshot = recordHostTranscriptRecallDispatchSnapshot;
    namespace.clearLastDispatchSnapshot = clearTranscriptRecallDispatchSnapshot;
    return namespace.plan;
}
