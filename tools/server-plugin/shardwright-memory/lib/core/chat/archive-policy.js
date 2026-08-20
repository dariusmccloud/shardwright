import { getMessageArchiveMetadata } from '../summarization/message-identity-schema.js';

export const ARCHIVE_PROMPT_VISIBILITY_SHOWN = 'shown';
export const ARCHIVE_PROMPT_VISIBILITY_HIDDEN = 'hidden';

function ensureShardwrightRoot(message) {
    if (!message.extra || typeof message.extra !== 'object') {
        message.extra = {};
    }
    if (!message.extra.shardwright || typeof message.extra.shardwright !== 'object') {
        message.extra.shardwright = {};
    }
    return message.extra.shardwright;
}

export function isArchivedMessage(message) {
    return getMessageArchiveMetadata(message)?.isArchived === true;
}

export function getPromptVisibilityState(message) {
    return message?.is_system === true
        ? ARCHIVE_PROMPT_VISIBILITY_HIDDEN
        : ARCHIVE_PROMPT_VISIBILITY_SHOWN;
}

export function archiveMessage(message, options = {}) {
    if (!message || typeof message !== 'object') {
        return false;
    }

    const ss = ensureShardwrightRoot(message);
    const previousArchive = getMessageArchiveMetadata(message);
    const nextPromptVisibility = previousArchive?.promptVisibilityBeforeArchive || getPromptVisibilityState(message);
    const nextArchivedAt = String(
        previousArchive?.archivedAt
        || options.archivedAt
        || new Date(Number.isFinite(options.now) ? options.now : Date.now()).toISOString()
    );
    const nextArchive = {
        isArchived: true,
        archivedAt: nextArchivedAt,
        promptVisibilityBeforeArchive: nextPromptVisibility,
    };

    const changed = !previousArchive
        || previousArchive.isArchived !== true
        || previousArchive.promptVisibilityBeforeArchive !== nextArchive.promptVisibilityBeforeArchive
        || message.is_system !== true;

    ss.archive = nextArchive;
    message.is_system = true;
    return changed;
}

export function restoreArchivedMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }

    const archive = getMessageArchiveMetadata(message);
    if (!archive?.isArchived) {
        return false;
    }

    const ss = ensureShardwrightRoot(message);
    const restoreHidden = archive.promptVisibilityBeforeArchive === ARCHIVE_PROMPT_VISIBILITY_HIDDEN;
    const changed = message.is_system !== restoreHidden || Object.prototype.hasOwnProperty.call(ss, 'archive');

    message.is_system = restoreHidden;
    delete ss.archive;
    if (Object.keys(ss).length === 0) {
        delete message.extra.shardwright;
        if (Object.keys(message.extra).length === 0) {
            delete message.extra;
        }
    }
    return changed;
}

export function collectArchivedMessageIndices(messages = []) {
    const indices = [];
    for (let index = 0; index < messages.length; index++) {
        if (isArchivedMessage(messages[index])) {
            indices.push(index);
        }
    }
    return indices;
}
