// Read-only custody observation for one registered Transcript Index source.
// A receipt reports what this observation could lawfully read; it is not a source
// revision ledger entry, message index, cache, or Phase X authority record.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, stableStringify, resolveChatJsonlPath } from './core.js';
import { readTranscriptSourceRegistryLedger, TranscriptSourceClass } from './transcript-source-registry.js';

export const TranscriptObservationState = Object.freeze({
    OBSERVED: 'OBSERVED',
    MISSING: 'MISSING',
    UNRESOLVED: 'UNRESOLVED',
    ERROR: 'ERROR',
});

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function timestamp(value) {
    if (value == null) return new Date().toISOString();
    const normalized = String(value).trim();
    if (!normalized) throw createError(400, 'observedAt must be non-empty when supplied.', 'TIR_OBSERVATION_INVALID_INPUT');
    return normalized;
}

function receipt(source, observedAt, observationState, extra = {}) {
    return Object.freeze({
        receiptVersion: 1,
        sourceLogicalId: source.sourceLogicalId,
        characterInstanceId: source.characterInstanceId,
        sourceClass: source.sourceClass,
        observationState,
        observedAt,
        sourceResolutionLocatorHash: hash(stableStringify(source.sourceResolutionLocator)),
        ...extra,
    });
}

function findSource(paths, sourceLogicalId) {
    const source = readTranscriptSourceRegistryLedger(paths)
        .map((entry) => entry.payload)
        .find((candidate) => candidate.sourceLogicalId === String(sourceLogicalId || '').trim());
    if (!source) throw createError(404, 'Registered transcript source is unknown.', 'TIR_OBSERVATION_SOURCE_UNKNOWN');
    return source;
}

function hostLocator(source) {
    const value = source.sourceResolutionLocator;
    if (source.sourceClass === TranscriptSourceClass.DIRECT) {
        return { isGroup: false, avatarUrl: value.avatarUrl, chatLocator: value.chatLocator };
    }
    return { isGroup: true, groupId: value.groupId, chatLocator: value.chatLocator };
}

export function observeRegisteredTranscriptSource(paths, request, sourceLogicalId, options = {}) {
    const source = findSource(paths, sourceLogicalId);
    const observedAt = timestamp(options.observedAt);
    let resolution;
    try {
        resolution = resolveChatJsonlPath(request, hostLocator(source));
    } catch (error) {
        return receipt(source, observedAt, TranscriptObservationState.UNRESOLVED, { refusalCode: error?.code || 'TIR_OBSERVATION_LOCATOR_UNRESOLVED' });
    }
    if (!fs.existsSync(resolution.chatFilePath)) {
        return receipt(source, observedAt, TranscriptObservationState.MISSING, { refusalCode: 'TIR_OBSERVATION_SOURCE_MISSING' });
    }
    try {
        const bytes = fs.readFileSync(resolution.chatFilePath);
        return receipt(source, observedAt, TranscriptObservationState.OBSERVED, {
            byteLength: bytes.length,
            sourceRevisionHash: hash(bytes),
        });
    } catch (error) {
        return receipt(source, observedAt, TranscriptObservationState.ERROR, { refusalCode: error?.code || 'TIR_OBSERVATION_READ_FAILED' });
    }
}
