import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLineageDecision } from './branch-lineage-decision.js';

const suggestion = {
    state: 'REVIEW_REQUIRED',
    reason: 'LIKELY_FORK_EXACT_PREFIX',
    proposedParentSourceLogicalId: 'parent',
    proposedChildSourceLogicalId: 'child',
    matchedPrefixLength: 3,
    forkAnchor: { messageIndex: 2, contentHash: 'sha256:b' },
};

const metadata = { operatorActionId: 'operator-1', recordedAt: '2026-09-20T00:00:00.000Z' };

test('accept proposed records an append-ready lineage decision', () => {
    const result = prepareLineageDecision({
        suggestion,
        decision: 'ACCEPT_PROPOSED',
        ...metadata,
        parentSourceLogicalId: 'parent',
        forkAnchor: { messageIndex: 2, contentHash: 'sha256:b' },
    });
    assert.equal(result.state, 'DECISION_READY');
    assert.equal(result.appendRequired, true);
    assert.equal(result.parentSourceLogicalId, 'parent');
});

test('leave independent is explicit and carries no parentage', () => {
    const result = prepareLineageDecision({ suggestion, decision: 'LEAVE_INDEPENDENT', ...metadata });
    assert.equal(result.state, 'DECISION_READY');
    assert.equal(result.parentSourceLogicalId, null);
    assert.equal(result.forkAnchor, null);
});

test('chosen parent requires a complete explicit selection', () => {
    assert.equal(prepareLineageDecision({ suggestion, decision: 'CHOOSE_PARENT', ...metadata }).reason, 'LINEAGE_SELECTION_INCOMPLETE');
});

test('invalid suggestion, decision, or operator metadata refuses', () => {
    assert.equal(prepareLineageDecision({ decision: 'ACCEPT_PROPOSED', ...metadata }).reason, 'SUGGESTION_UNAVAILABLE');
    assert.equal(prepareLineageDecision({ suggestion, decision: 'GUESS', ...metadata }).reason, 'LINEAGE_DECISION_INVALID');
    assert.equal(prepareLineageDecision({ suggestion, decision: 'REJECT', recordedAt: metadata.recordedAt }).reason, 'OPERATOR_ACTION_METADATA_UNAVAILABLE');
});

test('incomplete suggestion evidence refuses every decision type', () => {
    for (const decision of ['ACCEPT_PROPOSED', 'CHOOSE_PARENT', 'LEAVE_INDEPENDENT', 'REJECT']) {
        assert.equal(prepareLineageDecision({ suggestion: { ...suggestion, proposedParentSourceLogicalId: null }, decision, ...metadata, parentSourceLogicalId: 'parent', forkAnchor: { messageIndex: 2, contentHash: 'sha256:b' } }).reason, 'SUGGESTION_EVIDENCE_INCOMPLETE');
    }
});

test('accept proposed uses the suggestion evidence', () => {
    const result = prepareLineageDecision({ suggestion, decision: 'ACCEPT_PROPOSED', ...metadata, parentSourceLogicalId: 'wrong', forkAnchor: { messageIndex: 99, contentHash: 'wrong' } });
    assert.equal(result.parentSourceLogicalId, 'parent');
    assert.deepEqual(result.forkAnchor, { messageIndex: 2, contentHash: 'sha256:b' });
});
