import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getStoragePaths, openOperationalDatabase } from './core.js';
import {
    bootstrapStandardInterpretivePublicationPolicy,
    createInterpretiveProposalFromArchitecturalShard,
    createInterpretivePublicationAuthorization,
    executeInterpretiveSynthesisRun,
    executeInterpretivePublicationAuthorization,
    createInterpretiveSynthesisRun,
    createInterpretiveCandidate,
    createInterpretiveRevision,
    getCurrentActiveDnmRecord,
    getInterpretiveCandidate,
    getInterpretivePublicationOperatorState,
    getInterpretiveSynthesisRun,
    listInterpretiveDelegationPolicies,
    listDnmPublicationRecords,
    listInterpretivePublicationPolicies,
    listInterpretivePolicyDefinitions,
    listInterpretiveSynthesisPolicies,
    listInterpretiveReviews,
    prepareInterpretiveCandidate,
    qualifyInterpretivePublication,
    publishInterpretiveMemory,
    recordDnmDeltaReview,
    recordInterpretiveSubjectDisposition,
    replayPublicationLedger,
    replayInterpretiveLedger,
    revokeInterpretiveDelegationPolicy,
    revokeInterpretivePublicationPolicy,
    supersedeDnmPublicationRecord,
    submitInterpretiveReviewDisposition,
    withdrawDnmPublicationRecord,
    upsertInterpretiveDelegationPolicy,
    upsertInterpretivePublicationPolicy,
    upsertInterpretiveSynthesisPolicy,
} from './interpretive.js';
import {
    assignSubjectScopedProposalPolicyProfile,
    attestSubjectScopedProposalFacts,
    bindSubjectScopedProposalPolicyProfile,
    declareSubjectScopedProposalFact,
    evaluateBoundSubjectScopedSynthesisRequest,
    getSubjectScopedProposalEligibilityEvaluation,
    getSubjectScopedProposalFactAttestation,
    getSubjectScopedProposalPolicyBinding,
    recordSubjectScopedProposalAcknowledgment,
    registerSubjectScopedProposalPolicyProfile,
} from './subject-scoped-proposal-policy.js';

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-interpretive-'));
}

function buildRequest(root, overrides = {}) {
    return {
        user: {
            directories: {
                root,
                chats: path.join(root, 'chats'),
                groupChats: path.join(root, 'group chats'),
            },
        },
        body: {},
        query: {},
        params: {},
        ...overrides,
    };
}

function writeCharacterChatJsonl(root, avatarUrl, chatLocator, records) {
    const avatarDir = String(avatarUrl || '').replace(/\.png$/iu, '');
    const chatDir = path.join(root, 'chats', avatarDir);
    fs.mkdirSync(chatDir, { recursive: true });
    fs.writeFileSync(
        path.join(chatDir, `${chatLocator}.jsonl`),
        `${records.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
        'utf8',
    );
}

function makeBasePayload(overrides = {}) {
    const payload = {
        interpretationId: 'interp_jeep_arch_authority',
        interpretationRevisionId: 'interprev_jeep_arch_authority_v1',
        revisionReason: 'INITIAL_PROPOSAL',
        memoryScopeId: 'scope_alpha',
        memorySubjectId: 'character:jeep.png',
        type: 'ROLE_EVOLUTION',
        statement: 'Jeep evolved from an analytical role into the primary architectural authority for the extension design.',
        assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipAsserted: true,
        personalMeaningAsserted: true,
        materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
        groundingLinks: [
            {
                basisType: 'STRUCTURAL_RECORD',
                basisRecordId: 'decision:architectural-sharder-fork',
                basisRecordVersion: 1,
                basisRecordHash: 'sha256:decision-fork',
                speakerEntityId: 'character:jeep.png',
                groundingRole: 'PRIMARY',
                groundingAssessment: 'SUPPORTS',
            },
            {
                basisType: 'SOURCE_OCCURRENCE',
                chatInstanceId: 'chat_alpha',
                messageId: 'msg_alpha0000000000000000000000000',
                messageRevisionHash: 'sha256:msg-alpha',
                speakerEntityId: 'user:Chris',
                groundingRole: 'SUPPORTING',
                groundingAssessment: 'SUPPORTS',
            },
        ],
        now: Date.parse('2026-06-25T12:00:00.000Z'),
        ...overrides,
    };
    if (!Object.prototype.hasOwnProperty.call(overrides, 'evidenceFindings')) {
        const reviewableEvidence = makeSourceOccurrenceEvidenceEnvelope();
        payload.evidenceFindings = reviewableEvidence.evidenceFindings;
        payload.evidenceEnvelopeVersion = reviewableEvidence.evidenceEnvelopeVersion;
        payload.evidencePreviews = reviewableEvidence.evidencePreviews;
    }
    return payload;
}

function makeEvidenceFindings(overrides = {}) {
    return [
        {
            findingId: 'evfind_jeep_authority_primary',
            role: 'PRIMARY',
            summary: 'Jeep established primary architectural authority over the extension design.',
            basisRefs: [
                'decision:architectural-sharder-fork',
                'msg_alpha0000000000000000000000000',
            ],
            sourceLabel: 'Jeep, architectural memory record, June 2026',
            domains: ['AUTHORITY', 'ROLE'],
            supportLevel: 'SUPPORTED',
            ...overrides,
        },
    ];
}

function makeSourceOccurrenceEvidenceEnvelope(overrides = {}) {
    return {
        groundingLinks: [
            {
                basisType: 'SOURCE_OCCURRENCE',
                chatInstanceId: 'chat_alpha',
                messageId: 'msg_alpha0000000000000000000000000',
                messageRevisionHash: 'sha256:msg-alpha',
                speakerEntityId: 'user:Chris',
                groundingRole: 'PRIMARY',
                groundingAssessment: 'SUPPORTS',
            },
        ],
        evidenceFindings: makeEvidenceFindings({
            basisRefs: ['msg_alpha0000000000000000000000000'],
            sourceLabel: 'Chris, source chat excerpt',
        }),
        evidenceEnvelopeVersion: 1,
        evidencePreviews: [
            {
                basisType: 'SOURCE_OCCURRENCE',
                basisRef: 'msg_alpha0000000000000000000000000',
                sourceLabel: 'Chris, source chat excerpt',
                speakerLabel: 'Chris',
                contextLabel: 'Architecture discussion',
                previewKind: 'MESSAGE_EXCERPT',
                previewContent: {
                    text: 'Jeep is the primary architectural authority for the extension design.',
                },
                messageRevisionHash: 'sha256:msg-alpha',
            },
        ],
        ...overrides,
    };
}

function makeStructuralEvidenceEnvelope(overrides = {}) {
    return {
        groundingLinks: [
            {
                basisType: 'STRUCTURAL_RECORD',
                basisRecordId: 'decision:architectural-sharder-fork',
                basisRecordVersion: 1,
                basisRecordHash: 'sha256:decision-fork',
                speakerEntityId: 'character:jeep.png',
                groundingRole: 'PRIMARY',
                groundingAssessment: 'SUPPORTS',
            },
        ],
        evidenceFindings: makeEvidenceFindings({
            basisRefs: ['decision:architectural-sharder-fork'],
            sourceLabel: 'Architectural sharder fork decision',
        }),
        evidenceEnvelopeVersion: 1,
        evidencePreviews: [
            {
                basisType: 'STRUCTURAL_RECORD',
                basisRef: 'decision:architectural-sharder-fork',
                sourceRevisionIdentity: {
                    recordVersion: 1,
                    recordHash: 'sha256:decision-fork',
                },
                sourceLabel: 'Architectural sharder fork decision',
                speakerLabel: 'Jeep',
                contextLabel: 'Architecture decision record',
                previewKind: 'STRUCTURAL_FIELDS',
                previewContent: {
                    fields: [
                        { label: 'Decision', value: 'Jeep holds primary architectural authority for the extension design.' },
                        { label: 'Status', value: 'Accepted' },
                    ],
                },
            },
        ],
        ...overrides,
    };
}

function makeSavedShardEvidenceEnvelope(overrides = {}) {
    const envelope = makeStructuralEvidenceEnvelope();
    envelope.evidencePreviews = [
        {
            basisType: 'STRUCTURAL_RECORD',
            sourceArtifactClass: 'SAVED_SHARD',
            basisRef: 'decision:architectural-sharder-fork',
            sourceRevisionIdentity: {
                recordVersion: 1,
                recordHash: 'sha256:decision-fork',
                shardArtifactId: 'shard_architectural_checkpoint_291',
                shardRevisionHash: 'sha256:shard-checkpoint-291',
            },
            sourceLabel: 'Architectural shard at message 291',
            speakerLabel: 'Jeep',
            contextLabel: 'DECISIONS section, messages 270-290',
            previewKind: 'SHARD_EXCERPT',
            previewContent: {
                text: 'Jeep holds primary architectural authority for the extension design.',
                sectionLabel: 'DECISIONS',
                sourceRange: { startIndex: 270, endIndex: 290 },
            },
        },
    ];
    return { ...envelope, ...overrides };
}

function comparableInterpretationProjection(value) {
    return {
        interpretationRevisionId: value.interpretationRevisionId,
        interpretationId: value.interpretationId,
        parentRevisionId: value.parentRevisionId,
        createdFromDispositionId: value.createdFromDispositionId,
        revisionReason: value.revisionReason,
        memoryScopeId: value.memoryScopeId,
        memorySubjectId: value.memorySubjectId,
        type: value.type,
        statement: value.statement,
        assertionDomains: value.assertionDomains,
        sharedRelationshipAsserted: value.sharedRelationshipAsserted,
        personalMeaningAsserted: value.personalMeaningAsserted,
        materialParticipantEntityIds: value.materialParticipantEntityIds,
        candidateState: value.candidateState,
        groundingState: value.groundingState,
        evidenceFindingState: value.evidenceFindingState,
        reviewState: value.reviewState,
        subjectDispositionState: value.subjectDispositionState,
        publicationState: value.publicationState,
        authorityEffect: value.authorityEffect,
        proposalContentHash: value.proposalContentHash,
        reviewEnvelopeHash: value.reviewEnvelopeHash,
        groundingLinks: value.groundingLinks,
        evidenceFindings: value.evidenceFindings || [],
        evidenceEnvelopeVersion: value.evidenceEnvelopeVersion ?? null,
        evidenceInspectabilityState: value.evidenceInspectabilityState || 'LEGACY_UNAVAILABLE',
        evidencePreviews: value.evidencePreviews || [],
        groundingAggregate: value.groundingAggregate,
        risk: value.risk,
        policyBinding: value.policyBinding,
        reviewObligations: value.reviewObligations,
        reviewRequests: value.reviewRequests,
        reviewDispositions: value.reviewDispositions,
        subjectDisposition: value.subjectDisposition,
        childRevisionIds: value.childRevisionIds,
        revisionCreationProvenance: value.revisionCreationProvenance,
    };
}

function comparableSynthesisPolicyProjection(value) {
    return {
        synthesisPolicyId: value.synthesisPolicyId,
        policyVersion: value.policyVersion,
        memorySubjectId: value.memorySubjectId,
        enabled: value.enabled,
        allowedTypes: value.allowedTypes,
        allowedAssertionDomains: value.allowedAssertionDomains,
        prohibitedDomains: value.prohibitedDomains,
        manualTriggerRequiredForHighRisk: value.manualTriggerRequiredForHighRisk,
        maxCandidatesPerRun: value.maxCandidatesPerRun,
        policyHash: value.policyHash,
        details: value.details,
    };
}

function comparableSynthesisRunProjection(value) {
    return {
        synthesisRunId: value.synthesisRunId,
        memoryScopeId: value.memoryScopeId,
        memorySubjectId: value.memorySubjectId,
        synthesisPolicyId: value.synthesisPolicyId,
        policyVersion: value.policyVersion,
        policyHash: value.policyHash,
        sourceManifestId: value.sourceManifestId,
        sourceManifestHash: value.sourceManifestHash,
        sourceManifest: value.sourceManifest,
        modelProviderId: value.modelProviderId,
        promptVersion: value.promptVersion,
        promptHash: value.promptHash,
        generationConfigHash: value.generationConfigHash,
        requestedInterpretationTypes: value.requestedInterpretationTypes,
        requestedAssertionDomains: value.requestedAssertionDomains,
        sharedRelationshipRequested: value.sharedRelationshipRequested,
        personalMeaningRequested: value.personalMeaningRequested,
        maxCandidatesRequested: value.maxCandidatesRequested,
        generatedCandidateIds: value.generatedCandidateIds,
        runStatus: value.runStatus,
        failureCode: value.failureCode,
        failureDetails: value.failureDetails,
        createdByEntityId: value.createdByEntityId,
        manualTriggerAcknowledged: value.manualTriggerAcknowledged,
        proposals: value.proposals.map((proposal) => ({
            synthesisProposalId: proposal.synthesisProposalId,
            synthesisRunId: proposal.synthesisRunId,
            interpretationRevisionId: proposal.interpretationRevisionId,
            proposalStatus: proposal.proposalStatus,
            proposalContentHash: proposal.proposalContentHash,
            proposalPayload: proposal.proposalPayload,
            quarantineCode: proposal.quarantineCode,
            quarantineDetails: proposal.quarantineDetails,
            groundingEvaluation: proposal.groundingEvaluation,
        })),
    };
}

function makeSynthesisPolicyPayload(overrides = {}) {
    return {
        synthesisPolicyId: 'jeep-developmental-synthesis-v1',
        policyVersion: 1,
        memorySubjectId: 'character:jeep.png',
        enabled: true,
        allowedTypes: ['ROLE_EVOLUTION', 'PROJECT_TRANSFORMATION', 'RELATIONAL_PROGRESSION'],
        allowedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        prohibitedDomains: [],
        manualTriggerRequiredForHighRisk: true,
        maxCandidatesPerRun: 3,
        now: Date.parse('2026-06-26T00:00:00.000Z'),
        ...overrides,
    };
}

function makeSynthesisRunPayload(overrides = {}) {
    return {
        synthesisRunId: 'synthrun_scope_alpha_v1',
        memoryScopeId: 'scope_alpha',
        memorySubjectId: 'character:jeep.png',
        synthesisPolicyId: 'jeep-developmental-synthesis-v1',
        requestedInterpretationTypes: ['ROLE_EVOLUTION'],
        requestedAssertionDomains: ['ROLE', 'AUTHORITY'],
        sharedRelationshipRequested: false,
        personalMeaningRequested: false,
        maxCandidatesRequested: 2,
        manualTriggerAcknowledged: true,
        createdByEntityId: 'user:Chris',
        sourceManifestEntries: [
            {
                sourceClass: 'STRUCTURAL_RECORD',
                memoryScopeId: 'scope_alpha',
                basisRecordId: 'decision:constitutional-sovereignty',
                basisRecordVersion: 1,
                basisRecordHash: 'sha256:constitutional-sovereignty',
                speakerEntityId: 'character:jeep.png',
            },
            {
                sourceClass: 'SOURCE_OCCURRENCE',
                memoryScopeId: 'scope_alpha',
                chatInstanceId: 'chat_alpha',
                messageId: 'msg_alpha0000000000000000000000000',
                messageRevisionHash: 'sha256:msg-alpha',
                speakerEntityId: 'user:Chris',
            },
        ],
        now: Date.parse('2026-06-26T00:05:00.000Z'),
        ...overrides,
    };
}

function bindSubjectScopedAdmission(request, synthesisRun, { includeStability = true, evaluate = true } = {}) {
    const profile = registerSubjectScopedProposalPolicyProfile(request, {
        profile: {
            schemaVersion: 1,
            profileId: 'profile:jeep:admission:v1',
            policyVersion: 1,
            jurisdictionScopeId: synthesisRun.memoryScopeId,
            subjectEntityId: synthesisRun.memorySubjectId,
            rules: [{
                proposalKind: 'DESIGN_COMMITMENT',
                proposalTrack: 'ARCHITECTURAL_DECISION',
                requiredAcknowledgmentEntityIds: [synthesisRun.memorySubjectId],
                governanceValidationRequired: false,
                unavailableReviewerBehavior: 'BLOCK_PROVISIONAL',
            }],
        },
        now: Date.parse('2026-06-26T00:05:10.000Z'),
    }).profile;
    bindSubjectScopedProposalPolicyProfile(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: synthesisRun.synthesisRunId,
        profileId: profile.profileId,
        policyVersion: profile.policyVersion,
        expectedPolicyHash: profile.policyHash,
        evidenceSetHash: synthesisRun.sourceManifestHash,
        now: Date.parse('2026-06-26T00:05:20.000Z'),
    });
    const base = { evidenceSetHash: synthesisRun.sourceManifestHash, state: 'VERIFIED' };
    const records = [
        { ...base, recordId: 'fact:explicit', recordType: 'EXPLICITNESS_VERIFICATION', basisRefs: ['msg_alpha0000000000000000000000000'] },
        { ...base, recordId: 'fact:grounding', recordType: 'GROUNDING_VERIFICATION', basisRefs: ['msg_alpha0000000000000000000000000'] },
        { ...base, recordId: 'fact:enduring', recordType: 'ENDURING_VALUE_VERIFICATION', basisRefs: ['decision:constitutional-sovereignty'] },
        { ...base, recordId: 'ack:jeep', recordType: 'ACKNOWLEDGMENT', entityId: synthesisRun.memorySubjectId, basisRefs: ['msg_alpha0000000000000000000000000'] },
    ];
    if (includeStability) records.push({ ...base, recordId: 'fact:stability', recordType: 'STABILITY_VERIFICATION', basisRefs: ['decision:constitutional-sovereignty'] });
    attestSubjectScopedProposalFacts(request, {
        bindingTargetType: 'SYNTHESIS_REQUEST',
        bindingTargetId: synthesisRun.synthesisRunId,
        subjectEntityId: synthesisRun.memorySubjectId,
        proposalKind: 'DESIGN_COMMITMENT',
        proposalTrack: 'ARCHITECTURAL_DECISION',
        records,
        now: Date.parse('2026-06-26T00:05:30.000Z'),
    });
    if (evaluate) {
        return evaluateBoundSubjectScopedSynthesisRequest(request, {
            bindingTargetId: synthesisRun.synthesisRunId,
            now: Date.parse('2026-06-26T00:05:40.000Z'),
        });
    }
    return null;
}

function makeDelegationPolicyPayload(overrides = {}) {
    return {
        delegationPolicyId: 'jeep-chris-continuity-delegation',
        policyVersion: 1,
        principalEntityId: 'character:jeep.png',
        delegateEntityId: 'user:Chris',
        allowedActions: ['REVIEW_DISPOSITION', 'SUBJECT_REVISION', 'SUBJECT_DISPOSITION'],
        memoryScopeId: 'scope_alpha',
        continuityTargetId: 'character:jeep.png',
        evidenceRequirement: 'OPTIONAL',
        revocable: true,
        now: Date.parse('2026-06-25T12:04:00.000Z'),
        ...overrides,
    };
}

function makePublicationPolicyPayload(overrides = {}) {
    return {
        publicationPolicyId: 'dnm-publication-v1',
        policyVersion: 1,
        continuityTargetType: 'MEMORY_SUBJECT',
        subjectIdentityMode: 'EXACT_SUBJECT',
        permittedInterpretationTypes: ['ROLE_EVOLUTION', 'RELATIONAL_PROGRESSION'],
        requiredFinalSubjectState: 'GRANTED',
        requiredGroundingOutcome: 'SUPPORTED',
        participantDisagreementBlocksPublication: true,
        contestOrDeferBlocksPublication: true,
        immutableChildRequiredForTypes: ['ROLE_EVOLUTION'],
        postGrantHumanPublicationAuthorizationRequired: true,
        details: {
            policyClass: 'dnm-publication-v1',
            description: 'Read-only publication qualification contract for governed DNM publication.',
        },
        now: Date.parse('2026-06-26T00:10:00.000Z'),
        ...overrides,
    };
}

test('architectural shard proposal creation backfills the shard manifest from persisted output when header metadata is missing', async () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const avatarUrl = 'jeep.png';
    const chatLocator = 'architectural-proposal-launch';
    const header = {
        chat_metadata: {
            shardwright: {
                architecturalMemoryBinding: {
                    memoryScopeId: 'scope_arch',
                    chatInstanceId: 'chat_arch',
                },
                shardManifests: [],
            },
        },
    };
    const sourceMessageA = {
        name: 'Chris',
        mes: 'We need deterministic proposal creation from saved architectural shards.',
        send_date: 'src_send_a',
        extra: {
            shardwright: {
                messageIdentity: {
                    messageId: 'msg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    revisionHash: 'sha256:src-a',
                },
                speakerIdentity: {
                    speakerEntityId: 'user:Chris',
                },
            },
        },
    };
    const sourceMessageB = {
        name: 'Jeep',
        mes: 'The governed proposal should open directly from the saved shard.',
        send_date: 'src_send_b',
        extra: {
            shardwright: {
                messageIdentity: {
                    messageId: 'msg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                    revisionHash: 'sha256:src-b',
                },
                speakerIdentity: {
                    speakerEntityId: 'character:jeep.png',
                },
            },
        },
    };
    const shardMessage = {
        name: 'system',
        mes: '[MEMORY SHARD: Messages 0-1]\n\n[DECISIONS]\n[S0:1] ID:jeep-continuity-authority | TYPE:GOVERNANCE | DECISION:Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris. | WHY:The shared work assigned Jeep continuing architectural responsibility. | SCOPE:continuity architecture | STATUS:ACCEPTED | EVIDENCE:[REF: S1:1]\n',
        send_date: 'out_send_arch',
        extra: {
            shardwright: {
                messageIdentity: {
                    messageId: 'msg_cccccccccccccccccccccccccccccccc',
                    revisionHash: 'sha256:out-c',
                },
                speakerIdentity: {
                    speakerEntityId: 'system:summary-sharder',
                },
            },
        },
    };
    writeCharacterChatJsonl(root, avatarUrl, chatLocator, [
        header,
        sourceMessageA,
        sourceMessageB,
        shardMessage,
    ]);

    const result = await createInterpretiveProposalFromArchitecturalShard(request, {
        avatarUrl,
        chatLocator,
        shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
        memoryScopeId: 'scope_arch',
        memorySubjectId: 'character:jeep.png',
        createdByEntityId: 'user:Chris',
        synthesisRunId: 'synthrun_arch_launch',
        synthesisProposalId: 'synthproposal_arch_launch',
        interpretationId: 'interp_arch_launch',
        interpretationRevisionId: 'interprev_arch_launch_v1',
        now: Date.parse('2026-07-11T12:00:00.000Z'),
    });

    assert.equal(result.ok, true);
    assert.equal(result.sourceKind, 'persisted-architectural-shard');
    assert.equal(result.admitted, true);
    assert.equal(result.interpretation.interpretationRevisionId, 'interprev_arch_launch_v1');
    assert.equal(
        result.interpretation.statement,
        'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
    );
    assert.deepEqual(result.interpretation.assertionDomains, ['AUTHORITY', 'RELATIONSHIP', 'ROLE']);
    assert.equal(result.interpretation.sharedRelationshipAsserted, true);
    assert.equal(result.interpretation.personalMeaningAsserted, false);
    assert.deepEqual(result.interpretation.materialParticipantEntityIds, ['character:jeep.png', 'user:Chris']);
    assert.equal(
        result.synthesisRun.sourceManifest.sourceManifestEntries.some((entry) => entry.sourceClass === 'STRUCTURAL_RECORD' && entry.basisRecordId === 'decision:jeep-continuity-authority'),
        true,
    );
    assert.equal(
        result.synthesisRun.sourceManifest.sourceManifestEntries.filter((entry) => entry.sourceClass === 'SOURCE_OCCURRENCE').length,
        2,
    );
    assert.equal(result.synthesisRun.sourceManifestHash.startsWith('sha256:'), true);
    assert.equal(result.interpretation.evidenceFindingState, 'AVAILABLE');
    assert.deepEqual(result.interpretation.evidenceFindings, [
        {
            findingId: result.interpretation.evidenceFindings[0].findingId,
            role: 'PRIMARY',
            summary: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
            basisRefs: ['decision:jeep-continuity-authority', 'msg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'msg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
            sourceLabel: 'Architectural shard decision jeep-continuity-authority',
            domains: ['AUTHORITY', 'RELATIONSHIP', 'ROLE'],
            supportLevel: 'SUPPORTED',
            createdAt: result.interpretation.evidenceFindings[0].createdAt,
            updatedAt: result.interpretation.evidenceFindings[0].updatedAt,
        },
    ]);
    assert.equal(result.interpretation.evidenceEnvelopeVersion, 1);
    assert.equal(result.interpretation.evidenceInspectabilityState, 'VERIFIED');
    assert.equal(result.interpretation.evidencePreviews.length, 3);
    const shardPreview = result.interpretation.evidencePreviews.find((entry) => entry.sourceArtifactClass === 'SAVED_SHARD');
    assert.equal(shardPreview.previewKind, 'SHARD_EXCERPT');
    assert.equal(shardPreview.previewContent.sectionLabel, 'DECISIONS');
    assert.deepEqual(shardPreview.previewContent.sourceRange, { startIndex: 0, endIndex: 1 });
    assert.match(shardPreview.previewContent.text, /ID:jeep-continuity-authority/u);
    const messagePreviews = result.interpretation.evidencePreviews.filter((entry) => entry.sourceArtifactClass === 'MESSAGE');
    assert.deepEqual(
        messagePreviews.map((entry) => entry.previewContent.text).sort(),
        [
            'The governed proposal should open directly from the saved shard.',
            'We need deterministic proposal creation from saved architectural shards.',
        ].sort(),
    );

    const assignedProfile = registerSubjectScopedProposalPolicyProfile(request, {
        profile: {
            schemaVersion: 1,
            profileId: 'profile:jeep:scope-arch:v1',
            policyVersion: 1,
            jurisdictionScopeId: 'scope_arch',
            subjectEntityId: 'character:jeep.png',
            rules: [{
                proposalKind: 'DESIGN_COMMITMENT',
                proposalTrack: 'ARCHITECTURAL_DECISION',
                requiredAcknowledgmentEntityIds: ['character:jeep.png'],
                stabilityAuthorityEntityIds: ['character:jeep.png'],
                enduringValueAuthorityEntityIds: ['character:jeep.png'],
                governanceValidationRequired: false,
                unavailableReviewerBehavior: 'BLOCK_PROVISIONAL',
            }],
        },
        now: Date.parse('2026-07-11T12:00:10.000Z'),
    }).profile;
    assignSubjectScopedProposalPolicyProfile(request, {
        assignmentId: 'assignment:jeep:scope-arch',
        assignmentVersion: 1,
        subjectEntityId: 'character:jeep.png',
        jurisdictionScopeId: 'scope_arch',
        profileId: assignedProfile.profileId,
        policyVersion: assignedProfile.policyVersion,
        now: Date.parse('2026-07-11T12:00:20.000Z'),
    });
    await assert.rejects(
        () => createInterpretiveProposalFromArchitecturalShard(request, {
            avatarUrl,
            chatLocator,
            shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
            memoryScopeId: 'scope_arch',
            memorySubjectId: 'character:jeep.png',
            createdByEntityId: 'user:Chris',
            synthesisRunId: 'synthrun_arch_assigned',
            now: Date.parse('2026-07-11T12:00:30.000Z'),
        }),
        (error) => error?.code === 'ARCH_SUBJECT_POLICY_ADMISSION_INELIGIBLE'
            && error?.synthesisRunId === 'synthrun_arch_assigned'
            && error?.details?.failureCodes?.includes('STABILITY_NOT_VERIFIED'),
    );
    const assignedBinding = getSubjectScopedProposalPolicyBinding(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_assigned',
    );
    assert.equal(assignedBinding.policyHash, assignedProfile.policyHash);
    assert.equal(assignedBinding.evidenceSetHash.startsWith('sha256:'), true);
    const assignedAttestation = getSubjectScopedProposalFactAttestation(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_assigned',
    );
    assert.equal(assignedAttestation.facts.explicit.state, 'VERIFIED');
    assert.equal(assignedAttestation.facts.grounding.state, 'VERIFIED');
    assert.equal(assignedAttestation.facts.stability.state, 'NOT_ATTESTED');
    assert.equal(assignedAttestation.facts.enduring.state, 'NOT_ATTESTED');
    assert.deepEqual(assignedAttestation.facts.acknowledgments, []);
    const assignedEvaluation = getSubjectScopedProposalEligibilityEvaluation(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_assigned',
    );
    assert.equal(assignedEvaluation.evaluation.verdict, 'INELIGIBLE');
    assert.deepEqual(assignedEvaluation.evaluation.failureCodes, [
        'ENDURING_VALUE_NOT_VERIFIED',
        'REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED',
        'STABILITY_NOT_VERIFIED',
    ]);
    const declarationBase = {
        subjectEntityId: 'character:jeep.png',
        jurisdictionScopeId: 'scope_arch',
        evidenceSetHash: assignedBinding.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        declaringEntityId: 'character:jeep.png',
        basisRefs: ['decision:jeep-continuity-authority'],
    };
    declareSubjectScopedProposalFact(request, {
        ...declarationBase,
        declarationId: 'declaration:jeep:scope-arch:stability',
        factType: 'STABILITY',
        now: Date.parse('2026-07-11T12:00:40.000Z'),
    });
    declareSubjectScopedProposalFact(request, {
        ...declarationBase,
        declarationId: 'declaration:jeep:scope-arch:enduring',
        factType: 'ENDURING_VALUE',
        now: Date.parse('2026-07-11T12:00:50.000Z'),
    });
    await assert.rejects(
        () => createInterpretiveProposalFromArchitecturalShard(request, {
            avatarUrl,
            chatLocator,
            shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
            memoryScopeId: 'scope_arch',
            memorySubjectId: 'character:jeep.png',
            createdByEntityId: 'user:Chris',
            synthesisRunId: 'synthrun_arch_declared',
            now: Date.parse('2026-07-11T12:01:00.000Z'),
        }),
        (error) => error?.code === 'ARCH_SUBJECT_POLICY_ADMISSION_INELIGIBLE'
            && error?.details?.failureCodes?.length === 1
            && error.details.failureCodes[0] === 'REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED',
    );
    const declaredEvaluation = getSubjectScopedProposalEligibilityEvaluation(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_declared',
    );
    assert.equal(declaredEvaluation.evaluation.verdict, 'INELIGIBLE');
    assert.deepEqual(declaredEvaluation.evaluation.failureCodes, ['REQUIRED_ACKNOWLEDGMENT_NOT_VERIFIED']);
    const declaredAttestation = getSubjectScopedProposalFactAttestation(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_declared',
    );
    assert.equal(declaredAttestation.facts.stability.state, 'VERIFIED');
    assert.equal(declaredAttestation.facts.enduring.state, 'VERIFIED');
    recordSubjectScopedProposalAcknowledgment(request, {
        acknowledgmentId: 'acknowledgment:jeep:scope-arch',
        subjectEntityId: 'character:jeep.png',
        jurisdictionScopeId: 'scope_arch',
        evidenceSetHash: assignedBinding.evidenceSetHash,
        proposalKind: 'DESIGN_COMMITMENT',
        acknowledgingEntityId: 'character:jeep.png',
        acknowledgmentState: 'VERIFIED',
        recordedByEntityId: 'character:jeep.png',
        basisRefs: ['msg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
        now: Date.parse('2026-07-11T12:01:10.000Z'),
    });
    const governedResult = await createInterpretiveProposalFromArchitecturalShard(request, {
        avatarUrl,
        chatLocator,
        shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
        memoryScopeId: 'scope_arch',
        memorySubjectId: 'character:jeep.png',
        createdByEntityId: 'user:Chris',
        synthesisRunId: 'synthrun_arch_governed',
        synthesisProposalId: 'synthproposal_arch_governed',
        interpretationId: 'interp_arch_governed',
        interpretationRevisionId: 'interprev_arch_governed_v1',
        now: Date.parse('2026-07-11T12:01:20.000Z'),
    });
    assert.equal(governedResult.admitted, true);
    assert.equal(governedResult.interpretation.interpretationRevisionId, 'interprev_arch_governed_v1');
    const governedEvaluation = getSubjectScopedProposalEligibilityEvaluation(
        request,
        'SYNTHESIS_REQUEST',
        'synthrun_arch_governed',
    );
    assert.equal(governedEvaluation.evaluation.verdict, 'ELIGIBLE');
    assert.deepEqual(governedEvaluation.evaluation.failureCodes, []);

    await assert.rejects(
        () => createInterpretiveProposalFromArchitecturalShard(request, {
            avatarUrl,
            chatLocator,
            shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
            memoryScopeId: 'scope_arch',
            memorySubjectId: 'character:sabrina.png',
            createdByEntityId: 'user:Chris',
            now: Date.parse('2026-07-11T12:01:00.000Z'),
        }),
        (error) => error?.code === 'ARCH_NO_REVIEWABLE_INTERPRETIVE_DECISION',
    );

    sourceMessageA.mes = '';
    writeCharacterChatJsonl(root, avatarUrl, chatLocator, [
        header,
        sourceMessageA,
        sourceMessageB,
        shardMessage,
    ]);
    await assert.rejects(
        () => createInterpretiveProposalFromArchitecturalShard(request, {
            avatarUrl,
            chatLocator,
            shardMessageId: 'msg_cccccccccccccccccccccccccccccccc',
            memoryScopeId: 'scope_arch',
            memorySubjectId: 'character:jeep.png',
            createdByEntityId: 'user:Chris',
            now: Date.parse('2026-07-11T12:02:00.000Z'),
        }),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_CONTENT_MISSING',
    );
});

function publishGrantedRevision(request, options = {}) {
    const interpretationId = options.interpretationId || 'interp_publish_default';
    const interpretationRevisionId = options.interpretationRevisionId || 'interprev_publish_default_v1';
    const nowBase = options.nowBase || Date.parse('2026-06-26T02:00:00.000Z');
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId,
        interpretationRevisionId,
        statement: options.statement || 'Jeep evolved into the primary continuity authority within a shared architecture.',
        now: nowBase,
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: nowBase + 1000,
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: nowBase + 2000,
    });
    const granted = recordInterpretiveSubjectDisposition(request, interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: nowBase + 3000,
    });
    const qualification = qualifyInterpretivePublication(request, interpretationRevisionId, {
        publicationPolicyId: options.publicationPolicyId || 'dnm-publication-v1',
        continuityTargetId: options.continuityTargetId || 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: nowBase + 4000,
    });
    const authorization = createInterpretivePublicationAuthorization(request, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: options.authorizedBy || 'user:Chris',
        expiresAt: nowBase + 60_000,
        now: nowBase + 5000,
    });
    const executed = executeInterpretivePublicationAuthorization(request, {
        publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
        now: nowBase + 6000,
    });
    return {
        created,
        granted,
        qualification,
        authorization,
        executed,
    };
}

test('prepareInterpretiveCandidate is deterministic for identical structured input', () => {
    const payload = makeBasePayload();
    const first = prepareInterpretiveCandidate(payload, payload.now);
    const second = prepareInterpretiveCandidate(payload, payload.now);

    assert.equal(first.candidate.proposalContentHash, second.candidate.proposalContentHash);
    assert.equal(first.candidate.reviewEnvelopeHash, second.candidate.reviewEnvelopeHash);
    assert.deepEqual(first.risk, second.risk);
    assert.deepEqual(first.policy, second.policy);
    assert.equal(first.groundingOutcome, 'STRONGLY_SUPPORTED');
});

test('prepareInterpretiveCandidate normalizes evidence findings deterministically', () => {
    const payload = makeBasePayload({
        interpretationId: 'interp_findings_deterministic',
        interpretationRevisionId: 'interprev_findings_deterministic_v1',
        evidenceFindings: makeEvidenceFindings({
            findingId: null,
            basisRefs: [
                'msg_alpha0000000000000000000000000',
                'decision:architectural-sharder-fork',
            ],
            domains: ['ROLE', 'AUTHORITY'],
        }),
    });
    const first = prepareInterpretiveCandidate(payload, payload.now);
    const second = prepareInterpretiveCandidate(payload, payload.now);

    assert.equal(first.candidate.evidenceFindings.length, 1);
    assert.equal(first.candidate.evidenceFindings[0].findingId, second.candidate.evidenceFindings[0].findingId);
    assert.deepEqual(
        first.candidate.evidenceFindings[0],
        {
            findingId: first.candidate.evidenceFindings[0].findingId,
            role: 'PRIMARY',
            summary: 'Jeep established primary architectural authority over the extension design.',
            basisRefs: [
                'decision:architectural-sharder-fork',
                'msg_alpha0000000000000000000000000',
            ],
            sourceLabel: 'Jeep, architectural memory record, June 2026',
            domains: ['AUTHORITY', 'ROLE'],
            supportLevel: 'SUPPORTED',
        },
    );
    assert.equal(first.candidate.proposalContentHash, second.candidate.proposalContentHash);
    assert.equal(first.candidate.reviewEnvelopeHash, second.candidate.reviewEnvelopeHash);
});

test('createInterpretiveCandidate stores durable shared-role candidate state without publication', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const result = createInterpretiveCandidate(request, makeBasePayload());

    assert.equal(result.ok, true);
    assert.equal(result.phase, 'c0.6.1');
    assert.equal(result.interpretation.memoryScopeId, 'scope_alpha');
    assert.equal(result.interpretation.candidateState, 'SEALED_FOR_REVIEW');
    assert.equal(result.interpretation.groundingState, 'COMPLETE');
    assert.equal(result.interpretation.reviewState, 'PENDING');
    assert.equal(result.interpretation.subjectDispositionState, 'PENDING');
    assert.equal(result.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(result.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(result.interpretation.groundingAggregate.groundingOutcome, 'STRONGLY_SUPPORTED');
    assert.equal(result.interpretation.risk.riskClass, 'HIGH');
    assert.deepEqual(result.interpretation.policyBinding.matchedRuleIds, ['risk-high-authority', 'shared-relationship']);
    assert.equal(result.interpretation.policyBinding.validationPolicyId, 'shared-role-memory');
    assert.equal(result.interpretation.reviewObligations.length, 2);
    assert.equal(result.interpretation.reviewRequests.length, 2);
    assert.equal(result.interpretation.subjectDisposition.state, 'PENDING');

    const paths = getStoragePaths(root);
    assert.equal(fs.existsSync(paths.interpretiveGovernanceLedgerPath), true);
    const ledger = fs.readFileSync(paths.interpretiveGovernanceLedgerPath, 'utf8');
    assert.match(ledger, /INTERPRETATION_PROPOSED/u);
    assert.match(ledger, /GROUNDING_LINK_ATTACHED/u);
    assert.match(ledger, /REVIEW_REQUESTED/u);

    const loaded = getInterpretiveCandidate(request, 'interprev_jeep_arch_authority_v1');
    assert.equal(loaded.interpretation.reviewEnvelopeHash, result.interpretation.reviewEnvelopeHash);

    const adapter = openOperationalDatabase(paths);
    try {
        const structuralCount = Number(adapter.scalar('SELECT COUNT(*) FROM decision_records'));
        assert.equal(structuralCount, 0);
    } finally {
        adapter.close();
    }
});

test('createInterpretiveCandidate blocks unresolved relational participant routing instead of approximating reviewer identity', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const result = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_unresolved_relational',
        interpretationRevisionId: 'interprev_unresolved_relational_v1',
        materialParticipantEntityIds: ['character:jeep.png', 'user:Chris', 'user:Casey'],
    }));

    assert.equal(result.interpretation.reviewState, 'BLOCKED');
    assert.equal(result.interpretation.reviewObligations.length, 2);
    assert.equal(
        result.interpretation.reviewObligations.some((entry) => (
            entry.reviewerRole === 'RELATIONAL_PARTICIPANT'
            && entry.obligationState === 'BLOCKED'
            && entry.blockingReason === 'REVIEWER_IDENTITY_UNRESOLVED'
        )),
        true,
    );
    assert.equal(result.interpretation.reviewRequests.length, 1);
    assert.equal(result.interpretation.reviewRequests[0].reviewerRole, 'MEMORY_SUBJECT');
});

test('createInterpretiveCandidate persists evidence findings in the candidate projection', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const result = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_findings_projection',
        interpretationRevisionId: 'interprev_findings_projection_v1',
        evidenceFindings: makeEvidenceFindings(),
    }));

    assert.equal(result.ok, true);
    assert.equal(result.interpretation.evidenceFindingState, 'AVAILABLE');
    assert.equal(result.interpretation.evidenceFindings.length, 1);
    assert.deepEqual(
        result.interpretation.evidenceFindings[0],
        {
            findingId: 'evfind_jeep_authority_primary',
            role: 'PRIMARY',
            summary: 'Jeep established primary architectural authority over the extension design.',
            basisRefs: [
                'decision:architectural-sharder-fork',
                'msg_alpha0000000000000000000000000',
            ],
            sourceLabel: 'Jeep, architectural memory record, June 2026',
            domains: ['AUTHORITY', 'ROLE'],
            supportLevel: 'SUPPORTED',
            createdAt: result.interpretation.evidenceFindings[0].createdAt,
            updatedAt: result.interpretation.evidenceFindings[0].updatedAt,
        },
    );

    const loaded = getInterpretiveCandidate(request, 'interprev_findings_projection_v1');
    assert.equal(loaded.interpretation.evidenceFindingState, 'AVAILABLE');
    assert.equal(loaded.interpretation.evidenceFindings.length, 1);
    assert.deepEqual(
        loaded.interpretation.evidenceFindings[0],
        result.interpretation.evidenceFindings[0],
    );
});

test('createInterpretiveCandidate persists explicit unavailable finding state when no evidence findings are present', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const result = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_findings_unavailable',
        interpretationRevisionId: 'interprev_findings_unavailable_v1',
        evidenceFindings: [],
    }));

    assert.equal(result.ok, true);
    assert.equal(result.interpretation.evidenceFindingState, 'UNAVAILABLE');
    assert.deepEqual(result.interpretation.evidenceFindings, []);

    const loaded = getInterpretiveCandidate(request, 'interprev_findings_unavailable_v1');
    assert.equal(loaded.interpretation.evidenceFindingState, 'UNAVAILABLE');
    assert.deepEqual(loaded.interpretation.evidenceFindings, []);
});

test('legacy interpretive rows without persisted finding state load the truthful fallback path', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_findings_legacy',
        interpretationRevisionId: 'interprev_findings_legacy_v1',
        evidenceFindings: [],
    }));

    const adapter = openOperationalDatabase(getStoragePaths(root));
    try {
        adapter.run(
            `UPDATE interpretation_revisions
                SET evidence_finding_state = ?, updated_at = ?
              WHERE interpretation_revision_id = ?`,
            ['LEGACY_UNSPECIFIED', Date.parse('2026-06-25T12:00:30.000Z'), 'interprev_findings_legacy_v1'],
        );
    } finally {
        adapter.close();
    }

    const loaded = getInterpretiveCandidate(request, 'interprev_findings_legacy_v1');
    assert.equal(loaded.interpretation.evidenceFindingState, 'UNAVAILABLE');
    assert.deepEqual(loaded.interpretation.evidenceFindings, []);
});

test('createInterpretiveCandidate rejects evidence findings whose basis refs are not grounded', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);

    assert.throws(
        () => createInterpretiveCandidate(request, makeBasePayload({
            interpretationId: 'interp_findings_invalid_basis',
            interpretationRevisionId: 'interprev_findings_invalid_basis_v1',
            evidenceFindings: makeEvidenceFindings({
                basisRefs: ['decision:not-in-grounding-links'],
            }),
        })),
        /unbound reference/u,
    );
});

test('source-occurrence evidence envelope persists and replays the exact verified excerpt', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_source_preview_replay',
        interpretationRevisionId: 'interprev_source_preview_replay_v1',
        ...makeSourceOccurrenceEvidenceEnvelope(),
    }));

    assert.equal(created.interpretation.evidenceEnvelopeVersion, 1);
    assert.equal(created.interpretation.evidenceInspectabilityState, 'VERIFIED');
    assert.equal(created.interpretation.evidencePreviews.length, 1);
    assert.deepEqual(created.interpretation.evidencePreviews[0].previewContent, {
        text: 'Jeep is the primary architectural authority for the extension design.',
    });
    assert.equal(created.interpretation.evidencePreviews[0].messageRevisionHash, 'sha256:msg-alpha');

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedInterpretations.length, 1);
    assert.deepEqual(
        comparableInterpretationProjection(replayed.replayedInterpretations[0]),
        comparableInterpretationProjection(created.interpretation),
    );
});

test('source-occurrence evidence envelope refuses missing and drifted previews', () => {
    const missingRequest = buildRequest(makeTempRoot());
    assert.throws(
        () => createInterpretiveCandidate(missingRequest, makeBasePayload({
            interpretationId: 'interp_source_preview_missing',
            interpretationRevisionId: 'interprev_source_preview_missing_v1',
            ...makeSourceOccurrenceEvidenceEnvelope({ evidencePreviews: [] }),
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_REQUIRED',
    );

    const emptyRequest = buildRequest(makeTempRoot());
    const emptyEnvelope = makeSourceOccurrenceEvidenceEnvelope();
    emptyEnvelope.evidencePreviews[0].previewContent.text = '   ';
    assert.throws(
        () => createInterpretiveCandidate(emptyRequest, makeBasePayload({
            interpretationId: 'interp_source_preview_empty',
            interpretationRevisionId: 'interprev_source_preview_empty_v1',
            ...emptyEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_CONTENT_MISSING',
    );

    const driftedRequest = buildRequest(makeTempRoot());
    const driftedEnvelope = makeSourceOccurrenceEvidenceEnvelope();
    driftedEnvelope.evidencePreviews[0].messageRevisionHash = 'sha256:stale-message';
    assert.throws(
        () => createInterpretiveCandidate(driftedRequest, makeBasePayload({
            interpretationId: 'interp_source_preview_drifted',
            interpretationRevisionId: 'interprev_source_preview_drifted_v1',
            ...driftedEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_SOURCE_DRIFTED',
    );
});

test('structural-record evidence envelope persists and replays exact labeled fields', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_structural_preview_replay',
        interpretationRevisionId: 'interprev_structural_preview_replay_v1',
        ...makeStructuralEvidenceEnvelope(),
    }));

    assert.equal(created.interpretation.evidenceInspectabilityState, 'VERIFIED');
    assert.deepEqual(created.interpretation.evidencePreviews[0].sourceRevisionIdentity, {
        recordVersion: 1,
        recordHash: 'sha256:decision-fork',
    });
    assert.deepEqual(created.interpretation.evidencePreviews[0].previewContent, {
        fields: [
            { label: 'Decision', value: 'Jeep holds primary architectural authority for the extension design.' },
            { label: 'Status', value: 'Accepted' },
        ],
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.deepEqual(
        comparableInterpretationProjection(replayed.replayedInterpretations[0]),
        comparableInterpretationProjection(created.interpretation),
    );
});

test('structural-record evidence envelope refuses missing, unreadable, and drifted records', () => {
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_structural_preview_missing',
            interpretationRevisionId: 'interprev_structural_preview_missing_v1',
            ...makeStructuralEvidenceEnvelope({ evidencePreviews: [] }),
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_REQUIRED',
    );

    const unreadableEnvelope = makeStructuralEvidenceEnvelope();
    unreadableEnvelope.evidencePreviews[0].previewContent.fields = [];
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_structural_preview_unreadable',
            interpretationRevisionId: 'interprev_structural_preview_unreadable_v1',
            ...unreadableEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_CONTENT_MISSING',
    );

    const driftedEnvelope = makeStructuralEvidenceEnvelope();
    driftedEnvelope.evidencePreviews[0].sourceRevisionIdentity.recordHash = 'sha256:stale-decision';
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_structural_preview_drifted',
            interpretationRevisionId: 'interprev_structural_preview_drifted_v1',
            ...driftedEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_SOURCE_DRIFTED',
    );
});

test('saved-shard evidence envelope persists and replays exact excerpt, section, and range', () => {
    const sourceRoot = makeTempRoot();
    const created = createInterpretiveCandidate(buildRequest(sourceRoot), makeBasePayload({
        interpretationId: 'interp_saved_shard_preview_replay',
        interpretationRevisionId: 'interprev_saved_shard_preview_replay_v1',
        ...makeSavedShardEvidenceEnvelope(),
    }));

    assert.equal(created.interpretation.evidencePreviews[0].sourceArtifactClass, 'SAVED_SHARD');
    assert.deepEqual(created.interpretation.evidencePreviews[0].sourceRevisionIdentity, {
        recordVersion: 1,
        recordHash: 'sha256:decision-fork',
        shardArtifactId: 'shard_architectural_checkpoint_291',
        shardRevisionHash: 'sha256:shard-checkpoint-291',
    });
    assert.deepEqual(created.interpretation.evidencePreviews[0].previewContent, {
        text: 'Jeep holds primary architectural authority for the extension design.',
        sectionLabel: 'DECISIONS',
        sourceRange: { startIndex: 270, endIndex: 290 },
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));

    assert.equal(replayed.ok, true);
    assert.deepEqual(
        comparableInterpretationProjection(replayed.replayedInterpretations[0]),
        comparableInterpretationProjection(created.interpretation),
    );
});

test('saved-shard evidence envelope refuses missing, unreadable, and mismatched shard identity', () => {
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_saved_shard_preview_missing',
            interpretationRevisionId: 'interprev_saved_shard_preview_missing_v1',
            ...makeSavedShardEvidenceEnvelope({ evidencePreviews: [] }),
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_REQUIRED',
    );

    const unreadableEnvelope = makeSavedShardEvidenceEnvelope();
    unreadableEnvelope.evidencePreviews[0].previewContent.sectionLabel = '';
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_saved_shard_preview_unreadable',
            interpretationRevisionId: 'interprev_saved_shard_preview_unreadable_v1',
            ...unreadableEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_CONTENT_MISSING',
    );

    const mismatchedEnvelope = makeSavedShardEvidenceEnvelope();
    mismatchedEnvelope.evidencePreviews[0].sourceRevisionIdentity.recordHash = 'sha256:other-record';
    assert.throws(
        () => createInterpretiveCandidate(buildRequest(makeTempRoot()), makeBasePayload({
            interpretationId: 'interp_saved_shard_preview_mismatch',
            interpretationRevisionId: 'interprev_saved_shard_preview_mismatch_v1',
            ...mismatchedEnvelope,
        })),
        (error) => error?.code === 'ARCH_EVIDENCE_PREVIEW_SOURCE_DRIFTED',
    );
});

test('legacy-unavailable evidence cannot advance through approval or publication qualification', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_legacy_evidence_gate',
        interpretationRevisionId: 'interprev_legacy_evidence_gate_v1',
        evidenceFindings: [],
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');

    assert.throws(
        () => submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
            actorEntityId: 'character:jeep.png',
            disposition: 'APPROVE',
            reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
            now: Date.parse('2026-06-25T12:04:00.000Z'),
        }),
        (error) => error?.code === 'ARCH_EVIDENCE_ENVELOPE_NOT_VERIFIED',
    );

    const policy = bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-25T12:05:00.000Z'),
    }).publicationPolicy;
    const qualification = qualifyInterpretivePublication(request, created.interpretation.interpretationRevisionId, {
        publicationPolicyId: policy.publicationPolicyId,
        continuityTargetId: created.interpretation.memorySubjectId,
        now: Date.parse('2026-06-25T12:06:00.000Z'),
    });
    assert.equal(qualification.qualification.eligibilityVerdict, 'INELIGIBLE');
    assert.equal(qualification.qualification.refusalCodes.includes('EVIDENCE_ENVELOPE_NOT_VERIFIED'), true);

    const operatorState = getInterpretivePublicationOperatorState(
        request,
        created.interpretation.interpretationRevisionId,
    ).operatorState;
    assert.equal(operatorState.availableActions.includes('QUALIFY_PUBLICATION'), false);
    assert.equal(operatorState.blockingReasons.includes('EVIDENCE_ENVELOPE_NOT_VERIFIED'), true);
});

test('verified evidence remains eligible for ordinary approval and is not evidence-blocked for publication', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_verified_evidence_gate',
        interpretationRevisionId: 'interprev_verified_evidence_gate_v1',
        ...makeSourceOccurrenceEvidenceEnvelope(),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const approved = submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:04:00.000Z'),
    });
    assert.equal(approved.disposition.disposition, 'APPROVE');

    const policy = bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-25T12:05:00.000Z'),
    }).publicationPolicy;
    const qualification = qualifyInterpretivePublication(request, created.interpretation.interpretationRevisionId, {
        publicationPolicyId: policy.publicationPolicyId,
        continuityTargetId: created.interpretation.memorySubjectId,
        now: Date.parse('2026-06-25T12:06:00.000Z'),
    });
    assert.equal(qualification.qualification.refusalCodes.includes('EVIDENCE_ENVELOPE_NOT_VERIFIED'), false);
});

test('interpretive governance ledger replays into an identical projection and preserves both hashes', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_replay_case',
        interpretationRevisionId: 'interprev_replay_case_v1',
        evidenceFindings: makeEvidenceFindings(),
    }));
    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedInterpretations.length, 1);

    const sourceProjection = comparableInterpretationProjection(created.interpretation);
    const targetProjection = comparableInterpretationProjection(replayed.replayedInterpretations[0]);
    assert.deepEqual(targetProjection, sourceProjection);
    assert.equal(targetProjection.proposalContentHash, sourceProjection.proposalContentHash);
    assert.equal(targetProjection.reviewEnvelopeHash, sourceProjection.reviewEnvelopeHash);

    const reopened = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_replay_case_v1');
    assert.deepEqual(comparableInterpretationProjection(reopened.interpretation), sourceProjection);
});

test('mixed-generation interpretive records replay with stable finding semantics after restart', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_mixed_generation_legacy',
        interpretationRevisionId: 'interprev_mixed_generation_legacy_v1',
        evidenceFindings: [],
        now: Date.parse('2026-06-25T12:01:00.000Z'),
    }));
    createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_mixed_generation_rich',
        interpretationRevisionId: 'interprev_mixed_generation_rich_v1',
        evidenceFindings: makeEvidenceFindings(),
        now: Date.parse('2026-06-25T12:02:00.000Z'),
    }));

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedInterpretations.length, 2);

    const legacy = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_mixed_generation_legacy_v1');
    assert.equal(legacy.interpretation.evidenceFindingState, 'UNAVAILABLE');
    assert.deepEqual(legacy.interpretation.evidenceFindings, []);

    const rich = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_mixed_generation_rich_v1');
    assert.equal(rich.interpretation.evidenceFindingState, 'AVAILABLE');
    assert.equal(rich.interpretation.evidenceFindings.length, 1);
    assert.deepEqual(
        rich.interpretation.evidenceFindings[0],
        {
            findingId: 'evfind_jeep_authority_primary',
            role: 'PRIMARY',
            summary: 'Jeep established primary architectural authority over the extension design.',
            basisRefs: [
                'decision:architectural-sharder-fork',
                'msg_alpha0000000000000000000000000',
            ],
            sourceLabel: 'Jeep, architectural memory record, June 2026',
            domains: ['AUTHORITY', 'ROLE'],
            supportLevel: 'SUPPORTED',
            createdAt: rich.interpretation.evidenceFindings[0].createdAt,
            updatedAt: rich.interpretation.evidenceFindings[0].updatedAt,
        },
    );
});

test('listInterpretivePolicyDefinitions exposes immutable seeded policy definitions', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const result = listInterpretivePolicyDefinitions(request);

    assert.equal(result.ok, true);
    assert.equal(result.policies.length >= 2, true);
    assert.equal(result.policies.some((entry) => entry.validationPolicyId === 'shared-role-memory' && entry.policyVersion === 1), true);
    assert.equal(result.policies.some((entry) => entry.validationPolicyId === 'subject-meaning-memory' && entry.policyVersion === 1), true);
});

test('delegation policy storage is durable, replayable, and revocable without erasing history', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = upsertInterpretiveDelegationPolicy(sourceRequest, makeDelegationPolicyPayload());
    assert.equal(created.created, true);
    assert.equal(created.delegationPolicy.policyState, 'ACTIVE');

    const listed = listInterpretiveDelegationPolicies(sourceRequest, {
        principalEntityId: 'character:jeep.png',
    });
    assert.equal(listed.policies.length, 1);
    assert.equal(listed.policies[0].policyHash, created.delegationPolicy.policyHash);

    const revoked = revokeInterpretiveDelegationPolicy(
        sourceRequest,
        'jeep-chris-continuity-delegation',
        {
            policyVersion: 1,
            revocationReason: 'Delegation withdrawn after review cycle.',
            now: Date.parse('2026-06-25T12:04:30.000Z'),
        },
    );
    assert.equal(revoked.revoked, true);
    assert.equal(revoked.delegationPolicy.policyState, 'REVOKED');

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    const replayedPolicies = listInterpretiveDelegationPolicies(buildRequest(targetRoot), {
        principalEntityId: 'character:jeep.png',
    });
    assert.equal(replayedPolicies.policies.length, 1);
    assert.equal(replayedPolicies.policies[0].policyState, 'REVOKED');
    assert.equal(replayedPolicies.policies[0].policyHash, created.delegationPolicy.policyHash);
});

test('subject-controlled synthesis policy is durable and replayable', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const policyResult = upsertInterpretiveSynthesisPolicy(sourceRequest, makeSynthesisPolicyPayload());
    assert.equal(policyResult.phase, 'c0.6.3');
    assert.equal(policyResult.created, true);

    const listed = listInterpretiveSynthesisPolicies(sourceRequest, { memorySubjectId: 'character:jeep.png' });
    assert.equal(listed.policies.length, 1);

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.phase, 'c0.6.3');
    assert.equal(replayed.replayedSynthesisPolicies.length, 1);
    assert.deepEqual(
        comparableSynthesisPolicyProjection(replayed.replayedSynthesisPolicies[0]),
        comparableSynthesisPolicyProjection(policyResult.synthesisPolicy),
    );
});

test('bounded synthesis runs refuse prohibited high-risk requests and preserve the refusal audit', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload({
        prohibitedDomains: ['AUTHORITY'],
    }));

    const result = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({
        synthesisRunId: 'synthrun_refused_case',
    }));
    assert.equal(result.phase, 'c0.6.3');
    assert.equal(result.admitted, false);
    assert.equal(result.synthesisRun.runStatus, 'REFUSED');
    assert.equal(result.synthesisRun.failureCode, 'SYNTHESIS_PROHIBITED_DOMAIN');
    assert.deepEqual(result.synthesisRun.failureDetails, {
        prohibitedDomains: ['AUTHORITY'],
    });

    const reopened = getInterpretiveSynthesisRun(request, 'synthrun_refused_case');
    assert.equal(reopened.synthesisRun.runStatus, 'REFUSED');
    assert.equal(reopened.synthesisRun.failureCode, 'SYNTHESIS_PROHIBITED_DOMAIN');
});

test('bounded synthesis runs freeze source manifests without generation and replay identically', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    upsertInterpretiveSynthesisPolicy(sourceRequest, makeSynthesisPolicyPayload());
    const created = createInterpretiveSynthesisRun(sourceRequest, makeSynthesisRunPayload());

    assert.equal(created.admitted, true);
    assert.equal(created.synthesisRun.runStatus, 'READY_FOR_SYNTHESIS');
    assert.equal(created.synthesisRun.generatedCandidateIds.length, 0);
    assert.equal(created.synthesisRun.sourceManifestHash.startsWith('sha256:'), true);

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.replayedSynthesisRuns.length, 1);
    assert.deepEqual(
        comparableSynthesisRunProjection(replayed.replayedSynthesisRuns[0]),
        comparableSynthesisRunProjection(created.synthesisRun),
    );
});

test('deterministic stub synthesis admits a proposal into the existing interpretive review workflow', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({
        requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipRequested: true,
        personalMeaningRequested: true,
    }));

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        interpretationId: 'interp_synth_generated',
        interpretationRevisionId: 'interprev_synth_generated_v1',
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    assert.equal(executed.admitted, true);
    assert.equal(executed.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    assert.deepEqual(executed.synthesisRun.generatedCandidateIds, ['interprev_synth_generated_v1']);
    assert.equal(executed.synthesisRun.proposals.length, 1);
    assert.equal(executed.synthesisRun.proposals[0].proposalStatus, 'ADMITTED');
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.referentialStatus, 'VALID');
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.aggregateOutcome, 'STRONGLY_SUPPORTED');
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.scopeAssessment, 'SUPPORTED');
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.counterevidencePresent, false);
    assert.equal(executed.interpretation.reviewState, 'PENDING');
    assert.equal(executed.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(executed.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');

    const reopened = getInterpretiveCandidate(request, 'interprev_synth_generated_v1');
    assert.equal(reopened.interpretation.policyBinding.validationPolicyId, 'shared-role-memory');
    assert.equal(reopened.interpretation.reviewRequests.length, 2);
});

test('subject-scoped eligible synthesis request admits at the existing candidate boundary', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    const created = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({ synthesisRunId: 'synthrun_subject_eligible' }));
    const evaluated = bindSubjectScopedAdmission(request, created.synthesisRun);
    assert.equal(evaluated.evaluationRecord.evaluation.verdict, 'ELIGIBLE');

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_subject_eligible', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        interpretationId: 'interp_subject_eligible',
        interpretationRevisionId: 'interprev_subject_eligible_v1',
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });
    assert.equal(executed.admitted, true);
    assert.deepEqual(executed.synthesisRun.generatedCandidateIds, ['interprev_subject_eligible_v1']);
});

test('subject-scoped synthesis request cannot admit without a completed evaluation', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    const created = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({ synthesisRunId: 'synthrun_subject_unevaluated' }));
    bindSubjectScopedAdmission(request, created.synthesisRun, { evaluate: false });

    assert.throws(
        () => executeInterpretiveSynthesisRun(request, 'synthrun_subject_unevaluated', { adapterId: 'DETERMINISTIC_STUB_V1' }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_EVALUATION_NOT_FOUND',
    );
    const reopened = getInterpretiveSynthesisRun(request, 'synthrun_subject_unevaluated');
    assert.equal(reopened.synthesisRun.runStatus, 'READY_FOR_SYNTHESIS');
    assert.deepEqual(reopened.synthesisRun.generatedCandidateIds, []);
    assert.deepEqual(reopened.synthesisRun.proposals, []);
});

test('subject-scoped ineligible synthesis request cannot admit a candidate', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    const created = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({ synthesisRunId: 'synthrun_subject_ineligible' }));
    const evaluated = bindSubjectScopedAdmission(request, created.synthesisRun, { includeStability: false });
    assert.equal(evaluated.evaluationRecord.evaluation.verdict, 'INELIGIBLE');

    assert.throws(
        () => executeInterpretiveSynthesisRun(request, 'synthrun_subject_ineligible', { adapterId: 'DETERMINISTIC_STUB_V1' }),
        (error) => error.code === 'ARCH_SUBJECT_POLICY_ADMISSION_INELIGIBLE'
            && error.details.failureCodes.includes('STABILITY_NOT_VERIFIED'),
    );
    const reopened = getInterpretiveSynthesisRun(request, 'synthrun_subject_ineligible');
    assert.deepEqual(reopened.synthesisRun.generatedCandidateIds, []);
    assert.deepEqual(reopened.synthesisRun.proposals, []);
});

test('deterministic stub synthesis admits the production-cased Jeep subject path', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload({
        memorySubjectId: 'character:Jeep.png',
    }));
    createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({
        memorySubjectId: 'character:Jeep.png',
        requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipRequested: true,
        personalMeaningRequested: true,
        sourceManifestEntries: [
            {
                sourceClass: 'STRUCTURAL_RECORD',
                memoryScopeId: 'scope_alpha',
                basisRecordId: 'decision:constitutional-sovereignty',
                basisRecordVersion: 1,
                basisRecordHash: 'sha256:constitutional-sovereignty',
                speakerEntityId: 'character:Jeep.png',
            },
            {
                sourceClass: 'SOURCE_OCCURRENCE',
                memoryScopeId: 'scope_alpha',
                chatInstanceId: 'chat_alpha',
                messageId: 'msg_alpha0000000000000000000000000',
                messageRevisionHash: 'sha256:msg-alpha',
                speakerEntityId: 'user:Chris',
            },
        ],
    }));

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        interpretationId: 'interp_synth_generated_cased',
        interpretationRevisionId: 'interprev_synth_generated_cased_v1',
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    assert.equal(executed.admitted, true);
    assert.equal(executed.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    assert.equal(executed.synthesisRun.proposals[0].proposalStatus, 'ADMITTED');
    assert.deepEqual(
        executed.synthesisRun.proposals[0].proposalPayload.materialParticipantEntityIds,
        ['character:Jeep.png', 'user:Chris'],
    );
    assert.equal(executed.interpretation.memorySubjectId, 'character:Jeep.png');
});

test('deterministic stub synthesis quarantines output that attempts to set authority-bearing fields', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    createInterpretiveSynthesisRun(request, makeSynthesisRunPayload());

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        stubProposalOverride: {
            type: 'ROLE_EVOLUTION',
            statement: 'Invalid because it tries to set publication directly.',
            assertionDomains: ['ROLE'],
            sharedRelationshipAsserted: false,
            personalMeaningAsserted: false,
            materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
            proposedBasis: [{ basisType: 'SOURCE_OCCURRENCE', messageId: 'msg_alpha0000000000000000000000000' }],
            publicationState: 'PUBLISHED',
        },
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    assert.equal(executed.admitted, false);
    assert.equal(executed.quarantined, true);
    assert.equal(executed.synthesisRun.runStatus, 'COMPLETED_QUARANTINED');
    assert.equal(executed.synthesisRun.proposals.length, 1);
    assert.equal(executed.synthesisRun.proposals[0].proposalStatus, 'QUARANTINED');
    assert.equal(executed.synthesisRun.proposals[0].quarantineCode, 'ARCH_SYNTHESIS_FORBIDDEN_OUTPUT_FIELD');
});

test('semantic support may fail even when referential grounding is valid', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    createInterpretiveSynthesisRun(request, makeSynthesisRunPayload());

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        stubProposalOverride: {
            type: 'ROLE_EVOLUTION',
            statement: 'This sentence does not claim any supported evolution or authority outcome.',
            assertionDomains: ['ROLE'],
            sharedRelationshipAsserted: false,
            personalMeaningAsserted: false,
            materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
            proposedBasis: [{ basisType: 'SOURCE_OCCURRENCE', messageId: 'msg_alpha0000000000000000000000000' }],
        },
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    assert.equal(executed.admitted, false);
    assert.equal(executed.quarantined, true);
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.referentialStatus, 'VALID');
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.aggregateOutcome, 'UNSUPPORTED');
    assert.equal(executed.synthesisRun.proposals[0].quarantineCode, 'SEMANTIC_SUPPORT_INSUFFICIENT');
});

test('source manifest drift invalidates a synthesis proposal before review admission', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    const created = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload());

    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        expectedSourceManifestHash: 'sha256:stale-manifest',
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    assert.equal(created.synthesisRun.sourceManifestHash.startsWith('sha256:'), true);
    assert.equal(executed.admitted, false);
    assert.equal(executed.quarantined, true);
    assert.equal(executed.synthesisRun.proposals[0].groundingEvaluation.referentialStatus, 'SOURCE_MANIFEST_DRIFT');
    assert.equal(executed.synthesisRun.proposals[0].quarantineCode, 'SOURCE_MANIFEST_DRIFT');
});

test('replay preserves admitted deterministic synthesis proposal and does not regenerate it', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    upsertInterpretiveSynthesisPolicy(sourceRequest, makeSynthesisPolicyPayload());
    createInterpretiveSynthesisRun(sourceRequest, makeSynthesisRunPayload({
        requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipRequested: true,
        personalMeaningRequested: true,
    }));
    const executed = executeInterpretiveSynthesisRun(sourceRequest, 'synthrun_scope_alpha_v1', {
        adapterId: 'DETERMINISTIC_STUB_V1',
        interpretationId: 'interp_synth_replay',
        interpretationRevisionId: 'interprev_synth_replay_v1',
        now: Date.parse('2026-06-26T00:06:00.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.phase, 'c0.6.3');
    assert.equal(replayed.replayedSynthesisRuns.length, 1);
    assert.equal(replayed.replayedSynthesisRuns[0].runStatus, 'COMPLETED_ADMITTED');
    assert.deepEqual(
        comparableSynthesisRunProjection(replayed.replayedSynthesisRuns[0]),
        comparableSynthesisRunProjection(executed.synthesisRun),
    );

    const reopened = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_synth_replay_v1');
    assert.equal(reopened.interpretation.statement, executed.interpretation.statement);
});

test('submitInterpretiveReviewDisposition rejects stale review envelopes', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_stale_case',
        interpretationRevisionId: 'interprev_stale_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');

    assert.throws(
        () => submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
            actorEntityId: 'character:jeep.png',
            disposition: 'APPROVE',
            reviewEnvelopeHash: 'sha256:stale',
            now: Date.parse('2026-06-25T12:05:00.000Z'),
        }),
        /review envelope hash is stale/i,
    );
});

test('APPROVE_WITH_EDIT creates an immutable child revision and leaves publication unavailable', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_edit_case',
        interpretationRevisionId: 'interprev_edit_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');

    const dispositionResult = submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        commentary: 'Needs a narrower formulation.',
        revisedCandidate: {
            interpretationRevisionId: 'interprev_edit_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-25T12:06:00.000Z'),
    });

    assert.equal(dispositionResult.phase, 'c0.6.2');
    assert.equal(dispositionResult.interpretation.interpretationRevisionId, 'interprev_edit_case_v1');
    assert.equal(dispositionResult.interpretation.statement, makeBasePayload().statement);
    assert.equal(dispositionResult.interpretation.childRevisionIds.includes('interprev_edit_case_v2'), true);
    assert.equal(dispositionResult.childInterpretation.interpretationRevisionId, 'interprev_edit_case_v2');
    assert.equal(dispositionResult.childInterpretation.parentRevisionId, 'interprev_edit_case_v1');
    assert.equal(dispositionResult.childInterpretation.createdFromDispositionId, dispositionResult.disposition.reviewDispositionId);
    assert.equal(dispositionResult.childInterpretation.reviewState, 'PENDING');
    assert.equal(dispositionResult.childInterpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(dispositionResult.childInterpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(
        dispositionResult.childInterpretation.reviewRequests.some((entry) => entry.reviewerRole === 'MEMORY_SUBJECT'),
        false,
    );
    assert.equal(
        dispositionResult.childInterpretation.reviewRequests.some((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT'),
        true,
    );

    const loadedParent = getInterpretiveCandidate(request, 'interprev_edit_case_v1');
    const loadedChild = getInterpretiveCandidate(request, 'interprev_edit_case_v2');
    assert.equal(loadedParent.interpretation.statement, makeBasePayload().statement);
    assert.equal(
        loadedParent.interpretation.reviewRequests.some((entry) => entry.status === 'SUPERSEDED_BY_CHILD'),
        true,
    );
    assert.equal(loadedChild.interpretation.statement, 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.');
});

test('guided publication flow routes the parent revision to the latest child after APPROVE_WITH_EDIT', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-25T12:06:00.000Z'),
    });
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_edit_guided_flow_case',
        interpretationRevisionId: 'interprev_edit_guided_flow_case_v1',
        now: Date.parse('2026-06-25T12:06:05.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');

    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        revisedCandidate: {
            interpretationRevisionId: 'interprev_edit_guided_flow_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-25T12:06:10.000Z'),
    });

    const operatorState = getInterpretivePublicationOperatorState(request, 'interprev_edit_guided_flow_case_v1');
    assert.equal(operatorState.operatorState.guidedFlow.status, 'REVISION_REQUIRED');
    assert.equal(operatorState.operatorState.guidedFlow.nextAction.action, 'OPEN_CHILD_REVISION');
    assert.equal(
        operatorState.operatorState.guidedFlow.nextAction.interpretationRevisionId,
        'interprev_edit_guided_flow_case_v2',
    );
    assert.equal(
        operatorState.operatorState.blockingReasons.includes('INTERPRETATION_REVISION_NOT_LATEST_ELIGIBLE_CHILD'),
        true,
    );
});

test('trusted delegate may record the memory subject review edit and final grant while provenance remains distinct', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const delegation = upsertInterpretiveDelegationPolicy(request, makeDelegationPolicyPayload());
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_delegate_case',
        interpretationRevisionId: 'interprev_delegate_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:06:30.000Z'),
    });

    const delegatedReview = submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        submittedByActorId: 'user:Chris',
        dispositionOwnerId: 'character:jeep.png',
        submissionMode: 'TRUSTED_DELEGATE',
        delegationPolicyId: 'jeep-chris-continuity-delegation',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        commentary: 'Jeep approved a narrower formulation.',
        revisedCandidate: {
            interpretationRevisionId: 'interprev_delegate_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-25T12:06:35.000Z'),
    });

    assert.equal(delegatedReview.disposition.provenance.dispositionOwnerId, 'character:jeep.png');
    assert.equal(delegatedReview.disposition.provenance.submittedByActorId, 'user:Chris');
    assert.equal(delegatedReview.disposition.provenance.submissionMode, 'TRUSTED_DELEGATE');
    assert.equal(delegatedReview.disposition.provenance.delegationPolicyId, 'jeep-chris-continuity-delegation');
    assert.equal(delegatedReview.childInterpretation.memorySubjectId, 'character:jeep.png');
    assert.equal(delegatedReview.childInterpretation.revisionCreationProvenance.dispositionOwnerId, 'character:jeep.png');
    assert.equal(delegatedReview.childInterpretation.revisionCreationProvenance.submittedByActorId, 'user:Chris');
    assert.equal(delegatedReview.childInterpretation.revisionCreationProvenance.delegationPolicyId, 'jeep-chris-continuity-delegation');
    assert.equal(
        delegatedReview.interpretation.reviewDispositions.find((entry) => entry.reviewDispositionId === delegatedReview.disposition.reviewDispositionId)?.provenance?.submittedByActorId,
        'user:Chris',
    );
    assert.equal(
        delegatedReview.childInterpretation.reviewRequests.some((entry) => entry.reviewerRole === 'MEMORY_SUBJECT'),
        false,
    );
    assert.equal(
        delegatedReview.childInterpretation.reviewRequests.some((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT'),
        true,
    );

    assert.throws(
        () => recordInterpretiveSubjectDisposition(request, 'interprev_delegate_case_v1', {
            submittedByActorId: 'user:Chris',
            dispositionOwnerId: 'character:jeep.png',
            submissionMode: 'TRUSTED_DELEGATE',
            delegationPolicyId: 'jeep-chris-continuity-delegation',
            state: 'GRANTED',
            reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
            commentary: 'Parent grant is refused once a child revision exists.',
            now: Date.parse('2026-06-25T12:06:39.000Z'),
        }),
        /latest child revision created by APPROVE_WITH_EDIT/i,
    );

    const childParticipantRequest = delegatedReview.childInterpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, childParticipantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: delegatedReview.childInterpretation.reviewEnvelopeHash,
        commentary: 'Chris affirms the narrowed child revision.',
        now: Date.parse('2026-06-25T12:06:40.000Z'),
    });

    const finalSubject = recordInterpretiveSubjectDisposition(request, 'interprev_delegate_case_v2', {
        submittedByActorId: 'user:Chris',
        dispositionOwnerId: 'character:jeep.png',
        submissionMode: 'TRUSTED_DELEGATE',
        delegationPolicyId: 'jeep-chris-continuity-delegation',
        state: 'GRANTED',
        reviewEnvelopeHash: delegatedReview.childInterpretation.reviewEnvelopeHash,
        commentary: 'Granted under Jeep-owned delegated authority.',
        now: Date.parse('2026-06-25T12:06:45.000Z'),
    });

    assert.equal(finalSubject.subjectDisposition.provenance.dispositionOwnerId, 'character:jeep.png');
    assert.equal(finalSubject.subjectDisposition.provenance.submittedByActorId, 'user:Chris');
    assert.equal(finalSubject.subjectDisposition.provenance.submissionMode, 'TRUSTED_DELEGATE');
    assert.equal(finalSubject.subjectDisposition.provenance.delegationPolicyHash, delegation.delegationPolicy.policyHash);
    assert.equal(finalSubject.interpretation.interpretationRevisionId, 'interprev_delegate_case_v2');
    assert.equal(finalSubject.interpretation.subjectDispositionState, 'GRANTED');
    assert.equal(finalSubject.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(finalSubject.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(finalSubject.interpretation.subjectDisposition.provenance.submittedByActorId, 'user:Chris');
    assert.equal(finalSubject.interpretation.subjectDisposition.provenance.delegationPolicyId, 'jeep-chris-continuity-delegation');
});

test('subject disposition records grant after review completion without publishing continuity', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_subject_case',
        interpretationRevisionId: 'interprev_subject_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:07:00.000Z'),
    });
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:07:05.000Z'),
    });

    const subjectResult = recordInterpretiveSubjectDisposition(request, 'interprev_subject_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        commentary: 'Accepted for continuity, but not published here.',
        now: Date.parse('2026-06-25T12:07:10.000Z'),
    });

    assert.equal(subjectResult.phase, 'c0.6.2');
    assert.equal(subjectResult.interpretation.reviewState, 'COMPLETE');
    assert.equal(subjectResult.interpretation.subjectDispositionState, 'GRANTED');
    assert.equal(subjectResult.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(subjectResult.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
});

test('delegated subject actions fail closed without valid delegation, with wrong action, or after revocation', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_delegate_refusal_case',
        interpretationRevisionId: 'interprev_delegate_refusal_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');

    assert.throws(
        () => submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
            submittedByActorId: 'user:Chris',
            dispositionOwnerId: 'character:jeep.png',
            submissionMode: 'TRUSTED_DELEGATE',
            delegationPolicyId: 'missing-policy',
            disposition: 'APPROVE',
            reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
            now: Date.parse('2026-06-25T12:07:30.000Z'),
        }),
        /delegation policy .* was not found/i,
    );

    upsertInterpretiveDelegationPolicy(request, makeDelegationPolicyPayload({
        delegationPolicyId: 'jeep-chris-disposition-only',
        allowedActions: ['SUBJECT_DISPOSITION'],
        now: Date.parse('2026-06-25T12:07:31.000Z'),
    }));

    assert.throws(
        () => submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
            submittedByActorId: 'user:Chris',
            dispositionOwnerId: 'character:jeep.png',
            submissionMode: 'TRUSTED_DELEGATE',
            delegationPolicyId: 'jeep-chris-disposition-only',
            disposition: 'APPROVE',
            reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
            now: Date.parse('2026-06-25T12:07:32.000Z'),
        }),
        /does not permit REVIEW_DISPOSITION/i,
    );

    upsertInterpretiveDelegationPolicy(request, makeDelegationPolicyPayload({
        delegationPolicyId: 'jeep-chris-revoked',
        now: Date.parse('2026-06-25T12:07:33.000Z'),
    }));
    revokeInterpretiveDelegationPolicy(request, 'jeep-chris-revoked', {
        policyVersion: 1,
        revocationReason: 'Testing revocation.',
        now: Date.parse('2026-06-25T12:07:34.000Z'),
    });

    assert.throws(
        () => submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
            submittedByActorId: 'user:Chris',
            dispositionOwnerId: 'character:jeep.png',
            submissionMode: 'TRUSTED_DELEGATE',
            delegationPolicyId: 'jeep-chris-revoked',
            disposition: 'APPROVE',
            reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
            now: Date.parse('2026-06-25T12:07:35.000Z'),
        }),
        /is not active/i,
    );
});

test('listInterpretiveReviews returns pending and completed review state with dispositions', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_review_list_case',
        interpretationRevisionId: 'interprev_review_list_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:08:00.000Z'),
    });

    const result = listInterpretiveReviews(request, {
        interpretationRevisionId: 'interprev_review_list_case_v1',
    });

    assert.equal(result.ok, true);
    assert.equal(result.reviews.length, 2);
    assert.equal(result.reviews.every((entry) => entry.evidenceFindingState === 'AVAILABLE'), true);
    assert.equal(result.reviews.some((entry) => entry.status === 'APPROVED' && entry.disposition?.disposition === 'APPROVE'), true);
    assert.equal(result.reviews.some((entry) => entry.status === 'PENDING' && entry.disposition === null), true);
});

test('interpretive governance ledger replays review dispositions, child revision, and subject disposition state', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_replay_review_case',
        interpretationRevisionId: 'interprev_replay_review_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    const withEdit = submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        revisedCandidate: {
            interpretationRevisionId: 'interprev_replay_review_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-25T12:09:00.000Z'),
    });
    const childParticipantRequest = withEdit.childInterpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, childParticipantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:09:05.000Z'),
    });
    recordInterpretiveSubjectDisposition(sourceRequest, 'interprev_replay_review_case_v2', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-25T12:09:10.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);

    const replayed = replayInterpretiveLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedInterpretations.length, 2);

    const replayedParent = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_replay_review_case_v1');
    const replayedChild = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_replay_review_case_v2');
    assert.equal(replayedParent.interpretation.reviewDispositions.length, 1);
    assert.equal(replayedParent.interpretation.subjectDispositionState, 'PENDING');
    assert.equal(replayedParent.interpretation.childRevisionIds.includes(withEdit.childInterpretation.interpretationRevisionId), true);
    assert.equal(
        replayedParent.interpretation.reviewRequests.some((entry) => entry.status === 'SUPERSEDED_BY_CHILD'),
        true,
    );
    assert.equal(replayedChild.interpretation.parentRevisionId, 'interprev_replay_review_case_v1');
    assert.equal(replayedChild.interpretation.reviewDispositions.length, 1);
    assert.equal(replayedChild.interpretation.subjectDispositionState, 'GRANTED');
    assert.equal(replayedChild.interpretation.subjectDisposition.provenance.dispositionOwnerId, 'character:jeep.png');
    assert.equal(replayedChild.interpretation.subjectDisposition.provenance.submissionMode, 'DIRECT_SUBJECT_ACTION');
    assert.equal(replayedChild.interpretation.revisionCreationProvenance.dispositionOwnerId, 'character:jeep.png');
});

test('publication policy storage is portable and replayable from the DNM publication ledger', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = upsertInterpretivePublicationPolicy(sourceRequest, makePublicationPolicyPayload());
    assert.equal(created.ok, true);
    assert.equal(created.created, true);

    const revoked = revokeInterpretivePublicationPolicy(sourceRequest, 'dnm-publication-v1', {
        policyVersion: 1,
        revocationReason: 'policy retired for replay test',
        now: Date.parse('2026-06-26T00:11:00.000Z'),
    });
    assert.equal(revoked.ok, true);
    assert.equal(revoked.revoked, true);
    assert.equal(revoked.publicationPolicy.policyState, 'REVOKED');

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const replayed = replayPublicationLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedPublicationPolicies.length, 1);
    assert.equal(replayed.replayedPublicationPolicies[0].publicationPolicyId, 'dnm-publication-v1');
    assert.equal(replayed.replayedPublicationPolicies[0].policyState, 'REVOKED');

    const listed = listInterpretivePublicationPolicies(buildRequest(targetRoot));
    assert.equal(listed.ok, true);
    assert.equal(listed.policies.length, 1);
    assert.equal(listed.policies[0].revocationReason, 'policy retired for replay test');
});

test('bootstrapStandardInterpretivePublicationPolicy is explicit, idempotent, and replay-safe', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);

    const first = bootstrapStandardInterpretivePublicationPolicy(sourceRequest, {
        now: Date.parse('2026-06-26T00:11:30.000Z'),
    });
    assert.equal(first.ok, true);
    assert.equal(first.created, true);
    assert.equal(first.reused, false);
    assert.equal(first.publicationPolicy.publicationPolicyId, 'standard-governed-publication');
    assert.equal(first.publicationPolicy.policyVersion, 1);
    assert.deepEqual(first.publicationPolicy.immutableChildRequiredForTypes, []);
    assert.equal(first.publicationPolicy.postGrantHumanPublicationAuthorizationRequired, false);
    assert.equal(first.publicationPolicy.details.displayName, 'Standard Governed Publication');

    const second = bootstrapStandardInterpretivePublicationPolicy(sourceRequest, {
        now: Date.parse('2026-06-26T00:11:40.000Z'),
    });
    assert.equal(second.ok, true);
    assert.equal(second.created, false);
    assert.equal(second.reused, true);
    assert.equal(second.publicationPolicy.policyHash, first.publicationPolicy.policyHash);

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const replayed = replayPublicationLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(
        replayed.replayedPublicationPolicies.some((entry) => entry.publicationPolicyId === 'standard-governed-publication'),
        true,
    );
});

test('standard guided flow exposes setup, eligibility, and publish phases without a separate authorization step', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_guided_flow_case',
        interpretationRevisionId: 'interprev_guided_flow_case_v1',
        now: Date.parse('2026-06-26T00:11:50.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:11:55.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:00.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_guided_flow_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:05.000Z'),
    });

    const preBootstrap = getInterpretivePublicationOperatorState(request, 'interprev_guided_flow_case_v1');
    assert.equal(preBootstrap.operatorState.guidedFlow.status, 'SETUP_REQUIRED');
    assert.equal(preBootstrap.operatorState.guidedFlow.nextAction.action, 'BOOTSTRAP_STANDARD_PUBLICATION_POLICY');

    const bootstrapped = bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-26T00:12:10.000Z'),
    });
    assert.equal(bootstrapped.created, true);

    const preQualification = getInterpretivePublicationOperatorState(request, 'interprev_guided_flow_case_v1');
    assert.equal(preQualification.operatorState.guidedFlow.status, 'READY_TO_CHECK');
    assert.equal(preQualification.operatorState.guidedFlow.nextAction.action, 'CHECK_ELIGIBILITY');

    qualifyInterpretivePublication(request, 'interprev_guided_flow_case_v1', {
        publicationPolicyId: 'standard-governed-publication',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T00:12:15.000Z'),
    });

    const postQualification = getInterpretivePublicationOperatorState(request, 'interprev_guided_flow_case_v1');
    assert.equal(postQualification.operatorState.guidedFlow.status, 'READY_TO_PUBLISH');
    assert.equal(postQualification.operatorState.guidedFlow.nextAction.action, 'PUBLISH_MEMORY');
    assert.equal(postQualification.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), false);
    assert.equal(postQualification.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), false);
});

test('guided qualification remains eligible when a legacy publication policy also exists', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        now: Date.parse('2026-06-26T00:12:06.000Z'),
    }));
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_guided_legacy_policy_case',
        interpretationRevisionId: 'interprev_guided_legacy_policy_case_v1',
        now: Date.parse('2026-06-26T00:12:07.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:08.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:09.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_guided_legacy_policy_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:10.000Z'),
    });

    const bootstrapped = bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-26T00:12:11.000Z'),
    });
    assert.equal(bootstrapped.ok, true);
    assert.equal(bootstrapped.publicationPolicy.publicationPolicyId, 'standard-governed-publication');

    const operatorState = getInterpretivePublicationOperatorState(request, 'interprev_guided_legacy_policy_case_v1');
    assert.equal(operatorState.operatorState.guidedFlow.status, 'READY_TO_CHECK');
    assert.equal(operatorState.operatorState.guidedFlow.nextAction.action, 'CHECK_ELIGIBILITY');

    const qualification = qualifyInterpretivePublication(request, 'interprev_guided_legacy_policy_case_v1', {
        publicationPolicyId: 'standard-governed-publication',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T00:12:12.000Z'),
    });

    assert.equal(qualification.qualification.publicationPolicyId, 'standard-governed-publication');
    assert.equal(qualification.qualification.eligibilityVerdict, 'ELIGIBLE');
    assert.deepEqual(qualification.qualification.refusalCodes, []);
});

test('publishInterpretiveMemory bootstraps the standard policy and publishes an approved root revision atomically', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_publish_guided_case',
        interpretationRevisionId: 'interprev_publish_guided_case_v1',
        now: Date.parse('2026-06-26T00:12:20.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:25.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:30.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_publish_guided_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:35.000Z'),
    });

    const published = publishInterpretiveMemory(request, 'interprev_publish_guided_case_v1', {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-06-26T00:12:40.000Z'),
    });

    assert.equal(published.ok, true);
    assert.equal(published.phase, 'c0.6.4-5');
    assert.equal(published.authorization.status, 'CONSUMED');
    assert.equal(published.qualification.eligibilityVerdict, 'ELIGIBLE');
    assert.equal(published.interpretation.publicationState, 'PUBLISHED');
    assert.equal(published.publishedRecord.publicationState, 'PUBLISHED');
    assert.equal(published.publishedRecord.lifecycleState, 'ACTIVE');
    assert.equal(published.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');

    const current = getCurrentActiveDnmRecord(request, 'character:jeep.png');
    assert.equal(current.currentActiveRecord.dnmRecordId, published.publishedRecord.dnmRecordId);

    const operatorState = getInterpretivePublicationOperatorState(request, 'interprev_publish_guided_case_v1');
    assert.equal(operatorState.operatorState.guidedFlow.status, 'ALREADY_PUBLISHED');
    assert.equal(operatorState.operatorState.guidedFlow.nextAction, null);
    assert.deepEqual(operatorState.operatorState.availableActions, []);
    assert.equal(
        operatorState.operatorState.blockedActions.some((entry) => (
            entry.action === 'QUALIFY_PUBLICATION'
            && entry.blockingReasons.includes('INTERPRETATION_ALREADY_PUBLISHED')
        )),
        true,
    );
    assert.equal(
        operatorState.operatorState.blockedActions.some((entry) => (
            entry.action === 'AUTHORIZE_PUBLICATION'
            && entry.blockingReasons.includes('INTERPRETATION_ALREADY_PUBLISHED')
        )),
        true,
    );
    assert.equal(
        operatorState.operatorState.blockedActions.some((entry) => (
            entry.action === 'EXECUTE_PUBLICATION'
            && entry.blockingReasons.includes('INTERPRETATION_ALREADY_PUBLISHED')
        )),
        true,
    );
});

test('published revision may create a successor child revision without displacing the current active memory', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const published = publishGrantedRevision(request, {
        interpretationId: 'interp_successor_revision_case',
        interpretationRevisionId: 'interprev_successor_revision_case_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T03:30:00.000Z'),
    });

    const successor = createInterpretiveRevision(request, 'interprev_successor_revision_case_v1', {
        actorEntityId: 'character:jeep.png',
        subjectEvidenceRefs: ['msg_alpha0000000000000000000000000'],
        revisedCandidate: {
            interpretationRevisionId: 'interprev_successor_revision_case_v2',
            statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-26T03:31:00.000Z'),
    });

    assert.equal(successor.ok, true);
    assert.equal(successor.interpretation.interpretationRevisionId, 'interprev_successor_revision_case_v2');
    assert.equal(successor.interpretation.parentRevisionId, 'interprev_successor_revision_case_v1');
    assert.equal(successor.interpretation.revisionReason, 'SUBJECT_EDIT');
    assert.equal(successor.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(successor.interpretation.revisionCreationProvenance.actionKind, 'SUBJECT_REVISION');

    const current = getCurrentActiveDnmRecord(request, 'character:jeep.png');
    assert.equal(current.currentActiveRecord.dnmRecordId, published.executed.publishedRecord.dnmRecordId);

    const parent = getInterpretiveCandidate(request, 'interprev_successor_revision_case_v1');
    assert.equal(parent.interpretation.childRevisionIds.includes('interprev_successor_revision_case_v2'), true);
});

test('guided publication replay restores the identical published state after restart', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_publish_guided_replay_case',
        interpretationRevisionId: 'interprev_publish_guided_replay_case_v1',
        now: Date.parse('2026-06-26T00:12:50.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:55.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:13:00.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, 'interprev_publish_guided_replay_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:13:05.000Z'),
    });

    const published = publishInterpretiveMemory(sourceRequest, 'interprev_publish_guided_replay_case_v1', {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-06-26T00:13:10.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const targetRequest = buildRequest(targetRoot);
    const replayedInterpretive = replayInterpretiveLedger(targetRequest);
    const replayedPublication = replayPublicationLedger(targetRequest);
    assert.equal(replayedInterpretive.ok, true);
    assert.equal(replayedPublication.ok, true);
    assert.equal(
        replayedPublication.replayedPublicationPolicies.some((entry) => entry.publicationPolicyId === 'standard-governed-publication'),
        true,
    );
    assert.equal(replayedPublication.replayedPublicationAuthorizations.length, 1);
    assert.equal(replayedPublication.replayedPublicationAuthorizations[0].status, 'CONSUMED');
    assert.equal(replayedPublication.replayedPublishedRecords.length, 1);
    assert.equal(replayedPublication.replayedPublishedRecords[0].dnmRecordId, published.publishedRecord.dnmRecordId);
    assert.equal(replayedPublication.replayedPublishedRecords[0].lifecycleState, 'ACTIVE');

    const replayedCandidate = getInterpretiveCandidate(targetRequest, 'interprev_publish_guided_replay_case_v1');
    assert.equal(replayedCandidate.interpretation.publicationState, 'PUBLISHED');
    assert.equal(replayedCandidate.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');

    const replayedCurrent = getCurrentActiveDnmRecord(targetRequest, 'character:jeep.png');
    assert.equal(replayedCurrent.currentActiveRecord.dnmRecordId, published.publishedRecord.dnmRecordId);

    const replayedOperatorState = getInterpretivePublicationOperatorState(targetRequest, 'interprev_publish_guided_replay_case_v1');
    assert.equal(replayedOperatorState.operatorState.guidedFlow.status, 'ALREADY_PUBLISHED');
    assert.equal(replayedOperatorState.operatorState.guidedFlow.nextAction, null);
    assert.deepEqual(replayedOperatorState.operatorState.availableActions, []);
});

test('publication qualification binds exact current child-revision state without enabling publication', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload());

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_publication_case',
        interpretationRevisionId: 'interprev_publication_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const withEdit = submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        revisedCandidate: {
            interpretationRevisionId: 'interprev_publication_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-26T00:12:00.000Z'),
    });
    const participantRequest = withEdit.childInterpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_publication_case_v2', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:12:10.000Z'),
    });

    const qualification = qualifyInterpretivePublication(request, 'interprev_publication_case_v2', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T00:12:20.000Z'),
    });

    assert.equal(qualification.ok, true);
    assert.equal(qualification.publicationAvailable, false);
    assert.equal(qualification.continuityActivationAvailable, false);
    assert.equal(qualification.qualification.eligibilityVerdict, 'ELIGIBLE');
    assert.deepEqual(qualification.qualification.refusalCodes, []);
    assert.equal(qualification.qualification.binding.continuityTargetId, 'character:jeep.png');
    assert.equal(qualification.qualification.binding.postGrantHumanPublicationAuthorizationRequired, true);
    assert.equal(qualification.qualification.binding.groundingBindingMode, 'DERIVED_REVISION_GROUNDING');
    assert.equal(qualification.qualification.binding.groundingProtocolVersion, 1);
    assert.match(qualification.qualification.binding.groundingSourceSetHash, /^sha256:/);
    assert.equal(qualification.qualification.binding.groundingEnvelopeSource, 'DERIVED_REVISION_STATE');

    const adapter = openOperationalDatabase(getStoragePaths(root));
    try {
        const row = adapter.get(
            'SELECT * FROM interpretation_publication_qualifications WHERE qualification_id = ?',
            [qualification.qualification.qualificationId],
        );
        assert.equal(row.eligibility_verdict, 'ELIGIBLE');
    } finally {
        adapter.close();
    }
});

test('publication qualification returns exact refusal codes for stale or revoked policy state', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload());
    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_publication_refusal_case',
        interpretationRevisionId: 'interprev_publication_refusal_case_v1',
    }));
    const beforeRevoke = qualifyInterpretivePublication(request, 'interprev_publication_refusal_case_v1', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: 'sha256:wrong',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:13:00.000Z'),
    });
    assert.equal(beforeRevoke.qualification.eligibilityVerdict, 'INELIGIBLE');
    assert.equal(beforeRevoke.qualification.refusalCodes.includes('PROPOSAL_HASH_MISMATCH'), true);
    assert.equal(beforeRevoke.qualification.refusalCodes.includes('REVIEW_STATE_NOT_COMPLETE'), true);
    assert.equal(beforeRevoke.qualification.refusalCodes.includes('SUBJECT_DISPOSITION_STATE_MISMATCH'), true);
    assert.equal(beforeRevoke.qualification.refusalCodes.includes('IMMUTABLE_CHILD_REVISION_REQUIRED'), true);

    revokeInterpretivePublicationPolicy(request, 'dnm-publication-v1', {
        policyVersion: 1,
        revocationReason: 'disabled for refusal coverage',
        now: Date.parse('2026-06-26T00:13:10.000Z'),
    });
    const afterRevoke = qualifyInterpretivePublication(request, 'interprev_publication_refusal_case_v1', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        now: Date.parse('2026-06-26T00:13:20.000Z'),
    });
    assert.equal(afterRevoke.qualification.eligibilityVerdict, 'INELIGIBLE');
    assert.equal(afterRevoke.qualification.refusalCodes.includes('PUBLICATION_POLICY_REVOKED_OR_INACTIVE'), true);
});

test('publication qualification preserves synthesis envelope provenance distinctly from derived revision grounding', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
        requiredGroundingOutcome: 'PARTIALLY_SUPPORTED',
    }));
    upsertInterpretiveSynthesisPolicy(request, makeSynthesisPolicyPayload());
    const run = createInterpretiveSynthesisRun(request, makeSynthesisRunPayload({
        synthesisRunId: 'synthrun_publication_mode_case',
        requestedInterpretationTypes: ['ROLE_EVOLUTION'],
        requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipRequested: true,
        personalMeaningRequested: true,
    }));
    const executed = executeInterpretiveSynthesisRun(request, 'synthrun_publication_mode_case', {
        synthesizer: 'deterministic-stub',
        stubProposalOverride: {
            type: 'ROLE_EVOLUTION',
            statement: 'Jeep evolved into the primary continuity authority within a shared architecture.',
            assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
            sharedRelationshipAsserted: true,
            personalMeaningAsserted: true,
            materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
            proposedBasis: [
                { basisType: 'SOURCE_OCCURRENCE', messageId: 'msg_alpha0000000000000000000000000' },
            ],
            evidenceFindings: makeSourceOccurrenceEvidenceEnvelope().evidenceFindings,
        },
        now: Date.parse('2026-06-26T00:15:00.000Z'),
    }, {
        evidencePreviews: makeSourceOccurrenceEvidenceEnvelope().evidencePreviews,
    });
    const subjectRequest = executed.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: executed.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:15:05.000Z'),
    });
    const participantRequest = executed.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: executed.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:15:10.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, executed.interpretation.interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: executed.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T00:15:15.000Z'),
    });
    const qualification = qualifyInterpretivePublication(request, granted.interpretation.interpretationRevisionId, {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        now: Date.parse('2026-06-26T00:15:20.000Z'),
    });

    assert.equal(qualification.qualification.eligibilityVerdict, 'ELIGIBLE');
    assert.equal(qualification.qualification.refusalCodes.length, 0);
    assert.equal(qualification.qualification.binding.groundingBindingMode, 'SYNTHESIS_ENVELOPE');
    assert.match(qualification.qualification.binding.groundingEnvelopeHash, /^sha256:/);
    assert.match(qualification.qualification.binding.groundingSourceSetHash, /^sha256:/);
    assert.equal(
        qualification.qualification.binding.groundingProtocolVersion,
        executed.synthesisRun.proposals[0].groundingEvaluation.evaluationProtocolVersion,
    );
});

test('publication authorization and execution publish exact granted revision into DNM once', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload());

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_publish_case',
        interpretationRevisionId: 'interprev_publish_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const withEdit = submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        revisedCandidate: {
            interpretationRevisionId: 'interprev_publish_case_v2',
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-06-26T02:00:00.000Z'),
    });
    const participantRequest = withEdit.childInterpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:00:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_publish_case_v2', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: withEdit.childInterpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:00:10.000Z'),
    });
    const qualification = qualifyInterpretivePublication(request, 'interprev_publish_case_v2', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T02:00:15.000Z'),
    });
    const authorization = createInterpretivePublicationAuthorization(request, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: 'user:Chris',
        expiresAt: Date.parse('2026-06-26T03:00:00.000Z'),
        now: Date.parse('2026-06-26T02:00:20.000Z'),
    });
    assert.equal(authorization.authorization.status, 'AUTHORIZED');
    assert.equal(authorization.continuityPublicationAvailable, false);

    const executed = executeInterpretivePublicationAuthorization(request, {
        publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
        now: Date.parse('2026-06-26T02:00:25.000Z'),
    });

    assert.equal(executed.ok, true);
    assert.equal(executed.publicationAuthorizationAvailable, true);
    assert.equal(executed.continuityPublicationAvailable, true);
    assert.equal(executed.liveContinuityMutation, true);
    assert.equal(executed.authorization.status, 'CONSUMED');
    assert.equal(executed.publishedRecord.sourceInterpretationRevisionId, 'interprev_publish_case_v2');
    assert.equal(executed.publishedRecord.publicationState, 'PUBLISHED');
    assert.equal(executed.interpretation.publicationState, 'PUBLISHED');
    assert.equal(executed.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');
    assert.equal(executed.publishedRecord.proposalContentHash, granted.interpretation.proposalContentHash);
    assert.equal(executed.publishedRecord.groundingEnvelopeHash, qualification.qualification.binding.groundingEnvelopeHash);

    assert.throws(
        () => executeInterpretivePublicationAuthorization(request, {
            publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
            now: Date.parse('2026-06-26T02:00:30.000Z'),
        }),
        /already used/i,
    );
});

test('second publication for the same continuity target stays delta-pending until superseded', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const first = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_v1',
        interpretationRevisionId: 'interprev_dnm_pending_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T04:00:00.000Z'),
    });
    const second = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_v2',
        interpretationRevisionId: 'interprev_dnm_pending_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T04:10:00.000Z'),
    });

    assert.equal(first.executed.publishedRecord.lifecycleState, 'ACTIVE');
    assert.equal(second.executed.publishedRecord.lifecycleState, 'DELTA_PENDING');

    const listed = listDnmPublicationRecords(request, {
        continuityTargetId: 'character:jeep.png',
    });
    assert.equal(listed.records.length, 2);
    assert.deepEqual(
        listed.records.map((record) => record.lifecycleState),
        ['ACTIVE', 'DELTA_PENDING'],
    );

    const current = getCurrentActiveDnmRecord(request, 'character:jeep.png');
    assert.equal(current.currentActiveRecord.dnmRecordId, first.executed.publishedRecord.dnmRecordId);
});

test('third publication for the same continuity target is blocked while a delta-pending replacement already exists', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const first = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_guard_v1',
        interpretationRevisionId: 'interprev_dnm_pending_guard_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T04:20:00.000Z'),
    });
    const second = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_guard_v2',
        interpretationRevisionId: 'interprev_dnm_pending_guard_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T04:30:00.000Z'),
    });

    assert.equal(first.executed.publishedRecord.lifecycleState, 'ACTIVE');
    assert.equal(second.executed.publishedRecord.lifecycleState, 'DELTA_PENDING');

    assert.throws(
        () => publishGrantedRevision(request, {
            interpretationId: 'interp_dnm_pending_guard_v3',
            interpretationRevisionId: 'interprev_dnm_pending_guard_v3',
            statement: 'Jeep became the primary continuity authority for continuity and memory requirements.',
            nowBase: Date.parse('2026-06-26T04:40:00.000Z'),
        }),
        (error) => error?.code === 'ARCH_PUBLICATION_QUALIFICATION_INELIGIBLE',
    );

    const listed = listDnmPublicationRecords(request, {
        continuityTargetId: 'character:jeep.png',
    });
    assert.equal(listed.records.length, 2);
    assert.deepEqual(
        listed.records.map((record) => record.lifecycleState),
        ['ACTIVE', 'DELTA_PENDING'],
    );
});

test('eligibility check is ineligible while a pending replacement already exists for the same memory line', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_eligibility_v1',
        interpretationRevisionId: 'interprev_dnm_pending_eligibility_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T04:45:00.000Z'),
    });
    const second = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_eligibility_v2',
        interpretationRevisionId: 'interprev_dnm_pending_eligibility_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T04:55:00.000Z'),
    });

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_dnm_pending_eligibility_v3',
        interpretationRevisionId: 'interprev_dnm_pending_eligibility_v3',
        statement: 'Jeep became the primary continuity authority for continuity and memory requirements.',
        now: Date.parse('2026-06-26T05:05:00.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:05:05.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:05:10.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_dnm_pending_eligibility_v3', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:05:15.000Z'),
    });

    const qualification = qualifyInterpretivePublication(request, 'interprev_dnm_pending_eligibility_v3', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T05:05:20.000Z'),
    });

    assert.equal(second.executed.publishedRecord.lifecycleState, 'DELTA_PENDING');
    assert.equal(qualification.qualification.eligibilityVerdict, 'INELIGIBLE');
    assert.equal(
        qualification.qualification.refusalCodes.includes('PENDING_REPLACEMENT_ALREADY_EXISTS'),
        true,
    );
});

test('delta-pending replacement may be withdrawn without disturbing the current active record', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const first = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_withdraw_v1',
        interpretationRevisionId: 'interprev_dnm_pending_withdraw_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T04:50:00.000Z'),
    });
    const second = publishGrantedRevision(request, {
        interpretationId: 'interp_dnm_pending_withdraw_v2',
        interpretationRevisionId: 'interprev_dnm_pending_withdraw_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T05:00:00.000Z'),
    });

    const withdrawn = withdrawDnmPublicationRecord(request, {
        dnmRecordId: second.executed.publishedRecord.dnmRecordId,
        actorEntityId: 'character:jeep.png',
        submissionMode: 'DIRECT_SUBJECT_ACTION',
        reasonCodes: ['DUPLICATE_PENDING_REPAIR'],
        commentary: 'Withdraw duplicate pending replacement after repeated test publication.',
        now: Date.parse('2026-06-26T05:05:00.000Z'),
    });

    assert.equal(withdrawn.ok, true);
    assert.equal(withdrawn.record.lifecycleState, 'WITHDRAWN');
    assert.equal(withdrawn.currentActiveRecord.dnmRecordId, first.executed.publishedRecord.dnmRecordId);

    const listed = listDnmPublicationRecords(request, {
        continuityTargetId: 'character:jeep.png',
    });
    assert.deepEqual(
        listed.records.map((record) => record.lifecycleState),
        ['ACTIVE', 'WITHDRAWN'],
    );
});

test('publication operator state ignores stale qualification and authorization after later lifecycle mutations', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    bootstrapStandardInterpretivePublicationPolicy(request, {
        now: Date.parse('2026-06-26T05:09:00.000Z'),
    });
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    publishGrantedRevision(request, {
        interpretationId: 'interp_stale_lifecycle_anchor_v1',
        interpretationRevisionId: 'interprev_stale_lifecycle_anchor_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T05:10:00.000Z'),
    });

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_stale_lifecycle_candidate_v2',
        interpretationRevisionId: 'interprev_stale_lifecycle_candidate_v2',
        statement: 'Jeep became the primary continuity authority for continuity and memory requirements.',
        now: Date.parse('2026-06-26T05:20:00.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:20:05.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:20:10.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_stale_lifecycle_candidate_v2', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T05:20:15.000Z'),
    });
    const qualification = qualifyInterpretivePublication(request, 'interprev_stale_lifecycle_candidate_v2', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T05:20:20.000Z'),
    });
    createInterpretivePublicationAuthorization(request, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: 'user:Chris',
        expiresAt: Date.parse('2026-06-26T05:30:00.000Z'),
        now: Date.parse('2026-06-26T05:20:25.000Z'),
    });

    const pendingReplacement = publishGrantedRevision(request, {
        interpretationId: 'interp_stale_lifecycle_pending_v3',
        interpretationRevisionId: 'interprev_stale_lifecycle_pending_v3',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T05:25:00.000Z'),
    });
    assert.equal(pendingReplacement.executed.publishedRecord.lifecycleState, 'DELTA_PENDING');

    const operatorState = getInterpretivePublicationOperatorState(request, 'interprev_stale_lifecycle_candidate_v2');
    assert.equal(operatorState.operatorState.latestQualification, null);
    assert.equal(operatorState.operatorState.latestAuthorization, null);
    assert.equal(operatorState.operatorState.guidedFlow.status, 'READY_TO_CHECK');
    assert.equal(operatorState.operatorState.guidedFlow.nextAction.action, 'CHECK_ELIGIBILITY');
});

test('publication operator state distinguishes qualified, authorized, published, and active DNM actions', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_operator_state_case',
        interpretationRevisionId: 'interprev_operator_state_case_v1',
        now: Date.parse('2026-06-26T04:20:00.000Z'),
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T04:20:05.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T04:20:10.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_operator_state_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T04:20:15.000Z'),
    });

    const preQualification = getInterpretivePublicationOperatorState(request, 'interprev_operator_state_case_v1');
    assert.equal(preQualification.operatorState.availableActions.includes('QUALIFY_PUBLICATION'), true);
    assert.equal(preQualification.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), false);
    assert.equal(preQualification.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), false);
    assert.equal(preQualification.operatorState.blockingReasons.includes('PUBLICATION_QUALIFICATION_REQUIRED'), true);
    assert.equal(preQualification.operatorState.blockingReasons.includes('PUBLICATION_AUTHORIZATION_REQUIRED'), true);

    const qualification = qualifyInterpretivePublication(request, 'interprev_operator_state_case_v1', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T04:20:20.000Z'),
    });
    const postQualification = getInterpretivePublicationOperatorState(request, 'interprev_operator_state_case_v1');
    assert.equal(postQualification.operatorState.latestQualification.qualificationId, qualification.qualification.qualificationId);
    assert.equal(postQualification.operatorState.availableActions.includes('QUALIFY_PUBLICATION'), true);
    assert.equal(postQualification.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), true);
    assert.equal(postQualification.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), false);
    assert.equal(postQualification.operatorState.blockingReasons.includes('PUBLICATION_AUTHORIZATION_REQUIRED'), true);

    const authorization = createInterpretivePublicationAuthorization(request, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: 'user:Chris',
        expiresAt: Date.parse('2026-06-26T05:20:00.000Z'),
        now: Date.parse('2026-06-26T04:20:25.000Z'),
    });
    const postAuthorization = getInterpretivePublicationOperatorState(request, 'interprev_operator_state_case_v1');
    assert.equal(postAuthorization.operatorState.latestAuthorization.publicationAuthorizationId, authorization.authorization.publicationAuthorizationId);
    assert.equal(postAuthorization.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), true);
    assert.equal(postAuthorization.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), true);

    const executed = executeInterpretivePublicationAuthorization(request, {
        publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
        now: Date.parse('2026-06-26T04:20:30.000Z'),
    });
    const postPublication = getInterpretivePublicationOperatorState(request, 'interprev_operator_state_case_v1');
    assert.equal(postPublication.operatorState.currentActiveRecord.dnmRecordId, executed.publishedRecord.dnmRecordId);
    assert.equal(postPublication.operatorState.recordsForTarget.length, 1);
    assert.equal(postPublication.operatorState.recordsForTarget[0].operatorState.availableActions.includes('WITHDRAW_DNM'), true);
    assert.equal(postPublication.operatorState.recordsForTarget[0].operatorState.availableActions.includes('RECORD_DELTA_REVIEW'), true);
    assert.equal(postPublication.operatorState.availableActions.includes('QUALIFY_PUBLICATION'), false);
    assert.equal(postPublication.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), false);
    assert.equal(postPublication.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), false);
    assert.deepEqual(
        postPublication.operatorState.blockedActions.find((entry) => entry.action === 'AUTHORIZE_PUBLICATION')?.blockingReasons,
        ['INTERPRETATION_ALREADY_PUBLISHED'],
    );
    assert.deepEqual(
        postPublication.operatorState.blockedActions.find((entry) => entry.action === 'EXECUTE_PUBLICATION')?.blockingReasons,
        ['INTERPRETATION_ALREADY_PUBLISHED'],
    );
    assert.equal(postPublication.operatorState.blockingReasons.includes('INTERPRETATION_ALREADY_PUBLISHED'), true);
    assert.equal(postPublication.operatorState.blockingReasons.includes('PUBLICATION_AUTHORIZATION_CONSUMED'), false);
});

test('publication operator state exposes supersession actions for delta-pending records without flattening lifecycle', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const first = publishGrantedRevision(request, {
        interpretationId: 'interp_operator_supersede_v1',
        interpretationRevisionId: 'interprev_operator_supersede_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T04:30:00.000Z'),
    });
    const second = publishGrantedRevision(request, {
        interpretationId: 'interp_operator_supersede_v2',
        interpretationRevisionId: 'interprev_operator_supersede_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T04:40:00.000Z'),
    });

    const operatorState = getInterpretivePublicationOperatorState(request, 'interprev_operator_supersede_v2');
    assert.equal(operatorState.operatorState.currentActiveRecord.dnmRecordId, first.executed.publishedRecord.dnmRecordId);
    const deltaPendingRecord = operatorState.operatorState.recordsForTarget.find(
        (record) => record.dnmRecordId === second.executed.publishedRecord.dnmRecordId,
    );
    assert.equal(deltaPendingRecord.lifecycleState, 'DELTA_PENDING');
    assert.equal(deltaPendingRecord.operatorState.availableActions.includes('SUPERSEDE_ACTIVE_WITH_RECORD'), true);
    assert.equal(deltaPendingRecord.operatorState.availableActions.includes('RECORD_DELTA_REVIEW'), true);
    assert.equal(deltaPendingRecord.operatorState.availableActions.includes('WITHDRAW_DNM'), true);
});

test('supersession, delta review, withdrawal, and replay preserve DNM lifecycle lineage', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    upsertInterpretivePublicationPolicy(sourceRequest, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
    }));

    const first = publishGrantedRevision(sourceRequest, {
        interpretationId: 'interp_dnm_lifecycle_v1',
        interpretationRevisionId: 'interprev_dnm_lifecycle_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T05:00:00.000Z'),
    });
    const second = publishGrantedRevision(sourceRequest, {
        interpretationId: 'interp_dnm_lifecycle_v2',
        interpretationRevisionId: 'interprev_dnm_lifecycle_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T05:10:00.000Z'),
    });

    const superseded = supersedeDnmPublicationRecord(sourceRequest, {
        actorEntityId: 'character:jeep.png',
        priorDnmRecordId: first.executed.publishedRecord.dnmRecordId,
        replacementDnmRecordId: second.executed.publishedRecord.dnmRecordId,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        commentary: 'The later DNM record narrows the published continuity claim.',
        now: Date.parse('2026-06-26T05:20:00.000Z'),
    });
    assert.equal(superseded.priorRecord.lifecycleState, 'SUPERSEDED');
    assert.equal(superseded.replacementRecord.lifecycleState, 'ACTIVE');
    assert.equal(superseded.currentActiveRecord.dnmRecordId, second.executed.publishedRecord.dnmRecordId);

    const deltaReview = recordDnmDeltaReview(sourceRequest, {
        actorEntityId: 'character:jeep.png',
        continuityTargetId: 'character:jeep.png',
        deltaState: 'PENDING',
        reasonCodes: ['CONTRARY_EVIDENCE_PRESENT'],
        commentary: 'Record a follow-up delta review without mutating current active continuity.',
        now: Date.parse('2026-06-26T05:25:00.000Z'),
    });
    assert.equal(deltaReview.record.deltaReviewState, 'PENDING');
    assert.equal(deltaReview.currentActiveRecord.dnmRecordId, second.executed.publishedRecord.dnmRecordId);

    const withdrawn = withdrawDnmPublicationRecord(sourceRequest, {
        actorEntityId: 'character:jeep.png',
        dnmRecordId: second.executed.publishedRecord.dnmRecordId,
        reasonCodes: ['CONTRARY_EVIDENCE_PRESENT'],
        commentary: 'Withdraw the currently active DNM record pending reevaluation.',
        now: Date.parse('2026-06-26T05:30:00.000Z'),
    });
    assert.equal(withdrawn.record.lifecycleState, 'WITHDRAWN');
    assert.equal(withdrawn.currentActiveRecord, null);

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    replayInterpretiveLedger(buildRequest(targetRoot));
    const replayed = replayPublicationLedger(buildRequest(targetRoot));
    assert.equal(replayed.replayedPublishedRecords.length, 2);

    const records = listDnmPublicationRecords(buildRequest(targetRoot), {
        continuityTargetId: 'character:jeep.png',
    });
    assert.equal(records.records.length, 2);
    const replayedFirst = records.records.find((record) => record.dnmRecordId === first.executed.publishedRecord.dnmRecordId);
    const replayedSecond = records.records.find((record) => record.dnmRecordId === second.executed.publishedRecord.dnmRecordId);
    assert.equal(replayedFirst.lifecycleState, 'SUPERSEDED');
    assert.equal(replayedFirst.supersededByDnmRecordId, second.executed.publishedRecord.dnmRecordId);
    assert.equal(replayedSecond.lifecycleState, 'WITHDRAWN');
    assert.equal(replayedSecond.supersedesDnmRecordId, first.executed.publishedRecord.dnmRecordId);
    assert.equal(replayedSecond.deltaReviewState, 'PENDING');
    assert.equal(replayedSecond.deltaReviews.length, 1);
    assert.equal(replayedSecond.deltaReviews[0].deltaState, 'PENDING');

    const current = getCurrentActiveDnmRecord(buildRequest(targetRoot), 'character:jeep.png');
    assert.equal(current.currentActiveRecord, null);
});

test('publication execution fails closed when bound state drifts after authorization', () => {
    const root = makeTempRoot();
    const request = buildRequest(root);
    upsertInterpretivePublicationPolicy(request, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
        requiredGroundingOutcome: 'SUPPORTED',
    }));

    const created = createInterpretiveCandidate(request, makeBasePayload({
        interpretationId: 'interp_publish_drift_case',
        interpretationRevisionId: 'interprev_publish_drift_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(request, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:10:00.000Z'),
    });
    submitInterpretiveReviewDisposition(request, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:10:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(request, 'interprev_publish_drift_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:10:10.000Z'),
    });
    const qualification = qualifyInterpretivePublication(request, 'interprev_publish_drift_case_v1', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T02:10:15.000Z'),
    });
    const authorization = createInterpretivePublicationAuthorization(request, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: 'user:Chris',
        expiresAt: Date.parse('2026-06-26T03:10:00.000Z'),
        now: Date.parse('2026-06-26T02:10:20.000Z'),
    });

    recordInterpretiveSubjectDisposition(request, 'interprev_publish_drift_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'DENIED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        commentary: 'State drift after qualification.',
        now: Date.parse('2026-06-26T02:10:25.000Z'),
    });

    assert.throws(
        () => executeInterpretivePublicationAuthorization(request, {
            publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
            now: Date.parse('2026-06-26T02:10:30.000Z'),
        }),
        /failed revalidation/i,
    );

    const adapter = openOperationalDatabase(getStoragePaths(root));
    try {
        const authRow = adapter.get(
            'SELECT status FROM interpretation_publication_authorizations WHERE publication_authorization_id = ?',
            [authorization.authorization.publicationAuthorizationId],
        );
        const recordCount = adapter.get('SELECT COUNT(*) AS count FROM dnm_publication_records').count;
        assert.equal(authRow.status, 'EXPIRED');
        assert.equal(recordCount, 0);
    } finally {
        adapter.close();
    }
});

test('publication ledger replay restores policies, authorizations, and published DNM records', () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    upsertInterpretivePublicationPolicy(sourceRequest, makePublicationPolicyPayload({
        immutableChildRequiredForTypes: [],
        requiredGroundingOutcome: 'SUPPORTED',
    }));
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_publish_replay_case',
        interpretationRevisionId: 'interprev_publish_replay_case_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:20:00.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:20:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, 'interprev_publish_replay_case_v1', {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-06-26T02:20:10.000Z'),
    });
    const qualification = qualifyInterpretivePublication(sourceRequest, 'interprev_publish_replay_case_v1', {
        publicationPolicyId: 'dnm-publication-v1',
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        now: Date.parse('2026-06-26T02:20:15.000Z'),
    });
    const authorization = createInterpretivePublicationAuthorization(sourceRequest, {
        qualificationId: qualification.qualification.qualificationId,
        authorizedBy: 'user:Chris',
        expiresAt: Date.parse('2026-06-26T03:20:00.000Z'),
        now: Date.parse('2026-06-26T02:20:20.000Z'),
    });
    const executed = executeInterpretivePublicationAuthorization(sourceRequest, {
        publicationAuthorizationId: authorization.authorization.publicationAuthorizationId,
        now: Date.parse('2026-06-26T02:20:25.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    replayInterpretiveLedger(buildRequest(targetRoot));
    const replayed = replayPublicationLedger(buildRequest(targetRoot));
    assert.equal(replayed.ok, true);
    assert.equal(replayed.replayedPublicationPolicies.length, 1);
    assert.equal(replayed.replayedPublicationAuthorizations.length, 1);
    assert.equal(replayed.replayedPublishedRecords.length, 1);
    assert.equal(replayed.replayedPublicationAuthorizations[0].status, 'CONSUMED');
    assert.equal(replayed.replayedPublishedRecords[0].dnmRecordId, executed.publishedRecord.dnmRecordId);

    const replayedCandidate = getInterpretiveCandidate(buildRequest(targetRoot), 'interprev_publish_replay_case_v1');
    assert.equal(replayedCandidate.interpretation.publicationState, 'PUBLISHED');
    assert.equal(replayedCandidate.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');
});
