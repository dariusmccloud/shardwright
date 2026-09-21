import test from 'node:test';
import assert from 'node:assert/strict';
import { handleHostRecallBeforeDispatch } from './host-recall-before-dispatch.js';
import { TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

const invocation = Object.freeze({ state: 'ELIGIBLE', context: Object.freeze({ generationId: 'g1' }) });

test('injects approved bundle and verifies the live payload postcondition', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: `before ${TRANSCRIPT_RECALL_SENTINEL}` }] }, dryRun: false };
    const result = await handleHostRecallBeforeDispatch(payload, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'g1', bundleText: 'recall', bundleHash: 'sha256:x' }) });
    assert.equal(result.state, 'INJECTED');
    assert.equal(payload.generateData.prompt[0].content, 'before recall');
});

test('records a matching transient snapshot without making diagnostics authoritative', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: `before ${TRANSCRIPT_RECALL_SENTINEL}` }] }, dryRun: false };
    let recorded = null;
    const result = await handleHostRecallBeforeDispatch(payload, {
        getInvocation: () => invocation,
        prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'g1', bundleText: 'recall', bundleHash: 'sha256:x' }),
        recordSnapshot: async (value) => { recorded = value; },
    });
    assert.equal(result.state, 'INJECTED');
    assert.equal(recorded.payload, payload);
    assert.equal(recorded.prepared.state, 'APPROVED');
});

test('skips dry runs without planning', async () => {
    const result = await handleHostRecallBeforeDispatch({ generateData: {}, dryRun: true }, { prepare: async () => { throw new Error('must not plan'); } });
    assert.deepEqual(result, { state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
});

test('refuses when planner does not approve', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: `before ${TRANSCRIPT_RECALL_SENTINEL}` }] }, dryRun: false };
    const result = await handleHostRecallBeforeDispatch(payload, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'DECLINED', reason: 'CANDIDATE_SELECTION:NO_MATCH:REFUSED' }) });
    assert.deepEqual(result, { state: 'REFUSED', reason: 'CANDIDATE_SELECTION:NO_MATCH:REFUSED', requestId: '', evidenceState: 'NO_MATCH' });
    assert.match(payload.generateData.prompt[0].content, /state NO_MATCH \| no material supplied/u);
});

test('preserves bounded capacity facts for the refusal diagnostic', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: `before ${TRANSCRIPT_RECALL_SENTINEL}` }] }, dryRun: false };
    let recorded = null;
    const result = await handleHostRecallBeforeDispatch(payload, {
        getInvocation: () => invocation,
        prepare: async () => Object.freeze({
            state: 'BUNDLE_OVER_CAPACITY', reason: 'EXACT_CAPACITY_EXCEEDED', requestId: 'g2',
            promptTokenCeiling: 101928, baselinePromptTokens: 90000, contributionTokens: 15000,
            usableRetrievalTokens: 11928, shortfallTokens: 3072,
            capacityProfile: Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 0 }),
        }),
        recordEvidenceSnapshot: ({ result: refusal }) => { recorded = refusal; },
    });
    assert.equal(result.evidenceState, 'CAPACITY_UNAVAILABLE');
    assert.equal(recorded.promptTokenCeiling, 101928);
    assert.equal(recorded.baselinePromptTokens, 90000);
    assert.equal(recorded.capacityProfile.retrievalCeilingTokens, 24576);
});

test('refuses when sentinel postcondition cannot be verified', async () => {
    const payload = { generateData: { prompt: [{ role: 'system', content: 'no sentinel' }] }, dryRun: false };
    const result = await handleHostRecallBeforeDispatch(payload, { getInvocation: () => invocation, prepare: async () => Object.freeze({ state: 'APPROVED', requestId: 'g1', bundleText: 'recall' }) });
    assert.equal(result.state, 'REFUSED');
    assert.equal(result.reason, 'SENTINEL_NOT_FOUND');
});
