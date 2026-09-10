import assert from 'node:assert/strict';
import test from 'node:test';
import { preflightTranscriptCapacity } from './transcript-capacity-preflight.js';

const measured = (overrides = {}) => ({ measurementAvailable: true, contextWindowTokens: 10000, livePromptTokens: 4000, retrievalCeilingTokens: 3000, safetyHeadroomTokens: 500, requiredBundleTokens: 2500, ...overrides });

test('returns BUDGET_UNAVAILABLE without estimating tokens when host measurement is absent', () => {
    assert.deepEqual(preflightTranscriptCapacity({ measurementAvailable: false }), { state: 'BUDGET_UNAVAILABLE', reason: 'MEASUREMENT_UNAVAILABLE' });
});

test('uses the lesser of measured remaining capacity and profile retrieval ceiling', () => {
    const result = preflightTranscriptCapacity(measured());
    assert.equal(result.state, 'CAPACITY_AVAILABLE');
    assert.equal(result.measuredRemainingTokens, 5500);
    assert.equal(result.usableRetrievalTokens, 3000);
});

test('reports complete-bundle over-capacity without partial fallback', () => {
    const result = preflightTranscriptCapacity(measured({ requiredBundleTokens: 3500 }));
    assert.equal(result.state, 'BUNDLE_OVER_CAPACITY');
    assert.equal(result.shortfallTokens, 500);
});

test('refuses invalid token inputs rather than guessing a capacity', () => {
    assert.throws(() => preflightTranscriptCapacity(measured({ livePromptTokens: -1 })), (error) => error?.code === 'TIR_BUDGET_INPUT_INVALID');
});
