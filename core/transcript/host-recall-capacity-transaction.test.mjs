import test from 'node:test';
import assert from 'node:assert/strict';
import { measureHostRecallProposal } from './host-recall-capacity-transaction.js';
import { createShardwrightTranscriptRecallProposal } from './shardwright-context-planning.js';
import { TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

const request = Object.freeze({ requestId: 'g1', api: 'openai', tokenizerModel: 'gpt', contextWindowTokens: 1000, characterInstanceId: 'c', queryText: 'q', injectionTarget: Object.freeze({ kind: 'extension_prompt', tag: '5_shardwright_transcript_recall' }), measurementStage: 'PRE_DISPATCH_PLAN' });
const profile = Object.freeze({ retrievalCeilingTokens: 90, safetyHeadroomTokens: 0 });

test('measures a cloned candidate and returns an approval without mutating the live payload', async () => {
    const raw = await createShardwrightTranscriptRecallProposal({ request, bundleText: 'recall bundle with enough measured context to exceed the sentinel safely', capacityProfile: profile, cryptoApi: { subtle: { digest: async () => new Uint8Array(32) } } });
    const proposal = Object.freeze({ ...raw, reason: 'PROPOSAL_ADMITTED' });
    const payload = { generateData: { prompt: [{ role: 'system', content: TRANSCRIPT_RECALL_SENTINEL }] } };
    const result = await measureHostRecallProposal({ request, proposal, payload, countPrompt: async (prompt) => Array.isArray(prompt) ? 100 + (prompt[0]?.content?.length || 0) : 0 });
    assert.equal(result.state, 'APPROVED');
    assert.match(payload.generateData.prompt[0].content, /sentinel/);
});

test('refuses malformed capacity profiles before measurement', async () => {
    const result = await measureHostRecallProposal({ request, proposal: { bundleText: 'bundle' }, payload: { generateData: { prompt: [] } }, capacityProfile: { retrievalCeilingTokens: 'bad', safetyHeadroomTokens: 0 }, countPrompt: async () => 0 });
    assert.equal(result.state, 'BUDGET_UNAVAILABLE');
    assert.equal(result.reason, 'MEASUREMENT_INPUT_INVALID');
});
