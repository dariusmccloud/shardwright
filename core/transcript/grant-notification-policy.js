/**
 * Pure notification decisions for timed grants.
 * This module does not persist reminder state, render UI, or send notices.
 */

export const GRANT_REMINDER_LEAD_MS = 60 * 60 * 1000;

function refusal(reason) {
    return Object.freeze({ state: 'REFUSED', reason });
}

function finiteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Decide whether a single pre-expiration reminder is due.
 * `reminderSent` is supplied by the caller's durable state; this function does
 * not mutate or infer it.
 */
export function getGrantNotificationDecision({ nowMs, expiresAtMs, reminderSent = false } = {}) {
    if (!finiteNonNegative(nowMs) || !finiteNonNegative(expiresAtMs)) return refusal('NOTIFICATION_TIME_INVALID');
    if (typeof reminderSent !== 'boolean') return refusal('REMINDER_STATE_INVALID');
    if (nowMs >= expiresAtMs) {
        return Object.freeze({ state: 'EXPIRED', silent: true, actionRequired: false, reminderDue: false });
    }
    const reminderDue = !reminderSent && nowMs >= expiresAtMs - GRANT_REMINDER_LEAD_MS;
    if (reminderDue) {
        return Object.freeze({
            state: 'REMINDER_DUE',
            silent: false,
            actionRequired: true,
            allowInaction: true,
            reminderDue: true,
            expiresAtMs,
        });
    }
    return Object.freeze({ state: 'ACTIVE', silent: true, actionRequired: false, reminderDue: false, expiresAtMs });
}
