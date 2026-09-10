// Transcript Index character-instance binding ledger.
//
// Bounded by SHARDWRIGHT_TRANSCRIPT_INDEX_AND_RECALL_EXPERIENCE_CONTRACT.md
// §3.1 and TIR-ID-001. This module creates opaque character instances and records
// explicit operator rebinds only. It does not inspect host cards, titles, avatars,
// paths, chats, source material, or similarity; none of those may establish identity.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, createId, ensureStorageRoot, stableStringify } from './core.js';

export const TRANSCRIPT_CHARACTER_BINDING_LEDGER_VERSION = 1;
export const TRANSCRIPT_CHARACTER_BINDING_CREATE = 'CREATE_INSTANCE';
export const TRANSCRIPT_CHARACTER_BINDING_REBIND = 'REBIND_INSTANCE';

const OPERATIONS = new Set([
    TRANSCRIPT_CHARACTER_BINDING_CREATE,
    TRANSCRIPT_CHARACTER_BINDING_REBIND,
]);
const FORBIDDEN_IDENTITY_HINTS = new Set([
    'alias',
    'avatar',
    'avatarFilename',
    'cardPath',
    'displayName',
    'filePath',
    'similarity',
    'title',
]);

function requiredString(value, fieldName) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw createError(400, `${fieldName} is required.`, 'TIR_BINDING_INVALID_INPUT');
    }
    return normalized;
}

function assertPlainObject(value, fieldName) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw createError(400, `${fieldName} must be an object.`, 'TIR_BINDING_INVALID_INPUT');
    }
}

function assertNoIdentityHints(value) {
    for (const hint of FORBIDDEN_IDENTITY_HINTS) {
        if (Object.hasOwn(value, hint)) {
            throw createError(
                400,
                `${hint} cannot establish a transcript character identity.`,
                'TIR_BINDING_IDENTITY_HINT_FORBIDDEN',
            );
        }
    }
}

function canonicalHash(value) {
    return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function acquireLock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try {
        fs.mkdirSync(paths.transcriptCharacterBindingLockPath);
    } catch (error) {
        if (error?.code === 'EEXIST') {
            throw createError(409, 'Another transcript character binding write is in progress.', 'TIR_BINDING_LOCK_HELD');
        }
        throw error;
    }
}

function releaseLock(paths) {
    fs.rmSync(paths.transcriptCharacterBindingLockPath, { recursive: true, force: true });
}

function appendDurably(ledgerPath, entry) {
    const fd = fs.openSync(ledgerPath, 'a');
    try {
        fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8');
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}

function normalizeEntry(value, expectedSequence) {
    assertPlainObject(value, 'ledger entry');
    if (value.ledgerVersion !== TRANSCRIPT_CHARACTER_BINDING_LEDGER_VERSION) {
        throw createError(409, 'Transcript character binding ledger has an unsupported version.', 'TIR_BINDING_LEDGER_VERSION_UNSUPPORTED');
    }
    if (!Number.isInteger(value.sequence) || value.sequence !== expectedSequence) {
        throw createError(409, 'Transcript character binding ledger sequence is invalid.', 'TIR_BINDING_LEDGER_SEQUENCE_INVALID');
    }
    const operation = requiredString(value.operation, 'ledger operation');
    if (!OPERATIONS.has(operation)) {
        throw createError(409, 'Transcript character binding ledger operation is invalid.', 'TIR_BINDING_LEDGER_OPERATION_INVALID');
    }
    assertPlainObject(value.payload, 'ledger payload');
    if (canonicalHash(value.payload) !== value.payloadHash) {
        throw createError(409, 'Transcript character binding ledger payload hash does not match.', 'TIR_BINDING_LEDGER_HASH_MISMATCH');
    }
    const entry = {
        ledgerVersion: value.ledgerVersion,
        sequence: value.sequence,
        entryId: requiredString(value.entryId, 'ledger entryId'),
        operation,
        actionId: requiredString(value.actionId, 'ledger actionId'),
        payloadHash: requiredString(value.payloadHash, 'ledger payloadHash'),
        payload: value.payload,
    };
    const payload = entry.payload;
    if (requiredString(payload.characterInstanceId, 'payload.characterInstanceId') !== payload.characterInstanceId
        || requiredString(payload.bindingToken, 'payload.bindingToken') !== payload.bindingToken
        || requiredString(payload.operatorActionId, 'payload.operatorActionId') !== payload.operatorActionId
        || requiredString(payload.recordedAt, 'payload.recordedAt') !== payload.recordedAt) {
        throw createError(409, 'Transcript character binding ledger payload is invalid.', 'TIR_BINDING_LEDGER_PAYLOAD_INVALID');
    }
    if (entry.actionId !== payload.operatorActionId) {
        throw createError(409, 'Transcript character binding ledger action identity does not match.', 'TIR_BINDING_LEDGER_ACTION_MISMATCH');
    }
    if (operation === TRANSCRIPT_CHARACTER_BINDING_CREATE && payload.previousBindingToken != null) {
        throw createError(409, 'A create entry cannot name a previous binding.', 'TIR_BINDING_LEDGER_PAYLOAD_INVALID');
    }
    if (operation === TRANSCRIPT_CHARACTER_BINDING_REBIND) {
        requiredString(payload.previousBindingToken, 'payload.previousBindingToken');
        requiredString(payload.rebindBasis, 'payload.rebindBasis');
    }
    return Object.freeze(entry);
}

export function readTranscriptCharacterBindingLedger(paths) {
    const ledgerPath = paths?.transcriptCharacterBindingLedgerPath;
    if (!ledgerPath || !fs.existsSync(ledgerPath)) return [];
    const lines = fs.readFileSync(ledgerPath, 'utf8').split('\n').filter((line) => line.trim());
    return Object.freeze(lines.map((line, index) => {
        let parsed;
        try {
            parsed = JSON.parse(line);
        } catch {
            throw createError(409, `Transcript character binding ledger line ${index + 1} is malformed.`, 'TIR_BINDING_LEDGER_MALFORMED');
        }
        return normalizeEntry(parsed, index + 1);
    }));
}

export function replayTranscriptCharacterBindings(entries) {
    const byBindingToken = new Map();
    const byCharacterInstanceId = new Map();
    const byActionId = new Map();
    for (const entry of entries) {
        const { payload } = entry;
        const existingAction = byActionId.get(entry.actionId);
        if (existingAction) {
            if (existingAction.payloadHash !== entry.payloadHash) {
                throw createError(409, 'Transcript character binding ledger has a conflicting action identity.', 'TIR_BINDING_LEDGER_ACTION_COLLISION');
            }
            throw createError(409, 'Transcript character binding ledger repeats an action identity.', 'TIR_BINDING_LEDGER_ACTION_DUPLICATE');
        }
        byActionId.set(entry.actionId, entry);
        if (entry.operation === TRANSCRIPT_CHARACTER_BINDING_CREATE) {
            if (byCharacterInstanceId.has(payload.characterInstanceId) || byBindingToken.has(payload.bindingToken)) {
                throw createError(409, 'Transcript character binding ledger creates an already-bound identity.', 'TIR_BINDING_LEDGER_IDENTITY_COLLISION');
            }
            byCharacterInstanceId.set(payload.characterInstanceId, entry);
            byBindingToken.set(payload.bindingToken, entry);
            continue;
        }
        const current = byCharacterInstanceId.get(payload.characterInstanceId);
        if (!current || current.payload.bindingToken !== payload.previousBindingToken) {
            throw createError(409, 'Transcript character binding rebind does not match the current recorded binding.', 'TIR_BINDING_LEDGER_REBIND_INVALID');
        }
        if (byBindingToken.has(payload.bindingToken)) {
            throw createError(409, 'Transcript character binding rebind targets an already-bound token.', 'TIR_BINDING_LEDGER_IDENTITY_COLLISION');
        }
        byBindingToken.delete(payload.previousBindingToken);
        byBindingToken.set(payload.bindingToken, entry);
        byCharacterInstanceId.set(payload.characterInstanceId, entry);
    }
    return Object.freeze({ byBindingToken, byCharacterInstanceId, byActionId });
}

function writeEntry(paths, operation, payload) {
    acquireLock(paths);
    try {
        const entries = readTranscriptCharacterBindingLedger(paths);
        const replay = replayTranscriptCharacterBindings(entries);
        if (operation === TRANSCRIPT_CHARACTER_BINDING_CREATE
            && (replay.byCharacterInstanceId.has(payload.characterInstanceId)
                || replay.byBindingToken.has(payload.bindingToken))) {
            throw createError(409, 'Character instance or binding token is already recorded.', 'TIR_BINDING_TOKEN_ALREADY_BOUND');
        }
        if (operation === TRANSCRIPT_CHARACTER_BINDING_REBIND) {
            const current = replay.byCharacterInstanceId.get(payload.characterInstanceId);
            if (!current) {
                throw createError(404, 'Character instance is unknown; rebind cannot infer a prior instance.', 'TIR_BINDING_INSTANCE_UNKNOWN');
            }
            if (current.payload.bindingToken !== payload.previousBindingToken) {
                throw createError(409, 'previousBindingToken does not match the recorded current binding.', 'TIR_BINDING_PREVIOUS_TOKEN_MISMATCH');
            }
            if (replay.byBindingToken.has(payload.bindingToken)) {
                throw createError(409, 'bindingToken is already bound to a character instance.', 'TIR_BINDING_TOKEN_ALREADY_BOUND');
            }
        }
        const payloadHash = canonicalHash(payload);
        const existingAction = replay.byActionId.get(payload.operatorActionId);
        if (existingAction) {
            if (existingAction.payloadHash !== payloadHash || existingAction.operation !== operation) {
                throw createError(409, 'Transcript character binding action was already used with different immutable content.', 'TIR_BINDING_ACTION_COLLISION');
            }
            return Object.freeze({ entry: existingAction, appended: false });
        }
        const entry = Object.freeze({
            ledgerVersion: TRANSCRIPT_CHARACTER_BINDING_LEDGER_VERSION,
            sequence: entries.length + 1,
            entryId: createId('transcript_character_binding'),
            operation,
            actionId: payload.operatorActionId,
            payloadHash,
            payload: Object.freeze({ ...payload }),
        });
        appendDurably(paths.transcriptCharacterBindingLedgerPath, entry);
        return Object.freeze({ entry, appended: true });
    } finally {
        releaseLock(paths);
    }
}

export function createTranscriptCharacterInstance(paths, request) {
    assertPlainObject(request, 'create request');
    assertNoIdentityHints(request);
    if (request.characterInstanceId != null || request.previousBindingToken != null || request.rebindBasis != null) {
        throw createError(400, 'A fresh character-instance creation cannot adopt prior identity or rebind fields.', 'TIR_BINDING_CREATE_ADOPTION_FORBIDDEN');
    }
    const entries = readTranscriptCharacterBindingLedger(paths);
    const replay = replayTranscriptCharacterBindings(entries);
    const bindingToken = requiredString(request.bindingToken, 'bindingToken');
    if (replay.byBindingToken.has(bindingToken)) {
        throw createError(409, 'bindingToken is already bound; use the recorded instance or an explicit rebind.', 'TIR_BINDING_TOKEN_ALREADY_BOUND');
    }
    return writeEntry(paths, TRANSCRIPT_CHARACTER_BINDING_CREATE, {
        characterInstanceId: createId('transcript_character'),
        bindingToken,
        operatorActionId: requiredString(request.operatorActionId, 'operatorActionId'),
        recordedAt: requiredString(request.recordedAt, 'recordedAt'),
    });
}

export function rebindTranscriptCharacterInstance(paths, request) {
    assertPlainObject(request, 'rebind request');
    assertNoIdentityHints(request);
    const entries = readTranscriptCharacterBindingLedger(paths);
    const replay = replayTranscriptCharacterBindings(entries);
    const characterInstanceId = requiredString(request.characterInstanceId, 'characterInstanceId');
    const current = replay.byCharacterInstanceId.get(characterInstanceId);
    if (!current) {
        throw createError(404, 'Character instance is unknown; rebind cannot infer a prior instance.', 'TIR_BINDING_INSTANCE_UNKNOWN');
    }
    const previousBindingToken = requiredString(request.previousBindingToken, 'previousBindingToken');
    if (current.payload.bindingToken !== previousBindingToken) {
        throw createError(409, 'previousBindingToken does not match the recorded current binding.', 'TIR_BINDING_PREVIOUS_TOKEN_MISMATCH');
    }
    const bindingToken = requiredString(request.bindingToken, 'bindingToken');
    if (replay.byBindingToken.has(bindingToken)) {
        throw createError(409, 'bindingToken is already bound to a character instance.', 'TIR_BINDING_TOKEN_ALREADY_BOUND');
    }
    return writeEntry(paths, TRANSCRIPT_CHARACTER_BINDING_REBIND, {
        characterInstanceId,
        previousBindingToken,
        bindingToken,
        operatorActionId: requiredString(request.operatorActionId, 'operatorActionId'),
        recordedAt: requiredString(request.recordedAt, 'recordedAt'),
        rebindBasis: requiredString(request.rebindBasis, 'rebindBasis'),
    });
}

export function resolveTranscriptCharacterInstance(paths, bindingToken) {
    const replay = replayTranscriptCharacterBindings(readTranscriptCharacterBindingLedger(paths));
    const current = replay.byBindingToken.get(requiredString(bindingToken, 'bindingToken'));
    return current ? current.payload.characterInstanceId : null;
}
