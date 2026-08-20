import assert from 'node:assert/strict';
import test from 'node:test';

import {
    describeInterpretiveSourceNavigationStatus,
    resolveInterpretiveSourceOccurrence,
} from './interpretive-source-navigation.js';

function message(messageId) {
    return { extra: { summary_sharder: { messageIdentity: { messageId } } } };
}

test('resolves one stable source occurrence in the currently open chat', () => {
    assert.deepEqual(resolveInterpretiveSourceOccurrence({
        chatInstanceId: 'chat-1',
        messageId: 'msg-b',
        currentChatInstanceId: 'chat-1',
        messages: [message('msg-a'), message('msg-b')],
    }), { status: 'EXACT', messageIndex: 1 });
});

test('refuses an ambiguous stable message identity', () => {
    assert.deepEqual(resolveInterpretiveSourceOccurrence({
        chatInstanceId: 'chat-1',
        messageId: 'msg-a',
        currentChatInstanceId: 'chat-1',
        messages: [message('msg-a'), message('msg-a')],
    }), { status: 'AMBIGUOUS_MESSAGE', messageIndex: null });
    assert.match(describeInterpretiveSourceNavigationStatus('AMBIGUOUS_MESSAGE'), /navigation is unavailable/u);
});

test('inactive source status is shown only when an authoritative chat locator is known', () => {
    assert.equal(describeInterpretiveSourceNavigationStatus('CHAT_NOT_OPEN'), '');
    const status = describeInterpretiveSourceNavigationStatus('CHAT_NOT_OPEN', { chatLocator: 'Jeep - 2026-07-15' });
    assert.equal(status, 'Source chat is not active: Jeep - 2026-07-15.');
    assert.doesNotMatch(status, /copy/iu);
});

test('keeps missing and cross-chat references non-navigable', () => {
    assert.equal(resolveInterpretiveSourceOccurrence({
        chatInstanceId: 'chat-1',
        messageId: 'msg-missing',
        currentChatInstanceId: 'chat-1',
        messages: [message('msg-a')],
    }).status, 'MESSAGE_NOT_FOUND');
    assert.equal(resolveInterpretiveSourceOccurrence({
        chatInstanceId: 'chat-2',
        messageId: 'msg-a',
        currentChatInstanceId: 'chat-1',
        messages: [message('msg-a')],
    }).status, 'CHAT_NOT_OPEN');
});

test('rejects incomplete references instead of guessing', () => {
    assert.deepEqual(resolveInterpretiveSourceOccurrence({
        chatInstanceId: 'chat-1',
        currentChatInstanceId: 'chat-1',
        messages: [message('msg-a')],
    }), { status: 'INVALID_REFERENCE', messageIndex: null });
});
