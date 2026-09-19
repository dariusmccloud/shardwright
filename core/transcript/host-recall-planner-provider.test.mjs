import test from 'node:test';
import assert from 'node:assert/strict';
import { planHostTranscriptRecall } from './host-recall-planner-provider.js';

const request = Object.freeze({ requestId: 'g1', characterInstanceId: 'char1', queryText: 'CSP', contextWindowTokens: 80000, api: 'openai', tokenizerModel: 'gpt' });
const profile = Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 1024 });
const transports = {
    requestCandidates: async () => ({ state: 'CANDIDATES', candidates: [] }),
    requestAnchors: async () => ({ state: 'ANCHOR_RESOLUTIONS', resolutions: [] }),
    requestWindowAssembly: async () => ({ state: 'WINDOWS_ASSEMBLED', windows: [] }),
    requestPolicy: async () => ({ state: 'POLICY_EVALUATED', sufficiency: 'SUFFICIENT' }),
    requestBundle: async () => ({ state: 'BUNDLE_PRESENTED', bundleText: 'recall bundle' }),
};

test('builds a request-bound proposal from the retrieval orchestrator', async () => {
    const result = await planHostTranscriptRecall({ request, transports, capacityProfile: profile, cryptoApi: { subtle: { digest: async () => new Uint8Array(32) } } });
    assert.equal(result.state, 'PROPOSAL');
    assert.equal(result.requestId, 'g1');
    assert.equal(result.bundleText, 'recall bundle');
    assert.equal(result.injectionTarget.tag, '5_shardwright_transcript_recall');
});

test('preserves retrieval refusal without inventing a proposal', async () => {
    const result = await planHostTranscriptRecall({ request, transports: { ...transports, requestCandidates: async () => ({ state: 'CANDIDATES_UNAVAILABLE', reason: 'NO_SOURCE' }) }, capacityProfile: profile });
    assert.deepEqual(result, { state: 'DECLINED', reason: 'CANDIDATE_SELECTION:CANDIDATES_UNAVAILABLE:NO_SOURCE', requestId: 'g1' });
});
