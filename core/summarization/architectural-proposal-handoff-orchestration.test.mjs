import assert from 'node:assert/strict';
import test from 'node:test';

import {
    openPreparedArchitecturalProposalHandoff,
    prepareArchitecturalProposalHandoff,
} from './architectural-proposal-handoff-orchestration.js';

test('saved Architectural shard opens Review on the exact admitted proposal revision', async () => {
    const savedShard = { outputUID: 'saved-shard-success', content: 'persisted canonical shard' };
    const calls = [];
    const handoff = await prepareArchitecturalProposalHandoff({
        didSave: true,
        savedOutputUID: savedShard.outputUID,
        activeChatId: 'chat-success',
        authorityResult: { committed: true, projectionMetadata: { memoryScopeId: 'scope-success' } },
    }, {
        shouldCreateProposal: () => true,
        createReviewLaunchRequest: async (request) => {
            calls.push(['admit', request]);
            return { interpretationRevisionId: 'interprev_exact_success_v1' };
        },
        warnOperator: (message) => calls.push(['warn', message]),
    });
    const opened = openPreparedArchitecturalProposalHandoff(handoff, {
        openReview: (request) => calls.push(['open', request]),
    });

    assert.equal(opened, true);
    assert.deepEqual(calls.map(([operation]) => operation), ['admit', 'open']);
    assert.equal(calls[0][1].outputUID, savedShard.outputUID);
    assert.deepEqual(calls[1][1], {
        interpretationRevisionId: 'interprev_exact_success_v1',
        detailView: 'review',
    });
    assert.deepEqual(savedShard, { outputUID: 'saved-shard-success', content: 'persisted canonical shard' });
});

test('refused proposal preserves the saved shard, warns, and never opens Review', async () => {
    const savedShard = { outputUID: 'saved-shard-blocked', content: 'persisted canonical shard' };
    const calls = [];
    const handoff = await prepareArchitecturalProposalHandoff({
        didSave: true,
        savedOutputUID: savedShard.outputUID,
        activeChatId: 'chat-blocked',
        authorityResult: { committed: true, projectionMetadata: { memoryScopeId: 'scope-blocked' } },
    }, {
        shouldCreateProposal: () => true,
        createReviewLaunchRequest: async () => ({
            interpretationRevisionId: '',
            userMessage: 'Shard saved; no proposal created. Review the source evidence before retrying.',
        }),
        warnOperator: (message) => calls.push(['warn', message]),
    });
    const opened = openPreparedArchitecturalProposalHandoff(handoff, {
        openReview: (request) => calls.push(['open', request]),
    });

    assert.equal(handoff.outcome, 'BLOCKED');
    assert.equal(opened, false);
    assert.deepEqual(calls, [[
        'warn',
        'Shard saved; no proposal created. Review the source evidence before retrying.',
    ]]);
    assert.deepEqual(savedShard, { outputUID: 'saved-shard-blocked', content: 'persisted canonical shard' });
});

test('subject-policy blocker opens the requirements action surface without opening Review', async () => {
    const calls = [];
    const operatorStatus = {
        governed: true,
        permittedActions: [{ action: 'ACKNOWLEDGE', label: 'Acknowledge this meaning' }],
    };
    const handoff = await prepareArchitecturalProposalHandoff({
        didSave: true,
        savedOutputUID: 'saved-shard-requirements',
        authorityResult: { committed: true },
    }, {
        shouldCreateProposal: () => true,
        createReviewLaunchRequest: async () => ({
            interpretationRevisionId: '',
            userMessage: 'Proposal requirements remain.',
            synthesisRunId: 'synthreq_requirements',
            operatorStatus,
        }),
        warnOperator: () => {},
    });
    const opened = openPreparedArchitecturalProposalHandoff(handoff, {
        openReview: () => calls.push('review'),
        openRequirements: (id, status) => calls.push(['requirements', id, status]),
    });

    assert.equal(opened, false);
    assert.deepEqual(calls, [[
        'requirements',
        'synthreq_requirements',
        operatorStatus,
    ]]);
});
