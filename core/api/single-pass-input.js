function buildEffectiveCleanupSettings(settings) {
    let effectiveCleanup = {
        stripHiddenMessages: settings.contextCleanup?.stripHiddenMessages !== false,
    };

    if (settings.contextCleanup?.enabled) {
        effectiveCleanup = {
            ...settings.contextCleanup,
            stripHiddenMessages: settings.contextCleanup?.stripHiddenMessages !== false,
            stripEmojis: false,
        };
    }

    return effectiveCleanup;
}

/**
 * Build the single-pass prompt text and its authoritative persisted source-ID envelope.
 * Content cleanup transforms prompt text but does not redefine source identity.
 *
 * @param {object[]} messages
 * @param {number} startIndex
 * @param {number} endIndex
 * @param {object} settings
 * @param {{buildChatText: Function, applyContextCleanup: Function, getPersistedMessageId: Function}} deps
 * @returns {{chatText: string, messageIds: string[]}}
 */
export function buildSinglePassInput(messages, startIndex, endIndex, settings, deps) {
    const {
        buildChatText,
        applyContextCleanup,
        getPersistedMessageId,
    } = deps;
    const effectiveCleanup = buildEffectiveCleanupSettings(settings);
    let chatText = buildChatText(messages, startIndex, endIndex, {
        cleanup: effectiveCleanup,
        indexFormat: 'msg',
    });

    chatText = applyContextCleanup(chatText, effectiveCleanup);

    const messageIds = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
        const message = messages[index];
        if (!message) continue;
        if (effectiveCleanup.stripHiddenMessages && (message.is_hidden || message.is_system)) continue;

        messageIds.push(getPersistedMessageId(message));
    }

    return { chatText, messageIds };
}
