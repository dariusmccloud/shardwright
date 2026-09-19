import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeOneTimeGrant } from './grant-consumption-policy.js';

test('available one-time grant transitions to consumed', () => {
    assert.deepEqual(consumeOneTimeGrant({ grantType: 'ONE_TIME', grantState: 'AVAILABLE', grantId: 'grant-1' }), {
        state: 'CONSUMED', grantId: 'grant-1', previousState: 'AVAILABLE', nextState: 'CONSUMED',
    });
});

test('already consumed grant cannot be reopened', () => {
    assert.equal(consumeOneTimeGrant({ grantType: 'ONE_TIME', grantState: 'CONSUMED', grantId: 'grant-1' }).reason, 'ONE_TIME_GRANT_NOT_CONSUMABLE');
});

test('revoked, expired, and unresolved grants refuse consumption', () => {
    for (const grantState of ['REVOKED', 'EXPIRED', 'UNRESOLVED']) {
        assert.equal(consumeOneTimeGrant({ grantType: 'ONE_TIME', grantState, grantId: 'grant-1' }).reason, 'ONE_TIME_GRANT_NOT_CONSUMABLE');
    }
});

test('non-one-time grants and missing identity fail closed', () => {
    assert.equal(consumeOneTimeGrant({ grantType: 'TOPIC', grantState: 'AVAILABLE', grantId: 'grant-1' }).reason, 'GRANT_TYPE_NOT_ONE_TIME');
    assert.equal(consumeOneTimeGrant({ grantType: 'ONE_TIME', grantState: 'AVAILABLE' }).reason, 'GRANT_ID_UNAVAILABLE');
});
