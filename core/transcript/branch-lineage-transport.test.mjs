import test from 'node:test';
import assert from 'node:assert/strict';
import { appendBranchLineageDecision, listBranchLineageDecisions, suggestBranchLineage } from './branch-lineage-transport.js';

function fetchFixture(result, ok = true) {
    return async (path) => ({ ok: path === '/csrf-token' ? true : ok, async json() { return path === '/csrf-token' ? { token: 'csrf' } : result; } });
}

const decision = { state: 'DECISION_READY', decision: 'LEAVE_INDEPENDENT', operatorActionId: 'operator-1' };

test('lists lineage decisions through the authenticated route', async () => {
    const result = await listBranchLineageDecisions(fetchFixture({ ok: true, entries: [{ sequence: 1 }] }));
    assert.deepEqual(result, { state: 'LISTED', entries: [{ sequence: 1 }] });
});

test('appends a ready decision and distinguishes idempotent response', async () => {
    const appended = await appendBranchLineageDecision(decision, fetchFixture({ ok: true, appended: true, entry: { sequence: 1 } }));
    assert.equal(appended.state, 'APPENDED');
    const idempotent = await appendBranchLineageDecision(decision, fetchFixture({ ok: true, appended: false, entry: { sequence: 1 } }));
    assert.equal(idempotent.state, 'IDEMPOTENT');
});

test('refuses invalid input and transport failure', async () => {
    assert.equal((await appendBranchLineageDecision({ state: 'REFUSED' }, fetchFixture({}))).reason, 'LINEAGE_APPEND_INPUT_INVALID');
    assert.equal((await listBranchLineageDecisions(fetchFixture({}, false))).reason, 'LINEAGE_LIST_ROUTE_REFUSED');
});

test('requests a review-only fork suggestion for two or more sources', async () => {
    const result = await suggestBranchLineage(['source-a', 'source-b'], fetchFixture({ ok: true, state: 'REVIEW_REQUIRED', reason: 'LIKELY_FORK_EXACT_PREFIX' }));
    assert.equal(result.state, 'REVIEW_REQUIRED');
    const setResult = await suggestBranchLineage(['source-a', 'source-b', 'source-c'], fetchFixture({ ok: true, state: 'REVIEW_REQUIRED_SET', reason: 'LIKELY_FORK_SET', suggestions: [] }));
    assert.equal(setResult.state, 'REVIEW_REQUIRED_SET');
    assert.equal((await suggestBranchLineage(['source-a'], fetchFixture({}))).reason, 'FORK_SUGGESTION_INPUT_INVALID');
});
