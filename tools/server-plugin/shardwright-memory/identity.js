// Context Sheet Identity: durable CREATE_RECORD + CREATE_EVENT ledger foundation.
//
// Bounded by docs/contracts/PHASE_X_CONTEXT_SHEET_IDENTITY_RUNTIME_PERSISTENCE_AND_REPLAY_OWNERSHIP_CONTRACT.md.
// This module owns only the context-sheet-identity-ledger.jsonl append/read boundary for
// initial sheet creation. Alias, resolution, merge, split, redirect, retirement, restoration,
// reconciliation, projections, routes, semantic validation, and UI remain unauthorized.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

import { cloneJson, createError, createId, ensureStorageRoot, nowTimestamp, stableStringify } from './core.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const schemaDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog');

export const CONTEXT_SHEET_IDENTITY_LEDGER_VERSION = 1;
export const CONTEXT_SHEET_RECORD_SCHEMA_ID = 'context-sheet-record-v1';
export const CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID = 'context-sheet-creation-event-v1';
export const CONTEXT_SHEET_CREATE_RECORD_OPERATION = 'CREATE_RECORD';
export const CONTEXT_SHEET_CREATE_EVENT_OPERATION = 'CREATE_EVENT';

const CONTEXT_SHEET_RECORD_ARTIFACT_CLASS = 'IMMUTABLE_RECORD';
const CONTEXT_SHEET_CREATION_EVENT_ARTIFACT_CLASS = 'EVENT';
const KNOWN_CONTEXT_SHEET_CONTRACT_BINDING = 'phase-x-context-sheet-anchor@0.1.0';
const KNOWN_CONTEXT_SHEET_IDENTITY_POLICY_BINDING = 'context-sheet-identity-policy@v1';
const DATE_TIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;

const artifactValidators = new Map();

function loadSchema(fileName) {
    return JSON.parse(fs.readFileSync(path.join(schemaDir, fileName), 'utf8'));
}

function getArtifactValidator(schemaFileName) {
    if (artifactValidators.has(schemaFileName)) {
        return artifactValidators.get(schemaFileName);
    }
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    ajv.addFormat('date-time', { type: 'string', validate: (value) => DATE_TIME_FORMAT.test(value) });
    ajv.addSchema(loadSchema('memory-artifact-envelope-v1.schema.json'));
    ajv.addSchema(loadSchema('memory-artifact-reference-v1.schema.json'));
    const validator = ajv.compile(loadSchema(schemaFileName));
    artifactValidators.set(schemaFileName, validator);
    return validator;
}

function getRecordValidator() {
    return getArtifactValidator('context-sheet-record-v1.schema.json');
}

function getCreationEventValidator() {
    return getArtifactValidator('context-sheet-creation-event-v1.schema.json');
}

export function validateContextSheetRecordArtifact(artifact) {
    const validate = getRecordValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function validateContextSheetCreationEventArtifact(artifact) {
    const validate = getCreationEventValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function computeContextSheetIdentityArtifactHash(artifact) {
    return `sha256:${crypto.createHash('sha256').update(stableStringify(artifact)).digest('hex')}`;
}

function assertKnownBindings(envelope, operationName, policyVersion = null) {
    const contractBindings = Array.isArray(envelope.contractBindings) ? envelope.contractBindings : [];
    const contractKeys = contractBindings.map((binding) => `${binding?.id}@${binding?.version}`);
    if (contractKeys.length !== 1 || contractKeys[0] !== KNOWN_CONTEXT_SHEET_CONTRACT_BINDING) {
        throw createError(
            400,
            `Context Sheet Identity ${operationName} must bind the recognized anchor contract version.`,
            `CSI_${operationName}_CONTRACT_BINDING_UNSUPPORTED`,
        );
    }

    const policyBindings = Array.isArray(envelope.policyBindings) ? envelope.policyBindings : [];
    const policyKeys = policyBindings.map((binding) => `${binding?.id}@${binding?.version}`);
    if (policyKeys.length !== 1 || policyKeys[0] !== KNOWN_CONTEXT_SHEET_IDENTITY_POLICY_BINDING
        || (policyVersion !== null && policyVersion !== 'v1')) {
        throw createError(
            400,
            `Context Sheet Identity ${operationName} must bind the recognized identity policy version.`,
            `CSI_${operationName}_POLICY_BINDING_UNSUPPORTED`,
        );
    }
}

function acquireContextSheetIdentityLedgerLock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try {
        fs.mkdirSync(paths.contextSheetIdentityLockPath);
    } catch (error) {
        if (error && error.code === 'EEXIST') {
            throw createError(
                409,
                'Another Context Sheet Identity ledger append is already in progress.',
                'CSI_LEDGER_LOCK_HELD',
            );
        }
        throw error;
    }
}

function releaseContextSheetIdentityLedgerLock(paths) {
    fs.rmSync(paths.contextSheetIdentityLockPath, { recursive: true, force: true });
}

function expectedArtifactClassForEntry(entry) {
    if (entry.operation === CONTEXT_SHEET_CREATE_RECORD_OPERATION
        && entry.artifactSchemaId === CONTEXT_SHEET_RECORD_SCHEMA_ID) {
        return CONTEXT_SHEET_RECORD_ARTIFACT_CLASS;
    }
    if (entry.operation === CONTEXT_SHEET_CREATE_EVENT_OPERATION
        && entry.artifactSchemaId === CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID) {
        return CONTEXT_SHEET_CREATION_EVENT_ARTIFACT_CLASS;
    }
    return null;
}

function readContextSheetIdentityLedgerEntries(ledgerPath) {
    if (!fs.existsSync(ledgerPath)) {
        return [];
    }

    const raw = fs.readFileSync(ledgerPath, 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    let previousSequence = 0;

    return lines.map((line, index) => {
        let entry;
        try {
            entry = JSON.parse(line);
        } catch {
            throw createError(
                409,
                `Context Sheet Identity ledger line ${index + 1} is malformed JSON.`,
                'CSI_LEDGER_MALFORMED',
            );
        }

        if (!Number.isInteger(entry.sequence) || entry.sequence <= previousSequence) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${index + 1} has a non-monotonic sequence.`,
                'CSI_LEDGER_SEQUENCE_INVALID',
            );
        }
        previousSequence = entry.sequence;

        if (entry.ledgerVersion !== CONTEXT_SHEET_IDENTITY_LEDGER_VERSION) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${entry.entryId || index + 1} has an unsupported ledger version.`,
                'CSI_LEDGER_VERSION_UNSUPPORTED',
            );
        }

        if (computeContextSheetIdentityArtifactHash(entry.artifact) !== entry.artifactHash) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${entry.entryId || index + 1} failed hash verification.`,
                'CSI_LEDGER_HASH_MISMATCH',
            );
        }

        const expectedArtifactClass = expectedArtifactClassForEntry(entry);
        if (!expectedArtifactClass || entry.artifactClass !== expectedArtifactClass) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${entry.entryId || index + 1} has an unsupported operation mapping.`,
                'CSI_LEDGER_OPERATION_MAPPING_INVALID',
            );
        }

        if (entry.artifact?.envelope?.schemaId !== entry.artifactSchemaId
            || entry.artifact?.envelope?.artifactClass !== entry.artifactClass
            || entry.artifact?.envelope?.artifactId !== entry.artifactId
            || entry.artifact?.envelope?.memoryScopeId !== entry.scopeId) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${entry.entryId || index + 1} does not match its artifact envelope.`,
                'CSI_LEDGER_ENTRY_ENVELOPE_MISMATCH',
            );
        }

        if (entry.operation === CONTEXT_SHEET_CREATE_EVENT_OPERATION
            && entry.artifact.envelope.idempotencyKey !== entry.idempotencyKey) {
            throw createError(
                409,
                `Context Sheet Identity ledger entry ${entry.entryId || index + 1} does not match its request identity.`,
                'CSI_LEDGER_ENTRY_IDEMPOTENCY_MISMATCH',
            );
        }

        return entry;
    });
}

export function readContextSheetIdentityLedger(paths) {
    return readContextSheetIdentityLedgerEntries(paths.contextSheetIdentityLedgerPath);
}

function sameReference(left, right) {
    return left?.artifactType === right?.artifactType
        && left?.artifactId === right?.artifactId
        && left?.memoryScopeId === right?.memoryScopeId
        && left?.expectedArtifactClass === right?.expectedArtifactClass
        && left?.resolutionRequirement === right?.resolutionRequirement
        && left?.immutableHash === right?.immutableHash
        && left?.revision === right?.revision;
}

function recordReference(record, recordHash) {
    return {
        artifactType: CONTEXT_SHEET_RECORD_SCHEMA_ID,
        artifactId: record.envelope.artifactId,
        memoryScopeId: record.envelope.memoryScopeId,
        expectedArtifactClass: CONTEXT_SHEET_RECORD_ARTIFACT_CLASS,
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: recordHash,
    };
}

function creationEventReference(event) {
    return {
        artifactType: CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID,
        artifactId: event.envelope.artifactId,
        memoryScopeId: event.envelope.memoryScopeId,
        expectedArtifactClass: CONTEXT_SHEET_CREATION_EVENT_ARTIFACT_CLASS,
        resolutionRequirement: 'CURRENT_ALLOWED',
    };
}

function assertCreationPair(record, event, recordHash) {
    if (record.envelope.memoryScopeId !== event.envelope.memoryScopeId
        || record.memoryScopeId !== record.envelope.memoryScopeId) {
        throw createError(400, 'Context Sheet Identity creation pair crosses memory scopes.', 'CSI_CREATE_SCOPE_MISMATCH');
    }
    if (!sameReference(record.creationEventRef, creationEventReference(event))) {
        throw createError(400, 'Context Sheet record does not reference its creation event by current-allowed identity.', 'CSI_CREATE_EVENT_REF_MISMATCH');
    }
    if (!sameReference(event.contextSheetRef, recordReference(record, recordHash))) {
        throw createError(400, 'Context Sheet creation event does not bind the exact durable record hash.', 'CSI_CREATE_RECORD_REF_MISMATCH');
    }
    if (record.sheetType !== event.sheetType
        || record.anchorState !== event.anchorStateAtCreation
        || record.creationBasis?.creationPath !== event.creationPath) {
        throw createError(400, 'Context Sheet creation event does not match the record basis.', 'CSI_CREATE_BASIS_MISMATCH');
    }
}

function createLedgerEntry(entries, operation, artifactSchemaId, artifactClass, artifact, artifactHash, idempotencyKey, options) {
    const previousSequence = entries.length > 0 ? entries[entries.length - 1].sequence : 0;
    return {
        ledgerVersion: CONTEXT_SHEET_IDENTITY_LEDGER_VERSION,
        sequence: previousSequence + 1,
        entryId: createId('csiledger'),
        recordedAt: new Date(nowTimestamp(options.now)).toISOString(),
        scopeId: artifact.envelope.memoryScopeId,
        operation,
        idempotencyKey,
        artifactSchemaId,
        artifactClass,
        artifactId: artifact.envelope.artifactId,
        artifactHash,
        artifact,
    };
}

function appendLedgerEntriesDurably(ledgerPath, entries) {
    const serialized = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
    const fd = fs.openSync(ledgerPath, 'a');
    try {
        fs.writeSync(fd, serialized);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}

function findCreationEntry(entries, scopeId, operation, schemaId, idempotencyKey) {
    return entries.find((entry) => entry.scopeId === scopeId
        && entry.operation === operation
        && entry.artifactSchemaId === schemaId
        && entry.idempotencyKey === idempotencyKey) || null;
}

export function admitContextSheetCreation(paths, recordArtifact, creationEventArtifact, options = {}) {
    const recordValidation = validateContextSheetRecordArtifact(recordArtifact);
    if (!recordValidation.valid) {
        throw createError(400, 'Context Sheet record artifact failed schema validation.', 'CSI_CREATE_RECORD_SCHEMA_INVALID', { errors: recordValidation.errors });
    }
    const eventValidation = validateContextSheetCreationEventArtifact(creationEventArtifact);
    if (!eventValidation.valid) {
        throw createError(400, 'Context Sheet creation event artifact failed schema validation.', 'CSI_CREATE_EVENT_SCHEMA_INVALID', { errors: eventValidation.errors });
    }

    if (recordArtifact.envelope.schemaId !== CONTEXT_SHEET_RECORD_SCHEMA_ID
        || recordArtifact.envelope.artifactClass !== CONTEXT_SHEET_RECORD_ARTIFACT_CLASS) {
        throw createError(400, 'Context Sheet record envelope does not match the CREATE_RECORD operation mapping.', 'CSI_CREATE_RECORD_OPERATION_MISMATCH');
    }
    if (creationEventArtifact.envelope.schemaId !== CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID
        || creationEventArtifact.envelope.artifactClass !== CONTEXT_SHEET_CREATION_EVENT_ARTIFACT_CLASS) {
        throw createError(400, 'Context Sheet creation event envelope does not match the CREATE_EVENT operation mapping.', 'CSI_CREATE_EVENT_OPERATION_MISMATCH');
    }

    assertKnownBindings(recordArtifact.envelope, CONTEXT_SHEET_CREATE_RECORD_OPERATION, recordArtifact.identityPolicyVersion);
    assertKnownBindings(creationEventArtifact.envelope, CONTEXT_SHEET_CREATE_EVENT_OPERATION);

    const idempotencyKey = creationEventArtifact.envelope.idempotencyKey;
    const scopeId = creationEventArtifact.envelope.memoryScopeId;
    const recordHash = computeContextSheetIdentityArtifactHash(recordArtifact);
    const eventHash = computeContextSheetIdentityArtifactHash(creationEventArtifact);
    assertCreationPair(recordArtifact, creationEventArtifact, recordHash);

    ensureStorageRoot(paths.storageRoot);
    acquireContextSheetIdentityLedgerLock(paths);
    try {
        const entries = readContextSheetIdentityLedgerEntries(paths.contextSheetIdentityLedgerPath);
        const existingRecord = findCreationEntry(entries, scopeId, CONTEXT_SHEET_CREATE_RECORD_OPERATION, CONTEXT_SHEET_RECORD_SCHEMA_ID, idempotencyKey);
        const existingEvent = findCreationEntry(entries, scopeId, CONTEXT_SHEET_CREATE_EVENT_OPERATION, CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID, idempotencyKey);
        if ((existingRecord && !existingEvent) || (!existingRecord && existingEvent)) {
            throw createError(409, 'Context Sheet creation request has a partial durable pair.', 'CSI_CREATE_PARTIAL_PAIR');
        }
        if (existingRecord && existingEvent) {
            if (existingRecord.artifactHash === recordHash && existingEvent.artifactHash === eventHash) {
                return { recordEntry: existingRecord, eventEntry: existingEvent, appended: false };
            }
            throw createError(409, 'Context Sheet creation idempotency key collision with different artifact content.', 'CSI_CREATE_IDEMPOTENCY_COLLISION');
        }

        const recordEntry = createLedgerEntry(
            entries,
            CONTEXT_SHEET_CREATE_RECORD_OPERATION,
            CONTEXT_SHEET_RECORD_SCHEMA_ID,
            CONTEXT_SHEET_RECORD_ARTIFACT_CLASS,
            recordArtifact,
            recordHash,
            idempotencyKey,
            options,
        );
        const eventEntry = createLedgerEntry(
            [...entries, recordEntry],
            CONTEXT_SHEET_CREATE_EVENT_OPERATION,
            CONTEXT_SHEET_CREATION_EVENT_SCHEMA_ID,
            CONTEXT_SHEET_CREATION_EVENT_ARTIFACT_CLASS,
            creationEventArtifact,
            eventHash,
            idempotencyKey,
            options,
        );
        appendLedgerEntriesDurably(paths.contextSheetIdentityLedgerPath, [recordEntry, eventEntry]);
        return { recordEntry, eventEntry, appended: true };
    } finally {
        releaseContextSheetIdentityLedgerLock(paths);
    }
}
