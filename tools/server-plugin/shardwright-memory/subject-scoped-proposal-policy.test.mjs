import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    assignSubjectScopedProposalPolicyProfile,
    bindAuthenticatedAccountToSemanticEntity,
    attestSubjectScopedProposalFacts,
    evaluateSubjectScopedProposalEligibility,
    bindSubjectScopedProposalPolicyProfile,
    buildSubjectScopedAcknowledgmentFactRecords,
    declareSubjectScopedProposalFact,
    declareSubjectScopedProposalFactAsAuthenticatedAccount,
    deriveSubjectScopedProposalFacts,
    evaluateBoundSubjectScopedSynthesisRequest,
    getSubjectScopedProposalFactAttestation,
    getSubjectScopedProposalEligibilityEvaluation,
    getSubjectScopedProposalPolicyBinding,
    getSubjectScopedProposalPolicyProfile,
    getSubjectScopedPolicyOperatorStatus,
    getSubjectScopedSynthesisOperatorStatus,
    listSubjectScopedProposalFactDeclarations,
    listSubjectScopedProposalAcknowledgments,
    normalizeSubjectScopedProposalPolicyProfile,
    performAuthenticatedSubjectPolicySynthesisAction,
    recordSubjectScopedProposalAcknowledgment,
    recordSubjectScopedProposalAcknowledgmentAsAuthenticatedAccount,
    registerSubjectScopedProposalPolicyProfile,
    resolveAuthenticatedSemanticEntity,
    resolveSubjectScopedProposalPolicyAssignment,
} from './subject-scoped-proposal-policy.js';
import { replayInterpretiveLedger } from './interpretive.js';

const fixture = JSON.parse(fs.readFileSync(
    new URL('./fixtures/subject-scoped-proposal-policy-v1.json', import.meta.url),
    'utf8',
));

function makeRequest() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-subject-policy-'));
    return { user: { directories: { root } } };
}

function makeAuthenticatedRequest(handle, { admin = false, root = null } = {}) {
    return {
        user: {
            profile: { handle, name: handle, admin },
            directories: { root: root || fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-auth-binding-')) },
        },
    };
}

function governedRecords(evidenceSetHash = fixture.evidenceFacts.evidenceSetHash) {
    return [
        { recordId: 'fact:explicit', recordType: 'EXPLICITNESS_VERIFICATION', evidenceSetHash, state: 'VERIFIED', basisRefs: ['msg:100'] },
        { recordId: 'fact:grounding', recordType: 'GROUNDING_VERIFICATION', evidenceSetHash, state: 'VERIFIED', basisRefs: ['msg:100', 'msg:101'] },
        { recordId: 'fact:stability', recordType: 'STABILITY_VERIFICATION', evidenceSetHash, state: 'VERIFIED', basisRefs: ['msg:101'] },
        { recordId: 'fact:enduring', recordType: 'ENDURING_VALUE_VERIFICATION', evidenceSetHash, state: 'VERIFIED', basisRefs: ['msg:102'] },
        { recordId: 'ack:alpha', recordType: 'ACKNOWLEDGMENT', evidenceSetHash, state: 'VERIFIED', entityId: 'subject:alpha', basisRefs: ['msg:101'] },
        { recordId: 'ack:operator', recordType: 'ACKNOWLEDGMENT', evidenceSetHash, state: 'VERIFIED', entityId: 'user:operator', basisRefs: ['msg:102'] },
        { recordId: 'governance:1', recordType: 'GOVERNANCE_VALIDATION', evidenceSetHash, state: 'COMPATIBLE', basisRefs: ['decision:governing-law'] },
    ];
}

function registerBindAndAttest(request, {
    targetId,
    records = governedRecords(),
    proposalKind = 'DESIGN_COMMITMENT',
    proposalTrack = 'ARCHITECTURAL_DECISION',
}) {
    const registered = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 500 });
    bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: targetId,
        profileId: registered.profile.profileId,
        policyVersion: 1,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        now: 501,
    });
    return attestSubjectScopedProposalFacts(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: targetId,
        subjectEntityId: 'subject:alpha',
        proposalKind,
        proposalTrack,
        records,
        now: 502,
    });
}

test('same frozen evidence is eligible only under the subject profile that permits its proposal kind', () => {
    const alphaFacts = { ...fixture.evidenceFacts, subjectEntityId: 'subject:alpha' };
    const betaFacts = { ...fixture.evidenceFacts, subjectEntityId: 'subject:beta' };

    const alpha = evaluateSubjectScopedProposalEligibility(fixture.profiles.alpha, alphaFacts);
    const beta = evaluateSubjectScopedProposalEligibility(fixture.profiles.beta, betaFacts);

    assert.equal(alpha.evidenceSetHash, beta.evidenceSetHash);
    assert.equal(alpha.verdict, 'ELIGIBLE');
    assert.deepEqual(alpha.failureCodes, []);
    assert.equal(beta.verdict, 'INELIGIBLE');
    assert.deepEqual(beta.failureCodes, ['POLICY_KIND_NOT_ALLOWED']);
});

test('profile identity is deterministic regardless of rule and acknowledgment order', () => {
    const original = normalizeSubjectScopedProposalPolicyProfile(fixture.profiles.beta);
    const reordered = normalizeSubjectScopedProposalPolicyProfile({
        ...fixture.profiles.beta,
        rules: [...fixture.profiles.beta.rules].reverse().map((rule) => ({
            ...rule,
            requiredAcknowledgmentEntityIds: [...rule.requiredAcknowledgmentEntityIds].reverse(),
        })),
    });
    assert.equal(original.policyHash, reordered.policyHash);
});

test('unavailable required acknowledgment is recorded as provisional and cannot become eligible', () => {
    const profile = fixture.profiles.alpha;
    const facts = {
        ...fixture.evidenceFacts,
        subjectEntityId: 'subject:alpha',
        acknowledgments: fixture.evidenceFacts.acknowledgments.map((entry) => (
            entry.entityId === 'subject:alpha' ? { ...entry, state: 'UNAVAILABLE' } : entry
        )),
    };
    const result = evaluateSubjectScopedProposalEligibility(profile, facts);
    assert.equal(result.verdict, 'INELIGIBLE');
    assert.equal(result.provisional, true);
    assert.deepEqual(result.failureCodes, ['REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE']);
});

test('no generic fallback admits an unlisted proposal kind', () => {
    const result = evaluateSubjectScopedProposalEligibility(fixture.profiles.alpha, {
        ...fixture.evidenceFacts,
        subjectEntityId: 'subject:alpha',
        proposalKind: 'EMOTIONAL_PRECEDENT',
        proposalTrack: 'PERSONAL_IDENTITY',
    });
    assert.equal(result.verdict, 'INELIGIBLE');
    assert.deepEqual(result.failureCodes, ['POLICY_KIND_NOT_ALLOWED']);
});

test('governance decision cannot activate without compatible governing law', () => {
    const result = evaluateSubjectScopedProposalEligibility(fixture.profiles.beta, {
        ...fixture.evidenceFacts,
        subjectEntityId: 'subject:beta',
        proposalKind: 'GOVERNANCE_DECISION',
        proposalTrack: 'PROJECT_GOVERNANCE',
        acknowledgments: [
            { entityId: 'subject:beta', state: 'VERIFIED', basisRefs: ['msg:101'] },
            { entityId: 'user:operator', state: 'VERIFIED', basisRefs: ['msg:102'] },
        ],
        governanceValidation: { state: 'UNRESOLVED_CONFLICT', basisRefs: ['decision:governing-law'] },
    });
    assert.equal(result.verdict, 'INELIGIBLE');
    assert.deepEqual(result.failureCodes, ['GOVERNANCE_VALIDATION_NOT_SATISFIED']);
});

test('registered profile and immutable binding survive restart and ledger replay', () => {
    const request = makeRequest();
    const registered = registerSubjectScopedProposalPolicyProfile(request, {
        profile: fixture.profiles.alpha,
        now: 100,
    });
    const bound = bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: 'synthreq_alpha_1',
        profileId: registered.profile.profileId,
        policyVersion: registered.profile.policyVersion,
        expectedPolicyHash: registered.profile.policyHash,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        now: 101,
    });

    assert.equal(registered.created, true);
    assert.equal(bound.created, true);
    assert.equal(
        getSubjectScopedProposalPolicyProfile(request, 'profile:alpha:v1', 1).policyHash,
        registered.profile.policyHash,
    );
    assert.equal(
        getSubjectScopedProposalPolicyBinding(request, 'SYNTHESIS_REQUEST', 'synthreq_alpha_1').policyHash,
        registered.profile.policyHash,
    );

    replayInterpretiveLedger(request, { now: 102 });

    assert.equal(
        getSubjectScopedProposalPolicyProfile(request, 'profile:alpha:v1', 1).policyHash,
        registered.profile.policyHash,
    );
    assert.deepEqual(
        getSubjectScopedProposalPolicyBinding(request, 'SYNTHESIS_REQUEST', 'synthreq_alpha_1'),
        bound.binding,
    );
});

test('registered profile versions and binding targets refuse conflicting content', () => {
    const request = makeRequest();
    const registered = registerSubjectScopedProposalPolicyProfile(request, {
        profile: fixture.profiles.alpha,
        now: 200,
    });
    assert.throws(
        () => registerSubjectScopedProposalPolicyProfile(request, {
            profile: {
                ...fixture.profiles.alpha,
                rules: [{ ...fixture.profiles.alpha.rules[0], governanceValidationRequired: true }],
            },
            now: 201,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_PROFILE_CONFLICT',
    );

    bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: 'synthreq_alpha_2',
        profileId: registered.profile.profileId,
        policyVersion: 1,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        now: 202,
    });
    assert.throws(
        () => bindSubjectScopedProposalPolicyProfile(request, {
            bindingTargetType: 'SYNTHESIS_REQUEST',
            bindingTargetId: 'synthreq_alpha_2',
            profileId: registered.profile.profileId,
            policyVersion: 1,
            evidenceSetHash: 'sha256:different-evidence',
            now: 203,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_BINDING_CONFLICT',
    );
});

test('binding requires an exact registered profile and expected hash', () => {
    const request = makeRequest();
    assert.throws(
        () => bindSubjectScopedProposalPolicyProfile(request, {
            bindingTargetType: 'SYNTHESIS_REQUEST',
            bindingTargetId: 'synthreq_missing',
            profileId: 'profile:missing:v1',
            policyVersion: 1,
            evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
            now: 300,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_PROFILE_NOT_FOUND',
    );

    const registered = registerSubjectScopedProposalPolicyProfile(request, {
        profile: fixture.profiles.alpha,
        now: 301,
    });
    assert.throws(
        () => bindSubjectScopedProposalPolicyProfile(request, {
            bindingTargetType: 'SYNTHESIS_REQUEST',
            bindingTargetId: 'synthreq_hash_mismatch',
            profileId: registered.profile.profileId,
            policyVersion: 1,
            expectedPolicyHash: 'sha256:stale-policy-hash',
            evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
            now: 302,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_PROFILE_HASH_MISMATCH',
    );
});

test('governed records derive deterministic evaluator facts without prose inference', () => {
    const binding = {
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
    };
    const input = {
        subjectEntityId: 'subject:alpha',
        proposalKind: 'DESIGN_COMMITMENT',
        proposalTrack: 'ARCHITECTURAL_DECISION',
        records: governedRecords(),
    };
    const forward = deriveSubjectScopedProposalFacts(binding, input);
    const reversed = deriveSubjectScopedProposalFacts(binding, { ...input, records: [...input.records].reverse() });

    assert.equal(forward.factsHash, reversed.factsHash);
    assert.equal(forward.sourceRecordsHash, reversed.sourceRecordsHash);
    assert.equal(evaluateSubjectScopedProposalEligibility(fixture.profiles.alpha, forward.facts).verdict, 'ELIGIBLE');
    assert.equal(forward.facts.explicit.recordId, 'fact:explicit');
});

test('fact derivation refuses foreign evidence, ambiguous acknowledgment, and inferred states', () => {
    const binding = { evidenceSetHash: fixture.evidenceFacts.evidenceSetHash };
    const base = {
        subjectEntityId: 'subject:alpha',
        proposalKind: 'DESIGN_COMMITMENT',
        proposalTrack: 'ARCHITECTURAL_DECISION',
    };
    assert.throws(
        () => deriveSubjectScopedProposalFacts(binding, { ...base, records: governedRecords('sha256:foreign') }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_EVIDENCE_MISMATCH',
    );
    assert.throws(
        () => deriveSubjectScopedProposalFacts(binding, {
            ...base,
            records: [...governedRecords(), { ...governedRecords()[4], recordId: 'ack:alpha:duplicate' }],
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_AMBIGUOUS',
    );
    assert.throws(
        () => deriveSubjectScopedProposalFacts(binding, {
            ...base,
            records: [{ ...governedRecords()[0], state: 'MODEL_INFERRED' }],
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_STATE_INVALID',
    );
});

test('immutable fact attestation survives restart and ledger replay', () => {
    const request = makeRequest();
    const registered = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 400 });
    bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: 'synthreq_attested',
        profileId: registered.profile.profileId,
        policyVersion: 1,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        now: 401,
    });
    const created = attestSubjectScopedProposalFacts(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: 'synthreq_attested',
        subjectEntityId: 'subject:alpha',
        proposalKind: 'DESIGN_COMMITMENT',
        proposalTrack: 'ARCHITECTURAL_DECISION',
        records: governedRecords(),
        now: 402,
    });
    assert.equal(created.created, true);
    assert.equal(evaluateSubjectScopedProposalEligibility(fixture.profiles.alpha, created.attestation.facts).verdict, 'ELIGIBLE');
    assert.throws(
        () => attestSubjectScopedProposalFacts(request, {
            bindingTargetType: 'SYNTHESIS_REQUEST',
            bindingTargetId: 'synthreq_attested',
            subjectEntityId: 'subject:alpha',
            proposalKind: 'DESIGN_COMMITMENT',
            proposalTrack: 'ARCHITECTURAL_DECISION',
            records: governedRecords().filter((record) => record.recordType !== 'STABILITY_VERIFICATION'),
            now: 403,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_ATTESTATION_CONFLICT',
    );

    replayInterpretiveLedger(request, { now: 404 });
    assert.deepEqual(
        getSubjectScopedProposalFactAttestation(request, 'SYNTHESIS_REQUEST', 'synthreq_attested'),
        created.attestation,
    );
});

test('bound synthesis request persists an eligible result and replays unchanged', () => {
    const request = makeRequest();
    registerBindAndAttest(request, { targetId: 'synthreq_evaluate_eligible' });
    const result = evaluateBoundSubjectScopedSynthesisRequest(request, {
        bindingTargetId: 'synthreq_evaluate_eligible',
        now: 503,
    });
    assert.equal(result.created, true);
    assert.equal(result.evaluationRecord.evaluation.verdict, 'ELIGIBLE');
    assert.deepEqual(result.evaluationRecord.evaluation.failureCodes, []);

    replayInterpretiveLedger(request, { now: 504 });
    assert.deepEqual(
        getSubjectScopedProposalEligibilityEvaluation(request, 'SYNTHESIS_REQUEST', 'synthreq_evaluate_eligible'),
        result.evaluationRecord,
    );
});

test('bound synthesis request persists truthful ineligibility without admitting anything', () => {
    const request = makeRequest();
    registerBindAndAttest(request, {
        targetId: 'synthreq_evaluate_refused',
        records: governedRecords().filter((record) => record.recordType !== 'STABILITY_VERIFICATION'),
    });
    const result = evaluateBoundSubjectScopedSynthesisRequest(request, {
        bindingTargetId: 'synthreq_evaluate_refused',
        now: 503,
    });
    assert.equal(result.evaluationRecord.evaluation.verdict, 'INELIGIBLE');
    assert.deepEqual(result.evaluationRecord.evaluation.failureCodes, ['STABILITY_NOT_VERIFIED']);
});

test('synthesis request evaluation refuses missing binding and missing attestation', () => {
    const missingRequest = makeRequest();
    assert.throws(
        () => evaluateBoundSubjectScopedSynthesisRequest(missingRequest, { bindingTargetId: 'synthreq_missing', now: 600 }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_BINDING_NOT_FOUND',
    );

    const request = makeRequest();
    const registered = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 601 });
    bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: 'synthreq_missing_attestation',
        profileId: registered.profile.profileId,
        policyVersion: 1,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        now: 602,
    });
    assert.throws(
        () => evaluateBoundSubjectScopedSynthesisRequest(request, { bindingTargetId: 'synthreq_missing_attestation', now: 603 }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_ATTESTATION_NOT_FOUND',
    );
});

test('subject and jurisdiction resolve exactly one assigned policy and survive replay', () => {
    const request = makeRequest();
    const alpha = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 700 }).profile;
    const beta = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.beta, now: 701 }).profile;
    const alphaAssignment = assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:alpha:shared-project',
        assignmentVersion: 1,
        subjectEntityId: alpha.subjectEntityId,
        jurisdictionScopeId: alpha.jurisdictionScopeId,
        profileId: alpha.profileId,
        policyVersion: alpha.policyVersion,
        now: 702,
    });
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:beta:subject',
        assignmentVersion: 1,
        subjectEntityId: beta.subjectEntityId,
        jurisdictionScopeId: beta.jurisdictionScopeId,
        profileId: beta.profileId,
        policyVersion: beta.policyVersion,
        now: 703,
    });

    assert.equal(
        resolveSubjectScopedProposalPolicyAssignment(request, 'subject:alpha', 'scope:shared-project').profile.policyHash,
        alpha.policyHash,
    );
    assert.equal(
        resolveSubjectScopedProposalPolicyAssignment(request, 'subject:beta', 'scope:subject-beta').profile.policyHash,
        beta.policyHash,
    );
    replayInterpretiveLedger(request, { now: 704 });
    assert.deepEqual(
        resolveSubjectScopedProposalPolicyAssignment(request, 'subject:alpha', 'scope:shared-project').assignment,
        alphaAssignment.assignment,
    );
});

test('assignment refuses subject mismatch, a second active policy, and changed immutable content', () => {
    const request = makeRequest();
    const alpha = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 800 }).profile;
    assert.throws(
        () => assignSubjectScopedProposalPolicyProfile(request, {
            assignmentId: 'assignment:mismatch',
            assignmentVersion: 1,
            subjectEntityId: 'subject:wrong',
            jurisdictionScopeId: alpha.jurisdictionScopeId,
            profileId: alpha.profileId,
            policyVersion: 1,
            now: 801,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ASSIGNMENT_PROFILE_MISMATCH',
    );
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:alpha:active',
        assignmentVersion: 1,
        subjectEntityId: alpha.subjectEntityId,
        jurisdictionScopeId: alpha.jurisdictionScopeId,
        profileId: alpha.profileId,
        policyVersion: 1,
        now: 802,
    });
    assert.throws(
        () => assignSubjectScopedProposalPolicyProfile(request, {
            assignmentId: 'assignment:alpha:second',
            assignmentVersion: 1,
            subjectEntityId: alpha.subjectEntityId,
            jurisdictionScopeId: alpha.jurisdictionScopeId,
            profileId: alpha.profileId,
            policyVersion: 1,
            now: 803,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ASSIGNMENT_ACTIVE_CONFLICT',
    );
    registerSubjectScopedProposalPolicyProfile(request, {
        profile: { ...fixture.profiles.alpha, policyVersion: 2 },
        now: 804,
    });
    assert.throws(
        () => assignSubjectScopedProposalPolicyProfile(request, {
            assignmentId: 'assignment:alpha:active',
            assignmentVersion: 1,
            subjectEntityId: alpha.subjectEntityId,
            jurisdictionScopeId: alpha.jurisdictionScopeId,
            profileId: alpha.profileId,
            policyVersion: 2,
            now: 805,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ASSIGNMENT_CONFLICT',
    );
});

test('assignment resolution refuses an unassigned subject jurisdiction', () => {
    const request = makeRequest();
    assert.throws(
        () => resolveSubjectScopedProposalPolicyAssignment(request, 'subject:unassigned', 'scope:none'),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ASSIGNMENT_NOT_FOUND',
    );
});

test('authorized stability and enduring-value declarations are immutable and replayable', () => {
    const request = makeRequest();
    const profile = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 900 }).profile;
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:alpha:declarations', assignmentVersion: 1,
        subjectEntityId: profile.subjectEntityId, jurisdictionScopeId: profile.jurisdictionScopeId,
        profileId: profile.profileId, policyVersion: profile.policyVersion, now: 901,
    });
    const common = {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        declaringEntityId: 'subject:alpha',
    };
    const stability = declareSubjectScopedProposalFact(request, {
        ...common, declarationId: 'declaration:alpha:stability', factType: 'STABILITY', basisRefs: ['msg:101'], now: 902,
    });
    declareSubjectScopedProposalFact(request, {
        ...common, declarationId: 'declaration:alpha:enduring', factType: 'ENDURING_VALUE', basisRefs: ['msg:102'], now: 903,
    });
    assert.equal(stability.created, true);
    assert.equal(listSubjectScopedProposalFactDeclarations(request, {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
    }).length, 2);
    replayInterpretiveLedger(request, { now: 904 });
    assert.equal(listSubjectScopedProposalFactDeclarations(request, {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
    })[0].declarationHash.startsWith('sha256:'), true);
});

test('fact declarations refuse unauthorized actors and changed immutable content', () => {
    const request = makeRequest();
    const profile = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now: 950 }).profile;
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:alpha:declaration-refusal', assignmentVersion: 1,
        subjectEntityId: profile.subjectEntityId, jurisdictionScopeId: profile.jurisdictionScopeId,
        profileId: profile.profileId, policyVersion: 1, now: 951,
    });
    const base = {
        declarationId: 'declaration:alpha:fixed', factType: 'STABILITY',
        subjectEntityId: profile.subjectEntityId, jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT', basisRefs: ['msg:101'],
    };
    assert.throws(
        () => declareSubjectScopedProposalFact(request, { ...base, declaringEntityId: 'user:operator', now: 952 }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_UNAUTHORIZED',
    );
    declareSubjectScopedProposalFact(request, { ...base, declaringEntityId: 'subject:alpha', now: 953 });
    assert.throws(
        () => declareSubjectScopedProposalFact(request, { ...base, declaringEntityId: 'subject:alpha', basisRefs: ['msg:different'], now: 954 }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_FACT_DECLARATION_CONFLICT',
    );
});

function setupAlphaAssignment(request, now = 1000) {
    const profile = registerSubjectScopedProposalPolicyProfile(request, { profile: fixture.profiles.alpha, now }).profile;
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: `assignment:alpha:ack:${now}`, assignmentVersion: 1,
        subjectEntityId: profile.subjectEntityId, jurisdictionScopeId: profile.jurisdictionScopeId,
        profileId: profile.profileId, policyVersion: profile.policyVersion, now: now + 1,
    });
    return profile;
}

test('participant self-acknowledgment is immutable, attributable, and replayable', () => {
    const request = makeRequest();
    const profile = setupAlphaAssignment(request);
    const result = recordSubjectScopedProposalAcknowledgment(request, {
        acknowledgmentId: 'acknowledgment:alpha:self',
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        acknowledgingEntityId: 'subject:alpha',
        acknowledgmentState: 'VERIFIED',
        recordedByEntityId: 'subject:alpha',
        basisRefs: ['msg:101'], now: 1002,
    });
    assert.equal(result.acknowledgment.acknowledgmentState, 'VERIFIED');
    replayInterpretiveLedger(request, { now: 1003 });
    assert.deepEqual(listSubjectScopedProposalAcknowledgments(request, {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
    }), [result.acknowledgment]);
});

test('unavailable acknowledgment records reason and never impersonates consent', () => {
    const request = makeRequest();
    const profile = setupAlphaAssignment(request, 1050);
    const result = recordSubjectScopedProposalAcknowledgment(request, {
        acknowledgmentId: 'acknowledgment:alpha:unavailable',
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        acknowledgingEntityId: 'subject:alpha',
        acknowledgmentState: 'UNAVAILABLE',
        recordedByEntityId: 'user:operator',
        unavailableReason: 'Subject cannot currently participate.',
        basisRefs: ['record:availability-check'], now: 1052,
    });
    assert.equal(result.acknowledgment.acknowledgmentState, 'UNAVAILABLE');
    assert.equal(result.acknowledgment.recordedByEntityId, 'user:operator');
    assert.equal(result.acknowledgment.unavailableReason, 'Subject cannot currently participate.');
    const mapped = buildSubjectScopedAcknowledgmentFactRecords([result.acknowledgment], {
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        policyHash: profile.policyHash,
    });
    const derived = deriveSubjectScopedProposalFacts(
        { evidenceSetHash: fixture.evidenceFacts.evidenceSetHash },
        {
            subjectEntityId: 'subject:alpha', proposalKind: 'DESIGN_COMMITMENT', proposalTrack: 'ARCHITECTURAL_DECISION',
            records: [
                ...governedRecords().filter((entry) => !(entry.recordType === 'ACKNOWLEDGMENT' && entry.entityId === 'subject:alpha')),
                ...mapped,
            ],
        },
    );
    const evaluation = evaluateSubjectScopedProposalEligibility(fixture.profiles.alpha, derived.facts);
    assert.equal(evaluation.provisional, true);
    assert.deepEqual(evaluation.failureCodes, ['REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE']);
});

test('acknowledgment refuses impersonation, unauthorized unavailability, and duplicate participant state', () => {
    const request = makeRequest();
    const profile = setupAlphaAssignment(request, 1100);
    const base = {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT', acknowledgingEntityId: 'subject:alpha', basisRefs: ['msg:101'],
    };
    assert.throws(
        () => recordSubjectScopedProposalAcknowledgment(request, {
            ...base, acknowledgmentId: 'ack:impersonated', acknowledgmentState: 'VERIFIED', recordedByEntityId: 'user:operator', now: 1102,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_UNAUTHORIZED',
    );
    assert.throws(
        () => recordSubjectScopedProposalAcknowledgment(request, {
            ...base, acknowledgmentId: 'ack:unavailable-unauthorized', acknowledgmentState: 'UNAVAILABLE',
            recordedByEntityId: 'subject:alpha', unavailableReason: 'Unavailable.', now: 1103,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_UNAUTHORIZED',
    );
    recordSubjectScopedProposalAcknowledgment(request, {
        ...base, acknowledgmentId: 'ack:fixed', acknowledgmentState: 'VERIFIED', recordedByEntityId: 'subject:alpha', now: 1104,
    });
    assert.throws(
        () => recordSubjectScopedProposalAcknowledgment(request, {
            ...base, acknowledgmentId: 'ack:duplicate', acknowledgmentState: 'VERIFIED', recordedByEntityId: 'subject:alpha', now: 1105,
        }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_AMBIGUOUS',
    );
});

test('operator status explains unconfigured and configured subject scopes without hashes', () => {
    const request = makeRequest();
    const missing = getSubjectScopedPolicyOperatorStatus(request, {
        subjectEntityId: 'subject:alpha', jurisdictionScopeId: 'scope:shared-project',
    });
    assert.equal(missing.configured, false);
    assert.match(missing.nextAction, /Set up a subject policy/u);
    setupAlphaAssignment(request, 1200);
    const configured = getSubjectScopedPolicyOperatorStatus(request, {
        subjectEntityId: 'subject:alpha', jurisdictionScopeId: 'scope:shared-project',
    });
    assert.equal(configured.configured, true);
    assert.deepEqual(configured.permittedProposalKinds, ['DESIGN_COMMITMENT']);
    assert.equal(JSON.stringify(configured).includes('sha256:'), false);
});

test('operator synthesis status explains eligible and provisional lifecycle states', () => {
    const eligibleRequest = makeRequest();
    registerBindAndAttest(eligibleRequest, { targetId: 'synthreq_status_eligible' });
    evaluateBoundSubjectScopedSynthesisRequest(eligibleRequest, { bindingTargetId: 'synthreq_status_eligible', now: 1300 });
    const eligible = getSubjectScopedSynthesisOperatorStatus(eligibleRequest, 'synthreq_status_eligible');
    assert.equal(eligible.eligible, true);
    assert.equal(eligible.nextAction, 'Open the proposal in Review.');
    assert.deepEqual(eligible.missingRequirements, []);

    const provisionalRequest = makeRequest();
    const unavailableRecords = governedRecords().map((entry) => (
        entry.recordType === 'ACKNOWLEDGMENT' && entry.entityId === 'subject:alpha'
            ? { ...entry, state: 'UNAVAILABLE' }
            : entry
    ));
    registerBindAndAttest(provisionalRequest, {
        targetId: 'synthreq_status_provisional', records: unavailableRecords,
    });
    evaluateBoundSubjectScopedSynthesisRequest(provisionalRequest, { bindingTargetId: 'synthreq_status_provisional', now: 1301 });
    const provisional = getSubjectScopedSynthesisOperatorStatus(provisionalRequest, 'synthreq_status_provisional');
    assert.equal(provisional.eligible, false);
    assert.equal(provisional.provisional, true);
    assert.deepEqual(provisional.missingParticipantEntityIds, ['subject:alpha']);
    assert.match(provisional.missingRequirements[0], /currently unavailable/u);
    assert.match(provisional.nextAction, /Keep the proposal provisional/u);
    assert.equal(JSON.stringify(provisional).includes('REQUIRED_ACKNOWLEDGMENT_UNAVAILABLE'), false);
});

test('authenticated account binding is administrative, immutable, one-to-one, and replayable', () => {
    const request = makeAuthenticatedRequest('Chris', { admin: true });
    const created = bindAuthenticatedAccountToSemanticEntity(request, {
        accountHandle: 'Chris', semanticEntityId: 'user:Chris', now: 1400,
    });
    assert.equal(created.created, true);
    assert.equal(resolveAuthenticatedSemanticEntity(request).semanticEntityId, 'user:Chris');
    assert.equal(bindAuthenticatedAccountToSemanticEntity(request, {
        accountHandle: 'chris', semanticEntityId: 'user:Chris', now: 1401,
    }).created, false);
    assert.throws(
        () => bindAuthenticatedAccountToSemanticEntity(request, {
            accountHandle: 'chris', semanticEntityId: 'character:Jeep', now: 1402,
        }),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_BINDING_CONFLICT',
    );
    assert.throws(
        () => bindAuthenticatedAccountToSemanticEntity(request, {
            accountHandle: 'other', semanticEntityId: 'user:Chris', now: 1403,
        }),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_IMPERSONATION_REFUSED',
    );
    replayInterpretiveLedger(request, { now: 1404 });
    assert.deepEqual(resolveAuthenticatedSemanticEntity(request), created.binding);

    const nonAdmin = makeAuthenticatedRequest('other');
    assert.throws(
        () => bindAuthenticatedAccountToSemanticEntity(nonAdmin, {
            accountHandle: 'other', semanticEntityId: 'user:Other', now: 1405,
        }),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_BINDING_ADMIN_REQUIRED',
    );
});

test('ordinary governed actions derive the actor from authentication and refuse impersonation or unbound accounts', () => {
    const request = makeAuthenticatedRequest('alpha-admin', { admin: true });
    bindAuthenticatedAccountToSemanticEntity(request, {
        accountHandle: 'alpha-admin', semanticEntityId: 'subject:alpha', now: 1500,
    });
    const profile = setupAlphaAssignment(request, 1510);
    const base = {
        subjectEntityId: profile.subjectEntityId,
        jurisdictionScopeId: profile.jurisdictionScopeId,
        evidenceSetHash: fixture.evidenceFacts.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        basisRefs: ['msg:101'],
    };
    const declaration = declareSubjectScopedProposalFactAsAuthenticatedAccount(request, {
        ...base, declarationId: 'declaration:authenticated', factType: 'STABILITY', now: 1512,
    });
    assert.equal(declaration.declaration.declaringEntityId, 'subject:alpha');
    const acknowledgment = recordSubjectScopedProposalAcknowledgmentAsAuthenticatedAccount(request, {
        ...base, acknowledgmentId: 'acknowledgment:authenticated', acknowledgmentState: 'VERIFIED', now: 1513,
    });
    assert.equal(acknowledgment.acknowledgment.recordedByEntityId, 'subject:alpha');
    assert.equal(acknowledgment.acknowledgment.acknowledgingEntityId, 'subject:alpha');
    assert.throws(
        () => declareSubjectScopedProposalFactAsAuthenticatedAccount(request, {
            ...base, declarationId: 'declaration:impersonated', factType: 'ENDURING_VALUE',
            declaringEntityId: 'character:Jeep', now: 1514,
        }),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_IMPERSONATION_REFUSED',
    );
    const unbound = makeAuthenticatedRequest('unbound', { root: request.user.directories.root });
    assert.throws(
        () => recordSubjectScopedProposalAcknowledgmentAsAuthenticatedAccount(unbound, {
            ...base, acknowledgmentId: 'acknowledgment:unbound', acknowledgmentState: 'VERIFIED', now: 1515,
        }),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_BINDING_REQUIRED',
    );
});

test('operator status exposes only authenticated permitted actions and action commands record them server-side', () => {
    const request = makeAuthenticatedRequest('alpha-actions', { admin: true });
    bindAuthenticatedAccountToSemanticEntity(request, {
        accountHandle: 'alpha-actions', semanticEntityId: 'subject:alpha', now: 1600,
    });
    setupAlphaAssignment(request, 1601);
    const records = governedRecords().filter((entry) => ![
        'STABILITY_VERIFICATION',
        'ENDURING_VALUE_VERIFICATION',
    ].includes(entry.recordType) && !(entry.recordType === 'ACKNOWLEDGMENT' && entry.entityId === 'subject:alpha'));
    registerBindAndAttest(request, { targetId: 'synthreq_actions', records });
    evaluateBoundSubjectScopedSynthesisRequest(request, { bindingTargetId: 'synthreq_actions', now: 1603 });

    const status = getSubjectScopedSynthesisOperatorStatus(request, 'synthreq_actions');
    assert.deepEqual(status.permittedActions.map((entry) => entry.action), [
        'CONFIRM_STABILITY',
        'CONFIRM_ENDURING_VALUE',
        'ACKNOWLEDGE',
    ]);
    const stability = performAuthenticatedSubjectPolicySynthesisAction(
        request,
        'synthreq_actions',
        'CONFIRM_STABILITY',
        { now: 1604 },
    );
    assert.equal(stability.declaration.declaringEntityId, 'subject:alpha');
    const acknowledgment = performAuthenticatedSubjectPolicySynthesisAction(
        request,
        'synthreq_actions',
        'ACKNOWLEDGE',
        { now: 1605 },
    );
    assert.equal(acknowledgment.acknowledgment.recordedByEntityId, 'subject:alpha');

    const unbound = makeAuthenticatedRequest('unbound-actions', { root: request.user.directories.root });
    assert.deepEqual(
        getSubjectScopedSynthesisOperatorStatus(unbound, 'synthreq_actions').permittedActions,
        [],
    );
    assert.throws(
        () => performAuthenticatedSubjectPolicySynthesisAction(unbound, 'synthreq_actions', 'ACKNOWLEDGE'),
        (error) => error.code === 'ARCH_AUTHENTICATED_ENTITY_BINDING_REQUIRED',
    );
});
