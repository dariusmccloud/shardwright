// Read-only prompt-capacity accounting. Host measurements and explicit safety headroom are
// inputs; this module never guesses tokens, persists settings, selects anchors, or injects.

import { createError } from './core.js';

function nonNegative(value, field) {
    if (!Number.isInteger(value) || value < 0) throw createError(400, `${field} must be a non-negative measured token value.`, 'TIR_BUDGET_INPUT_INVALID');
    return value;
}

export function preflightTranscriptCapacity(input) {
    if (!input?.measurementAvailable) return Object.freeze({ state: 'BUDGET_UNAVAILABLE', reason: 'MEASUREMENT_UNAVAILABLE' });
    const contextWindowTokens = nonNegative(input.contextWindowTokens, 'contextWindowTokens');
    const livePromptTokens = nonNegative(input.livePromptTokens, 'livePromptTokens');
    const retrievalCeilingTokens = nonNegative(input.retrievalCeilingTokens, 'retrievalCeilingTokens');
    const safetyHeadroomTokens = nonNegative(input.safetyHeadroomTokens, 'safetyHeadroomTokens');
    const requiredBundleTokens = nonNegative(input.requiredBundleTokens, 'requiredBundleTokens');
    const measuredRemainingTokens = Math.max(0, contextWindowTokens - livePromptTokens - safetyHeadroomTokens);
    const usableRetrievalTokens = Math.min(retrievalCeilingTokens, measuredRemainingTokens);
    const state = requiredBundleTokens <= usableRetrievalTokens ? 'CAPACITY_AVAILABLE' : 'BUNDLE_OVER_CAPACITY';
    return Object.freeze({ state, contextWindowTokens, livePromptTokens, safetyHeadroomTokens, measuredRemainingTokens, retrievalCeilingTokens, usableRetrievalTokens, requiredBundleTokens, shortfallTokens: Math.max(0, requiredBundleTokens - usableRetrievalTokens) });
}
