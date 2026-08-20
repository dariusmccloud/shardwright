import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getArchitecturalAuthorityWarning,
    projectArchitecturalProposalLaunchBlocker,
    shouldCreateProposalAfterAuthorityResult,
} from './architectural-proposal-launch-blocker.js';

test('continues proposal creation after reviewable authority conflicts', () => {
    for (const reason of [
        'ARCH_SCOPE_VERSION_CONFLICT',
        'ARCH_DECISION_VERSION_CONFLICT',
        'ARCH_DECISION_UNPROVEN_COLLISION',
    ]) {
        assert.equal(shouldCreateProposalAfterAuthorityResult({
            committed: false,
            reason,
            projectionMetadata: { memoryScopeId: 'scope_alpha' },
        }), true, reason);
    }
});

test('does not continue proposal creation after unsafe authority failures', () => {
    assert.equal(shouldCreateProposalAfterAuthorityResult({
        committed: false,
        reason: 'missing-chat-id',
        projectionMetadata: null,
    }), false);
    assert.equal(shouldCreateProposalAfterAuthorityResult({
        committed: false,
        reason: 'ARCH_AUTHORITY_COMMIT_BLOCKED',
        projectionMetadata: { memoryScopeId: 'scope_alpha' },
    }), false);
});

test('authority preservation notice does not promise that review was created', () => {
    const message = getArchitecturalAuthorityWarning({
        committed: false,
        reason: 'ARCH_SCOPE_VERSION_CONFLICT',
        projectionMetadata: { memoryScopeId: 'scope_alpha' },
    });

    assert.equal(message, 'Existing architectural authority was preserved.');
    assert.doesNotMatch(message, /review|proposal/ui);
});

test('projects unrelated architectural evidence as a truthful no-proposal result', () => {
    const blocker = projectArchitecturalProposalLaunchBlocker({}, {
        code: 'ARCH_NO_REVIEWABLE_INTERPRETIVE_DECISION',
    });

    assert.equal(blocker.outcome, 'NO_PROPOSAL_CREATED');
    assert.equal(blocker.title, 'Shard saved; no proposal created');
    assert.equal(blocker.reason, 'The saved shard contains no explicit role or relationship decision about this memory subject.');
    assert.match(blocker.nextStep, /Keep the shard as architectural evidence/u);
    assert.match(blocker.toastMessage, /^Shard saved; no proposal created\./u);
});

test('projects a quarantined type-unsupported proposal into a plain-language blocker', () => {
    const projection = projectArchitecturalProposalLaunchBlocker({
        synthesisRun: {
            failureCode: 'ARCH_SYNTHESIS_TYPE_UNSUPPORTED',
            proposals: [
                {
                    proposalStatus: 'QUARANTINED',
                    quarantineCode: 'ARCH_SYNTHESIS_TYPE_UNSUPPORTED',
                },
            ],
        },
    });

    assert.equal(projection.code, 'ARCH_SYNTHESIS_TYPE_UNSUPPORTED');
    assert.equal(projection.outcome, 'BLOCKED');
    assert.match(projection.reason, /interpretation type outside the approved review vocabulary/i);
    assert.match(projection.nextStep, /regenerate the shard/i);
    assert.match(projection.toastMessage, /Blocked: governed proposal creation failed\./);
});

test('prefers referential drift when grounding marks the saved shard stale', () => {
    const projection = projectArchitecturalProposalLaunchBlocker({
        synthesisRun: {
            proposals: [
                {
                    proposalStatus: 'QUARANTINED',
                    quarantineCode: 'SEMANTIC_SUPPORT_INSUFFICIENT',
                    groundingEvaluation: {
                        referentialStatus: 'SOURCE_MANIFEST_DRIFT',
                    },
                },
            ],
        },
    });

    assert.equal(projection.code, 'SOURCE_MANIFEST_DRIFT');
    assert.match(projection.reason, /no longer matches/i);
});

test('maps server-side manifest missing errors even without a synthesis run payload', () => {
    const projection = projectArchitecturalProposalLaunchBlocker({}, { code: 'ARCH_SHARD_MANIFEST_MISSING' });

    assert.equal(projection.code, 'ARCH_SHARD_MANIFEST_MISSING');
    assert.match(projection.reason, /persisted manifest/i);
    assert.match(projection.nextStep, /save a fresh architectural shard/i);
});

test('prefers governed operator status over internal subject-policy refusal codes', () => {
    const projection = projectArchitecturalProposalLaunchBlocker({}, {
        code: 'ARCH_SUBJECT_POLICY_ADMISSION_INELIGIBLE',
        operatorStatus: {
            governed: true,
            eligible: false,
            provisional: false,
            status: 'This proposal is blocked and cannot advance.',
            missingRequirements: [
                'No authorized person has confirmed that this is a settled or durable conclusion.',
                'A required participant has not acknowledged the proposed meaning.',
            ],
            nextAction: 'Ask an authorized person to confirm stability and enduring value.',
        },
    });

    assert.equal(projection.code, 'SUBJECT_POLICY_REQUIREMENTS_NOT_SATISFIED');
    assert.equal(projection.title, 'This proposal is blocked and cannot advance.');
    assert.match(projection.reason, /settled or durable conclusion/u);
    assert.match(projection.reason, /required participant/u);
    assert.equal(projection.nextStep, 'Ask an authorized person to confirm stability and enduring value.');
    assert.doesNotMatch(projection.toastMessage, /ARCH_|sha256|policy hash/iu);
});
