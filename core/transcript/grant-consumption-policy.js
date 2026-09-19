/**
 * Pure one-time grant consumption guard.
 * Durable atomicity belongs to the future grant ledger; this module only
 * defines the fail-closed state transition that the ledger must enforce.
 */

const CONSUMABLE_STATE = 'AVAILABLE';

function refusal(reason, extra = {}) {
    return Object.freeze({ state: 'REFUSED', reason, ...extra });
}

export function consumeOneTimeGrant({ grantType, grantState, grantId } = {}) {
    if (grantType !== 'ONE_TIME') return refusal('GRANT_TYPE_NOT_ONE_TIME');
    if (typeof grantId !== 'string' || !grantId.trim()) return refusal('GRANT_ID_UNAVAILABLE');
    if (grantState !== CONSUMABLE_STATE) {
        return refusal('ONE_TIME_GRANT_NOT_CONSUMABLE', { grantId, grantState });
    }
    return Object.freeze({ state: 'CONSUMED', grantId, previousState: CONSUMABLE_STATE, nextState: 'CONSUMED' });
}
