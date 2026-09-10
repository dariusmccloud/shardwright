import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getLatestHostCapacityReceipt,
    normalizeHostCapacityReceipt,
    observeHostCapacityReceipt,
    registerHostCapacityReceiptObserver,
    resetHostCapacityReceiptForTest,
} from './host-capacity-receipt.js';

const measured = (overrides = {}) => Object.freeze({
    schemaVersion: 1,
    measurementState: 'MEASURED',
    measurementStage: 'PRE_DISPATCH',
    api: 'openai',
    tokenizerModel: 'gpt-3.5-turbo',
    promptTokens: 1234,
    promptTokenCeiling: 8000,
    ...overrides,
});

test('accepts a frozen measured host receipt without estimating capacity', () => {
    assert.deepEqual(normalizeHostCapacityReceipt(measured()), {
        state: 'MEASURED',
        api: 'openai',
        tokenizerModel: 'gpt-3.5-turbo',
        promptTokens: 1234,
        promptTokenCeiling: 8000,
        measurementStage: 'PRE_DISPATCH',
    });
});

test('refuses malformed or mutable receipts instead of guessing', () => {
    assert.deepEqual(normalizeHostCapacityReceipt({ ...measured() }), {
        state: 'BUDGET_UNAVAILABLE',
        reason: 'HOST_RECEIPT_INVALID',
    });
    assert.deepEqual(normalizeHostCapacityReceipt(measured({ promptTokens: -1 })), {
        state: 'BUDGET_UNAVAILABLE',
        reason: 'HOST_RECEIPT_INVALID',
    });
});

test('preserves an explicit host refusal without replacing it', () => {
    const result = normalizeHostCapacityReceipt(Object.freeze({
        schemaVersion: 1,
        measurementState: 'BUDGET_UNAVAILABLE',
        measurementStage: 'PRE_DISPATCH',
        api: 'kobold',
        refusalReason: 'HOST_MEASUREMENT_UNSUPPORTED_FOR_API',
    }));
    assert.deepEqual(result, {
        state: 'BUDGET_UNAVAILABLE',
        reason: 'HOST_MEASUREMENT_UNSUPPORTED_FOR_API',
        api: 'kobold',
        measurementStage: 'PRE_DISPATCH',
    });
});

test('reads only the third event argument and keeps an in-memory latest receipt', () => {
    resetHostCapacityReceiptForTest();
    const received = observeHostCapacityReceipt({ prompt: 'ignored' }, false, measured({ promptTokens: 77 }));
    assert.equal(received.promptTokens, 77);
    assert.deepEqual(getLatestHostCapacityReceipt(), received);
    assert.equal(Object.isFrozen(received), true);
});

test('registers only against the supplied host event surface', () => {
    resetHostCapacityReceiptForTest();
    let registeredType = null;
    let registeredHandler = null;
    const eventSource = {
        on(type, handler) {
            registeredType = type;
            registeredHandler = handler;
        },
    };
    assert.equal(registerHostCapacityReceiptObserver(eventSource, 'generate_after_data'), true);
    assert.equal(registeredType, 'generate_after_data');
    registeredHandler({}, false, measured({ promptTokens: 88 }));
    assert.equal(getLatestHostCapacityReceipt().promptTokens, 88);
    assert.equal(registerHostCapacityReceiptObserver(null, 'generate_after_data'), false);
});
