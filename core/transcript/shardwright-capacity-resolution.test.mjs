import assert from 'node:assert/strict';
import test from 'node:test';
import { createShardwrightCapacityResolution, getShardwrightCapacityRetryDisposition } from './shardwright-capacity-resolution.js';

function receipt(overrides = {}) {
    return Object.freeze({
        state: 'BUNDLE_OVER_CAPACITY',
        requestId: 'request-1',
        baselinePromptTokens: 79933,
        contributionTokens: 371,
        safetyHeadroomTokens: 0,
        ...overrides,
    });
}

test('derives an exact one-shot host expansion from an exact receipt', () => {
    const result = createShardwrightCapacityResolution({
        receipt: receipt(), activeOutputTokenLimit: 8192, providerContextLimit: 200000,
    });
    assert.deepEqual(result, {
        state: 'EXPANSION_AVAILABLE', reason: 'EXACT_EXPANSION_AVAILABLE', requestId: 'request-1',
        requiredPromptTokenCeiling: 80304, requiredHostContextLimit: 88496, providerContextLimit: 200000,
    });
});

test('refuses unavailable host limits and provider maxima below the exact requirement', () => {
    assert.equal(createShardwrightCapacityResolution({ receipt: receipt(), activeOutputTokenLimit: 8192, providerContextLimit: null }).reason, 'HOST_CONTEXT_LIMIT_UNAVAILABLE');
    assert.equal(createShardwrightCapacityResolution({ receipt: receipt(), activeOutputTokenLimit: 8192, providerContextLimit: 88495 }).reason, 'PROVIDER_CONTEXT_LIMIT_EXCEEDED');
});

test('refuses malformed receipts rather than deriving a guessed expansion', () => {
    assert.equal(createShardwrightCapacityResolution({ receipt: receipt({ contributionTokens: -1 }), activeOutputTokenLimit: 8192, providerContextLimit: 200000 }).reason, 'CAPACITY_RECEIPT_INVALID');
});

test('offers one expansion only before its retry override is consumed', () => {
    const receipt = Object.freeze({ state: 'BUNDLE_OVER_CAPACITY', requestId: 'request-1' });
    assert.deepEqual(getShardwrightCapacityRetryDisposition({ receipt }), {
        state: 'EXPANSION_OFFERABLE', reason: 'ONE_SHOT_EXPANSION_AVAILABLE', requestId: 'request-1',
    });
    assert.deepEqual(getShardwrightCapacityRetryDisposition({ receipt, retryOverrideConsumed: true }), {
        state: 'EXPANSION_EXHAUSTED', reason: 'ONE_SHOT_EXPANSION_ALREADY_CONSUMED', requestId: 'request-1',
    });
    assert.equal(getShardwrightCapacityRetryDisposition({ receipt: Object.freeze({ state: 'APPROVED' }) }), null);
});
