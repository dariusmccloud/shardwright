import { replaceTranscriptRecallSentinel } from './host-dispatch-sentinel.js';

export async function measureHostRecallProposal({ request, proposal, payload, countPrompt, capacityProfile = proposal?.capacityProfile } = {}) {
    if (!request || !proposal || !payload?.generateData || typeof countPrompt !== 'function' || typeof structuredClone !== 'function'
        || !capacityProfile || !Number.isFinite(capacityProfile.retrievalCeilingTokens) || capacityProfile.retrievalCeilingTokens < 0
        || !Number.isFinite(capacityProfile.safetyHeadroomTokens) || capacityProfile.safetyHeadroomTokens < 0) {
        return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: 'MEASUREMENT_INPUT_INVALID', requestId: request?.requestId || '' });
    }
    let baselinePrompt;
    let candidatePrompt;
    try {
        baselinePrompt = structuredClone(payload.generateData.prompt);
        candidatePrompt = structuredClone(payload.generateData.prompt);
    } catch {
        return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: 'HOST_PROMPT_CLONE_FAILED', requestId: request.requestId });
    }
    const candidateData = { prompt: candidatePrompt };
    const replacement = replaceTranscriptRecallSentinel(candidateData, { bundleText: proposal.bundleText });
    if (replacement.state !== 'REPLACED') return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: replacement.reason, requestId: request.requestId });
    candidatePrompt = candidateData.prompt;
    let baselineTokens;
    let finalTokens;
    try {
        [baselineTokens, finalTokens] = await Promise.all([countPrompt(baselinePrompt), countPrompt(candidatePrompt)]);
    } catch {
        return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: 'HOST_TOKENIZER_UNAVAILABLE', requestId: request.requestId });
    }
    if (!Number.isSafeInteger(baselineTokens) || baselineTokens < 0 || !Number.isSafeInteger(finalTokens) || finalTokens < baselineTokens) {
        return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: 'HOST_TOKENIZER_UNAVAILABLE', requestId: request.requestId });
    }
    const contributionTokens = finalTokens - baselineTokens;
    const usable = Math.min(capacityProfile.retrievalCeilingTokens, Math.max(0, request.contextWindowTokens - baselineTokens - capacityProfile.safetyHeadroomTokens));
    const base = { requestId: request.requestId, injectionTarget: proposal.injectionTarget, bundleHash: proposal.bundleHash, baselinePromptTokens: baselineTokens, finalPromptTokens: finalTokens, contributionTokens, usableRetrievalTokens: usable };
    return Object.freeze(contributionTokens <= usable && finalTokens <= request.contextWindowTokens
        ? { state: 'APPROVED', reason: 'EXACT_CAPACITY_APPROVED', ...base, bundleText: proposal.bundleText }
        : { state: 'BUNDLE_OVER_CAPACITY', reason: 'EXACT_CAPACITY_EXCEEDED', ...base, bundleText: proposal.bundleText });
}
