import test from 'node:test';
import assert from 'node:assert/strict';

import {
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

test('projects unrelated architectural evidence as a truthful no-proposal result', () => {
    const blocker = projectArchitecturalProposalLaunchBlocker({}, {
        code: 'ARCH_NO_REVIEWABLE_INTERPRETIVE_DECISION',
    });

    assert.equal(blocker.reason, 'The saved shard contains no explicit role or relationship decision about this memory subject.');
    assert.match(blocker.nextStep, /Keep the shard as architectural evidence/u);
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
