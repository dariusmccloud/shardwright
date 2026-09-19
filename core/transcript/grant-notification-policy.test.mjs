import test from 'node:test';
import assert from 'node:assert/strict';
import {
    GRANT_REMINDER_LEAD_MS,
    getGrantNotificationDecision,
} from './grant-notification-policy.js';

test('timed grants remain silent before the reminder window', () => {
    const result = getGrantNotificationDecision({ nowMs: 0, expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS });
    assert.deepEqual(result, { state: 'ACTIVE', silent: true, actionRequired: false, reminderDue: false, expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS });
});

test('exactly one decision-based reminder is due at T-1 hour', () => {
    const result = getGrantNotificationDecision({ nowMs: GRANT_REMINDER_LEAD_MS, expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS });
    assert.deepEqual(result, {
        state: 'REMINDER_DUE',
        silent: false,
        actionRequired: true,
        allowInaction: true,
        reminderDue: true,
        expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS,
    });
    assert.equal(getGrantNotificationDecision({ nowMs: GRANT_REMINDER_LEAD_MS, expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS, reminderSent: true }).state, 'ACTIVE');
});

test('expired grants are silently disregarded without escalation', () => {
    assert.deepEqual(getGrantNotificationDecision({ nowMs: 2 * GRANT_REMINDER_LEAD_MS, expiresAtMs: 2 * GRANT_REMINDER_LEAD_MS }), {
        state: 'EXPIRED', silent: true, actionRequired: false, reminderDue: false,
    });
});

test('invalid time or reminder state fails closed', () => {
    assert.equal(getGrantNotificationDecision({ nowMs: -1, expiresAtMs: 10 }).reason, 'NOTIFICATION_TIME_INVALID');
    assert.equal(getGrantNotificationDecision({ nowMs: 1, expiresAtMs: 10, reminderSent: 'no' }).reason, 'REMINDER_STATE_INVALID');
});
