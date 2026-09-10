import assert from 'node:assert/strict';
import test from 'node:test';
import {
    armShardwrightOneShotContextOverride,
    clearShardwrightOneShotContextOverride,
    consumeShardwrightOneShotContextOverride,
    getShardwrightOneShotContextOverrideForTest,
} from './shardwright-context-override.js';

test('arms and consumes one host-runtime override exactly once', () => {
    assert.deepEqual(armShardwrightOneShotContextOverride({ retryId: 'retry-1', promptTokenCeiling: 80304 }), {
        state: 'ARMED', reason: 'ONE_SHOT_OVERRIDE_ARMED', retryId: 'retry-1', promptTokenCeiling: 80304,
    });
    assert.equal(consumeShardwrightOneShotContextOverride('other-retry'), null);
    assert.deepEqual(consumeShardwrightOneShotContextOverride('retry-1'), { retryId: 'retry-1', promptTokenCeiling: 80304 });
    assert.equal(consumeShardwrightOneShotContextOverride('retry-1'), null);
});

test('refuses malformed and concurrently armed overrides', () => {
    assert.equal(armShardwrightOneShotContextOverride({ retryId: '', promptTokenCeiling: 1 }).reason, 'OVERRIDE_INPUT_INVALID');
    assert.equal(armShardwrightOneShotContextOverride({ retryId: 'retry-2', promptTokenCeiling: 1 }).state, 'ARMED');
    assert.equal(armShardwrightOneShotContextOverride({ retryId: 'retry-3', promptTokenCeiling: 2 }).reason, 'OVERRIDE_ALREADY_ARMED');
    assert.equal(clearShardwrightOneShotContextOverride('other-retry').reason, 'OVERRIDE_RETRY_BINDING_MISMATCH');
    assert.equal(clearShardwrightOneShotContextOverride('retry-2').reason, 'ONE_SHOT_OVERRIDE_CLEARED');
});

test('clear leaves no state for a later unrelated generation', () => {
    assert.equal(armShardwrightOneShotContextOverride({ retryId: 'retry-4', promptTokenCeiling: 2 }).state, 'ARMED');
    assert.equal(clearShardwrightOneShotContextOverride().reason, 'ONE_SHOT_OVERRIDE_CLEARED');
    assert.equal(getShardwrightOneShotContextOverrideForTest(), null);
});
