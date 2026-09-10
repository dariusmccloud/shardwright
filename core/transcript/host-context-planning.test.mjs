import assert from 'node:assert/strict';
import test from 'node:test';
import {
    declineTranscriptRecallPlan,
    clearTranscriptRecallDispatchSnapshot,
    getLatestTranscriptRecallDispatchSnapshot,
    getLatestTranscriptRecallPlanResult,
    installTranscriptRecallPlanningDeclineCapability,
    recordHostTranscriptRecallPlanResult,
    recordHostTranscriptRecallDispatchSnapshot,
    TRANSCRIPT_RECALL_PLANNING_TARGET,
} from './host-context-planning.js';

function request(overrides = {}) {
    return Object.freeze({
        schemaVersion: 1,
        requestId: 'request-1',
        measurementStage: 'PRE_DISPATCH_PLAN',
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
        ...overrides,
    });
}

test('declines exactly the dedicated Transcript Recall planning target', () => {
    const result = declineTranscriptRecallPlan(request());
    assert.deepEqual(result, {
        state: 'DECLINED',
        reason: 'NO_TRANSCRIPT_PROPOSAL',
        requestId: 'request-1',
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
    });
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(getLatestTranscriptRecallPlanResult(), result);
});

test('refuses a mutable, missing, or RAG-target planning request', () => {
    assert.deepEqual(declineTranscriptRecallPlan({}), {
        state: 'PROPOSAL_INVALID',
        reason: 'PLANNING_REQUEST_INVALID',
    });
    assert.equal(declineTranscriptRecallPlan(Object.freeze({
        requestId: 'request-1',
        measurementStage: 'PRE_DISPATCH_PLAN',
        injectionTarget: { kind: 'variable', tag: 'shardwright_rag_memory' },
    })).state, 'PROPOSAL_INVALID');
});

test('installs only the owned planning capability beneath Shardwright', () => {
    const target = {};
    const plan = installTranscriptRecallPlanningDeclineCapability(target);
    assert.equal(target.Shardwright.contextPlanning.plan, plan);
    assert.equal(target.Shardwright.contextPlanning.getLastResult, getLatestTranscriptRecallPlanResult);
    assert.equal(target.Shardwright.contextPlanning.recordHostResult, recordHostTranscriptRecallPlanResult);
    assert.equal(target.Shardwright.contextPlanning.getLastDispatchSnapshot, getLatestTranscriptRecallDispatchSnapshot);
    assert.equal(installTranscriptRecallPlanningDeclineCapability(target), plan);
    target.Shardwright.contextPlanning.plan = () => null;
    assert.throws(() => installTranscriptRecallPlanningDeclineCapability(target));
});

test('records only a frozen host result for the dedicated target', () => {
    const result = Object.freeze({
        state: 'PROPOSAL_INVALID',
        reason: 'REQUEST_BINDING_MISMATCH',
        requestId: 'request-2',
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
    });
    assert.equal(recordHostTranscriptRecallPlanResult(result), result);
    assert.equal(recordHostTranscriptRecallPlanResult({ state: 'DECLINED' }).reason, 'HOST_PLANNING_RESULT_INVALID');
});

test('records a host-admitted proposal only as transient planning state', () => {
    const result = Object.freeze({
        state: 'PROPOSAL',
        reason: 'PROPOSAL_ADMITTED',
        requestId: 'request-3',
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
    });
    assert.equal(recordHostTranscriptRecallPlanResult(result), result);
    assert.equal(getLatestTranscriptRecallPlanResult(), result);
});

test('records a frozen host capacity receipt only for the dedicated target', () => {
    const result = Object.freeze({
        state: 'BUNDLE_OVER_CAPACITY',
        reason: 'EXACT_CAPACITY_EXCEEDED',
        requestId: 'request-4',
        injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET,
    });
    assert.equal(recordHostTranscriptRecallPlanResult(result), result);
    assert.equal(getLatestTranscriptRecallPlanResult(), result);
});

test('captures one cloned final dispatch prompt only for a matching bundle', () => {
    clearTranscriptRecallDispatchSnapshot();
    const prompt = [{ role: 'system', content: 'before\n[probe]\nafter' }];
    const snapshot = recordHostTranscriptRecallDispatchSnapshot({
        context: Object.freeze({ requestId: 'request-5', injectionTarget: TRANSCRIPT_RECALL_PLANNING_TARGET, bundleHash: `sha256:${'a'.repeat(64)}`, bundleText: '[probe]' }),
        prompt,
        promptTokens: 17,
    });
    prompt[0].content = 'changed';
    assert.equal(snapshot.state, 'DISPATCH_SNAPSHOT');
    assert.equal(snapshot.bundlePresent, true);
    assert.equal(snapshot.promptTokens, 17);
    assert.equal(snapshot.prompt[0].content, 'before\n[probe]\nafter');
    assert.equal(Object.isFrozen(snapshot.prompt[0]), true);
});

test('refuses invalid dispatch snapshot input and clears on the next ordinary generation', () => {
    recordHostTranscriptRecallDispatchSnapshot({ context: Object.freeze({}), prompt: [] });
    assert.equal(getLatestTranscriptRecallDispatchSnapshot().reason, 'DISPATCH_SNAPSHOT_INPUT_INVALID');
    clearTranscriptRecallDispatchSnapshot();
    assert.equal(getLatestTranscriptRecallDispatchSnapshot(), null);
});
