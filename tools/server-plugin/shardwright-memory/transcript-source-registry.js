// Transcript Index source-registration ledger.
// Bounded to declared NOT_SCANNED source custody. No host scan, message intake,
// source revision, retrieval projection, or locator-derived identity occurs here.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, createId, ensureStorageRoot, stableStringify } from './core.js';
import { replayTranscriptCharacterBindings, readTranscriptCharacterBindingLedger } from './transcript-character-binding.js';

export const TRANSCRIPT_SOURCE_REGISTRY_LEDGER_VERSION = 1;
export const TRANSCRIPT_SOURCE_REGISTER = 'REGISTER_SOURCE';
export const TranscriptSourceClass = Object.freeze({ DIRECT: 'DIRECT', GROUP: 'GROUP' });

const SOURCE_CLASSES = new Set(Object.values(TranscriptSourceClass));

function required(value, name) {
    const normalized = String(value || '').trim();
    if (!normalized) throw createError(400, `${name} is required.`, 'TIR_SOURCE_INVALID_INPUT');
    return normalized;
}

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function lock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try { fs.mkdirSync(paths.transcriptSourceRegistryLockPath); } catch (error) {
        if (error?.code === 'EEXIST') throw createError(409, 'Another transcript source registration is in progress.', 'TIR_SOURCE_LOCK_HELD');
        throw error;
    }
}

function unlock(paths) {
    fs.rmSync(paths.transcriptSourceRegistryLockPath, { recursive: true, force: true });
}

function append(paths, entry) {
    const fd = fs.openSync(paths.transcriptSourceRegistryLedgerPath, 'a');
    try { fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function normalizeGroupBasis(sourceClass, basis) {
    if (sourceClass === TranscriptSourceClass.DIRECT) {
        if (basis != null) throw createError(400, 'DIRECT sources cannot carry group participant basis.', 'TIR_SOURCE_DIRECT_BASIS_FORBIDDEN');
        return null;
    }
    if (!basis || typeof basis !== 'object' || Array.isArray(basis)) {
        throw createError(400, 'GROUP sources require historicalParticipantBasis.', 'TIR_SOURCE_GROUP_BASIS_REQUIRED');
    }
    return Object.freeze({
        groupSourceId: required(basis.groupSourceId, 'historicalParticipantBasis.groupSourceId'),
        participantId: required(basis.participantId, 'historicalParticipantBasis.participantId'),
        evidenceHash: required(basis.evidenceHash, 'historicalParticipantBasis.evidenceHash'),
    });
}

function normalizeResolutionLocator(sourceClass, locator) {
    if (!locator || typeof locator !== 'object' || Array.isArray(locator)) {
        throw createError(400, 'sourceResolutionLocator is required.', 'TIR_SOURCE_RESOLUTION_LOCATOR_REQUIRED');
    }
    const kind = required(locator.kind, 'sourceResolutionLocator.kind');
    if (kind !== sourceClass) {
        throw createError(400, 'sourceResolutionLocator kind must match sourceClass.', 'TIR_SOURCE_RESOLUTION_LOCATOR_CLASS_MISMATCH');
    }
    if (kind === TranscriptSourceClass.DIRECT) {
        return Object.freeze({
            kind,
            avatarUrl: required(locator.avatarUrl, 'sourceResolutionLocator.avatarUrl'),
            chatLocator: required(locator.chatLocator, 'sourceResolutionLocator.chatLocator'),
        });
    }
    return Object.freeze({
        kind,
        groupId: required(locator.groupId, 'sourceResolutionLocator.groupId'),
        chatLocator: required(locator.chatLocator, 'sourceResolutionLocator.chatLocator'),
    });
}

export function readTranscriptSourceRegistryLedger(paths) {
    if (!fs.existsSync(paths.transcriptSourceRegistryLedgerPath)) return [];
    return Object.freeze(fs.readFileSync(paths.transcriptSourceRegistryLedgerPath, 'utf8').split('\n').filter(Boolean).map((line, index) => {
        let entry;
        try { entry = JSON.parse(line); } catch { throw createError(409, `Transcript source ledger line ${index + 1} is malformed.`, 'TIR_SOURCE_LEDGER_MALFORMED'); }
        if (entry.ledgerVersion !== TRANSCRIPT_SOURCE_REGISTRY_LEDGER_VERSION || entry.sequence !== index + 1 || entry.operation !== TRANSCRIPT_SOURCE_REGISTER) {
            throw createError(409, 'Transcript source ledger entry is structurally invalid.', 'TIR_SOURCE_LEDGER_INVALID');
        }
        if (!entry.payload || hash(entry.payload) !== entry.payloadHash) throw createError(409, 'Transcript source ledger payload hash does not match.', 'TIR_SOURCE_LEDGER_HASH_MISMATCH');
        return Object.freeze(entry);
    }));
}

export function registerTranscriptSource(paths, request) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) throw createError(400, 'Source registration request must be an object.', 'TIR_SOURCE_INVALID_INPUT');
    const characterInstanceId = required(request.characterInstanceId, 'characterInstanceId');
    const sourceClass = required(request.sourceClass, 'sourceClass');
    if (!SOURCE_CLASSES.has(sourceClass)) throw createError(400, 'sourceClass must be DIRECT or GROUP.', 'TIR_SOURCE_INVALID_CLASS');
    const payload = Object.freeze({
        sourceLogicalId: createId('transcript_source'),
        characterInstanceId,
        sourceClass,
        hostLocator: required(request.hostLocator, 'hostLocator'),
        sourceResolutionLocator: normalizeResolutionLocator(sourceClass, request.sourceResolutionLocator),
        coverageState: 'NOT_SCANNED',
        historicalParticipantBasis: normalizeGroupBasis(sourceClass, request.historicalParticipantBasis),
        operatorActionId: required(request.operatorActionId, 'operatorActionId'),
        recordedAt: required(request.recordedAt, 'recordedAt'),
    });
    lock(paths);
    try {
        const bindings = replayTranscriptCharacterBindings(readTranscriptCharacterBindingLedger(paths));
        if (!bindings.byCharacterInstanceId.has(characterInstanceId)) {
            throw createError(404, 'Character instance is unknown; source registration cannot infer identity.', 'TIR_SOURCE_CHARACTER_UNKNOWN');
        }
        const entries = readTranscriptSourceRegistryLedger(paths);
        if (entries.some((entry) => entry.payload.operatorActionId === payload.operatorActionId)) {
            throw createError(409, 'operatorActionId has already registered a source.', 'TIR_SOURCE_ACTION_ALREADY_USED');
        }
        const entry = Object.freeze({ ledgerVersion: TRANSCRIPT_SOURCE_REGISTRY_LEDGER_VERSION, sequence: entries.length + 1, entryId: createId('transcript_source_registration'), operation: TRANSCRIPT_SOURCE_REGISTER, payloadHash: hash(payload), payload });
        append(paths, entry);
        return Object.freeze({ entry, appended: true });
    } finally { unlock(paths); }
}
