// Explicit, read-only admission preview. Registration remains a separate
// operator action and this module never appends a source or ingests messages.
import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, parseJsonlRecords, resolveChatJsonlPath, summarizePersistedChatMetadata } from './core.js';

function hash(bytes) {
    return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function required(value, name) {
    const normalized = String(value || '').trim();
    if (!normalized) throw createError(400, `${name} is required.`, 'TIR_SOURCE_PREVIEW_INPUT_INVALID');
    return normalized;
}

function locatorFor(request) {
    const sourceClass = required(request?.sourceClass, 'sourceClass');
    const locator = request?.sourceResolutionLocator;
    if (!locator || typeof locator !== 'object' || Array.isArray(locator)) throw createError(400, 'sourceResolutionLocator is required.', 'TIR_SOURCE_PREVIEW_LOCATOR_REQUIRED');
    if (locator.kind !== sourceClass) throw createError(400, 'sourceResolutionLocator kind must match sourceClass.', 'TIR_SOURCE_PREVIEW_LOCATOR_CLASS_MISMATCH');
    return sourceClass === 'DIRECT'
        ? { isGroup: false, avatarUrl: required(locator.avatarUrl, 'sourceResolutionLocator.avatarUrl'), chatLocator: required(locator.chatLocator, 'sourceResolutionLocator.chatLocator') }
        : { isGroup: true, groupId: required(locator.groupId, 'sourceResolutionLocator.groupId'), chatLocator: required(locator.chatLocator, 'sourceResolutionLocator.chatLocator') };
}

export function previewTranscriptSource(request, hostRequest) {
    const locator = locatorFor(request);
    let resolution;
    try { resolution = resolveChatJsonlPath(hostRequest, locator); } catch (error) {
        return Object.freeze({ state: 'LOCATOR_UNRESOLVED', refusalCode: error?.code || 'TIR_SOURCE_PREVIEW_LOCATOR_UNRESOLVED' });
    }
    if (!fs.existsSync(resolution.chatFilePath)) return Object.freeze({ state: 'MISSING', refusalCode: 'TIR_SOURCE_PREVIEW_SOURCE_MISSING' });
    let bytes;
    try { bytes = fs.readFileSync(resolution.chatFilePath); } catch (error) {
        return Object.freeze({ state: 'UNREADABLE', refusalCode: error?.code || 'TIR_SOURCE_PREVIEW_READ_FAILED' });
    }
    const parsed = parseJsonlRecords(bytes.toString('utf8'));
    const metadata = summarizePersistedChatMetadata(parsed.records, parsed.invalidLines);
    const stat = fs.statSync(resolution.chatFilePath);
    if (parsed.invalidLines.length > 0) return Object.freeze({ state: 'MALFORMED_JSONL', refusalCode: 'TIR_SOURCE_PREVIEW_INVALID_JSONL', byteLength: bytes.length, sourceRevisionHash: hash(bytes), invalidLineCount: parsed.invalidLines.length, recordCount: parsed.records.length });
    if (parsed.records.length === 0) return Object.freeze({ state: 'MALFORMED_JSONL', refusalCode: 'TIR_SOURCE_PREVIEW_EMPTY_JSONL', byteLength: bytes.length, sourceRevisionHash: hash(bytes), invalidLineCount: 0 });
    return Object.freeze({
        state: 'READABLE',
        sourceRevisionHash: hash(bytes),
        byteLength: bytes.length,
        recordCount: parsed.records.length,
        messageCount: metadata.messageCount,
        sourceCreationAtMs: Number.isFinite(stat.birthtimeMs) ? stat.birthtimeMs : null,
        sourceCreationTimestampTier: Number.isFinite(stat.birthtimeMs) ? 'FILESYSTEM_NATIVE' : 'UNAVAILABLE',
        chatMetadata: Object.freeze({ headerPresent: metadata.headerPresent, chatIdentityStatus: metadata.chatIdentityStatus }),
    });
}
