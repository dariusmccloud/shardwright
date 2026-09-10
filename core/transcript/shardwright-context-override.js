let pendingOverride = null;

function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function frozenResult(state, reason, fields = {}) {
    return Object.freeze({ state, reason, ...fields });
}

/**
 * Arms exactly one host-runtime prompt-ceiling override for a fresh generation.
 * This state is deliberately not persisted and must be consumed or explicitly
 * cleared by the host's retry transaction.
 */
export function armShardwrightOneShotContextOverride({ retryId, promptTokenCeiling }) {
    if (typeof retryId !== 'string' || !retryId.trim() || !isPositiveSafeInteger(promptTokenCeiling)) {
        return frozenResult('REFUSED', 'OVERRIDE_INPUT_INVALID');
    }
    if (pendingOverride) return frozenResult('REFUSED', 'OVERRIDE_ALREADY_ARMED');
    pendingOverride = Object.freeze({ retryId, promptTokenCeiling });
    return frozenResult('ARMED', 'ONE_SHOT_OVERRIDE_ARMED', pendingOverride);
}

/**
 * Consumes the override before host context selection. Consumption is destructive:
 * a later generation must be armed by a new retry transaction.
 */
export function consumeShardwrightOneShotContextOverride(retryId = null) {
    if (!pendingOverride) return null;
    if (retryId !== pendingOverride.retryId) return null;
    const override = pendingOverride;
    pendingOverride = null;
    return override;
}

/** Clears an unconsumed override when its retry transaction is cancelled or fails. */
export function clearShardwrightOneShotContextOverride(retryId = null) {
    if (!pendingOverride) return frozenResult('CLEARED', 'NO_OVERRIDE_ARMED');
    if (retryId !== null && retryId !== pendingOverride.retryId) {
        return frozenResult('REFUSED', 'OVERRIDE_RETRY_BINDING_MISMATCH');
    }
    const cleared = pendingOverride;
    pendingOverride = null;
    return frozenResult('CLEARED', 'ONE_SHOT_OVERRIDE_CLEARED', cleared);
}

export function getShardwrightOneShotContextOverrideForTest() {
    return pendingOverride;
}
