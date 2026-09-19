/**
 * Pure policy helpers for grant duration and deliberate extension.
 * This module does not issue grants, persist state, or send notifications.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const GRANT_DURATION_POLICY = Object.freeze({
    ONE_TIME: Object.freeze({ defaultDurationMs: null, maximumDurationMs: null, singleAccess: true }),
    FINDING: Object.freeze({ defaultDurationMs: 8 * HOUR_MS, maximumDurationMs: 7 * DAY_MS, singleAccess: false }),
    TOPIC: Object.freeze({ defaultDurationMs: 8 * HOUR_MS, maximumDurationMs: 7 * DAY_MS, singleAccess: false }),
    TIME_RANGE: Object.freeze({ defaultDurationMs: 8 * HOUR_MS, maximumDurationMs: 7 * DAY_MS, singleAccess: false }),
    MESSAGE: Object.freeze({ defaultDurationMs: 8 * HOUR_MS, maximumDurationMs: 3 * DAY_MS, singleAccess: false }),
    FULL_CHAT: Object.freeze({ defaultDurationMs: 1 * HOUR_MS, maximumDurationMs: 24 * HOUR_MS, singleAccess: false }),
});

function refusal(reason, extra = {}) {
    return Object.freeze({ state: 'REFUSED', reason, ...extra });
}

function policyFor(grantType) {
    return GRANT_DURATION_POLICY[grantType] ?? null;
}

function finiteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getGrantDurationPolicy(grantType) {
    const policy = policyFor(grantType);
    return policy ? Object.freeze({ grantType, ...policy }) : null;
}

export function validateGrantDuration({ grantType, durationMs } = {}) {
    const policy = policyFor(grantType);
    if (!policy) return refusal('GRANT_TYPE_INVALID');
    if (policy.singleAccess) {
        return durationMs === null || durationMs === undefined
            ? Object.freeze({ state: 'VALID', grantType, singleAccess: true, durationMs: null })
            : refusal('ONE_TIME_DURATION_NOT_APPLICABLE', { grantType });
    }
    if (!finiteNonNegative(durationMs) || durationMs === 0) return refusal('DURATION_INVALID', { grantType });
    if (durationMs > policy.maximumDurationMs) return refusal('DURATION_EXCEEDS_MAXIMUM', { grantType, maximumDurationMs: policy.maximumDurationMs });
    return Object.freeze({ state: 'VALID', grantType, singleAccess: false, durationMs, maximumDurationMs: policy.maximumDurationMs });
}

export function getDefaultGrantDuration(grantType) {
    const policy = policyFor(grantType);
    if (!policy) return refusal('GRANT_TYPE_INVALID');
    return Object.freeze({ state: 'DEFAULT', grantType, singleAccess: policy.singleAccess, durationMs: policy.defaultDurationMs });
}

export function calculateGrantExtension({ grantType, issuedAtMs, currentExpirationMs, extensionMs, nowMs } = {}) {
    const policy = policyFor(grantType);
    if (!policy) return refusal('GRANT_TYPE_INVALID');
    if (policy.singleAccess) return refusal('ONE_TIME_EXTENSION_NOT_APPLICABLE', { grantType });
    if (!finiteNonNegative(issuedAtMs) || !finiteNonNegative(currentExpirationMs) || !finiteNonNegative(extensionMs) || !finiteNonNegative(nowMs) || extensionMs === 0) {
        return refusal('EXTENSION_INPUT_INVALID', { grantType });
    }
    if (nowMs >= currentExpirationMs) return refusal('GRANT_EXPIRED', { grantType, currentExpirationMs, nowMs });
    if (currentExpirationMs < issuedAtMs) return refusal('CURRENT_EXPIRATION_INVALID', { grantType });
    const maximumExpirationMs = issuedAtMs + policy.maximumDurationMs;
    const nextExpirationMs = currentExpirationMs + extensionMs;
    if (nextExpirationMs > maximumExpirationMs) {
        return refusal('EXTENSION_EXCEEDS_MAXIMUM', { grantType, maximumExpirationMs, currentExpirationMs });
    }
    return Object.freeze({ state: 'VALID', grantType, startsAtMs: currentExpirationMs, nextExpirationMs, maximumExpirationMs });
}
