// Context Sheet Membership: durable NOMINATE, VALIDATE, LINK, SUCCEED, and IMPACT_DECIDE ledger foundation.
//
// Bounded by docs/contracts/PHASE_X_CONTEXT_SHEET_MEMBERSHIP_RUNTIME_PERSISTENCE_AND_REPLAY_OWNERSHIP_CONTRACT.md.
// This module owns only the context-sheet-membership-ledger.jsonl append/read boundary for the
// NOMINATE, durable VALIDATE-event, immutable LINK, SUCCEED-event, and IMPACT_DECIDE-event
// admission. RECONCILE, routes, projections, semantic validation, and UI remain unauthorized
// and out of scope for this slice.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

import { cloneJson, createError, createId, ensureStorageRoot, nowTimestamp, stableStringify } from './core.js';
import { readContextSheetIdentityLedger } from './identity.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const schemaDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog');

export const MEMBERSHIP_LEDGER_VERSION = 1;
export const MEMBERSHIP_NOMINATION_SCHEMA_ID = 'context-sheet-membership-nomination-v1';
export const MEMBERSHIP_VALIDATION_SCHEMA_ID = 'context-sheet-membership-validation-event-v1';
export const MEMBERSHIP_LINK_SCHEMA_ID = 'context-sheet-membership-link-v1';
export const MEMBERSHIP_SUCCESSOR_SCHEMA_ID = 'context-sheet-membership-successor-event-v1';
export const MEMBERSHIP_IMPACT_DECISION_SCHEMA_ID = 'context-sheet-membership-impact-decision-v1';
const MEMBERSHIP_NOMINATION_OPERATION = 'NOMINATE';
const MEMBERSHIP_NOMINATION_ARTIFACT_CLASS = 'NOMINATION';
const MEMBERSHIP_VALIDATION_OPERATION = 'VALIDATE';
const MEMBERSHIP_VALIDATION_ARTIFACT_CLASS = 'EVENT';
const MEMBERSHIP_LINK_OPERATION = 'LINK';
const MEMBERSHIP_LINK_ARTIFACT_CLASS = 'IMMUTABLE_RECORD';
const MEMBERSHIP_SUCCESSOR_OPERATION = 'SUCCEED';
const MEMBERSHIP_SUCCESSOR_ARTIFACT_CLASS = 'EVENT';
const MEMBERSHIP_IMPACT_DECIDE_OPERATION = 'IMPACT_DECIDE';
const MEMBERSHIP_IMPACT_DECISION_ARTIFACT_CLASS = 'EVENT';

// This slice recognizes exactly one governing contract binding for membership operations. NOMINATE
// has no applicable policy binding yet; VALIDATE, LINK, and SUCCEED require the recognized
// membership-validation policy binding. Unsupported bindings refuse before append rather than being
// silently accepted or guessed at.
const KNOWN_MEMBERSHIP_CONTRACT_BINDINGS = new Set(['phase-x-context-sheet-membership@0.1.0']);
const KNOWN_MEMBERSHIP_VALIDATION_POLICY_BINDING = 'membership-validation-policy@v1';

function assertKnownContractBindings(envelope, operationName, errorPrefix = operationName) {
    const contractBindings = Array.isArray(envelope.contractBindings) ? envelope.contractBindings : [];
    if (contractBindings.length === 0) {
        throw createError(
            400,
            `Context Sheet membership ${operationName} is missing its required contract binding.`,
            `CSM_${errorPrefix}_CONTRACT_BINDING_MISSING`,
        );
    }
    for (const binding of contractBindings) {
        const bindingKey = `${binding?.id}@${binding?.version}`;
        if (!KNOWN_MEMBERSHIP_CONTRACT_BINDINGS.has(bindingKey)) {
            throw createError(
                400,
                `Context Sheet membership ${operationName} references an unsupported contract binding: ${bindingKey}.`,
                `CSM_${errorPrefix}_CONTRACT_BINDING_UNSUPPORTED`,
            );
        }
    }
}

function assertKnownNominationPolicyBindings(envelope) {
    const policyBindings = Array.isArray(envelope.policyBindings) ? envelope.policyBindings : [];
    if (policyBindings.length > 0) {
        throw createError(
            400,
            'Context Sheet membership NOMINATE has no recognized applicable policy binding in this slice.',
            'CSM_NOMINATION_POLICY_BINDING_UNSUPPORTED',
        );
    }
}

function assertKnownValidationPolicyBindings(artifact, operationName, errorPrefix = operationName) {
    const policyBindings = Array.isArray(artifact.envelope.policyBindings) ? artifact.envelope.policyBindings : [];
    const policyBindingKeys = policyBindings.map((binding) => `${binding?.id}@${binding?.version}`);
    if (policyBindingKeys.length !== 1 || policyBindingKeys[0] !== KNOWN_MEMBERSHIP_VALIDATION_POLICY_BINDING
        || artifact.governingPolicyVersion !== 'v1') {
        const errorCode = operationName === MEMBERSHIP_VALIDATION_OPERATION
            ? 'CSM_VALIDATE_POLICY_BINDING_UNSUPPORTED'
            : `CSM_${errorPrefix}_POLICY_BINDING_UNSUPPORTED`;
        throw createError(
            400,
            `Context Sheet membership ${operationName} must bind the recognized membership validation policy version.`,
            errorCode,
        );
    }
}

function loadSchema(fileName) {
    return JSON.parse(fs.readFileSync(path.join(schemaDir, fileName), 'utf8'));
}

const DATE_TIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;

const artifactValidators = new Map();

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

function getNominationValidator() {
    return getArtifactValidator('context-sheet-membership-nomination-v1.schema.json');
}

function getValidationValidator() {
    return getArtifactValidator('context-sheet-membership-validation-event-v1.schema.json');
}

function getLinkValidator() {
    return getArtifactValidator('context-sheet-membership-link-v1.schema.json');
}

function getSuccessorValidator() {
    return getArtifactValidator('context-sheet-membership-successor-event-v1.schema.json');
}

function getImpactDecisionValidator() {
    return getArtifactValidator('context-sheet-membership-impact-decision-v1.schema.json');
}

export function validateMembershipNominationArtifact(artifact) {
    const validate = getNominationValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function validateMembershipValidationArtifact(artifact) {
    const validate = getValidationValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function validateMembershipLinkArtifact(artifact) {
    const validate = getLinkValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function validateMembershipSuccessorArtifact(artifact) {
    const validate = getSuccessorValidator();
    const valid = validate(artifact) === true;
    return {
        valid,
        errors: valid ? [] : cloneJson(validate.errors || []),
    };
}

export function validateMembershipImpactDecisionArtifact(artifact) {
    const validate = getImpactDecisionValidator();
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

        if (entry.ledgerVersion !== MEMBERSHIP_LEDGER_VERSION) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${entry.entryId || index + 1} has an unsupported ledger version.`,
                'CSM_LEDGER_VERSION_UNSUPPORTED',
            );
        }

        if (computeMembershipArtifactHash(entry.artifact) !== entry.artifactHash) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${entry.entryId || index + 1} failed hash verification.`,
                'CSM_LEDGER_HASH_MISMATCH',
            );
        }

        const expectedArtifactClass = entry.operation === MEMBERSHIP_NOMINATION_OPERATION
            && entry.artifactSchemaId === MEMBERSHIP_NOMINATION_SCHEMA_ID
            ? MEMBERSHIP_NOMINATION_ARTIFACT_CLASS
            : entry.operation === MEMBERSHIP_VALIDATION_OPERATION
                && entry.artifactSchemaId === MEMBERSHIP_VALIDATION_SCHEMA_ID
                ? MEMBERSHIP_VALIDATION_ARTIFACT_CLASS
                : entry.operation === MEMBERSHIP_LINK_OPERATION
                    && entry.artifactSchemaId === MEMBERSHIP_LINK_SCHEMA_ID
                    ? MEMBERSHIP_LINK_ARTIFACT_CLASS
                    : entry.operation === MEMBERSHIP_SUCCESSOR_OPERATION
                        && entry.artifactSchemaId === MEMBERSHIP_SUCCESSOR_SCHEMA_ID
                        ? MEMBERSHIP_SUCCESSOR_ARTIFACT_CLASS
                        : entry.operation === MEMBERSHIP_IMPACT_DECIDE_OPERATION
                            && entry.artifactSchemaId === MEMBERSHIP_IMPACT_DECISION_SCHEMA_ID
                            ? MEMBERSHIP_IMPACT_DECISION_ARTIFACT_CLASS
                            : null;
        if (!expectedArtifactClass || entry.artifactClass !== expectedArtifactClass) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${entry.entryId || index + 1} has an unsupported operation mapping.`,
                'CSM_LEDGER_OPERATION_MAPPING_INVALID',
            );
        }
        if (entry.artifact?.envelope?.schemaId !== entry.artifactSchemaId
            || entry.artifact?.envelope?.artifactClass !== entry.artifactClass
            || entry.artifact?.envelope?.artifactId !== entry.artifactId
            || entry.artifact?.envelope?.memoryScopeId !== entry.scopeId
            || entry.artifact?.envelope?.idempotencyKey !== entry.idempotencyKey) {
            throw createError(
                409,
                `Context Sheet membership ledger entry ${entry.entryId || index + 1} does not match its artifact envelope.`,
                'CSM_LEDGER_ENTRY_ENVELOPE_MISMATCH',
            );
        }

        return entry;
    });
}

/**
 * Reads and verifies the durable membership ledger for restart read-back. Stateless per call: every invocation
 * re-reads and re-verifies the ledger bytes, so this function itself is the "restart" proof surface.
 */
export function readContextSheetMembershipLedger(paths) {
    return readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
}

function findExistingOperation(entries, scopeId, operation, artifactSchemaId, idempotencyKey) {
    return entries.find((entry) => entry.scopeId === scopeId
        && entry.operation === operation
        && entry.artifactSchemaId === artifactSchemaId
        && entry.idempotencyKey === idempotencyKey) || null;
}

function sameExactReference(left, right) {
    return left?.artifactType === right?.artifactType
        && left?.artifactId === right?.artifactId
        && left?.memoryScopeId === right?.memoryScopeId
        && left?.expectedArtifactClass === right?.expectedArtifactClass
        && left?.resolutionRequirement === 'EXACT_HASH'
        && right?.resolutionRequirement === 'EXACT_HASH'
        && left?.immutableHash === right?.immutableHash;
}

function assertValidationNominationCustody(entries, artifact) {
    const { envelope, nominationRef } = artifact;
    if (nominationRef.memoryScopeId !== envelope.memoryScopeId) {
        throw createError(
            400,
            'Context Sheet membership VALIDATE nomination reference is outside the validation scope.',
            'CSM_VALIDATE_NOMINATION_SCOPE_MISMATCH',
        );
    }

    const nominationEntry = entries.find((entry) => entry.operation === MEMBERSHIP_NOMINATION_OPERATION
        && entry.artifactSchemaId === MEMBERSHIP_NOMINATION_SCHEMA_ID
        && entry.scopeId === envelope.memoryScopeId
        && entry.artifactId === nominationRef.artifactId);
    if (!nominationEntry) {
        throw createError(
            409,
            'Context Sheet membership VALIDATE requires an exact prior durable NOMINATE entry.',
            'CSM_VALIDATE_NOMINATION_MISSING',
        );
    }
    if (nominationEntry.artifactHash !== nominationRef.immutableHash) {
        throw createError(
            409,
            'Context Sheet membership VALIDATE nomination reference does not match the durable nomination hash.',
            'CSM_VALIDATE_NOMINATION_HASH_MISMATCH',
        );
    }

    const authorityBasisRefs = Array.isArray(envelope.authorityBasisRefs) ? envelope.authorityBasisRefs : [];
    if (!authorityBasisRefs.some((reference) => sameExactReference(reference, nominationRef))) {
        throw createError(
            400,
            'Context Sheet membership VALIDATE must bind its exact nomination as an authority basis reference.',
            'CSM_VALIDATE_NOMINATION_BASIS_MISSING',
        );
    }
}

function exactLedgerReference(entry, artifactType, artifactClass) {
    return {
        artifactType,
        artifactId: entry.artifactId,
        memoryScopeId: entry.scopeId,
        expectedArtifactClass: artifactClass,
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: entry.artifactHash,
    };
}

function sameStringArray(left, right) {
    return Array.isArray(left) && Array.isArray(right)
        && left.length === right.length
        && left.every((value, index) => value === right[index]);
}

function assertLinkValidationCustody(entries, artifact) {
    const { envelope, validationEventRef, createdFromNominationRef } = artifact;
    if (validationEventRef.memoryScopeId !== envelope.memoryScopeId
        || createdFromNominationRef.memoryScopeId !== envelope.memoryScopeId) {
        throw createError(400, 'Context Sheet membership LINK source references are outside the link scope.', 'CSM_LINK_SOURCE_SCOPE_MISMATCH');
    }

    const validationEntry = entries.find((entry) => entry.operation === MEMBERSHIP_VALIDATION_OPERATION
        && entry.artifactSchemaId === MEMBERSHIP_VALIDATION_SCHEMA_ID
        && entry.scopeId === envelope.memoryScopeId
        && entry.artifactId === validationEventRef.artifactId);
    if (!validationEntry) {
        throw createError(409, 'Context Sheet membership LINK requires an exact prior durable VALIDATE entry.', 'CSM_LINK_VALIDATION_MISSING');
    }
    const expectedValidationRef = exactLedgerReference(validationEntry, MEMBERSHIP_VALIDATION_SCHEMA_ID, MEMBERSHIP_VALIDATION_ARTIFACT_CLASS);
    if (!sameExactReference(validationEventRef, expectedValidationRef)) {
        throw createError(409, 'Context Sheet membership LINK validation reference does not match the durable validation hash.', 'CSM_LINK_VALIDATION_HASH_MISMATCH');
    }

    const validationArtifact = validationEntry.artifact;
    if (validationArtifact.decision !== 'ACCEPTED'
        || validationArtifact.validationEffect !== 'ACCEPT_LINK'
        || validationArtifact.acceptedLinkEligible !== true) {
        throw createError(409, 'Context Sheet membership LINK requires an accepted durable VALIDATE decision.', 'CSM_LINK_VALIDATION_NOT_ACCEPTED');
    }

    const expectedNominationRef = validationArtifact.nominationRef;
    if (!sameExactReference(createdFromNominationRef, expectedNominationRef)) {
        throw createError(409, 'Context Sheet membership LINK nomination reference does not match its validation custody.', 'CSM_LINK_NOMINATION_MISMATCH');
    }
    const authorityBasisRefs = Array.isArray(envelope.authorityBasisRefs) ? envelope.authorityBasisRefs : [];
    if (!authorityBasisRefs.some((reference) => sameExactReference(reference, expectedValidationRef))) {
        throw createError(400, 'Context Sheet membership LINK must bind its exact validation event as an authority basis reference.', 'CSM_LINK_VALIDATION_BASIS_MISSING');
    }

    const matchesValidation = sameExactReference(artifact.catalogRecordRef, validationArtifact.evaluatedCatalogRecordRef)
        && sameExactReference(artifact.contextSheetLifecycleRef, validationArtifact.evaluatedContextSheetRef)
        && artifact.linkType === validationArtifact.validatedLinkType
        && sameStringArray(artifact.catalogClaimIds, validationArtifact.claimBasis.catalogClaimIds)
        && sameStringArray(artifact.targetClaimIds, validationArtifact.claimBasis.targetClaimIds)
        && artifact.claimBasisHash === validationArtifact.claimBasis.basisHash
        && artifact.boundedMeaning === validationArtifact.claimBasis.boundedMeaning
        && sameStringArray(artifact.limitations, validationArtifact.claimBasis.limitations)
        && artifact.validationMethod === validationArtifact.validationMethod
        && artifact.governingPolicyVersion === validationArtifact.governingPolicyVersion
        && artifact.validatedBy.owner === validationArtifact.validator.owner
        && artifact.validatedBy.componentId === validationArtifact.validator.componentId
        && artifact.validatedBy.componentVersion === validationArtifact.validator.componentVersion
        && artifact.validatedAt === validationArtifact.occurredAt;
    if (!matchesValidation) {
        throw createError(409, 'Context Sheet membership LINK does not match its accepted validation decision.', 'CSM_LINK_VALIDATION_CONTENT_MISMATCH');
    }
}

function findExistingLinkBySemanticKey(entries, scopeId, semanticDeduplicationKey) {
    return entries.find((entry) => entry.operation === MEMBERSHIP_LINK_OPERATION
        && entry.artifactSchemaId === MEMBERSHIP_LINK_SCHEMA_ID
        && entry.scopeId === scopeId
        && entry.artifact?.semanticDeduplicationKey === semanticDeduplicationKey) || null;
}

function findExactLedgerEntry(entries, operation, artifactSchemaId, scopeId, reference) {
    const entry = entries.find((candidate) => candidate.operation === operation
        && candidate.artifactSchemaId === artifactSchemaId
        && candidate.scopeId === scopeId
        && candidate.artifactId === reference.artifactId);
    if (!entry) {
        return null;
    }
    return entry.artifactHash === reference.immutableHash ? entry : false;
}

function assertSuccessorLinkCustody(entries, artifact) {
    const { envelope, predecessorLinkRef, successorLinkRef, successorValidationEventRef } = artifact;
    if (predecessorLinkRef.memoryScopeId !== envelope.memoryScopeId) {
        throw createError(400, 'Context Sheet membership SUCCEED predecessor reference is outside the event scope.', 'CSM_SUCCEED_PREDECESSOR_SCOPE_MISMATCH');
    }
    const predecessor = findExactLedgerEntry(entries, MEMBERSHIP_LINK_OPERATION, MEMBERSHIP_LINK_SCHEMA_ID, envelope.memoryScopeId, predecessorLinkRef);
    if (predecessor === null) {
        throw createError(409, 'Context Sheet membership SUCCEED requires an exact prior durable LINK.', 'CSM_SUCCEED_PREDECESSOR_MISSING');
    }
    if (predecessor === false) {
        throw createError(409, 'Context Sheet membership SUCCEED predecessor reference does not match the durable link hash.', 'CSM_SUCCEED_PREDECESSOR_HASH_MISMATCH');
    }
    const authorityBasisRefs = Array.isArray(envelope.authorityBasisRefs) ? envelope.authorityBasisRefs : [];
    if (!authorityBasisRefs.some((reference) => sameExactReference(reference, predecessorLinkRef))) {
        throw createError(400, 'Context Sheet membership SUCCEED must bind its exact predecessor link as an authority basis reference.', 'CSM_SUCCEED_PREDECESSOR_BASIS_MISSING');
    }
    if (artifact.governingPolicyVersion !== predecessor.artifact.governingPolicyVersion) {
        throw createError(409, 'Context Sheet membership SUCCEED policy version does not match its predecessor link.', 'CSM_SUCCEED_POLICY_MISMATCH');
    }

    for (const [reference, operation, schemaId, missingCode, hashCode] of [
        [successorLinkRef, MEMBERSHIP_LINK_OPERATION, MEMBERSHIP_LINK_SCHEMA_ID, 'CSM_SUCCEED_SUCCESSOR_LINK_MISSING', 'CSM_SUCCEED_SUCCESSOR_LINK_HASH_MISMATCH'],
        [successorValidationEventRef, MEMBERSHIP_VALIDATION_OPERATION, MEMBERSHIP_VALIDATION_SCHEMA_ID, 'CSM_SUCCEED_SUCCESSOR_VALIDATION_MISSING', 'CSM_SUCCEED_SUCCESSOR_VALIDATION_HASH_MISMATCH'],
    ]) {
        if (reference === null) {
            continue;
        }
        if (reference.memoryScopeId !== envelope.memoryScopeId) {
            throw createError(400, 'Context Sheet membership SUCCEED successor reference is outside the event scope.', 'CSM_SUCCEED_SUCCESSOR_SCOPE_MISMATCH');
        }
        const successor = findExactLedgerEntry(entries, operation, schemaId, envelope.memoryScopeId, reference);
        if (successor === null) {
            throw createError(409, 'Context Sheet membership SUCCEED requires its exact durable successor custody.', missingCode);
        }
        if (successor === false) {
            throw createError(409, 'Context Sheet membership SUCCEED successor reference does not match durable custody.', hashCode);
        }
    }
}

function findExactIdentityLedgerEntry(paths, scopeId, reference) {
    const identityEntries = readContextSheetIdentityLedger(paths);
    const entry = identityEntries.find((candidate) => candidate.scopeId === scopeId
        && candidate.artifactSchemaId === reference.artifactType
        && candidate.artifactClass === reference.expectedArtifactClass
        && candidate.artifactId === reference.artifactId);
    if (!entry) {
        return null;
    }
    return entry.artifactHash === reference.immutableHash ? entry : false;
}

function exactReferenceForMembershipEntry(entry) {
    return exactLedgerReference(entry, entry.artifactSchemaId, entry.artifactClass);
}

function assertImpactDecisionCustody(paths, entries, artifact) {
    const { envelope, structuralEventRef, impactedLinkRef, successorEventRefs } = artifact;
    if (structuralEventRef.memoryScopeId !== envelope.memoryScopeId
        || impactedLinkRef.memoryScopeId !== envelope.memoryScopeId
        || successorEventRefs.some((reference) => reference.memoryScopeId !== envelope.memoryScopeId)) {
        throw createError(400, 'Context Sheet membership IMPACT_DECIDE references must stay inside the event scope.', 'CSM_IMPACT_SCOPE_MISMATCH');
    }

    const structuralEvent = findExactIdentityLedgerEntry(paths, envelope.memoryScopeId, structuralEventRef);
    if (structuralEvent === null) {
        throw createError(409, 'Context Sheet membership IMPACT_DECIDE requires exact durable Context Sheet structural-event custody.', 'CSM_IMPACT_STRUCTURAL_EVENT_MISSING');
    }
    if (structuralEvent === false) {
        throw createError(409, 'Context Sheet membership IMPACT_DECIDE structural-event reference does not match the Identity ledger hash.', 'CSM_IMPACT_STRUCTURAL_EVENT_HASH_MISMATCH');
    }
    if ((artifact.impactSource === 'MERGE' && structuralEvent.operation !== 'MERGE')
        || (artifact.impactSource === 'SPLIT' && structuralEvent.operation !== 'SPLIT')) {
        throw createError(409, 'Context Sheet membership IMPACT_DECIDE impact source does not match the structural event operation.', 'CSM_IMPACT_STRUCTURAL_EVENT_OPERATION_MISMATCH');
    }

    const impactedLink = findExactLedgerEntry(entries, MEMBERSHIP_LINK_OPERATION, MEMBERSHIP_LINK_SCHEMA_ID, envelope.memoryScopeId, impactedLinkRef);
    if (impactedLink === null) {
        throw createError(409, 'Context Sheet membership IMPACT_DECIDE requires exact durable impacted LINK custody.', 'CSM_IMPACT_LINK_MISSING');
    }
    if (impactedLink === false) {
        throw createError(409, 'Context Sheet membership IMPACT_DECIDE impacted LINK reference does not match the durable link hash.', 'CSM_IMPACT_LINK_HASH_MISMATCH');
    }

    const authorityBasisRefs = Array.isArray(envelope.authorityBasisRefs) ? envelope.authorityBasisRefs : [];
    if (!authorityBasisRefs.some((reference) => sameExactReference(reference, structuralEventRef))) {
        throw createError(400, 'Context Sheet membership IMPACT_DECIDE must bind its exact structural event as an authority basis reference.', 'CSM_IMPACT_STRUCTURAL_EVENT_BASIS_MISSING');
    }
    if (!artifact.evidenceRefs.some((reference) => sameExactReference(reference, structuralEventRef))) {
        throw createError(400, 'Context Sheet membership IMPACT_DECIDE must cite the structural event as evidence.', 'CSM_IMPACT_STRUCTURAL_EVENT_EVIDENCE_MISSING');
    }

    for (const successorEventRef of successorEventRefs) {
        const successorEvent = findExactLedgerEntry(entries, MEMBERSHIP_SUCCESSOR_OPERATION, MEMBERSHIP_SUCCESSOR_SCHEMA_ID, envelope.memoryScopeId, successorEventRef);
        if (successorEvent === null) {
            throw createError(409, 'Context Sheet membership IMPACT_DECIDE requires exact durable successor-event custody.', 'CSM_IMPACT_SUCCESSOR_EVENT_MISSING');
        }
        if (successorEvent === false) {
            throw createError(409, 'Context Sheet membership IMPACT_DECIDE successor-event reference does not match the durable successor hash.', 'CSM_IMPACT_SUCCESSOR_EVENT_HASH_MISMATCH');
        }
        if (!sameExactReference(successorEvent.artifact.predecessorLinkRef, impactedLinkRef)) {
            throw createError(409, 'Context Sheet membership IMPACT_DECIDE successor event does not govern the impacted predecessor link.', 'CSM_IMPACT_SUCCESSOR_PREDECESSOR_MISMATCH');
        }
    }
}

function findExactMembershipEntryByRef(entries, operation, artifactSchemaId, scopeId, reference) {
    const entry = findExactLedgerEntry(entries, operation, artifactSchemaId, scopeId, reference);
    if (entry === null) {
        throw createError(409, 'Context Sheet membership replay is missing exact durable membership custody.', 'CSM_REPLAY_MEMBERSHIP_CUSTODY_MISSING');
    }
    if (entry === false) {
        throw createError(409, 'Context Sheet membership replay found stale durable membership custody.', 'CSM_REPLAY_MEMBERSHIP_CUSTODY_HASH_MISMATCH');
    }
    return entry;
}

function assertReplayStructuralEventCustody(paths, scopeId, reference, impactSource) {
    const entry = findExactIdentityLedgerEntry(paths, scopeId, reference);
    if (entry === null) {
        throw createError(409, 'Context Sheet membership replay is missing exact Context Sheet structural-event custody.', 'CSM_REPLAY_STRUCTURAL_EVENT_MISSING');
    }
    if (entry === false) {
        throw createError(409, 'Context Sheet membership replay found stale Context Sheet structural-event custody.', 'CSM_REPLAY_STRUCTURAL_EVENT_HASH_MISMATCH');
    }
    if ((impactSource === 'MERGE' && entry.operation !== 'MERGE')
        || (impactSource === 'SPLIT' && entry.operation !== 'SPLIT')) {
        throw createError(409, 'Context Sheet membership replay structural-event operation does not match the impact source.', 'CSM_REPLAY_STRUCTURAL_EVENT_OPERATION_MISMATCH');
    }
    return entry;
}

function referenceKeysEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
}

function sameLinkRefs(left, right) {
    return Array.isArray(left) && Array.isArray(right)
        && left.length === right.length
        && left.every((reference, index) => referenceKeysEqual(reference, right[index]));
}

function applyCurrentUseEffect(linkStatesByArtifactId, targetLinkRef, currentUseState, successorLinkRefs, effectRef) {
    const target = linkStatesByArtifactId.get(targetLinkRef.artifactId);
    if (!target) {
        throw createError(409, 'Context Sheet membership replay cannot apply current-use state to a missing link.', 'CSM_REPLAY_LINK_STATE_MISSING');
    }

    if (target.currentUseEffectRef
        && (target.currentUseState !== currentUseState || !sameLinkRefs(target.successorLinkRefs, successorLinkRefs))) {
        target.currentUseState = 'BLOCKED';
        target.successorLinkRefs = [];
        target.blockers.push('CSM_REPLAY_CONFLICTING_CURRENT_USE_EVENTS');
        target.currentUseEffectRef = effectRef;
        return;
    }

    target.currentUseState = currentUseState;
    target.successorLinkRefs = successorLinkRefs.map((reference) => cloneJson(reference));
    target.currentUseEffectRef = effectRef;
}

function createLedgerEntry(entries, operation, artifactSchemaId, artifactClass, artifact, artifactHash, options) {
    const previousSequence = entries.length > 0 ? entries[entries.length - 1].sequence : 0;
    return {
        ledgerVersion: MEMBERSHIP_LEDGER_VERSION,
        sequence: previousSequence + 1,
        entryId: createId('csmledger'),
        recordedAt: new Date(nowTimestamp(options.now)).toISOString(),
        scopeId: artifact.envelope.memoryScopeId,
        operation,
        idempotencyKey: artifact.envelope.idempotencyKey,
        artifactSchemaId,
        artifactClass,
        artifactId: artifact.envelope.artifactId,
        artifactHash,
        artifact,
    };
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

    assertKnownContractBindings(envelope, MEMBERSHIP_NOMINATION_OPERATION, 'NOMINATION');
    assertKnownNominationPolicyBindings(envelope);

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);

    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        const existing = findExistingOperation(entries, scopeId, MEMBERSHIP_NOMINATION_OPERATION, MEMBERSHIP_NOMINATION_SCHEMA_ID, idempotencyKey);

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

        const entry = createLedgerEntry(
            entries,
            MEMBERSHIP_NOMINATION_OPERATION,
            MEMBERSHIP_NOMINATION_SCHEMA_ID,
            MEMBERSHIP_NOMINATION_ARTIFACT_CLASS,
            artifact,
            artifactHash,
            options,
        );

        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}

/**
 * Admits one server-owned VALIDATE decision event after schema/policy verification and exact
 * durable NOMINATE custody. This records a validation decision only: it does not resolve source
 * authority, create a membership link, or perform semantic validation in this slice.
 */
export function admitContextSheetMembershipValidation(paths, artifact, options = {}) {
    const { valid, errors } = validateMembershipValidationArtifact(artifact);
    if (!valid) {
        throw createError(
            400,
            'Context Sheet membership validation artifact failed schema validation.',
            'CSM_VALIDATE_SCHEMA_INVALID',
            { errors },
        );
    }

    const envelope = artifact.envelope;
    if (envelope.schemaId !== MEMBERSHIP_VALIDATION_SCHEMA_ID || envelope.artifactClass !== MEMBERSHIP_VALIDATION_ARTIFACT_CLASS) {
        throw createError(
            400,
            'Context Sheet membership validation envelope does not match the VALIDATE operation mapping.',
            'CSM_VALIDATE_OPERATION_MISMATCH',
        );
    }

    assertKnownContractBindings(envelope, MEMBERSHIP_VALIDATION_OPERATION);
    assertKnownValidationPolicyBindings(artifact, MEMBERSHIP_VALIDATION_OPERATION);

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);

    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        assertValidationNominationCustody(entries, artifact);
        const existing = findExistingOperation(entries, scopeId, MEMBERSHIP_VALIDATION_OPERATION, MEMBERSHIP_VALIDATION_SCHEMA_ID, idempotencyKey);

        if (existing) {
            if (existing.artifactHash === artifactHash) {
                return { entry: existing, appended: false };
            }
            throw createError(
                409,
                'Context Sheet membership validation idempotency key collision with different artifact content.',
                'CSM_VALIDATE_IDEMPOTENCY_COLLISION',
            );
        }

        const entry = createLedgerEntry(
            entries,
            MEMBERSHIP_VALIDATION_OPERATION,
            MEMBERSHIP_VALIDATION_SCHEMA_ID,
            MEMBERSHIP_VALIDATION_ARTIFACT_CLASS,
            artifact,
            artifactHash,
            options,
        );
        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}

/**
 * Admits one immutable LINK only from an exact prior ACCEPTED VALIDATE event and its exact NOMINATE.
 * This stores the accepted relationship without resolving external source authority, building projections,
 * or performing semantic validation in this slice.
 */
export function admitContextSheetMembershipLink(paths, artifact, options = {}) {
    const { valid, errors } = validateMembershipLinkArtifact(artifact);
    if (!valid) {
        throw createError(400, 'Context Sheet membership link artifact failed schema validation.', 'CSM_LINK_SCHEMA_INVALID', { errors });
    }

    const envelope = artifact.envelope;
    if (envelope.schemaId !== MEMBERSHIP_LINK_SCHEMA_ID || envelope.artifactClass !== MEMBERSHIP_LINK_ARTIFACT_CLASS) {
        throw createError(400, 'Context Sheet membership link envelope does not match the LINK operation mapping.', 'CSM_LINK_OPERATION_MISMATCH');
    }
    assertKnownContractBindings(envelope, MEMBERSHIP_LINK_OPERATION);
    assertKnownValidationPolicyBindings(artifact, MEMBERSHIP_LINK_OPERATION);

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);
    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        assertLinkValidationCustody(entries, artifact);
        const existing = findExistingOperation(entries, scopeId, MEMBERSHIP_LINK_OPERATION, MEMBERSHIP_LINK_SCHEMA_ID, idempotencyKey);
        if (existing) {
            if (existing.artifactHash === artifactHash) {
                return { entry: existing, appended: false };
            }
            throw createError(409, 'Context Sheet membership link idempotency key collision with different artifact content.', 'CSM_LINK_IDEMPOTENCY_COLLISION');
        }
        if (findExistingLinkBySemanticKey(entries, scopeId, artifact.semanticDeduplicationKey)) {
            throw createError(409, 'Context Sheet membership link duplicates an existing accepted semantic basis.', 'CSM_LINK_SEMANTIC_DUPLICATE');
        }

        const entry = createLedgerEntry(
            entries,
            MEMBERSHIP_LINK_OPERATION,
            MEMBERSHIP_LINK_SCHEMA_ID,
            MEMBERSHIP_LINK_ARTIFACT_CLASS,
            artifact,
            artifactHash,
            options,
        );
        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}

/**
 * Admits one immutable SUCCEED correction event from exact durable predecessor/successor custody.
 * It records the correction event only; projection current-use reconstruction remains out of scope.
 */
export function admitContextSheetMembershipSuccessor(paths, artifact, options = {}) {
    const { valid, errors } = validateMembershipSuccessorArtifact(artifact);
    if (!valid) {
        throw createError(400, 'Context Sheet membership successor artifact failed schema validation.', 'CSM_SUCCEED_SCHEMA_INVALID', { errors });
    }
    const envelope = artifact.envelope;
    if (envelope.schemaId !== MEMBERSHIP_SUCCESSOR_SCHEMA_ID || envelope.artifactClass !== MEMBERSHIP_SUCCESSOR_ARTIFACT_CLASS) {
        throw createError(400, 'Context Sheet membership successor envelope does not match the SUCCEED operation mapping.', 'CSM_SUCCEED_OPERATION_MISMATCH');
    }
    assertKnownContractBindings(envelope, MEMBERSHIP_SUCCESSOR_OPERATION);
    assertKnownValidationPolicyBindings(artifact, MEMBERSHIP_SUCCESSOR_OPERATION);

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);
    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        assertSuccessorLinkCustody(entries, artifact);
        const existing = findExistingOperation(entries, scopeId, MEMBERSHIP_SUCCESSOR_OPERATION, MEMBERSHIP_SUCCESSOR_SCHEMA_ID, idempotencyKey);
        if (existing) {
            if (existing.artifactHash === artifactHash) {
                return { entry: existing, appended: false };
            }
            throw createError(409, 'Context Sheet membership successor idempotency key collision with different artifact content.', 'CSM_SUCCEED_IDEMPOTENCY_COLLISION');
        }
        const entry = createLedgerEntry(
            entries,
            MEMBERSHIP_SUCCESSOR_OPERATION,
            MEMBERSHIP_SUCCESSOR_SCHEMA_ID,
            MEMBERSHIP_SUCCESSOR_ARTIFACT_CLASS,
            artifact,
            artifactHash,
            options,
        );
        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}

/**
 * Admits one IMPACT_DECIDE event from exact durable membership-link custody and exact Context
 * Sheet Identity merge/split custody. This records the per-link decision only; it does not mutate
 * the predecessor link, write Context Sheet authority, or materialize current-use projections.
 */
export function admitContextSheetMembershipImpactDecision(paths, artifact, options = {}) {
    const { valid, errors } = validateMembershipImpactDecisionArtifact(artifact);
    if (!valid) {
        throw createError(400, 'Context Sheet membership impact decision artifact failed schema validation.', 'CSM_IMPACT_SCHEMA_INVALID', { errors });
    }
    const envelope = artifact.envelope;
    if (envelope.schemaId !== MEMBERSHIP_IMPACT_DECISION_SCHEMA_ID || envelope.artifactClass !== MEMBERSHIP_IMPACT_DECISION_ARTIFACT_CLASS) {
        throw createError(400, 'Context Sheet membership impact decision envelope does not match the IMPACT_DECIDE operation mapping.', 'CSM_IMPACT_OPERATION_MISMATCH');
    }
    assertKnownContractBindings(envelope, MEMBERSHIP_IMPACT_DECIDE_OPERATION, 'IMPACT');
    assertKnownValidationPolicyBindings(artifact, MEMBERSHIP_IMPACT_DECIDE_OPERATION, 'IMPACT');

    const scopeId = envelope.memoryScopeId;
    const idempotencyKey = envelope.idempotencyKey;
    const artifactHash = computeMembershipArtifactHash(artifact);
    ensureStorageRoot(paths.storageRoot);
    acquireMembershipLedgerLock(paths);
    try {
        const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
        const existing = findExistingOperation(entries, scopeId, MEMBERSHIP_IMPACT_DECIDE_OPERATION, MEMBERSHIP_IMPACT_DECISION_SCHEMA_ID, idempotencyKey);
        if (existing) {
            if (existing.artifactHash === artifactHash) {
                return { entry: existing, appended: false };
            }
            throw createError(409, 'Context Sheet membership impact decision idempotency key collision with different artifact content.', 'CSM_IMPACT_IDEMPOTENCY_COLLISION');
        }

        assertImpactDecisionCustody(paths, entries, artifact);
        const entry = createLedgerEntry(
            entries,
            MEMBERSHIP_IMPACT_DECIDE_OPERATION,
            MEMBERSHIP_IMPACT_DECISION_SCHEMA_ID,
            MEMBERSHIP_IMPACT_DECISION_ARTIFACT_CLASS,
            artifact,
            artifactHash,
            options,
        );
        appendLedgerEntryDurably(paths.contextSheetMembershipLedgerPath, entry);
        return { entry, appended: true };
    } finally {
        releaseMembershipLedgerLock(paths);
    }
}

export function replayContextSheetMembershipCurrentUse(paths) {
    const entries = readMembershipLedgerEntries(paths.contextSheetMembershipLedgerPath);
    const linkEntries = entries.filter((entry) => entry.operation === MEMBERSHIP_LINK_OPERATION);
    const successorEntries = entries.filter((entry) => entry.operation === MEMBERSHIP_SUCCESSOR_OPERATION);
    const impactEntries = entries.filter((entry) => entry.operation === MEMBERSHIP_IMPACT_DECIDE_OPERATION);

    const linkStatesByArtifactId = new Map();
    for (const entry of linkEntries) {
        const link = entry.artifact;
        linkStatesByArtifactId.set(entry.artifactId, {
            membershipLinkId: link.membershipLinkId,
            linkRef: exactReferenceForMembershipEntry(entry),
            catalogRecordRef: cloneJson(link.catalogRecordRef),
            contextSheetRef: cloneJson(link.contextSheetRef),
            contextSheetLifecycleRef: cloneJson(link.contextSheetLifecycleRef),
            linkType: link.linkType,
            currentUseState: 'CURRENT',
            successorLinkRefs: [],
            currentUseEffectRef: null,
            blockers: [],
        });
    }

    for (const entry of successorEntries) {
        const successor = entry.artifact;
        findExactMembershipEntryByRef(
            entries,
            MEMBERSHIP_LINK_OPERATION,
            MEMBERSHIP_LINK_SCHEMA_ID,
            entry.scopeId,
            successor.predecessorLinkRef,
        );
        const successorLinkRefs = [];
        if (successor.successorLinkRef) {
            findExactMembershipEntryByRef(
                entries,
                MEMBERSHIP_LINK_OPERATION,
                MEMBERSHIP_LINK_SCHEMA_ID,
                entry.scopeId,
                successor.successorLinkRef,
            );
            successorLinkRefs.push(successor.successorLinkRef);
        }
        applyCurrentUseEffect(
            linkStatesByArtifactId,
            successor.predecessorLinkRef,
            successor.predecessorCurrentUseState,
            successorLinkRefs,
            exactReferenceForMembershipEntry(entry),
        );
    }

    for (const entry of impactEntries) {
        const impact = entry.artifact;
        assertReplayStructuralEventCustody(paths, entry.scopeId, impact.structuralEventRef, impact.impactSource);
        findExactMembershipEntryByRef(
            entries,
            MEMBERSHIP_LINK_OPERATION,
            MEMBERSHIP_LINK_SCHEMA_ID,
            entry.scopeId,
            impact.impactedLinkRef,
        );
        const successorLinkRefs = [];
        for (const successorEventRef of impact.successorEventRefs) {
            const successorEntry = findExactMembershipEntryByRef(
                entries,
                MEMBERSHIP_SUCCESSOR_OPERATION,
                MEMBERSHIP_SUCCESSOR_SCHEMA_ID,
                entry.scopeId,
                successorEventRef,
            );
            const successor = successorEntry.artifact;
            if (!sameExactReference(successor.predecessorLinkRef, impact.impactedLinkRef)) {
                throw createError(409, 'Context Sheet membership replay impact successor does not govern the impacted link.', 'CSM_REPLAY_IMPACT_SUCCESSOR_PREDECESSOR_MISMATCH');
            }
            if (successor.successorLinkRef) {
                findExactMembershipEntryByRef(
                    entries,
                    MEMBERSHIP_LINK_OPERATION,
                    MEMBERSHIP_LINK_SCHEMA_ID,
                    entry.scopeId,
                    successor.successorLinkRef,
                );
                successorLinkRefs.push(successor.successorLinkRef);
            }
        }
        applyCurrentUseEffect(
            linkStatesByArtifactId,
            impact.impactedLinkRef,
            impact.predecessorCurrentUseState,
            successorLinkRefs,
            exactReferenceForMembershipEntry(entry),
        );
    }

    const links = [...linkStatesByArtifactId.values()];
    return {
        projectionType: 'context-sheet-membership-current-use-v1',
        projectionAuthority: 'DISPOSABLE_REPLAY_DERIVED',
        sourceLedger: 'context-sheet-membership-ledger.jsonl',
        entriesReplayed: entries.length,
        links,
        currentLinks: links.filter((link) => link.currentUseState === 'CURRENT').map((link) => link.linkRef),
        blockedLinks: links.filter((link) => link.currentUseState === 'BLOCKED').map((link) => link.linkRef),
    };
}
