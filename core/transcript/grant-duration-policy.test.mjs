import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateGrantExtension,
    getDefaultGrantDuration,
    getGrantDurationPolicy,
    validateGrantDuration,
} from './grant-duration-policy.js';

test('duration policy exposes the agreed defaults and maximums', () => {
    assert.deepEqual(getDefaultGrantDuration('FINDING'), { state: 'DEFAULT', grantType: 'FINDING', singleAccess: false, durationMs: 8 * 60 * 60 * 1000 });
    assert.equal(getGrantDurationPolicy('FINDING').maximumDurationMs, 7 * 24 * 60 * 60 * 1000);
    assert.equal(getGrantDurationPolicy('MESSAGE').maximumDurationMs, 3 * 24 * 60 * 60 * 1000);
    assert.equal(getGrantDurationPolicy('FULL_CHAT').defaultDurationMs, 60 * 60 * 1000);
});

test('validates timed durations and refuses malformed or over-maximum values', () => {
    assert.equal(validateGrantDuration({ grantType: 'TOPIC', durationMs: 8 * 60 * 60 * 1000 }).state, 'VALID');
    assert.equal(validateGrantDuration({ grantType: 'TOPIC', durationMs: 8 * 24 * 60 * 60 * 1000 }).reason, 'DURATION_EXCEEDS_MAXIMUM');
    assert.equal(validateGrantDuration({ grantType: 'TOPIC', durationMs: 0 }).reason, 'DURATION_INVALID');
    assert.equal(validateGrantDuration({ grantType: 'UNKNOWN', durationMs: 1 }).reason, 'GRANT_TYPE_INVALID');
});

test('one-time retrieval is single access and cannot receive a duration or extension', () => {
    assert.equal(validateGrantDuration({ grantType: 'ONE_TIME' }).state, 'VALID');
    assert.equal(validateGrantDuration({ grantType: 'ONE_TIME', durationMs: 1 }).reason, 'ONE_TIME_DURATION_NOT_APPLICABLE');
    assert.equal(calculateGrantExtension({ grantType: 'ONE_TIME', issuedAtMs: 0, currentExpirationMs: 0, extensionMs: 1, nowMs: 0 }).reason, 'ONE_TIME_EXTENSION_NOT_APPLICABLE');
});

test('extension begins at current expiration and cannot bypass the original maximum', () => {
    const valid = calculateGrantExtension({ grantType: 'MESSAGE', issuedAtMs: 1_000, currentExpirationMs: 2_000, extensionMs: 3_000, nowMs: 1_500 });
    assert.deepEqual(valid, { state: 'VALID', grantType: 'MESSAGE', startsAtMs: 2_000, nextExpirationMs: 5_000, maximumExpirationMs: 259_201_000 });
    const refused = calculateGrantExtension({ grantType: 'MESSAGE', issuedAtMs: 0, currentExpirationMs: 3 * 24 * 60 * 60 * 1000, extensionMs: 1, nowMs: 0 });
    assert.equal(refused.reason, 'EXTENSION_EXCEEDS_MAXIMUM');
});

test('expired grants cannot be extended', () => {
    assert.equal(calculateGrantExtension({ grantType: 'MESSAGE', issuedAtMs: 0, currentExpirationMs: 1_000, extensionMs: 1, nowMs: 1_000 }).reason, 'GRANT_EXPIRED');
});
