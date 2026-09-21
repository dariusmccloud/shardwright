import assert from 'node:assert/strict';
import test from 'node:test';
import { captureRuntimeMessageIdentity, clearLastRuntimeMessageIdentityCapture, getLastRuntimeMessageIdentityCapture, installRuntimeMessageIdentityCaptureAdapter, RuntimeMessageIdentityCaptureState } from './runtime-message-identity-capture.js';

function cryptoApi() {
    return { randomUUID: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', subtle: globalThis.crypto?.subtle };
}

function message() {
    return { name: 'Chris', is_user: true, mes: 'What did we decide?', send_date: '2026-09-19T12:00:00.000Z' };
}

test('captures and persists one complete opaque marker', async () => {
    const value = message();
    const writes = [];
    const result = await captureRuntimeMessageIdentity({ message: value, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: (receipt) => { writes.push(receipt); } });
    assert.equal(result.state, RuntimeMessageIdentityCaptureState.CAPTURED);
    assert.match(result.messageId, /^msg_[0-9a-f]{32}$/u);
    assert.equal(writes.length, 1);
    assert.deepEqual(value.extra.shardwright.messageIdentity, writes[0].marker);
    assert.match(value.extra.shardwright.messageIdentity.initFingerprint, /^sha256:/u);
    assert.match(value.extra.shardwright.messageIdentity.revisionHash, /^sha256:/u);
});

test('reuses a valid marker idempotently and refuses malformed identity', async () => {
    const value = message();
    let writes = 0;
    const first = await captureRuntimeMessageIdentity({ message: value, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: () => { writes += 1; } });
    const second = await captureRuntimeMessageIdentity({ message: value, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: () => { writes += 1; } });
    assert.equal(second.state, RuntimeMessageIdentityCaptureState.ALREADY_IDENTIFIED);
    assert.equal(second.messageId, first.messageId);
    assert.equal(writes, 1);

    const malformed = message();
    malformed.extra = { shardwright: { messageIdentity: { messageId: 'not-lawful' } } };
    const refused = await captureRuntimeMessageIdentity({ message: malformed, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: () => { writes += 1; } });
    assert.equal(refused.state, RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_AMBIGUOUS);
    assert.equal(writes, 1);
});

test('rolls back the marker when the host persistence primitive fails', async () => {
    const value = message();
    const result = await captureRuntimeMessageIdentity({ message: value, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: () => { throw new Error('save failed'); } });
    assert.equal(result.state, RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE);
    assert.equal(value.extra?.shardwright, undefined);
});

test('publishes and clears the latest diagnostic without changing identity authority', async () => {
    clearLastRuntimeMessageIdentityCapture();
    const value = message();
    await captureRuntimeMessageIdentity({ message: value, context: { name1: 'Chris' }, cryptoApi: cryptoApi(), persist: () => {} });
    assert.equal(getLastRuntimeMessageIdentityCapture().state, RuntimeMessageIdentityCaptureState.CAPTURED);
    clearLastRuntimeMessageIdentityCapture();
    assert.equal(getLastRuntimeMessageIdentityCapture(), null);
});

test('registers before the invocation consumer and awaits capture before continuing', async () => {
    const listeners = [];
    const eventSource = {
        on(_event, handler) { listeners.push(handler); },
        makeFirst(_event, handler) { listeners.unshift(handler); },
    };
    const value = message();
    const order = [];
    installRuntimeMessageIdentityCaptureAdapter({
        eventSource,
        eventType: 'GENERATION_AFTER_COMMANDS',
        resolveContext: () => ({ chat: [value], name1: 'Chris' }),
        cryptoApi: cryptoApi(),
        persist: async () => { order.push('persist'); },
    });
    eventSource.on('GENERATION_AFTER_COMMANDS', () => { order.push('consumer'); });
    for (const listener of listeners) await listener('GENERATION_AFTER_COMMANDS', { type: 'normal' }, false);
    assert.deepEqual(order, ['persist', 'consumer']);
    assert.match(value.extra.shardwright.messageIdentity.messageId, /^msg_[0-9a-f]{32}$/u);
});
