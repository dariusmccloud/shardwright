function normalize(value) {
    return String(value || '').trim();
}

export function resolveInterpretiveSourceOccurrence({
    chatInstanceId,
    messageId,
    currentChatInstanceId,
    messages,
} = {}) {
    const targetChatInstanceId = normalize(chatInstanceId);
    const targetMessageId = normalize(messageId);
    const activeChatInstanceId = normalize(currentChatInstanceId);

    if (!targetChatInstanceId || !targetMessageId) {
        return { status: 'INVALID_REFERENCE', messageIndex: null };
    }
    if (!activeChatInstanceId || targetChatInstanceId !== activeChatInstanceId) {
        return { status: 'CHAT_NOT_OPEN', messageIndex: null };
    }

    const matches = (Array.isArray(messages) ? messages : [])
        .map((message, messageIndex) => ({
            messageIndex,
            messageId: normalize(message?.extra?.summary_sharder?.messageIdentity?.messageId),
        }))
        .filter((entry) => entry.messageId === targetMessageId);

    if (matches.length === 0) {
        return { status: 'MESSAGE_NOT_FOUND', messageIndex: null };
    }
    if (matches.length > 1) {
        return { status: 'AMBIGUOUS_MESSAGE', messageIndex: null };
    }
    return { status: 'EXACT', messageIndex: matches[0].messageIndex };
}

export function describeInterpretiveSourceNavigationStatus(status, options = {}) {
    switch (status) {
        case 'EXACT':
            return 'Open the exact source message in the current chat.';
        case 'CHAT_NOT_OPEN':
            return normalize(options.chatLocator)
                ? `Source chat is not active: ${normalize(options.chatLocator)}.`
                : '';
        case 'MESSAGE_NOT_FOUND':
            return 'Source message is not present in the active chat.';
        case 'AMBIGUOUS_MESSAGE':
            return 'More than one message has this identity, so navigation is unavailable.';
        default:
            return 'Source reference is incomplete; navigation is unavailable.';
    }
}
