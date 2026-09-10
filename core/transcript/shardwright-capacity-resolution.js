function isNonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function frozenResult(state, reason, fields = {}) {
    return Object.freeze({ state, reason, ...fields });
}

/**
 * Derives the only expansion that can make an exact measured bundle fit. This
 * receives host-owned limits; it does not read extension settings or the DOM.
 */
export function createShardwrightCapacityResolution({ receipt, activeOutputTokenLimit, providerContextLimit }) {
    if (!receipt || receipt.state !== 'BUNDLE_OVER_CAPACITY'
        || !isNonNegativeSafeInteger(receipt.baselinePromptTokens)
        || !isNonNegativeSafeInteger(receipt.contributionTokens)
        || !isNonNegativeSafeInteger(receipt.safetyHeadroomTokens)
        || !isNonNegativeSafeInteger(activeOutputTokenLimit)) {
        return frozenResult('EXPANSION_UNAVAILABLE', 'CAPACITY_RECEIPT_INVALID');
    }
    if (!Number.isSafeInteger(providerContextLimit) || providerContextLimit <= 0) {
        return frozenResult('EXPANSION_UNAVAILABLE', 'HOST_CONTEXT_LIMIT_UNAVAILABLE');
    }
    const requiredPromptTokenCeiling = receipt.baselinePromptTokens
        + receipt.contributionTokens
        + receipt.safetyHeadroomTokens;
    const requiredHostContextLimit = requiredPromptTokenCeiling + activeOutputTokenLimit;
    if (!Number.isSafeInteger(requiredHostContextLimit) || requiredHostContextLimit > providerContextLimit) {
        return frozenResult('EXPANSION_UNAVAILABLE', 'PROVIDER_CONTEXT_LIMIT_EXCEEDED', {
            requiredPromptTokenCeiling,
            requiredHostContextLimit,
            providerContextLimit,
        });
    }
    return frozenResult('EXPANSION_AVAILABLE', 'EXACT_EXPANSION_AVAILABLE', {
        requestId: receipt.requestId,
        requiredPromptTokenCeiling,
        requiredHostContextLimit,
        providerContextLimit,
    });
}

/** A one-shot retry may offer capacity resolution only before its override is consumed. */
export function getShardwrightCapacityRetryDisposition({ receipt, retryOverrideConsumed = false }) {
    if (receipt?.state !== 'BUNDLE_OVER_CAPACITY') return null;
    if (retryOverrideConsumed) {
        return frozenResult('EXPANSION_EXHAUSTED', 'ONE_SHOT_EXPANSION_ALREADY_CONSUMED', {
            requestId: receipt.requestId,
        });
    }
    return frozenResult('EXPANSION_OFFERABLE', 'ONE_SHOT_EXPANSION_AVAILABLE', {
        requestId: receipt.requestId,
    });
}
