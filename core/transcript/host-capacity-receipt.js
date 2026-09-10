// Read-only bridge from the host's pre-dispatch capacity receipt. This module never
// persists a receipt, estimates token counts, selects evidence, or changes a prompt.

const RECEIPT_SCHEMA_VERSION = 1;

function unavailable(reason) {
    return Object.freeze({
        state: 'BUDGET_UNAVAILABLE',
        reason,
    });
}

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

let latestReceipt = unavailable('NO_HOST_RECEIPT');

/**
 * Validate and normalize one host-owned pre-dispatch capacity receipt.
 * Invalid or unavailable host material never receives a guessed substitute.
 *
 * @param {unknown} receipt
 * @returns {Readonly<object>}
 */
export function normalizeHostCapacityReceipt(receipt) {
    if (!receipt || typeof receipt !== 'object' || !Object.isFrozen(receipt)) {
        return unavailable('HOST_RECEIPT_INVALID');
    }
    if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION || receipt.measurementStage !== 'PRE_DISPATCH' || !isNonEmptyString(receipt.api)) {
        return unavailable('HOST_RECEIPT_INVALID');
    }
    if (receipt.measurementState === 'BUDGET_UNAVAILABLE') {
        if (!isNonEmptyString(receipt.refusalReason)) return unavailable('HOST_RECEIPT_INVALID');
        return Object.freeze({
            state: 'BUDGET_UNAVAILABLE',
            reason: receipt.refusalReason,
            api: receipt.api,
            measurementStage: receipt.measurementStage,
        });
    }
    if (receipt.measurementState !== 'MEASURED'
        || !isNonEmptyString(receipt.tokenizerModel)
        || !isNonNegativeInteger(receipt.promptTokens)
        || !isNonNegativeInteger(receipt.promptTokenCeiling)) {
        return unavailable('HOST_RECEIPT_INVALID');
    }
    return Object.freeze({
        state: 'MEASURED',
        api: receipt.api,
        tokenizerModel: receipt.tokenizerModel,
        promptTokens: receipt.promptTokens,
        promptTokenCeiling: receipt.promptTokenCeiling,
        measurementStage: receipt.measurementStage,
    });
}

/**
 * Receive the third argument of SillyTavern's GENERATE_AFTER_DATA event.
 * The generation payload and dry-run flag are intentionally irrelevant here.
 *
 * @param {unknown} _generationData
 * @param {unknown} _dryRun
 * @param {unknown} receipt
 * @returns {Readonly<object>}
 */
export function observeHostCapacityReceipt(_generationData, _dryRun, receipt) {
    latestReceipt = normalizeHostCapacityReceipt(receipt);
    return latestReceipt;
}

/**
 * Register the read-only consumer on the host's existing event surface.
 *
 * @param {{ on?: Function }} eventSource
 * @param {unknown} eventType
 * @returns {boolean}
 */
export function registerHostCapacityReceiptObserver(eventSource, eventType) {
    if (!eventSource || typeof eventSource.on !== 'function' || !eventType) return false;
    eventSource.on(eventType, observeHostCapacityReceipt);
    return true;
}

/**
 * @returns {Readonly<object>}
 */
export function getLatestHostCapacityReceipt() {
    return latestReceipt;
}

export function resetHostCapacityReceiptForTest() {
    latestReceipt = unavailable('NO_HOST_RECEIPT');
}
