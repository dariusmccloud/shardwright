// Append-only operational evidence for Transcript Index maintenance attempts.
// This ledger is not transcript authority and is not an incremental projection input.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, createId, ensureStorageRoot, stableStringify } from './core.js';

export const TRANSCRIPT_MAINTENANCE_RUN_LEDGER_VERSION = 1;
export const TRANSCRIPT_MAINTENANCE_RUN_OPEN = 'OPEN_MAINTENANCE_RUN';
export const TRANSCRIPT_MAINTENANCE_RUN_CLOSE = 'CLOSE_MAINTENANCE_RUN';

export const TranscriptMaintenanceTrigger = Object.freeze({
    ACTIVE_CHAT_LOAD: 'ACTIVE_CHAT_LOAD',
    ACTIVE_CHAT_CHANGE: 'ACTIVE_CHAT_CHANGE',
    BEFORE_ELIGIBLE_RETRIEVAL: 'BEFORE_ELIGIBLE_RETRIEVAL',
    SCHEDULED: 'SCHEDULED',
});

export const TranscriptMaintenanceTerminalState = Object.freeze({
    COMPLETED: 'COMPLETED',
    SUSPENDED: 'SUSPENDED',
    FAILED: 'FAILED',
    REFUSED: 'REFUSED',
});

const TRIGGERS = new Set(Object.values(TranscriptMaintenanceTrigger));
const TERMINAL_STATES = new Set(Object.values(TranscriptMaintenanceTerminalState));

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function required(value, name) {
    const normalized = String(value || '').trim();
    if (!normalized) throw createError(400, `${name} is required.`, 'TIR_MAINTENANCE_INVALID_INPUT');
    return normalized;
}

function timestamp(value, name) {
    const normalized = required(value, name);
    if (!Number.isFinite(Date.parse(normalized))) throw createError(400, `${name} must be a valid timestamp.`, 'TIR_MAINTENANCE_INVALID_INPUT');
    return normalized;
}

function sourceScope(value) {
    if (!Array.isArray(value) || value.length === 0) throw createError(400, 'sourceScope must be a non-empty array.', 'TIR_MAINTENANCE_SCOPE_INVALID');
    return Object.freeze(value.map((source, index) => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) throw createError(400, `sourceScope[${index}] must be an object.`, 'TIR_MAINTENANCE_SCOPE_INVALID');
        return Object.freeze({
            sourceLogicalId: required(source.sourceLogicalId, `sourceScope[${index}].sourceLogicalId`),
            characterInstanceId: required(source.characterInstanceId, `sourceScope[${index}].characterInstanceId`),
            sourceClass: required(source.sourceClass, `sourceScope[${index}].sourceClass`),
        });
    }));
}

function lock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try { fs.mkdirSync(paths.transcriptMaintenanceRunLockPath); } catch (error) {
        if (error?.code === 'EEXIST') throw createError(409, 'Another maintenance run append is in progress.', 'TIR_MAINTENANCE_LOCK_HELD');
        throw error;
    }
}

function unlock(paths) {
    fs.rmSync(paths.transcriptMaintenanceRunLockPath, { recursive: true, force: true });
}

function append(paths, entry) {
    ensureStorageRoot(paths.storageRoot);
    const fd = fs.openSync(paths.transcriptMaintenanceRunLedgerPath, 'a');
    try { fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function parseEntry(line, index) {
    let entry;
    try { entry = JSON.parse(line); } catch { throw createError(409, `Maintenance ledger line ${index + 1} is malformed.`, 'TIR_MAINTENANCE_LEDGER_MALFORMED'); }
    if (!entry || entry.ledgerVersion !== TRANSCRIPT_MAINTENANCE_RUN_LEDGER_VERSION || entry.sequence !== index + 1 || ![TRANSCRIPT_MAINTENANCE_RUN_OPEN, TRANSCRIPT_MAINTENANCE_RUN_CLOSE].includes(entry.operation) || !entry.payload || hash(entry.payload) !== entry.payloadHash) {
        throw createError(409, 'Maintenance ledger entry is structurally invalid.', 'TIR_MAINTENANCE_LEDGER_INVALID');
    }
    return Object.freeze(entry);
}

export function readTranscriptMaintenanceRunLedger(paths) {
    if (!fs.existsSync(paths.transcriptMaintenanceRunLedgerPath)) return Object.freeze([]);
    const entries = fs.readFileSync(paths.transcriptMaintenanceRunLedgerPath, 'utf8').split('\n').filter(Boolean).map(parseEntry);
    const openRuns = new Set();
    for (const entry of entries) {
        if (entry.operation === TRANSCRIPT_MAINTENANCE_RUN_OPEN) {
            if (openRuns.has(entry.payload.runId)) throw createError(409, 'Maintenance run was opened more than once.', 'TIR_MAINTENANCE_LEDGER_TRANSITION_INVALID');
            openRuns.add(entry.payload.runId);
        } else {
            if (!openRuns.has(entry.payload.runId)) throw createError(409, 'Maintenance run close has no open predecessor.', 'TIR_MAINTENANCE_LEDGER_TRANSITION_INVALID');
            openRuns.delete(entry.payload.runId);
        }
    }
    return Object.freeze(entries);
}

function appendEntry(paths, entries, operation, payload) {
    const entry = Object.freeze({
        ledgerVersion: TRANSCRIPT_MAINTENANCE_RUN_LEDGER_VERSION,
        sequence: entries.length + 1,
        entryId: createId('transcript_maintenance_run'),
        operation,
        payloadHash: hash(payload),
        payload: Object.freeze(payload),
    });
    append(paths, entry);
    return entry;
}

export function openTranscriptMaintenanceRun(paths, request = {}) {
    const triggerKind = required(request.triggerKind, 'triggerKind');
    if (!TRIGGERS.has(triggerKind)) throw createError(400, 'triggerKind is unsupported.', 'TIR_MAINTENANCE_TRIGGER_INVALID');
    const payload = {
        runId: required(request.runId || createId('transcript_maintenance'), 'runId'),
        triggerKind,
        sourceScope: sourceScope(request.sourceScope),
        startedAt: timestamp(request.startedAt || new Date().toISOString(), 'startedAt'),
    };
    lock(paths);
    try {
        const entries = readTranscriptMaintenanceRunLedger(paths);
        if (entries.some((entry) => entry.payload.runId === payload.runId)) throw createError(409, 'runId has already been used.', 'TIR_MAINTENANCE_RUN_ALREADY_USED');
        return Object.freeze({ entry: appendEntry(paths, entries, TRANSCRIPT_MAINTENANCE_RUN_OPEN, payload), state: 'OPEN' });
    } finally { unlock(paths); }
}

export function closeTranscriptMaintenanceRun(paths, request = {}) {
    const runId = required(request.runId, 'runId');
    const terminalState = required(request.terminalState, 'terminalState');
    if (!TERMINAL_STATES.has(terminalState)) throw createError(400, 'terminalState is unsupported.', 'TIR_MAINTENANCE_TERMINAL_STATE_INVALID');
    const payload = {
        runId,
        terminalState,
        recordedAt: timestamp(request.recordedAt || new Date().toISOString(), 'recordedAt'),
        completedCount: Number.isInteger(request.completedCount) && request.completedCount >= 0 ? request.completedCount : 0,
        expectedCount: Number.isInteger(request.expectedCount) && request.expectedCount >= 0 ? request.expectedCount : null,
        revisionBoundary: request.revisionBoundary ?? null,
        outcome: request.outcome ?? null,
        category: request.category ?? null,
    };
    lock(paths);
    try {
        const entries = readTranscriptMaintenanceRunLedger(paths);
        const open = entries.find((entry) => entry.operation === TRANSCRIPT_MAINTENANCE_RUN_OPEN && entry.payload.runId === runId);
        if (!open || entries.some((entry) => entry.operation === TRANSCRIPT_MAINTENANCE_RUN_CLOSE && entry.payload.runId === runId)) throw createError(409, 'runId is not open or was already closed.', 'TIR_MAINTENANCE_RUN_NOT_OPEN');
        return Object.freeze({ entry: appendEntry(paths, entries, TRANSCRIPT_MAINTENANCE_RUN_CLOSE, payload), state: terminalState });
    } finally { unlock(paths); }
}

export function replayTranscriptMaintenanceRuns(entries) {
    const current = new Map();
    for (const entry of entries || []) {
        if (entry.operation === TRANSCRIPT_MAINTENANCE_RUN_OPEN) current.set(entry.payload.runId, { state: 'OPEN', open: entry });
        else if (entry.operation === TRANSCRIPT_MAINTENANCE_RUN_CLOSE) current.set(entry.payload.runId, { state: entry.payload.terminalState, open: current.get(entry.payload.runId)?.open, close: entry });
    }
    return Object.freeze(current);
}
