import { createHash } from 'node:crypto';
import fs from 'node:fs';

import {
    createError,
    createId,
    getAuthenticatedUserRoot,
    getStoragePaths,
    nowTimestamp,
    openOperationalDatabase,
    snapshotOperationalDatabase,
    stableStringify,
} from './core.js';

export const SUBJECT_SCOPED_POLICY_SCHEMA_VERSION = 1;

const ALLOWED_TRACKS = new Set([
    'PERSONAL_IDENTITY',
    'RELATIONAL',
    'ARCHITECTURAL_DECISION',
    'PROJECT_GOVERNANCE',
    'THIRD_PARTY_DISCOVERY',
]);

const ALLOWED_UNAVAILABLE_REVIEWER_BEHAVIORS = new Set(['BLOCK_PROVISIONAL']);
const ALLOWED_BINDING_TARGET_TYPES = new Set(['SYNTHESIS_REQUEST', 'INTERPRETATION_REVISION']);

export const SUBJECT_SCOPED_POLICY_LEDGER_EVENT_TYPES = new Set([
    'AUTHENTICATED_SEMANTIC_ENTITY_BOUND',
    'SUBJECT_SCOPED_POLICY_PROFILE_REGISTERED',
    'SUBJECT_SCOPED_POLICY_PROFILE_ASSIGNED',
    'SUBJECT_SCOPED_POLICY_FACT_DECLARED',
    'SUBJECT_SCOPED_POLICY_ACKNOWLEDGMENT_RECORDED',
    'SUBJECT_SCOPED_POLICY_PROFILE_BOUND',
    'SUBJECT_SCOPED_POLICY_FACTS_ATTESTED',
    'SUBJECT_SCOPED_POLICY_ELIGIBILITY_EVALUATED',
]);

const FACT_RECORD_TYPES = new Set([
    'EXPLICITNESS_VERIFICATION',
    'GROUNDING_VERIFICATION',
    'STABILITY_VERIFICATION',
    'ENDURING_VALUE_VERIFICATION',
    'ACKNOWLEDGMENT',
    'GOVERNANCE_VALIDATION',
]);

const GOVERNANCE_VALIDATION_STATES = new Set([
    'COMPATIBLE',
    'LAWFUL_AMENDMENT',
    'LAWFUL_SUCCESSOR',
    'DUPLICATE_AUTHORITY',
    'UNRESOLVED_CONFLICT',
    'PROHIBITED_CONTRADICTION',
    'GOVERNING_RECORD_UNAVAILABLE',
    'GOVERNING_RECORD_AMBIGUOUS',
]);

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function hashCanonical(value) {
    return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}

function requiredString(value, name) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new TypeError(`${name} is required`);
    return normalized;
}

function sortedUniqueStrings(values, name) {
    if (!Array.isArray(values)) throw new TypeError(`${name} must be an array`);
    return [...new Set(values.map((value) => requiredString(value, name)))].sort();
}

function normalizeFactSourceRecord(record, index, evidenceSetHash) {
    const recordType = requiredString(record?.recordType, `records[${index}].recordType`);
    if (!FACT_RECORD_TYPES.has(recordType)) {
        throw createError(400, 'Subject-scoped fact record type is unsupported', 'ARCH_SUBJECT_POLICY_FACT_RECORD_TYPE_INVALID');
    }
    if (requiredString(record?.evidenceSetHash, `records[${index}].evidenceSetHash`) !== evidenceSetHash) {
        throw createError(409, 'Subject-scoped fact record belongs to a different evidence set', 'ARCH_SUBJECT_POLICY_FACT_EVIDENCE_MISMATCH');
    }
    const normalized = {
        recordId: requiredString(record?.recordId, `records[${index}].recordId`),
        recordType,
        evidenceSetHash,
        state: requiredString(record?.state, `records[${index}].state`),
        basisRefs: sortedUniqueStrings(record?.basisRefs || [], `records[${index}].basisRefs`),
    };
    if (normalized.basisRefs.length === 0) {
        throw createError(400, 'Subject-scoped fact record requires an exact basis reference', 'ARCH_SUBJECT_POLICY_FACT_BASIS_REQUIRED');
    }
    if (recordType === 'ACKNOWLEDGMENT') {
        normalized.entityId = requiredString(record?.entityId, `records[${index}].entityId`);
        if (!['VERIFIED', 'UNAVAILABLE'].includes(normalized.state)) {
            throw createError(400, 'Acknowledgment state must be VERIFIED or UNAVAILABLE', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_STATE_INVALID');
        }
    } else if (recordType === 'GOVERNANCE_VALIDATION') {
        if (!GOVERNANCE_VALIDATION_STATES.has(normalized.state)) {
            throw createError(400, 'Governance validation state is unsupported', 'ARCH_SUBJECT_POLICY_GOVERNANCE_STATE_INVALID');
        }
    } else if (normalized.state !== 'VERIFIED') {
        throw createError(400, 'Evidence verification records must be VERIFIED', 'ARCH_SUBJECT_POLICY_FACT_STATE_INVALID');
    }
    return normalized;
}

export function deriveSubjectScopedProposalFacts(binding, payload = {}) {
    const evidenceSetHash = requiredString(binding?.evidenceSetHash, 'binding.evidenceSetHash');
    const records = (Array.isArray(payload.records) ? payload.records : [])
        .map((record, index) => normalizeFactSourceRecord(record, index, evidenceSetHash))
        .sort((left, right) => left.recordId.localeCompare(right.recordId));
    if (records.length === 0) {
        throw createError(400, 'At least one governed fact record is required', 'ARCH_SUBJECT_POLICY_FACT_RECORDS_REQUIRED');
    }
    if (new Set(records.map((record) => record.recordId)).size !== records.length) {
        throw createError(409, 'Governed fact record identities must be unique', 'ARCH_SUBJECT_POLICY_FACT_RECORD_DUPLICATE');
    }
    const singletonTypes = ['EXPLICITNESS_VERIFICATION', 'GROUNDING_VERIFICATION', 'STABILITY_VERIFICATION', 'ENDURING_VALUE_VERIFICATION', 'GOVERNANCE_VALIDATION'];
    for (const recordType of singletonTypes) {
        if (records.filter((record) => record.recordType === recordType).length > 1) {
            throw createError(409, 'Only one governed record may establish each proposal fact', 'ARCH_SUBJECT_POLICY_FACT_RECORD_AMBIGUOUS');
        }
    }
    const acknowledgments = records.filter((record) => record.recordType === 'ACKNOWLEDGMENT');
    if (new Set(acknowledgments.map((record) => record.entityId)).size !== acknowledgments.length) {
        throw createError(409, 'Acknowledgment records are ambiguous for an entity', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_AMBIGUOUS');
    }
    const factFor = (recordType) => {
        const record = records.find((entry) => entry.recordType === recordType);
        return record ? { state: record.state, basisRefs: record.basisRefs, recordId: record.recordId } : { state: 'NOT_ATTESTED', basisRefs: [] };
    };
    const facts = {
        evidenceSetHash,
        subjectEntityId: requiredString(payload.subjectEntityId, 'subjectEntityId'),
        proposalKind: requiredString(payload.proposalKind, 'proposalKind'),
        proposalTrack: requiredString(payload.proposalTrack, 'proposalTrack'),
        explicit: factFor('EXPLICITNESS_VERIFICATION'),
        grounding: factFor('GROUNDING_VERIFICATION'),
        stability: factFor('STABILITY_VERIFICATION'),
        enduring: factFor('ENDURING_VALUE_VERIFICATION'),
        acknowledgments: acknowledgments.map((record) => ({
            entityId: record.entityId,
            state: record.state,
            basisRefs: record.basisRefs,
            recordId: record.recordId,
        })).sort((left, right) => left.entityId.localeCompare(right.entityId)),
        governanceValidation: factFor('GOVERNANCE_VALIDATION'),
    };
    return Object.freeze({
        facts,
        factsHash: hashCanonical(facts),
        sourceRecords: records,
        sourceRecordsHash: hashCanonical(records),
    });
}

function normalizeRule(rule, index) {
    const proposalKind = requiredString(rule?.proposalKind, `rules[${index}].proposalKind`);
    const proposalTrack = requiredString(rule?.proposalTrack, `rules[${index}].proposalTrack`);
    if (!ALLOWED_TRACKS.has(proposalTrack)) {
        throw new TypeError(`rules[${index}].proposalTrack is not supported`);
    }
    const unavailableReviewerBehavior = requiredString(
        rule?.unavailableReviewerBehavior || 'BLOCK_PROVISIONAL',
        `rules[${index}].unavailableReviewerBehavior`,
    );
    if (!ALLOWED_UNAVAILABLE_REVIEWER_BEHAVIORS.has(unavailableReviewerBehavior)) {
        throw new TypeError(`rules[${index}].unavailableReviewerBehavior is not supported`);
    }
    return {
        proposalKind,
        proposalTrack,
        requiredAcknowledgmentEntityIds: sortedUniqueStrings(
            rule?.requiredAcknowledgmentEntityIds || [],
            `rules[${index}].requiredAcknowledgmentEntityIds`,
        ),
        stabilityAuthorityEntityIds: sortedUniqueStrings(
            rule?.stabilityAuthorityEntityIds || [],
            `rules[${index}].stabilityAuthorityEntityIds`,
        ),
        enduringValueAuthorityEntityIds: sortedUniqueStrings(
            rule?.enduringValueAuthorityEntityIds || [],
            `rules[${index}].enduringValueAuthorityEntityIds`,
        ),
        unavailabilityAuthorityEntityIds: sortedUniqueStrings(
            rule?.unavailabilityAuthorityEntityIds || [],
            `rules[${index}].unavailabilityAuthorityEntityIds`,
        ),
        governanceValidationRequired: rule?.governanceValidationRequired === true,
        unavailableReviewerBehavior,
    };
}

export function normalizeSubjectScopedProposalPolicyProfile(input) {
    if (Number(input?.schemaVersion) !== SUBJECT_SCOPED_POLICY_SCHEMA_VERSION) {
        throw new TypeError(`schemaVersion must equal ${SUBJECT_SCOPED_POLICY_SCHEMA_VERSION}`);
    }
    const policyVersion = Number(input?.policyVersion);
    if (!Number.isSafeInteger(policyVersion) || policyVersion < 1) {
        throw new TypeError('policyVersion must be a positive integer');
    }
    const rules = (Array.isArray(input?.rules) ? input.rules : []).map(normalizeRule)
        .sort((left, right) => left.proposalKind.localeCompare(right.proposalKind));
    if (rules.length === 0) throw new TypeError('rules must contain at least one policy rule');
    if (new Set(rules.map((rule) => rule.proposalKind)).size !== rules.length) {
        throw new TypeError('rules must not contain duplicate proposalKind values');
    }
    const normalized = {
        schemaVersion: SUBJECT_SCOPED_POLICY_SCHEMA_VERSION,
        profileId: requiredString(input?.profileId, 'profileId'),
        policyVersion,
        jurisdictionScopeId: requiredString(input?.jurisdictionScopeId, 'jurisdictionScopeId'),
        subjectEntityId: requiredString(input?.subjectEntityId, 'subjectEntityId'),
        rules,
    };
    return Object.freeze({ ...normalized, policyHash: hashCanonical(normalized) });
}

function verifiedFact(fact) {
    return fact?.state === 'VERIFIED'
        && Array.isArray(fact.basisRefs)
        && fact.basisRefs.some((basisRef) => String(basisRef || '').trim());
}

export function evaluateSubjectScopedProposalEligibility(profileInput, facts = {}) {
    const profile = normalizeSubjectScopedProposalPolicyProfile(profileInput);
    const proposalKind = requiredString(facts?.proposalKind, 'facts.proposalKind');
    const proposalTrack = requiredString(facts?.proposalTrack, 'facts.proposalTrack');
    const subjectEntityId = requiredString(facts?.subjectEntityId, 'facts.subjectEntityId');
    const evidenceSetHash = requiredString(facts?.evidenceSetHash, 'facts.evidenceSetHash');
    const failures = new Set();
    let provisional = false;

    if (subjectEntityId !== profile.subjectEntityId) failures.add('POLICY_SUBJECT_MISMATCH');
    const rule = profile.rules.find((entry) => entry.proposalKind === proposalKind);
    if (!rule) {
        failures.add('POLICY_KIND_NOT_ALLOWED');
    } else if (proposalTrack !== rule.proposalTrack) {
        failures.add('POLICY_TRACK_MISMATCH');
    }

    if (!verifiedFact(facts.explicit)) failures.add('EXPLICIT_EVIDENCE_NOT_VERIFIED');
    if (!verifiedFact(facts.grounding)) failures.add('GROUNDING_NOT_VERIFIED');
    if (!verifiedFact(facts.stability)) failures.add('STABILITY_NOT_VERIFIED');
    if (!verifiedFact(facts.enduring)) failures.add('ENDURING_VALUE_NOT_VERIFIED');

    const acknowledgmentByEntityId = new Map((Array.isArray(facts.acknowledgments) ? facts.acknowledgments : [])
        .map((entry) => [String(entry?.entityId || '').trim(), entry]));
    for (const entityId of rule?.requiredAcknowledgmentEntityIds || []) {
        const acknowledgment = acknowledgmentByEntityId.get(entityId);
        if (acknowledgment?.state === 'UNAVAILABLE') {
            failures.add('REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE');
            provisional = true;
        } else if (!verifiedFact(acknowledgment)) {
            failures.add('REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED');
        }
    }

    if (rule?.governanceValidationRequired
        && !['COMPATIBLE', 'LAWFUL_AMENDMENT', 'LAWFUL_SUCCESSOR'].includes(facts?.governanceValidation?.state)) {
        failures.add('GOVERNANCE_VALIDATION_NOT_SATISFIED');
    }

    const failureCodes = [...failures].sort();
    return {
        verdict: failureCodes.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE',
        provisional,
        failureCodes,
        evidenceSetHash,
        subjectEntityId,
        proposalKind,
        proposalTrack,
        policyProfileId: profile.profileId,
        policyVersion: profile.policyVersion,
        policyHash: profile.policyHash,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        matchedRule: rule || null,
    };
}

function appendLedgerEvent(ledgerPath, event) {
    fs.appendFileSync(ledgerPath, `${JSON.stringify(event)}\n`, 'utf8');
}

function normalizedAccountHandle(value, name = 'accountHandle') {
    return requiredString(value, name).toLowerCase();
}

function authenticatedAccountHandle(request) {
    const handle = request?.user?.profile?.handle;
    if (!handle) {
        throw createError(401, 'Authenticated account identity is unavailable', 'ARCH_AUTHENTICATED_ACCOUNT_REQUIRED');
    }
    return normalizedAccountHandle(handle, 'request.user.profile.handle');
}

function loadAuthenticatedEntityBinding(adapter, accountHandle) {
    const row = adapter.get(
        'SELECT * FROM authenticated_semantic_entity_bindings WHERE account_handle = ?',
        [normalizedAccountHandle(accountHandle)],
    );
    if (!row) return null;
    return {
        accountHandle: row.account_handle,
        semanticEntityId: row.semantic_entity_id,
        bindingHash: row.binding_hash,
        boundByAccountHandle: row.bound_by_account_handle,
        createdAt: Number(row.created_at),
    };
}

function persistAuthenticatedEntityBinding(adapter, binding) {
    adapter.run(
        `INSERT INTO authenticated_semantic_entity_bindings (
            account_handle, semantic_entity_id, binding_hash, bound_by_account_handle, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [binding.accountHandle, binding.semanticEntityId, binding.bindingHash, binding.boundByAccountHandle, binding.createdAt],
    );
}

function loadProfile(adapter, profileId, policyVersion) {
    const row = adapter.get(
        `SELECT profile_json, policy_hash, created_at
         FROM subject_scoped_proposal_policy_profiles
         WHERE profile_id = ? AND policy_version = ?`,
        [profileId, Number(policyVersion)],
    );
    if (!row) return null;
    return {
        ...JSON.parse(row.profile_json),
        policyHash: row.policy_hash,
        createdAt: Number(row.created_at),
    };
}

function loadBinding(adapter, bindingTargetType, bindingTargetId) {
    const row = adapter.get(
        `SELECT * FROM subject_scoped_proposal_policy_bindings
         WHERE binding_target_type = ? AND binding_target_id = ?`,
        [bindingTargetType, bindingTargetId],
    );
    if (!row) return null;
    return {
        bindingTargetType: row.binding_target_type,
        bindingTargetId: row.binding_target_id,
        profileId: row.profile_id,
        policyVersion: Number(row.policy_version),
        policyHash: row.policy_hash,
        subjectEntityId: row.subject_entity_id,
        jurisdictionScopeId: row.jurisdiction_scope_id,
        evidenceSetHash: row.evidence_set_hash,
        createdAt: Number(row.created_at),
    };
}

function assignmentFromRow(row) {
    if (!row) return null;
    return {
        assignmentId: row.assignment_id,
        assignmentVersion: Number(row.assignment_version),
        assignmentHash: row.assignment_hash,
        subjectEntityId: row.subject_entity_id,
        jurisdictionScopeId: row.jurisdiction_scope_id,
        profileId: row.profile_id,
        policyVersion: Number(row.policy_version),
        policyHash: row.policy_hash,
        assignmentState: row.assignment_state,
        createdAt: Number(row.created_at),
    };
}

function loadAssignment(adapter, assignmentId, assignmentVersion) {
    return assignmentFromRow(adapter.get(
        `SELECT * FROM subject_scoped_proposal_policy_assignments
         WHERE assignment_id = ? AND assignment_version = ?`,
        [assignmentId, Number(assignmentVersion)],
    ));
}

function resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId) {
    const rows = adapter.all(
        `SELECT * FROM subject_scoped_proposal_policy_assignments
         WHERE subject_entity_id = ? AND jurisdiction_scope_id = ? AND assignment_state = 'ACTIVE'
         ORDER BY assignment_id, assignment_version`,
        [subjectEntityId, jurisdictionScopeId],
    );
    if (rows.length === 0) return null;
    if (rows.length > 1) {
        throw createError(409, 'Subject jurisdiction has multiple active policy assignments', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_AMBIGUOUS');
    }
    return assignmentFromRow(rows[0]);
}

function declarationFromRow(row) {
    if (!row) return null;
    return {
        declarationId: row.declaration_id,
        declarationHash: row.declaration_hash,
        factType: row.fact_type,
        subjectEntityId: row.subject_entity_id,
        jurisdictionScopeId: row.jurisdiction_scope_id,
        evidenceSetHash: row.evidence_set_hash,
        proposalKind: row.proposal_kind,
        declaringEntityId: row.declaring_entity_id,
        basisRefs: JSON.parse(row.basis_refs_json),
        profileId: row.profile_id,
        policyVersion: Number(row.policy_version),
        policyHash: row.policy_hash,
        createdAt: Number(row.created_at),
    };
}

function loadFactDeclaration(adapter, declarationId) {
    return declarationFromRow(adapter.get(
        'SELECT * FROM subject_scoped_proposal_fact_declarations WHERE declaration_id = ?',
        [declarationId],
    ));
}

function acknowledgmentFromRow(row) {
    if (!row) return null;
    return {
        acknowledgmentId: row.acknowledgment_id,
        acknowledgmentHash: row.acknowledgment_hash,
        subjectEntityId: row.subject_entity_id,
        jurisdictionScopeId: row.jurisdiction_scope_id,
        evidenceSetHash: row.evidence_set_hash,
        proposalKind: row.proposal_kind,
        acknowledgingEntityId: row.acknowledging_entity_id,
        acknowledgmentState: row.acknowledgment_state,
        recordedByEntityId: row.recorded_by_entity_id,
        unavailableReason: row.unavailable_reason,
        basisRefs: JSON.parse(row.basis_refs_json),
        profileId: row.profile_id,
        policyVersion: Number(row.policy_version),
        policyHash: row.policy_hash,
        createdAt: Number(row.created_at),
    };
}

function loadAcknowledgment(adapter, acknowledgmentId) {
    return acknowledgmentFromRow(adapter.get(
        'SELECT * FROM subject_scoped_proposal_acknowledgments WHERE acknowledgment_id = ?',
        [acknowledgmentId],
    ));
}

function loadFactAttestation(adapter, bindingTargetType, bindingTargetId) {
    const row = adapter.get(
        `SELECT * FROM subject_scoped_proposal_fact_attestations
         WHERE binding_target_type = ? AND binding_target_id = ?`,
        [bindingTargetType, bindingTargetId],
    );
    if (!row) return null;
    return {
        bindingTargetType: row.binding_target_type,
        bindingTargetId: row.binding_target_id,
        evidenceSetHash: row.evidence_set_hash,
        policyHash: row.policy_hash,
        factsHash: row.facts_hash,
        facts: JSON.parse(row.facts_json),
        sourceRecordsHash: row.source_records_hash,
        sourceRecords: JSON.parse(row.source_records_json),
        createdAt: Number(row.created_at),
    };
}

function loadEligibilityEvaluation(adapter, bindingTargetType, bindingTargetId) {
    const row = adapter.get(
        `SELECT * FROM subject_scoped_proposal_eligibility_evaluations
         WHERE binding_target_type = ? AND binding_target_id = ?`,
        [bindingTargetType, bindingTargetId],
    );
    if (!row) return null;
    return {
        bindingTargetType: row.binding_target_type,
        bindingTargetId: row.binding_target_id,
        policyHash: row.policy_hash,
        factsHash: row.facts_hash,
        evaluationHash: row.evaluation_hash,
        evaluation: JSON.parse(row.evaluation_json),
        createdAt: Number(row.created_at),
    };
}

function persistProfile(adapter, profile, createdAt) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_policy_profiles (
            profile_id, policy_version, policy_hash, subject_entity_id,
            jurisdiction_scope_id, profile_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            profile.profileId,
            profile.policyVersion,
            profile.policyHash,
            profile.subjectEntityId,
            profile.jurisdictionScopeId,
            stableStringify({
                schemaVersion: profile.schemaVersion,
                profileId: profile.profileId,
                policyVersion: profile.policyVersion,
                jurisdictionScopeId: profile.jurisdictionScopeId,
                subjectEntityId: profile.subjectEntityId,
                rules: profile.rules,
            }),
            createdAt,
        ],
    );
}

function persistBinding(adapter, binding) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_policy_bindings (
            binding_target_type, binding_target_id, profile_id, policy_version,
            policy_hash, subject_entity_id, jurisdiction_scope_id, evidence_set_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            binding.bindingTargetType,
            binding.bindingTargetId,
            binding.profileId,
            binding.policyVersion,
            binding.policyHash,
            binding.subjectEntityId,
            binding.jurisdictionScopeId,
            binding.evidenceSetHash,
            binding.createdAt,
        ],
    );
}

function persistAssignment(adapter, assignment) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_policy_assignments (
            assignment_id, assignment_version, assignment_hash, subject_entity_id,
            jurisdiction_scope_id, profile_id, policy_version, policy_hash,
            assignment_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            assignment.assignmentId,
            assignment.assignmentVersion,
            assignment.assignmentHash,
            assignment.subjectEntityId,
            assignment.jurisdictionScopeId,
            assignment.profileId,
            assignment.policyVersion,
            assignment.policyHash,
            assignment.assignmentState,
            assignment.createdAt,
        ],
    );
}

function persistFactDeclaration(adapter, declaration) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_fact_declarations (
            declaration_id, declaration_hash, fact_type, subject_entity_id,
            jurisdiction_scope_id, evidence_set_hash, proposal_kind,
            declaring_entity_id, basis_refs_json, profile_id, policy_version,
            policy_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            declaration.declarationId,
            declaration.declarationHash,
            declaration.factType,
            declaration.subjectEntityId,
            declaration.jurisdictionScopeId,
            declaration.evidenceSetHash,
            declaration.proposalKind,
            declaration.declaringEntityId,
            stableStringify(declaration.basisRefs),
            declaration.profileId,
            declaration.policyVersion,
            declaration.policyHash,
            declaration.createdAt,
        ],
    );
}

function persistAcknowledgment(adapter, acknowledgment) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_acknowledgments (
            acknowledgment_id, acknowledgment_hash, subject_entity_id,
            jurisdiction_scope_id, evidence_set_hash, proposal_kind,
            acknowledging_entity_id, acknowledgment_state, recorded_by_entity_id,
            unavailable_reason, basis_refs_json, profile_id, policy_version,
            policy_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            acknowledgment.acknowledgmentId,
            acknowledgment.acknowledgmentHash,
            acknowledgment.subjectEntityId,
            acknowledgment.jurisdictionScopeId,
            acknowledgment.evidenceSetHash,
            acknowledgment.proposalKind,
            acknowledgment.acknowledgingEntityId,
            acknowledgment.acknowledgmentState,
            acknowledgment.recordedByEntityId,
            acknowledgment.unavailableReason,
            stableStringify(acknowledgment.basisRefs),
            acknowledgment.profileId,
            acknowledgment.policyVersion,
            acknowledgment.policyHash,
            acknowledgment.createdAt,
        ],
    );
}

function persistFactAttestation(adapter, attestation) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_fact_attestations (
            binding_target_type, binding_target_id, evidence_set_hash, policy_hash,
            facts_hash, facts_json, source_records_hash, source_records_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            attestation.bindingTargetType,
            attestation.bindingTargetId,
            attestation.evidenceSetHash,
            attestation.policyHash,
            attestation.factsHash,
            stableStringify(attestation.facts),
            attestation.sourceRecordsHash,
            stableStringify(attestation.sourceRecords),
            attestation.createdAt,
        ],
    );
}

function persistEligibilityEvaluation(adapter, record) {
    adapter.run(
        `INSERT INTO subject_scoped_proposal_eligibility_evaluations (
            binding_target_type, binding_target_id, policy_hash, facts_hash,
            evaluation_hash, evaluation_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            record.bindingTargetType,
            record.bindingTargetId,
            record.policyHash,
            record.factsHash,
            record.evaluationHash,
            stableStringify(record.evaluation),
            record.createdAt,
        ],
    );
}

function sameBindingIdentity(left, right) {
    const fields = [
        'bindingTargetType',
        'bindingTargetId',
        'profileId',
        'policyVersion',
        'policyHash',
        'subjectEntityId',
        'jurisdictionScopeId',
        'evidenceSetHash',
    ];
    return fields.every((field) => left?.[field] === right?.[field]);
}

export function applySubjectScopedPolicyLedgerEvent(adapter, event) {
    if (!SUBJECT_SCOPED_POLICY_LEDGER_EVENT_TYPES.has(event?.eventType)) {
        throw createError(500, 'Subject-scoped policy ledger event type is invalid', 'ARCH_SUBJECT_POLICY_LEDGER_INVALID');
    }
    if (event.eventType === 'AUTHENTICATED_SEMANTIC_ENTITY_BOUND') {
        const binding = event.payload?.binding;
        const identity = binding && {
            accountHandle: normalizedAccountHandle(binding.accountHandle),
            semanticEntityId: requiredString(binding.semanticEntityId, 'semanticEntityId'),
            boundByAccountHandle: normalizedAccountHandle(binding.boundByAccountHandle, 'boundByAccountHandle'),
        };
        if (!binding || binding.bindingHash !== hashCanonical(identity)) {
            throw createError(500, 'Authenticated semantic entity binding is invalid', 'ARCH_AUTHENTICATED_ENTITY_BINDING_INVALID');
        }
        const existing = loadAuthenticatedEntityBinding(adapter, identity.accountHandle);
        if (existing && existing.bindingHash !== binding.bindingHash) {
            throw createError(409, 'Authenticated account already has a different semantic entity binding', 'ARCH_AUTHENTICATED_ENTITY_BINDING_CONFLICT');
        }
        const entityOwner = adapter.get(
            'SELECT account_handle, binding_hash FROM authenticated_semantic_entity_bindings WHERE semantic_entity_id = ?',
            [identity.semanticEntityId],
        );
        if (entityOwner && entityOwner.binding_hash !== binding.bindingHash) {
            throw createError(409, 'Semantic entity is already bound to a different authenticated account', 'ARCH_AUTHENTICATED_ENTITY_IMPERSONATION_REFUSED');
        }
        if (!existing) persistAuthenticatedEntityBinding(adapter, binding);
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_PROFILE_REGISTERED') {
        const profile = normalizeSubjectScopedProposalPolicyProfile(event.payload?.profile);
        if (profile.policyHash !== event.payload?.policyHash) {
            throw createError(500, 'Subject-scoped policy profile hash does not match ledger event', 'ARCH_SUBJECT_POLICY_LEDGER_HASH_MISMATCH');
        }
        const existing = loadProfile(adapter, profile.profileId, profile.policyVersion);
        if (existing && existing.policyHash !== profile.policyHash) {
            throw createError(409, 'Subject-scoped policy profile version is immutable', 'ARCH_SUBJECT_POLICY_PROFILE_CONFLICT');
        }
        if (!existing) persistProfile(adapter, profile, Number(event.occurredAt));
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_PROFILE_ASSIGNED') {
        const assignment = event.payload?.assignment;
        const profile = loadProfile(adapter, assignment?.profileId, assignment?.policyVersion);
        const expectedHash = hashCanonical({
            assignmentId: assignment?.assignmentId,
            assignmentVersion: assignment?.assignmentVersion,
            subjectEntityId: assignment?.subjectEntityId,
            jurisdictionScopeId: assignment?.jurisdictionScopeId,
            profileId: assignment?.profileId,
            policyVersion: assignment?.policyVersion,
            policyHash: assignment?.policyHash,
            assignmentState: assignment?.assignmentState,
        });
        if (!profile
            || profile.policyHash !== assignment?.policyHash
            || profile.subjectEntityId !== assignment?.subjectEntityId
            || profile.jurisdictionScopeId !== assignment?.jurisdictionScopeId
            || assignment?.assignmentState !== 'ACTIVE'
            || assignment?.assignmentHash !== expectedHash) {
            throw createError(500, 'Subject-scoped policy assignment is invalid or mismatched', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_INVALID');
        }
        const existing = loadAssignment(adapter, assignment.assignmentId, assignment.assignmentVersion);
        if (existing && existing.assignmentHash !== assignment.assignmentHash) {
            throw createError(409, 'Subject-scoped policy assignment version is immutable', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_CONFLICT');
        }
        const active = resolveActiveAssignment(adapter, assignment.subjectEntityId, assignment.jurisdictionScopeId);
        if (active && active.assignmentHash !== assignment.assignmentHash) {
            throw createError(409, 'Subject jurisdiction already has an active policy assignment', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_ACTIVE_CONFLICT');
        }
        if (!existing) persistAssignment(adapter, assignment);
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_FACT_DECLARED') {
        const declaration = event.payload?.declaration;
        const assignment = resolveActiveAssignment(
            adapter,
            declaration?.subjectEntityId,
            declaration?.jurisdictionScopeId,
        );
        const profile = assignment && loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        const rule = profile?.rules.find((entry) => entry.proposalKind === declaration?.proposalKind);
        const authorityField = declaration?.factType === 'STABILITY'
            ? 'stabilityAuthorityEntityIds'
            : declaration?.factType === 'ENDURING_VALUE'
                ? 'enduringValueAuthorityEntityIds'
                : null;
        const identity = declaration && {
            declarationId: declaration.declarationId,
            factType: declaration.factType,
            subjectEntityId: declaration.subjectEntityId,
            jurisdictionScopeId: declaration.jurisdictionScopeId,
            evidenceSetHash: declaration.evidenceSetHash,
            proposalKind: declaration.proposalKind,
            declaringEntityId: declaration.declaringEntityId,
            basisRefs: declaration.basisRefs,
            profileId: declaration.profileId,
            policyVersion: declaration.policyVersion,
            policyHash: declaration.policyHash,
        };
        if (!assignment || !profile || !rule || !authorityField
            || declaration.profileId !== assignment.profileId
            || declaration.policyVersion !== assignment.policyVersion
            || declaration.policyHash !== assignment.policyHash
            || !Array.isArray(rule[authorityField])
            || !rule[authorityField].includes(declaration.declaringEntityId)
            || declaration.declarationHash !== hashCanonical(identity)) {
            throw createError(500, 'Subject-scoped fact declaration is unauthorized or mismatched', 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_INVALID');
        }
        const existing = loadFactDeclaration(adapter, declaration.declarationId);
        if (existing && existing.declarationHash !== declaration.declarationHash) {
            throw createError(409, 'Subject-scoped fact declaration is immutable', 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_CONFLICT');
        }
        if (!existing) persistFactDeclaration(adapter, declaration);
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_ACKNOWLEDGMENT_RECORDED') {
        const acknowledgment = event.payload?.acknowledgment;
        const assignment = resolveActiveAssignment(adapter, acknowledgment?.subjectEntityId, acknowledgment?.jurisdictionScopeId);
        const profile = assignment && loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        const rule = profile?.rules.find((entry) => entry.proposalKind === acknowledgment?.proposalKind);
        const identity = acknowledgment && {
            acknowledgmentId: acknowledgment.acknowledgmentId,
            subjectEntityId: acknowledgment.subjectEntityId,
            jurisdictionScopeId: acknowledgment.jurisdictionScopeId,
            evidenceSetHash: acknowledgment.evidenceSetHash,
            proposalKind: acknowledgment.proposalKind,
            acknowledgingEntityId: acknowledgment.acknowledgingEntityId,
            acknowledgmentState: acknowledgment.acknowledgmentState,
            recordedByEntityId: acknowledgment.recordedByEntityId,
            unavailableReason: acknowledgment.unavailableReason,
            basisRefs: acknowledgment.basisRefs,
            profileId: acknowledgment.profileId,
            policyVersion: acknowledgment.policyVersion,
            policyHash: acknowledgment.policyHash,
        };
        const verified = acknowledgment?.acknowledgmentState === 'VERIFIED'
            && acknowledgment.recordedByEntityId === acknowledgment.acknowledgingEntityId;
        const unavailable = acknowledgment?.acknowledgmentState === 'UNAVAILABLE'
            && Array.isArray(rule?.unavailabilityAuthorityEntityIds)
            && rule.unavailabilityAuthorityEntityIds.includes(acknowledgment.recordedByEntityId)
            && Boolean(acknowledgment.unavailableReason);
        if (!assignment || !profile || !rule
            || !rule.requiredAcknowledgmentEntityIds.includes(acknowledgment?.acknowledgingEntityId)
            || acknowledgment.profileId !== assignment.profileId
            || acknowledgment.policyVersion !== assignment.policyVersion
            || acknowledgment.policyHash !== assignment.policyHash
            || (!verified && !unavailable)
            || acknowledgment.acknowledgmentHash !== hashCanonical(identity)) {
            throw createError(500, 'Subject-scoped acknowledgment is unauthorized or mismatched', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_INVALID');
        }
        const existing = loadAcknowledgment(adapter, acknowledgment.acknowledgmentId);
        if (existing && existing.acknowledgmentHash !== acknowledgment.acknowledgmentHash) {
            throw createError(409, 'Subject-scoped acknowledgment is immutable', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_CONFLICT');
        }
        if (!existing) persistAcknowledgment(adapter, acknowledgment);
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_FACTS_ATTESTED') {
        const attestation = event.payload?.attestation;
        const binding = loadBinding(adapter, attestation?.bindingTargetType, attestation?.bindingTargetId);
        if (!binding
            || binding.evidenceSetHash !== attestation?.evidenceSetHash
            || binding.policyHash !== attestation?.policyHash) {
            throw createError(500, 'Subject-scoped fact attestation binding is unavailable or mismatched', 'ARCH_SUBJECT_POLICY_FACT_BINDING_MISMATCH');
        }
        const derived = deriveSubjectScopedProposalFacts(binding, {
            subjectEntityId: attestation.facts?.subjectEntityId,
            proposalKind: attestation.facts?.proposalKind,
            proposalTrack: attestation.facts?.proposalTrack,
            records: attestation.sourceRecords,
        });
        if (derived.factsHash !== attestation.factsHash
            || derived.sourceRecordsHash !== attestation.sourceRecordsHash) {
            throw createError(500, 'Subject-scoped fact attestation does not match its governed records', 'ARCH_SUBJECT_POLICY_FACT_HASH_MISMATCH');
        }
        const existing = loadFactAttestation(adapter, attestation.bindingTargetType, attestation.bindingTargetId);
        if (existing && existing.factsHash !== attestation.factsHash) {
            throw createError(409, 'Subject-scoped fact attestation is immutable', 'ARCH_SUBJECT_POLICY_FACT_ATTESTATION_CONFLICT');
        }
        if (!existing) persistFactAttestation(adapter, attestation);
        return;
    }
    if (event.eventType === 'SUBJECT_SCOPED_POLICY_ELIGIBILITY_EVALUATED') {
        const record = event.payload?.evaluationRecord;
        const binding = loadBinding(adapter, record?.bindingTargetType, record?.bindingTargetId);
        const profile = binding && loadProfile(adapter, binding.profileId, binding.policyVersion);
        const attestation = binding && loadFactAttestation(adapter, binding.bindingTargetType, binding.bindingTargetId);
        if (!binding || !profile || !attestation
            || binding.policyHash !== record?.policyHash
            || attestation.factsHash !== record?.factsHash) {
            throw createError(500, 'Subject-scoped eligibility inputs are unavailable or mismatched', 'ARCH_SUBJECT_POLICY_EVALUATION_INPUT_MISMATCH');
        }
        const evaluation = evaluateSubjectScopedProposalEligibility(profile, attestation.facts);
        if (hashCanonical(evaluation) !== record.evaluationHash) {
            throw createError(500, 'Subject-scoped eligibility result does not match bound inputs', 'ARCH_SUBJECT_POLICY_EVALUATION_HASH_MISMATCH');
        }
        const existing = loadEligibilityEvaluation(adapter, record.bindingTargetType, record.bindingTargetId);
        if (existing && existing.evaluationHash !== record.evaluationHash) {
            throw createError(409, 'Subject-scoped eligibility evaluation is immutable', 'ARCH_SUBJECT_POLICY_EVALUATION_CONFLICT');
        }
        if (!existing) persistEligibilityEvaluation(adapter, record);
        return;
    }
    const binding = event.payload?.binding;
    const profile = loadProfile(adapter, binding?.profileId, binding?.policyVersion);
    if (!profile || profile.policyHash !== binding?.policyHash) {
        throw createError(500, 'Subject-scoped policy binding profile is unavailable or mismatched', 'ARCH_SUBJECT_POLICY_BINDING_PROFILE_MISMATCH');
    }
    const existing = loadBinding(adapter, binding.bindingTargetType, binding.bindingTargetId);
    if (existing && !sameBindingIdentity(existing, binding)) {
        throw createError(409, 'Subject-scoped policy binding target is immutable', 'ARCH_SUBJECT_POLICY_BINDING_CONFLICT');
    }
    if (!existing) persistBinding(adapter, binding);
}

export function bindAuthenticatedAccountToSemanticEntity(request, payload = {}) {
    const actorHandle = authenticatedAccountHandle(request);
    if (request?.user?.profile?.admin !== true) {
        throw createError(403, 'Only an authenticated administrator may create identity bindings', 'ARCH_AUTHENTICATED_ENTITY_BINDING_ADMIN_REQUIRED');
    }
    const timestamp = nowTimestamp(payload.now);
    const identity = {
        accountHandle: normalizedAccountHandle(payload.accountHandle),
        semanticEntityId: requiredString(payload.semanticEntityId, 'semanticEntityId'),
        boundByAccountHandle: actorHandle,
    };
    const binding = { ...identity, bindingHash: hashCanonical(identity), createdAt: timestamp };
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const existing = loadAuthenticatedEntityBinding(adapter, identity.accountHandle);
        if (existing) {
            if (existing.bindingHash !== binding.bindingHash) {
                throw createError(409, 'Authenticated account already has a different semantic entity binding', 'ARCH_AUTHENTICATED_ENTITY_BINDING_CONFLICT');
            }
            return { created: false, binding: existing };
        }
        const entityOwner = adapter.get(
            'SELECT account_handle FROM authenticated_semantic_entity_bindings WHERE semantic_entity_id = ?',
            [identity.semanticEntityId],
        );
        if (entityOwner) {
            throw createError(409, 'Semantic entity is already bound to a different authenticated account', 'ARCH_AUTHENTICATED_ENTITY_IMPERSONATION_REFUSED');
        }
        const event = {
            eventId: createId('iglevent'), eventType: 'AUTHENTICATED_SEMANTIC_ENTITY_BOUND',
            occurredAt: timestamp, memoryScopeId: null, interpretationId: null, interpretationRevisionId: null,
            payload: { binding },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, binding: loadAuthenticatedEntityBinding(adapter, identity.accountHandle) };
    } finally {
        adapter.close();
    }
}

export function resolveAuthenticatedSemanticEntity(request) {
    const accountHandle = authenticatedAccountHandle(request);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        const binding = loadAuthenticatedEntityBinding(adapter, accountHandle);
        if (!binding) {
            throw createError(403, 'Authenticated account has no governed semantic entity binding', 'ARCH_AUTHENTICATED_ENTITY_BINDING_REQUIRED');
        }
        return binding;
    } finally {
        adapter.close();
    }
}

function refuseActorOverride(payload, fields, semanticEntityId) {
    for (const field of fields) {
        if (payload?.[field] !== undefined && requiredString(payload[field], field) !== semanticEntityId) {
            throw createError(403, 'Caller may not act as a different semantic entity', 'ARCH_AUTHENTICATED_ENTITY_IMPERSONATION_REFUSED');
        }
    }
}

export function declareSubjectScopedProposalFactAsAuthenticatedAccount(request, payload = {}) {
    const { semanticEntityId } = resolveAuthenticatedSemanticEntity(request);
    refuseActorOverride(payload, ['declaringEntityId'], semanticEntityId);
    return declareSubjectScopedProposalFact(request, { ...payload, declaringEntityId: semanticEntityId });
}

export function recordSubjectScopedProposalAcknowledgmentAsAuthenticatedAccount(request, payload = {}) {
    const { semanticEntityId } = resolveAuthenticatedSemanticEntity(request);
    refuseActorOverride(payload, ['recordedByEntityId'], semanticEntityId);
    const acknowledgmentState = requiredString(payload.acknowledgmentState, 'acknowledgmentState');
    if (acknowledgmentState === 'VERIFIED') {
        refuseActorOverride(payload, ['acknowledgingEntityId'], semanticEntityId);
        return recordSubjectScopedProposalAcknowledgment(request, {
            ...payload,
            acknowledgingEntityId: semanticEntityId,
            recordedByEntityId: semanticEntityId,
        });
    }
    return recordSubjectScopedProposalAcknowledgment(request, { ...payload, recordedByEntityId: semanticEntityId });
}

export function registerSubjectScopedProposalPolicyProfile(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const profile = normalizeSubjectScopedProposalPolicyProfile(payload.profile);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const existing = loadProfile(adapter, profile.profileId, profile.policyVersion);
        if (existing) {
            if (existing.policyHash !== profile.policyHash) {
                throw createError(409, 'Subject-scoped policy profile version is immutable', 'ARCH_SUBJECT_POLICY_PROFILE_CONFLICT');
            }
            return { created: false, profile: existing };
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_PROFILE_REGISTERED',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { profile, policyHash: profile.policyHash },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, profile: loadProfile(adapter, profile.profileId, profile.policyVersion) };
    } finally {
        adapter.close();
    }
}

export function assignSubjectScopedProposalPolicyProfile(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const assignmentId = requiredString(payload.assignmentId, 'assignmentId');
    const assignmentVersion = Number(payload.assignmentVersion);
    if (!Number.isSafeInteger(assignmentVersion) || assignmentVersion < 1) {
        throw createError(400, 'assignmentVersion must be a positive integer', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_VERSION_INVALID');
    }
    const profileId = requiredString(payload.profileId, 'profileId');
    const policyVersion = Number(payload.policyVersion);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const profile = loadProfile(adapter, profileId, policyVersion);
        if (!profile) {
            throw createError(404, 'Subject-scoped policy profile is not registered', 'ARCH_SUBJECT_POLICY_PROFILE_NOT_FOUND');
        }
        const subjectEntityId = requiredString(payload.subjectEntityId, 'subjectEntityId');
        const jurisdictionScopeId = requiredString(payload.jurisdictionScopeId, 'jurisdictionScopeId');
        if (profile.subjectEntityId !== subjectEntityId || profile.jurisdictionScopeId !== jurisdictionScopeId) {
            throw createError(409, 'Policy profile does not govern the assigned subject and jurisdiction', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_PROFILE_MISMATCH');
        }
        const identity = {
            assignmentId,
            assignmentVersion,
            subjectEntityId,
            jurisdictionScopeId,
            profileId,
            policyVersion,
            policyHash: profile.policyHash,
            assignmentState: 'ACTIVE',
        };
        const assignment = { ...identity, assignmentHash: hashCanonical(identity), createdAt: timestamp };
        const existing = loadAssignment(adapter, assignmentId, assignmentVersion);
        if (existing) {
            if (existing.assignmentHash !== assignment.assignmentHash) {
                throw createError(409, 'Subject-scoped policy assignment version is immutable', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_CONFLICT');
            }
            return { created: false, assignment: existing };
        }
        const active = resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId);
        if (active) {
            throw createError(409, 'Subject jurisdiction already has an active policy assignment', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_ACTIVE_CONFLICT');
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_PROFILE_ASSIGNED',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { assignment },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, assignment: loadAssignment(adapter, assignmentId, assignmentVersion) };
    } finally {
        adapter.close();
    }
}

export function resolveSubjectScopedProposalPolicyAssignment(request, subjectEntityId, jurisdictionScopeId) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        const assignment = resolveActiveAssignment(
            adapter,
            requiredString(subjectEntityId, 'subjectEntityId'),
            requiredString(jurisdictionScopeId, 'jurisdictionScopeId'),
        );
        if (!assignment) {
            throw createError(404, 'Subject jurisdiction has no active policy assignment', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_NOT_FOUND');
        }
        const profile = loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        if (!profile || profile.policyHash !== assignment.policyHash) {
            throw createError(409, 'Assigned subject-scoped policy profile is unavailable or mismatched', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_PROFILE_MISMATCH');
        }
        return { assignment, profile };
    } finally {
        adapter.close();
    }
}

export function bindAssignedSubjectPolicyToSynthesisRequest(request, payload = {}) {
    const subjectEntityId = requiredString(payload.subjectEntityId, 'subjectEntityId');
    const jurisdictionScopeId = requiredString(payload.jurisdictionScopeId, 'jurisdictionScopeId');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    let assignment;
    try {
        assignment = resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId);
    } finally {
        adapter.close();
    }
    if (!assignment) return { assigned: false, assignment: null, binding: null };
    const bound = bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: requiredString(payload.synthesisRunId, 'synthesisRunId'),
        profileId: assignment.profileId,
        policyVersion: assignment.policyVersion,
        expectedPolicyHash: assignment.policyHash,
        evidenceSetHash: requiredString(payload.evidenceSetHash, 'evidenceSetHash'),
        now: payload.now,
    });
    return { assigned: true, assignment, binding: bound.binding };
}

export function declareSubjectScopedProposalFact(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const factType = requiredString(payload.factType, 'factType');
    const authorityField = factType === 'STABILITY'
        ? 'stabilityAuthorityEntityIds'
        : factType === 'ENDURING_VALUE'
            ? 'enduringValueAuthorityEntityIds'
            : null;
    if (!authorityField) {
        throw createError(400, 'Subject-scoped declarable fact type is unsupported', 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_TYPE_INVALID');
    }
    const subjectEntityId = requiredString(payload.subjectEntityId, 'subjectEntityId');
    const jurisdictionScopeId = requiredString(payload.jurisdictionScopeId, 'jurisdictionScopeId');
    const proposalKind = requiredString(payload.proposalKind, 'proposalKind');
    const declaringEntityId = requiredString(payload.declaringEntityId, 'declaringEntityId');
    const basisRefs = sortedUniqueStrings(payload.basisRefs || [], 'basisRefs');
    if (basisRefs.length === 0) {
        throw createError(400, 'Subject-scoped fact declaration requires exact basis references', 'ARCH_SUBJECT_POLICY_FACT_BASIS_REQUIRED');
    }
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const assignment = resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId);
        if (!assignment) {
            throw createError(404, 'Subject jurisdiction has no active policy assignment', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_NOT_FOUND');
        }
        const profile = loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        const rule = profile?.rules.find((entry) => entry.proposalKind === proposalKind);
        if (!rule) {
            throw createError(409, 'Assigned policy does not permit this proposal kind', 'ARCH_SUBJECT_POLICY_KIND_NOT_ALLOWED');
        }
        if (!Array.isArray(rule[authorityField]) || !rule[authorityField].includes(declaringEntityId)) {
            throw createError(403, 'Declaring entity is not authorized for this proposal fact', 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_UNAUTHORIZED');
        }
        const identity = {
            declarationId: requiredString(payload.declarationId, 'declarationId'),
            factType,
            subjectEntityId,
            jurisdictionScopeId,
            evidenceSetHash: requiredString(payload.evidenceSetHash, 'evidenceSetHash'),
            proposalKind,
            declaringEntityId,
            basisRefs,
            profileId: assignment.profileId,
            policyVersion: assignment.policyVersion,
            policyHash: assignment.policyHash,
        };
        const declaration = { ...identity, declarationHash: hashCanonical(identity), createdAt: timestamp };
        const existing = loadFactDeclaration(adapter, declaration.declarationId);
        if (existing) {
            if (existing.declarationHash !== declaration.declarationHash) {
                throw createError(409, 'Subject-scoped fact declaration is immutable', 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_CONFLICT');
            }
            return { created: false, declaration: existing };
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_FACT_DECLARED',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { declaration },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, declaration: loadFactDeclaration(adapter, declaration.declarationId) };
    } finally {
        adapter.close();
    }
}

export function listSubjectScopedProposalFactDeclarations(request, filters = {}) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        const subjectEntityId = requiredString(filters.subjectEntityId, 'subjectEntityId');
        const jurisdictionScopeId = requiredString(filters.jurisdictionScopeId, 'jurisdictionScopeId');
        const evidenceSetHash = requiredString(filters.evidenceSetHash, 'evidenceSetHash');
        return adapter.all(
            `SELECT * FROM subject_scoped_proposal_fact_declarations
             WHERE subject_entity_id = ? AND jurisdiction_scope_id = ? AND evidence_set_hash = ?
             ORDER BY fact_type, declaration_id`,
            [subjectEntityId, jurisdictionScopeId, evidenceSetHash],
        ).map(declarationFromRow);
    } finally {
        adapter.close();
    }
}

export function recordSubjectScopedProposalAcknowledgment(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const acknowledgmentState = requiredString(payload.acknowledgmentState, 'acknowledgmentState');
    if (!['VERIFIED', 'UNAVAILABLE'].includes(acknowledgmentState)) {
        throw createError(400, 'Acknowledgment state must be VERIFIED or UNAVAILABLE', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_STATE_INVALID');
    }
    const subjectEntityId = requiredString(payload.subjectEntityId, 'subjectEntityId');
    const jurisdictionScopeId = requiredString(payload.jurisdictionScopeId, 'jurisdictionScopeId');
    const proposalKind = requiredString(payload.proposalKind, 'proposalKind');
    const acknowledgingEntityId = requiredString(payload.acknowledgingEntityId, 'acknowledgingEntityId');
    const recordedByEntityId = requiredString(payload.recordedByEntityId, 'recordedByEntityId');
    const basisRefs = sortedUniqueStrings(payload.basisRefs || [], 'basisRefs');
    if (basisRefs.length === 0) {
        throw createError(400, 'Acknowledgment requires exact basis references', 'ARCH_SUBJECT_POLICY_FACT_BASIS_REQUIRED');
    }
    const unavailableReason = acknowledgmentState === 'UNAVAILABLE'
        ? requiredString(payload.unavailableReason, 'unavailableReason')
        : null;
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const assignment = resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId);
        if (!assignment) throw createError(404, 'Subject jurisdiction has no active policy assignment', 'ARCH_SUBJECT_POLICY_ASSIGNMENT_NOT_FOUND');
        const profile = loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        const rule = profile?.rules.find((entry) => entry.proposalKind === proposalKind);
        if (!rule?.requiredAcknowledgmentEntityIds.includes(acknowledgingEntityId)) {
            throw createError(409, 'Entity is not a required acknowledger for this proposal kind', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGER_NOT_REQUIRED');
        }
        if (acknowledgmentState === 'VERIFIED' && recordedByEntityId !== acknowledgingEntityId) {
            throw createError(403, 'Verified acknowledgment must be recorded by the acknowledging participant', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_UNAUTHORIZED');
        }
        if (acknowledgmentState === 'UNAVAILABLE'
            && (!Array.isArray(rule.unavailabilityAuthorityEntityIds)
                || !rule.unavailabilityAuthorityEntityIds.includes(recordedByEntityId))) {
            throw createError(403, 'Recorder is not authorized to mark this participant unavailable', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_UNAUTHORIZED');
        }
        const identity = {
            acknowledgmentId: requiredString(payload.acknowledgmentId, 'acknowledgmentId'),
            subjectEntityId,
            jurisdictionScopeId,
            evidenceSetHash: requiredString(payload.evidenceSetHash, 'evidenceSetHash'),
            proposalKind,
            acknowledgingEntityId,
            acknowledgmentState,
            recordedByEntityId,
            unavailableReason,
            basisRefs,
            profileId: assignment.profileId,
            policyVersion: assignment.policyVersion,
            policyHash: assignment.policyHash,
        };
        const acknowledgment = { ...identity, acknowledgmentHash: hashCanonical(identity), createdAt: timestamp };
        const existing = loadAcknowledgment(adapter, acknowledgment.acknowledgmentId);
        if (existing) {
            if (existing.acknowledgmentHash !== acknowledgment.acknowledgmentHash) {
                throw createError(409, 'Subject-scoped acknowledgment is immutable', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_CONFLICT');
            }
            return { created: false, acknowledgment: existing };
        }
        const existingForEntity = adapter.get(
            `SELECT acknowledgment_id FROM subject_scoped_proposal_acknowledgments
             WHERE subject_entity_id = ? AND jurisdiction_scope_id = ? AND evidence_set_hash = ?
             AND proposal_kind = ? AND acknowledging_entity_id = ?`,
            [subjectEntityId, jurisdictionScopeId, identity.evidenceSetHash, proposalKind, acknowledgingEntityId],
        );
        if (existingForEntity) {
            throw createError(409, 'Participant already has an acknowledgment record for this evidence set', 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_AMBIGUOUS');
        }
        const event = {
            eventId: createId('iglevent'), eventType: 'SUBJECT_SCOPED_POLICY_ACKNOWLEDGMENT_RECORDED',
            occurredAt: timestamp, memoryScopeId: null, interpretationId: null, interpretationRevisionId: null,
            payload: { acknowledgment },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, acknowledgment: loadAcknowledgment(adapter, acknowledgment.acknowledgmentId) };
    } finally {
        adapter.close();
    }
}

export function listSubjectScopedProposalAcknowledgments(request, filters = {}) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        return adapter.all(
            `SELECT * FROM subject_scoped_proposal_acknowledgments
             WHERE subject_entity_id = ? AND jurisdiction_scope_id = ? AND evidence_set_hash = ?
             ORDER BY acknowledging_entity_id, acknowledgment_id`,
            [
                requiredString(filters.subjectEntityId, 'subjectEntityId'),
                requiredString(filters.jurisdictionScopeId, 'jurisdictionScopeId'),
                requiredString(filters.evidenceSetHash, 'evidenceSetHash'),
            ],
        ).map(acknowledgmentFromRow);
    } finally {
        adapter.close();
    }
}

export function buildSubjectScopedAcknowledgmentFactRecords(acknowledgments, expected = {}) {
    const evidenceSetHash = requiredString(expected.evidenceSetHash, 'evidenceSetHash');
    const proposalKind = requiredString(expected.proposalKind, 'proposalKind');
    const policyHash = requiredString(expected.policyHash, 'policyHash');
    return (Array.isArray(acknowledgments) ? acknowledgments : [])
        .filter((entry) => (
            entry.evidenceSetHash === evidenceSetHash
            && entry.proposalKind === proposalKind
            && entry.policyHash === policyHash
        ))
        .map((entry) => ({
            recordId: entry.acknowledgmentId,
            recordType: 'ACKNOWLEDGMENT',
            evidenceSetHash: entry.evidenceSetHash,
            state: entry.acknowledgmentState,
            entityId: entry.acknowledgingEntityId,
            basisRefs: entry.basisRefs,
        }))
        .sort((left, right) => left.entityId.localeCompare(right.entityId));
}

const OPERATOR_REQUIREMENT_TEXT = Object.freeze({
    EXPLICIT_EVIDENCE_NOT_VERIFIED: 'The evidence does not directly state or demonstrate the proposed meaning.',
    GROUNDING_NOT_VERIFIED: 'The proposal is not bound to exact inspectable source evidence.',
    STABILITY_NOT_VERIFIED: 'No authorized person has confirmed that this is a settled or durable conclusion.',
    ENDURING_VALUE_NOT_VERIFIED: 'No authorized person has confirmed why this should remain useful beyond the current conversation.',
    REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED: 'A required participant has not acknowledged the proposed meaning.',
    REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE: 'A required participant is currently unavailable to acknowledge the proposed meaning.',
    GOVERNANCE_VALIDATION_NOT_SATISFIED: 'The proposal has not passed its required governing-law check.',
    POLICY_KIND_NOT_ALLOWED: 'The assigned subject policy does not permit this kind of proposal.',
    POLICY_TRACK_MISMATCH: 'The proposal does not match the assigned subject-policy track.',
    POLICY_SUBJECT_MISMATCH: 'The proposal subject does not match the assigned subject policy.',
});

function nextOperatorAction(failureCodes) {
    if (failureCodes.includes('EXPLICIT_EVIDENCE_NOT_VERIFIED') || failureCodes.includes('GROUNDING_NOT_VERIFIED')) {
        return 'Select evidence that directly states the proposed meaning and can be opened for inspection.';
    }
    if (failureCodes.includes('STABILITY_NOT_VERIFIED') || failureCodes.includes('ENDURING_VALUE_NOT_VERIFIED')) {
        return 'Ask an authorized person to confirm stability and enduring value.';
    }
    if (failureCodes.includes('REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE')) {
        return 'Keep the proposal provisional until the unavailable participant can respond.';
    }
    if (failureCodes.includes('REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED')) {
        return 'Request acknowledgment from the missing participant.';
    }
    if (failureCodes.includes('GOVERNANCE_VALIDATION_NOT_SATISFIED')) {
        return 'Review the governing-law conflict or create a lawful amendment.';
    }
    return 'Review the assigned subject policy before trying again.';
}

export function getSubjectScopedPolicyOperatorStatus(request, filters = {}) {
    const subjectEntityId = requiredString(filters.subjectEntityId, 'subjectEntityId');
    const jurisdictionScopeId = requiredString(filters.jurisdictionScopeId, 'jurisdictionScopeId');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        const assignment = resolveActiveAssignment(adapter, subjectEntityId, jurisdictionScopeId);
        if (!assignment) {
            return {
                configured: false,
                subjectEntityId,
                jurisdictionScopeId,
                status: 'No subject policy is configured for this scope.',
                nextAction: 'Set up a subject policy before creating governed proposals.',
            };
        }
        const profile = loadProfile(adapter, assignment.profileId, assignment.policyVersion);
        return {
            configured: true,
            subjectEntityId,
            jurisdictionScopeId,
            status: 'Subject policy is configured.',
            permittedProposalKinds: profile.rules.map((rule) => rule.proposalKind).sort(),
            nextAction: 'Select evidence and create a proposal.',
        };
    } finally {
        adapter.close();
    }
}

export function getSubjectScopedSynthesisOperatorStatus(request, synthesisRunId) {
    const bindingTargetType = 'SYNTHESIS_REQUEST';
    const bindingTargetId = requiredString(synthesisRunId, 'synthesisRunId');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        const binding = loadBinding(adapter, bindingTargetType, bindingTargetId);
        if (!binding) {
            return {
                governed: false,
                synthesisRunId: bindingTargetId,
                status: 'This proposal request does not use a subject-scoped policy.',
                missingRequirements: [],
                nextAction: 'Continue through the existing proposal review flow.',
            };
        }
        const attestation = loadFactAttestation(adapter, bindingTargetType, bindingTargetId);
        const evaluationRecord = loadEligibilityEvaluation(adapter, bindingTargetType, bindingTargetId);
        if (!attestation || !evaluationRecord) {
            return {
                governed: true,
                synthesisRunId: bindingTargetId,
                subjectEntityId: binding.subjectEntityId,
                jurisdictionScopeId: binding.jurisdictionScopeId,
                status: 'This proposal request has not finished its evidence checks.',
                missingRequirements: ['Evidence checks are incomplete.'],
                nextAction: 'Run the proposal request again after its governed records are available.',
            };
        }
        const evaluation = evaluationRecord.evaluation;
        const requiredAcknowledgers = evaluation.matchedRule?.requiredAcknowledgmentEntityIds || [];
        const acknowledgmentByEntity = new Map(attestation.facts.acknowledgments.map((entry) => [entry.entityId, entry]));
        const missingParticipants = requiredAcknowledgers.filter((entityId) => acknowledgmentByEntity.get(entityId)?.state !== 'VERIFIED');
        const failureCodes = Array.isArray(evaluation.failureCodes) ? evaluation.failureCodes : [];
        let authenticatedEntityId = null;
        try {
            authenticatedEntityId = loadAuthenticatedEntityBinding(
                adapter,
                authenticatedAccountHandle(request),
            )?.semanticEntityId || null;
        } catch {
            authenticatedEntityId = null;
        }
        const permittedActions = [];
        if (authenticatedEntityId) {
            const rule = evaluation.matchedRule || {};
            if (failureCodes.includes('STABILITY_NOT_VERIFIED')
                && rule.stabilityAuthorityEntityIds?.includes(authenticatedEntityId)) {
                permittedActions.push({
                    action: 'CONFIRM_STABILITY',
                    label: 'Confirm this is settled',
                    description: 'Record that this meaning is stable enough to review.',
                });
            }
            if (failureCodes.includes('ENDURING_VALUE_NOT_VERIFIED')
                && rule.enduringValueAuthorityEntityIds?.includes(authenticatedEntityId)) {
                permittedActions.push({
                    action: 'CONFIRM_ENDURING_VALUE',
                    label: 'Confirm this should be remembered',
                    description: 'Record that this meaning has enduring continuity value.',
                });
            }
            if (missingParticipants.includes(authenticatedEntityId)) {
                permittedActions.push({
                    action: 'ACKNOWLEDGE',
                    label: 'Acknowledge this meaning',
                    description: 'Record your acknowledgment of the proposed meaning.',
                });
            }
        }
        return {
            governed: true,
            synthesisRunId: bindingTargetId,
            subjectEntityId: binding.subjectEntityId,
            jurisdictionScopeId: binding.jurisdictionScopeId,
            status: evaluation.verdict === 'ELIGIBLE'
                ? 'All proposal requirements are satisfied.'
                : evaluation.provisional
                    ? 'This proposal is provisional and cannot advance.'
                    : 'This proposal is blocked and cannot advance.',
            eligible: evaluation.verdict === 'ELIGIBLE',
            provisional: evaluation.provisional === true,
            missingRequirements: failureCodes.map((code) => OPERATOR_REQUIREMENT_TEXT[code] || 'A required subject-policy check is not satisfied.'),
            missingParticipantEntityIds: missingParticipants,
            permittedActions,
            nextAction: evaluation.verdict === 'ELIGIBLE'
                ? 'Open the proposal in Review.'
                : nextOperatorAction(failureCodes),
        };
    } finally {
        adapter.close();
    }
}

export function performAuthenticatedSubjectPolicySynthesisAction(request, synthesisRunId, actionInput, payload = {}) {
    const bindingTargetId = requiredString(synthesisRunId, 'synthesisRunId');
    const action = requiredString(actionInput, 'action');
    const actor = resolveAuthenticatedSemanticEntity(request);
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    let binding;
    let attestation;
    let evaluationRecord;
    try {
        binding = loadBinding(adapter, 'SYNTHESIS_REQUEST', bindingTargetId);
        attestation = loadFactAttestation(adapter, 'SYNTHESIS_REQUEST', bindingTargetId);
        evaluationRecord = loadEligibilityEvaluation(adapter, 'SYNTHESIS_REQUEST', bindingTargetId);
    } finally {
        adapter.close();
    }
    if (!binding || !attestation || !evaluationRecord) {
        throw createError(409, 'Proposal requirements are not ready for an operator action', 'ARCH_SUBJECT_POLICY_ACTION_NOT_READY');
    }
    const facts = attestation.facts;
    const common = {
        subjectEntityId: binding.subjectEntityId,
        jurisdictionScopeId: binding.jurisdictionScopeId,
        evidenceSetHash: binding.evidenceSetHash,
        proposalKind: facts.proposalKind,
        basisRefs: [...new Set([
            ...(facts.explicit?.basisRefs || []),
            ...(facts.grounding?.basisRefs || []),
        ])].sort(),
        now: payload.now,
    };
    if (action === 'CONFIRM_STABILITY' || action === 'CONFIRM_ENDURING_VALUE') {
        const factType = action === 'CONFIRM_STABILITY' ? 'STABILITY' : 'ENDURING_VALUE';
        return declareSubjectScopedProposalFactAsAuthenticatedAccount(request, {
            ...common,
            declarationId: createId('subjectfact'),
            factType,
        });
    }
    if (action === 'ACKNOWLEDGE') {
        return recordSubjectScopedProposalAcknowledgmentAsAuthenticatedAccount(request, {
            ...common,
            acknowledgmentId: createId('subjectack'),
            acknowledgmentState: 'VERIFIED',
        });
    }
    throw createError(400, 'Subject-policy operator action is unsupported', 'ARCH_SUBJECT_POLICY_ACTION_INVALID');
}

export function bindSubjectScopedProposalPolicyProfile(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const bindingTargetType = requiredString(payload.bindingTargetType, 'bindingTargetType');
    if (!ALLOWED_BINDING_TARGET_TYPES.has(bindingTargetType)) {
        throw createError(400, 'Subject-scoped policy binding target type is unsupported', 'ARCH_SUBJECT_POLICY_BINDING_TARGET_INVALID');
    }
    const bindingTargetId = requiredString(payload.bindingTargetId, 'bindingTargetId');
    const profileId = requiredString(payload.profileId, 'profileId');
    const policyVersion = Number(payload.policyVersion);
    const evidenceSetHash = requiredString(payload.evidenceSetHash, 'evidenceSetHash');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const profile = loadProfile(adapter, profileId, policyVersion);
        if (!profile) {
            throw createError(404, 'Subject-scoped policy profile is not registered', 'ARCH_SUBJECT_POLICY_PROFILE_NOT_FOUND');
        }
        if (payload.expectedPolicyHash && payload.expectedPolicyHash !== profile.policyHash) {
            throw createError(409, 'Subject-scoped policy profile hash changed before binding', 'ARCH_SUBJECT_POLICY_PROFILE_HASH_MISMATCH');
        }
        const binding = {
            bindingTargetType,
            bindingTargetId,
            profileId,
            policyVersion,
            policyHash: profile.policyHash,
            subjectEntityId: profile.subjectEntityId,
            jurisdictionScopeId: profile.jurisdictionScopeId,
            evidenceSetHash,
            createdAt: timestamp,
        };
        const existing = loadBinding(adapter, bindingTargetType, bindingTargetId);
        if (existing) {
            if (!sameBindingIdentity(existing, binding)) {
                throw createError(409, 'Subject-scoped policy binding target is immutable', 'ARCH_SUBJECT_POLICY_BINDING_CONFLICT');
            }
            return { created: false, binding: existing };
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_PROFILE_BOUND',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { binding },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, binding: loadBinding(adapter, bindingTargetType, bindingTargetId) };
    } finally {
        adapter.close();
    }
}

export function attestSubjectScopedProposalFacts(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const bindingTargetType = requiredString(payload.bindingTargetType, 'bindingTargetType');
    const bindingTargetId = requiredString(payload.bindingTargetId, 'bindingTargetId');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const binding = loadBinding(adapter, bindingTargetType, bindingTargetId);
        if (!binding) {
            throw createError(404, 'Subject-scoped policy binding is not registered', 'ARCH_SUBJECT_POLICY_BINDING_NOT_FOUND');
        }
        const derived = deriveSubjectScopedProposalFacts(binding, payload);
        const attestation = {
            bindingTargetType,
            bindingTargetId,
            evidenceSetHash: binding.evidenceSetHash,
            policyHash: binding.policyHash,
            factsHash: derived.factsHash,
            facts: derived.facts,
            sourceRecordsHash: derived.sourceRecordsHash,
            sourceRecords: derived.sourceRecords,
            createdAt: timestamp,
        };
        const existing = loadFactAttestation(adapter, bindingTargetType, bindingTargetId);
        if (existing) {
            if (existing.factsHash !== attestation.factsHash
                || existing.sourceRecordsHash !== attestation.sourceRecordsHash) {
                throw createError(409, 'Subject-scoped fact attestation is immutable', 'ARCH_SUBJECT_POLICY_FACT_ATTESTATION_CONFLICT');
            }
            return { created: false, attestation: existing };
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_FACTS_ATTESTED',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { attestation },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, attestation: loadFactAttestation(adapter, bindingTargetType, bindingTargetId) };
    } finally {
        adapter.close();
    }
}

export function evaluateBoundSubjectScopedSynthesisRequest(request, payload = {}) {
    const timestamp = nowTimestamp(payload.now);
    const bindingTargetType = 'SYNTHESIS_REQUEST';
    const bindingTargetId = requiredString(payload.bindingTargetId, 'bindingTargetId');
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths, { now: timestamp });
    try {
        const binding = loadBinding(adapter, bindingTargetType, bindingTargetId);
        if (!binding) {
            throw createError(404, 'Synthesis request has no subject-scoped policy binding', 'ARCH_SUBJECT_POLICY_BINDING_NOT_FOUND');
        }
        const profile = loadProfile(adapter, binding.profileId, binding.policyVersion);
        if (!profile || profile.policyHash !== binding.policyHash) {
            throw createError(409, 'Synthesis request policy profile is unavailable or mismatched', 'ARCH_SUBJECT_POLICY_EVALUATION_PROFILE_MISMATCH');
        }
        const attestation = loadFactAttestation(adapter, bindingTargetType, bindingTargetId);
        if (!attestation) {
            throw createError(409, 'Synthesis request has no governed fact attestation', 'ARCH_SUBJECT_POLICY_FACT_ATTESTATION_NOT_FOUND');
        }
        if (attestation.policyHash !== binding.policyHash
            || attestation.evidenceSetHash !== binding.evidenceSetHash) {
            throw createError(409, 'Synthesis request fact attestation is stale or mismatched', 'ARCH_SUBJECT_POLICY_EVALUATION_INPUT_MISMATCH');
        }
        const evaluation = evaluateSubjectScopedProposalEligibility(profile, attestation.facts);
        const record = {
            bindingTargetType,
            bindingTargetId,
            policyHash: binding.policyHash,
            factsHash: attestation.factsHash,
            evaluationHash: hashCanonical(evaluation),
            evaluation,
            createdAt: timestamp,
        };
        const existing = loadEligibilityEvaluation(adapter, bindingTargetType, bindingTargetId);
        if (existing) {
            if (existing.evaluationHash !== record.evaluationHash) {
                throw createError(409, 'Subject-scoped eligibility evaluation is immutable', 'ARCH_SUBJECT_POLICY_EVALUATION_CONFLICT');
            }
            return { created: false, evaluationRecord: existing };
        }
        const event = {
            eventId: createId('iglevent'),
            eventType: 'SUBJECT_SCOPED_POLICY_ELIGIBILITY_EVALUATED',
            occurredAt: timestamp,
            memoryScopeId: null,
            interpretationId: null,
            interpretationRevisionId: null,
            payload: { evaluationRecord: record },
        };
        appendLedgerEvent(paths.interpretiveGovernanceLedgerPath, event);
        adapter.transaction(() => applySubjectScopedPolicyLedgerEvent(adapter, event));
        snapshotOperationalDatabase(adapter, paths);
        return { created: true, evaluationRecord: loadEligibilityEvaluation(adapter, bindingTargetType, bindingTargetId) };
    } finally {
        adapter.close();
    }
}

export function requireSubjectScopedEligibilityForAdmission(adapter, bindingTargetId) {
    const bindingTargetType = 'SYNTHESIS_REQUEST';
    const normalizedTargetId = requiredString(bindingTargetId, 'bindingTargetId');
    const binding = loadBinding(adapter, bindingTargetType, normalizedTargetId);
    if (!binding) return { governed: false, evaluationRecord: null };
    const evaluationRecord = loadEligibilityEvaluation(adapter, bindingTargetType, normalizedTargetId);
    if (!evaluationRecord) {
        throw createError(409, 'Bound synthesis request has not completed subject-scoped eligibility evaluation', 'ARCH_SUBJECT_POLICY_EVALUATION_NOT_FOUND');
    }
    if (evaluationRecord.policyHash !== binding.policyHash) {
        throw createError(409, 'Bound synthesis request eligibility evaluation is stale', 'ARCH_SUBJECT_POLICY_EVALUATION_INPUT_MISMATCH');
    }
    if (evaluationRecord.evaluation?.verdict !== 'ELIGIBLE') {
        const error = createError(409, 'Bound synthesis request is not eligible for proposal admission', 'ARCH_SUBJECT_POLICY_ADMISSION_INELIGIBLE');
        error.details = {
            failureCodes: Array.isArray(evaluationRecord.evaluation?.failureCodes)
                ? [...evaluationRecord.evaluation.failureCodes]
                : [],
            provisional: evaluationRecord.evaluation?.provisional === true,
        };
        throw error;
    }
    return { governed: true, evaluationRecord };
}

export function getSubjectScopedProposalPolicyProfile(request, profileId, policyVersion) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        return loadProfile(adapter, requiredString(profileId, 'profileId'), Number(policyVersion));
    } finally {
        adapter.close();
    }
}

export function getSubjectScopedProposalPolicyBinding(request, bindingTargetType, bindingTargetId) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        return loadBinding(
            adapter,
            requiredString(bindingTargetType, 'bindingTargetType'),
            requiredString(bindingTargetId, 'bindingTargetId'),
        );
    } finally {
        adapter.close();
    }
}

export function getSubjectScopedProposalFactAttestation(request, bindingTargetType, bindingTargetId) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        return loadFactAttestation(
            adapter,
            requiredString(bindingTargetType, 'bindingTargetType'),
            requiredString(bindingTargetId, 'bindingTargetId'),
        );
    } finally {
        adapter.close();
    }
}

export function getSubjectScopedProposalEligibilityEvaluation(request, bindingTargetType, bindingTargetId) {
    const paths = getStoragePaths(getAuthenticatedUserRoot(request));
    const adapter = openOperationalDatabase(paths);
    try {
        return loadEligibilityEvaluation(
            adapter,
            requiredString(bindingTargetType, 'bindingTargetType'),
            requiredString(bindingTargetId, 'bindingTargetId'),
        );
    } finally {
        adapter.close();
    }
}
