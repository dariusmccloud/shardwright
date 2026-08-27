// Context Sheet Membership: NOMINATE-only durable ledger foundation.
//
// Bounded by docs/contracts/PHASE_X_CONTEXT_SHEET_MEMBERSHIP_RUNTIME_PERSISTENCE_AND_REPLAY_OWNERSHIP_CONTRACT.md.
// This module owns only the context-sheet-membership-ledger.jsonl append/read boundary for the
// NOMINATE operation. VALIDATE, LINK, SUCCEED, IMPACT_DECIDE, RECONCILE, routes, projections, and
// UI remain unauthorized and out of scope for this slice.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

import { cloneJson, createError, createId, ensureStorageRoot, nowTimestamp, stableStringify } from './core.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const schemaDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog');

export const MEMBERSHIP_LEDGER_VERSION = 1;
export const MEMBERSHIP_NOMINATION_SCHEMA_ID = 'context-sheet-membership-nomination-v1';
const MEMBERSHIP_NOMINATION_OPERATION = 'NOMINATE';
const MEMBERSHIP_NOMINATION_ARTIFACT_CLASS = 'NOMINATION';

// This slice recognizes exactly one governing contract binding for NOMINATE and no applicable
// policy binding yet. Any other contract binding, or any non-empty policy binding, is unsupported
// and must refuse before append rather than be silently accepted or guessed at.
const KNOWN_MEMBERSHIP_CONTRACT_BINDINGS = new Set(['phase-x-context-sheet-membership@0.1.0']);

function assertKnownContractAndPolicyBindings(envelope) {
    const contractBindings = Array.isArray(envelope.contractBindings) ? envelope.contractBindings : [];
    if (contractBindings.length === 0) {
        throw createError(
            400,
            'Context Sheet membership nomination is missing its required contract binding.',
            'CSM_NOMINATION_CONTRACT_BINDING_MISSING',
        );
    }
    for (const binding of contractBindings) {
        const bindingKey = `${binding?.id}@${binding?.version}`;
        if (!KNOWN_MEMBERSHIP_CONTRACT_BINDINGS.has(bindingKey)) {
            throw createError(
                400,
                `Context Sheet membership nomination references an unsupported contract binding: ${bindingKey}.`,
                'CSM_NOMINATION_CONTRACT_BINDING_UNSUPPORTED',
            );
        }
    }

    const policyBindings = Array.isArray(envelope.policyBindings) ? envelope.policyBindings : [];
    if (policyBindings.length > 0) {
        throw createError(
            400,
            'Context Sheet membership NOMINATE has no recognized applicable policy binding in this slice.',
            'CSM_NOMINATION_POLICY_BINDING_UNSUPPORTED',
        );
    }
}

function loadSchema(fileName) {
    return JSON.parse(fs.readFileSync(path.join(schemaDir, fileName), 'utf8'));
}

const DATE_TIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;

let nominationValidator = null;

function getNominationValidator() {
    if (nominationValidator) {
        return nominationValidator;
    }

    const ajv = new Ajv2020({ strict: true, allErrors: true });
    ajv.addFormat('date-time', { type: 'string', validate: (value) => DATE_TIME_FORMAT.test(value) });
    ajv.addSchema(loadSchema('memory-artifact-envelope-v1.schema.json'));
    ajv.addSchema(loadSchema('memory-artifact-reference-v1.schema.json'));
    nominationValidator = ajv.compile(loadSchema('context-sheet-membership-nomination-v1.schema.json'));
    return nominationValidator;
}

export function validateMembershipNominationArtifact(artifact) {
    const validate = getNominationValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function computeMembershipArtifactHash(artifact) {
    const canonicalPayload = stableStringify(artifact);
    return `sha256:${crypto.createHash('sha256').update(canonicalPayload).digest('hex')}`;
}

function acquireMembershipLedgerLock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try {
        fs.mkdirSync(paths.contextSheetMembershipLockPath);
    } catch (error) {
        if (error && error.code === 'EEXIST') {
            throw createError(
                409,
                'Another Context Sheet membership ledger append is already in progress.',
                'CSM_LEDGER_LOCK_HELD',
            );
        }
        throw error;
    }
}

function releaseMembershipLedgerLock(paths) {
    fs.rmSync(paths.contextSheetMembershipLockPath, { recursive: true, force: true });
}

function readMembershipLedgerEntries(ledgerPath) {
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
                `Context Sheet membership ledger line ${index + 1} is malformed JSON.`,
                'CSM_LEDGER_MALFORMED',
            );
        }

        if (!Number.isInteger(entry.sequence) || entry.sequence <= previousSequence) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${index + 1} has a non-monotonic sequence.`,
                'CSM_LEDGER_SEQUENCE_INVALID',
            );
        }
        previousSequence = entry.sequence;

        if (computeMembershipArtifactHash(entry.artifact) !== entry.artifactHash) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${entry.entryId || index + 1} failed hash verification.`,
                'CSM_LEDGER_HASH_MISMATCH',
            );
        }

        return entry;
    });
}

/**
 * Reads and verifies the durable NOMINATE ledger for restart read-back. Stateless per call: every invocation re-reads
 * and re-verifies the ledger bytes, so this function itself is the "restart" proof surface.
 */
export function readContextSheetMembershipLedger(paths) {
    return readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
}

function findExistingNomination(entries, scopeId, idempotencyKey) {
    return entries.find((entry) => entry.scopeId === scopeId
        && entry.operation === MEMBERSHIP_NOMINATION_OPERATION
        && entry.artifactSchemaId === MEMBERSHIP_NOMINATION_SCHEMA_ID
        && entry.idempotencyKey === idempotencyKey) || null;
}

function appendLedgerEntryDurably(ledgerPath, entry) {
    const serialized = `${JSON.stringify(entry)}\n`;
    const fd = fs.openSync(ledgerPath, 'a');
    try {
        fs.writeSync(fd, serialized);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}

/**
 * Admits exactly one NOMINATE artifact. Idempotency identity is (scopeId, operation,
 * artifactSchemaId, envelope.idempotencyKey); the canonical artifact hash is compared
 * separately so a changed artifact under a reused key cannot be mistaken for a repeat
 * of the same request.
 */
export function nominateContextSheetMembership(paths, artifact, options = {}) {
    const { valid, errors } = validateMembershipNominationArtifact(artifact);
    if (!valid) {
        throw createError(
            400,
            'Context Sheet membership nomination artifact failed schema validation.',
            'CSM_NOMINATION_SCHEMA_INVALID',
            { errors },
        );
    }

    const envelope = artifact.envelope;
    if (envelope.schemaId !== MEMBERSHIP_NOMINATION_SCHEMA_ID || envelope.artifactClass !== MEMBERSHIP_NOMINATION_ARTIFACT_CLASS) {
        throw createError(
            400,
            'Context Sheet membership nomination envelope does not match the NOMINATE operation mapping.',
            'CSM_NOMINATION_OPERATION_MISMATCH',
        );
    }

    assertKnownContractAndPolicyBindings(envelope);

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);

    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        const existing = findExistingNomination(entries, scopeId, idempotencyKey);

        if (existing) {
            if (existing.artifactHash === artifactHash) {
                return { entry: existing, appended: false };
            }
            throw createError(
                409,
                'Context Sheet membership nomination idempotency key collision with different artifact content.',
                'CSM_NOMINATION_IDEMPOTENCY_COLLISION',
            );
        }

        const previousSequence = entries.length > 0 ? entries[entries.length - 1].sequence : 0;
        const entry = {
            ledgerVersion: MEMBERSHIP_LEDGER_VERSION,
            sequence: previousSequence + 1,
            entryId: createId('csmledger'),
            recordedAt: new Date(nowTimestamp(options.now)).toISOString(),
            scopeId,
            operation: MEMBERSHIP_NOMINATION_OPERATION,
            idempotencyKey,
            artifactSchemaId: MEMBERSHIP_NOMINATION_SCHEMA_ID,
            artifactClass: MEMBERSHIP_NOMINATION_ARTIFACT_CLASS,
            artifactId: envelope.artifactId,
            artifactHash,
            artifact,
        };

        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}
