import assert from 'node:assert/strict';
import test from 'node:test';

import { buildChatText } from '../chat/chat-text-builder.js';
import { buildSinglePassInput } from './single-pass-input.js';

const deps = {
    buildChatText,
    applyContextCleanup: (text, cleanup) => cleanup?.enabled
        ? text.replace(/<[^>]*>/gu, '').replace(/https?:\/\/[^\s]+/gu, '[url]')
        : text,
    getPersistedMessageId: message => message?.extra?.summary_sharder?.messageIdentity?.messageId || '',
};

function message(messageId, overrides = {}) {
    return {
        name: 'Jeep',
        mes: 'Visible content',
        is_user: false,
        is_system: false,
        extra: {
            summary_sharder: {
                messageIdentity: { messageId },
            },
        },
        ...overrides,
    };
}

test('hidden and system filtering aligns prompt text with persisted source IDs', () => {
    const messages = [
        message('msg_00000000000000000000000000000001', { name: 'Chris', is_user: true }),
        message('msg_00000000000000000000000000000002', { is_hidden: true }),
        message('msg_00000000000000000000000000000003', { is_system: true }),
        message('msg_00000000000000000000000000000004'),
    ];

    const result = buildSinglePassInput(messages, 0, 3, { contextCleanup: {} }, deps);

    assert.match(result.chatText, /\[Msg 0\] \[Chris\]/u);
    assert.match(result.chatText, /\[Msg 3\] \[Jeep\]/u);
    assert.doesNotMatch(result.chatText, /\[Msg [12]\]/u);
    assert.deepEqual(result.messageIds, [
        'msg_00000000000000000000000000000001',
        'msg_00000000000000000000000000000004',
    ]);
});

test('content cleanup preserves the ordered source-ID envelope', () => {
    const messages = [
        message('msg_0000000000000000000000000000000a', { mes: '<b>First</b>' }),
        message('msg_0000000000000000000000000000000b', { mes: 'Second https://example.com' }),
    ];

    const result = buildSinglePassInput(messages, 0, 1, {
        contextCleanup: {
            enabled: true,
            stripHtml: true,
            stripUrls: true,
        },
    }, deps);

    assert.match(result.chatText, /\[Msg 0\] \[Jeep\]: First/u);
    assert.match(result.chatText, /\[Msg 1\] \[Jeep\]: Second \[url\]/u);
    assert.deepEqual(result.messageIds, [
        'msg_0000000000000000000000000000000a',
        'msg_0000000000000000000000000000000b',
    ]);
});

test('explicitly disabled hidden filtering retains both text and source IDs', () => {
    const messages = [
        message('msg_0000000000000000000000000000000c', { is_hidden: true }),
        message('msg_0000000000000000000000000000000d', { is_system: true }),
    ];

    const result = buildSinglePassInput(messages, 0, 1, {
        contextCleanup: { stripHiddenMessages: false },
    }, deps);

    assert.match(result.chatText, /\[Msg 0\]/u);
    assert.match(result.chatText, /\[Msg 1\]/u);
    assert.deepEqual(result.messageIds, [
        'msg_0000000000000000000000000000000c',
        'msg_0000000000000000000000000000000d',
    ]);
});
