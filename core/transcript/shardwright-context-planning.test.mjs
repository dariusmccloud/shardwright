import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createShardwrightCanonicalProposalPayload,
    createShardwrightTranscriptRecallProposal,
    createShardwrightTranscriptRecallProposalFromBundle,
    createShardwrightPlanningRequest,
    finalizeShardwrightTranscriptRecallCapacity,
    getShardwrightPlanningRequestRefusalReason,
    hashShardwrightCanonicalProposal,
    materializeShardwrightTranscriptRecallForDispatch,
    measureShardwrightTranscriptRecallProposal,
    normalizeShardwrightPlanningResponse,
    requestShardwrightTranscriptRecallPlan,
    requestShardwrightTranscriptCandidates,
    requestShardwrightTranscriptAnchors,
    requestShardwrightTranscriptContextWindow,
    requestShardwrightTranscriptWindowAssembly,
    requestShardwrightTranscriptBundle,
    measureAndFinalizeShardwrightTranscriptRecallProposal,
    materializeApprovedShardwrightTranscriptRecall,
    requestShardwrightCharacterInstanceId,
    SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
} from './shardwright-context-planning.js';

test('retrieves character-scoped candidates through the authenticated route only', async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => { calls.push({ url, options }); return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'CANDIDATES', candidates: [{ documentId: 'doc-1' }], availableCandidateCount: 1, candidateLimit: 24, truncated: false }; } }; };
    const result = await requestShardwrightTranscriptCandidates({ request: request(), fetchImpl });
    assert.equal(result.state, 'CANDIDATES'); assert.equal(result.candidates.length, 1);
    assert.equal(calls[1].url, '/api/plugins/shardwright-memory/transcript-recall/candidates');
    assert.deepEqual(JSON.parse(calls[1].options.body), { characterInstanceId: 'character:jeep', queryText: 'current user message', posture: 'CONTINUITY', candidateLimit: 24 });
});

test('refuses candidate retrieval without a frozen bound request or route success', async () => {
    const invalid = await requestShardwrightTranscriptCandidates({ request: { characterInstanceId: 'character:jeep', queryText: 'x' } });
    assert.equal(invalid.reason, 'CANDIDATE_INPUT_INVALID');
    const refused = await requestShardwrightTranscriptCandidates({ request: request(), fetchImpl: async (url) => ({ ok: url === '/csrf-token', async json() { return {}; } }) });
    assert.equal(refused.reason, 'CANDIDATE_ROUTE_REFUSED');
});

test('transports only an explicit frozen selection and anchor limit', async () => {
    const selection = Object.freeze({ posture: 'CONTINUITY', candidates: Object.freeze([]) });
    const calls = [];
    const fetchImpl = async (url, options = {}) => { calls.push({ url, options }); return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'ANCHORS_RESOLVED', anchors: [] }; } }; };
    const result = await requestShardwrightTranscriptAnchors({ selection, anchorOccurrenceLimit: 1, fetchImpl });
    assert.equal(result.state, 'ANCHORS_RESOLVED');
    assert.deepEqual(JSON.parse(calls[1].options.body), { selection, anchorOccurrenceLimit: 1 });
});

test('refuses mutable selection or anchor route refusal', async () => {
    assert.equal((await requestShardwrightTranscriptAnchors({ selection: { posture: 'CONTINUITY' } })).reason, 'ANCHOR_INPUT_INVALID');
    const selection = Object.freeze({ posture: 'CONTINUITY', candidates: Object.freeze([]) });
    const refused = await requestShardwrightTranscriptAnchors({ selection, fetchImpl: async (url) => ({ ok: url === '/csrf-token', async json() { return {}; } }) });
    assert.equal(refused.reason, 'ANCHOR_ROUTE_REFUSED');
});

test('transports one explicit anchor window request without selecting or combining sources', async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => { calls.push({ url, options }); return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'WINDOW_RECONSTRUCTED', rows: [{ messageRecordId: 'msg-1' }], omissions: [] }; } }; };
    const result = await requestShardwrightTranscriptContextWindow({ characterInstanceId: 'character:jeep', documentId: 'doc-1', anchorMessageRecordId: 'msg-1', posture: 'CONTINUITY', before: 2, after: 3, fetchImpl });
    assert.equal(result.state, 'WINDOW_RECONSTRUCTED'); assert.equal(result.rows.length, 1);
    assert.deepEqual(JSON.parse(calls[1].options.body), { characterInstanceId: 'character:jeep', documentId: 'doc-1', anchorMessageRecordId: 'msg-1', posture: 'CONTINUITY', before: 2, after: 3 });
});

test('refuses incomplete window input or route refusal', async () => {
    assert.equal((await requestShardwrightTranscriptContextWindow({ characterInstanceId: 'character:jeep', documentId: 'doc-1' })).reason, 'WINDOW_INPUT_INVALID');
    const refused = await requestShardwrightTranscriptContextWindow({ characterInstanceId: 'character:jeep', documentId: 'doc-1', anchorMessageRecordId: 'msg-1', fetchImpl: async (url) => ({ ok: url === '/csrf-token', async json() { return {}; } }) });
    assert.equal(refused.reason, 'WINDOW_ROUTE_REFUSED');
});

test('transports complete explicit selection, anchors, and bounds to window assembly', async () => {
    const selection = Object.freeze({ posture: 'CONTINUITY', candidates: Object.freeze([]) }); const anchors = [{ documentId: 'doc-1', anchorMessageRecordId: 'msg-1' }];
    const calls = []; const fetchImpl = async (url, options = {}) => { calls.push({ url, options }); return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'WINDOWS_ASSEMBLED', windows: [] }; } }; };
    const result = await requestShardwrightTranscriptWindowAssembly({ selection, anchors, before: 2, after: 3, fetchImpl }); assert.equal(result.state, 'WINDOWS_ASSEMBLED'); assert.deepEqual(JSON.parse(calls[1].options.body), { selection, anchors, before: 2, after: 3 });
});

test('refuses incomplete assembly input or route refusal', async () => {
    assert.equal((await requestShardwrightTranscriptWindowAssembly({ selection: Object.freeze({}) })).reason, 'WINDOW_ASSEMBLY_INPUT_INVALID');
    const selection = Object.freeze({ posture: 'CONTINUITY', candidates: Object.freeze([]) }); const refused = await requestShardwrightTranscriptWindowAssembly({ selection, anchors: [{ documentId: 'd', anchorMessageRecordId: 'm' }], fetchImpl: async (url) => ({ ok: url === '/csrf-token', async json() { return {}; } }) }); assert.equal(refused.reason, 'WINDOW_ASSEMBLY_ROUTE_REFUSED');
});

test('transports only a frozen assembled-window result to bundle presentation', async () => {
    const assembly = Object.freeze({ state: 'WINDOWS_ASSEMBLED', windows: Object.freeze([]) }); const calls = [];
    const fetchImpl = async (url, options = {}) => { calls.push({ url, options }); return { ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf' } : { ok: true, state: 'BUNDLE_PRESENTED', bundleText: 'assembled text' }; } }; };
    const result = await requestShardwrightTranscriptBundle({ assembly, fetchImpl }); assert.equal(result.state, 'BUNDLE_PRESENTED'); assert.deepEqual(JSON.parse(calls[1].options.body), { assembly });
});

test('refuses mutable bundle input or presentation refusal', async () => {
    assert.equal((await requestShardwrightTranscriptBundle({ assembly: {} })).reason, 'BUNDLE_INPUT_INVALID');
    const assembly = Object.freeze({ state: 'WINDOWS_ASSEMBLED', windows: Object.freeze([]) }); const refused = await requestShardwrightTranscriptBundle({ assembly, fetchImpl: async (url) => ({ ok: url === '/csrf-token', async json() { return {}; } }) }); assert.equal(refused.reason, 'BUNDLE_ROUTE_REFUSED');
});

test('measures and finalizes one bound proposal through the exact capacity gate', async () => {
    const p = Object.freeze({ ...(await proposal()), reason: 'PROPOSAL_ADMITTED' }); let staged = ''; let restored = 0;
    const result = await measureAndFinalizeShardwrightTranscriptRecallProposal({ request: request(), proposal: p, baselinePrompt: ['base'], stageContribution: async (text) => { staged = text; }, restoreTarget: async () => { restored += 1; }, assemblePrompt: async () => ['base', staged], countPrompt: async (prompt) => prompt.length === 1 ? 10 : 12 });
    assert.equal(result.state, 'APPROVED'); assert.equal(result.contributionTokens, 2); assert.equal(restored, 1);
});

test('returns complete-bundle refusal when the measured proposal exceeds capacity', async () => {
    const p = Object.freeze({ ...(await proposal()), reason: 'PROPOSAL_ADMITTED' }); const result = await measureAndFinalizeShardwrightTranscriptRecallProposal({ request: request(), proposal: p, baselinePrompt: ['base'], stageContribution: async () => {}, restoreTarget: async () => {}, assemblePrompt: async () => ['base', 'large'], countPrompt: async (prompt) => prompt.length === 1 ? 99999 : 100001 });
    assert.equal(result.state, 'BUNDLE_OVER_CAPACITY'); assert.equal(result.reason, 'EXACT_CAPACITY_EXCEEDED');
});

test('materializes one approved bundle and restores the dedicated slot', async () => {
    const proposalValue = Object.freeze({ ...(await proposal()), reason: 'PROPOSAL_ADMITTED' });
    const approval = Object.freeze({ state: 'APPROVED', reason: 'EXACT_CAPACITY_APPROVED', requestId: 'request-1', injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET, bundleHash: proposalValue.bundleHash, capacityProfile: proposalValue.capacityProfile });
    let restored = 0;
    const result = await materializeApprovedShardwrightTranscriptRecall({ request: request(), proposal: proposalValue, approval, stageContribution: async () => {}, restoreTarget: async () => { restored += 1; }, assemblePrompt: async () => [['final'], { total: 1 }] });
    assert.equal(result.state, 'MATERIALIZED'); assert.equal(restored, 1); assert.deepEqual(result.prompt, ['final']);
});

function request() {
    return createShardwrightPlanningRequest({
        requestId: 'request-1',
        api: 'openai',
        tokenizerModel: 'test-tokenizer',
        contextWindowTokens: 100000,
        characterInstanceId: 'character:jeep',
        queryText: 'current user message',
    });
}

test('resolves an explicitly supplied binding token without inferring identity', async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') return { ok: true, async json() { return { token: 'csrf-1' }; } };
        return { ok: true, async json() { return { ok: true, characterInstanceId: 'character:jeep' }; } };
    };
    assert.equal(await requestShardwrightCharacterInstanceId('operator:jeep', fetchImpl), 'character:jeep');
    assert.equal(calls[1].url, '/api/plugins/shardwright-memory/transcript-recall/character-binding');
    assert.equal(calls[1].options.headers['x-csrf-token'], 'csrf-1');
    assert.deepEqual(JSON.parse(calls[1].options.body), { bindingToken: 'operator:jeep' });
});

test('fails closed for missing, unresolved, or malformed binding responses', async () => {
    assert.equal(await requestShardwrightCharacterInstanceId(' ', async () => null), null);
    const unresolved = async (url) => ({ ok: url === '/csrf-token', async json() { return url === '/csrf-token' ? { token: 'csrf-1' } : { ok: false }; } });
    assert.equal(await requestShardwrightCharacterInstanceId('unknown', unresolved), null);
    const malformed = async (url) => ({ ok: true, async json() { return url === '/csrf-token' ? { token: 'csrf-1' } : { ok: true }; } });
    assert.equal(await requestShardwrightCharacterInstanceId('token', malformed), null);
});

async function proposal(overrides = {}) {
    const capacityProfile = Object.freeze({
        retrievalCeilingTokens: 24576,
        safetyHeadroomTokens: 0,
        ...overrides.capacityProfile,
    });
    const fields = {
        schemaVersion: 1,
        state: 'PROPOSAL',
        requestId: 'request-1',
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        bundleText: 'Exact recall contribution.',
        capacityProfile,
        ...overrides,
    };
    const bundleHash = overrides.bundleHash || await hashShardwrightCanonicalProposal(
        createShardwrightCanonicalProposalPayload(fields),
    );
    return Object.freeze({ ...fields, bundleHash });
}

test('preserves ordinary dispatch eligibility when no Shardwright planner is present', async () => {
    const result = await requestShardwrightTranscriptRecallPlan({ request: request(), targetEmpty: true, runtime: {} });
    assert.equal(result.state, 'DECLINED');
    assert.equal(result.reason, 'NO_SHARDWRIGHT_PLANNER');
});

test('uses an exact server digest when Web Crypto is unavailable', async () => {
    const payload = 'canonical payload';
    const expected = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    assert.equal(await hashShardwrightCanonicalProposal(payload, {}, async (received) => received === payload ? expected : null), expected);
    assert.equal(await hashShardwrightCanonicalProposal(payload, {}, async () => 'not-a-digest'), null);
});

test('constructs a frozen request-bound proposal with the exact canonical hash', async () => {
    const result = await createShardwrightTranscriptRecallProposal({
        request: request(),
        bundleText: 'Exact assembled transcript bundle.',
        capacityProfile: Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 0 }),
    });
    assert.equal(result.state, 'PROPOSAL');
    assert.equal(result.requestId, 'request-1');
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.capacityProfile), true);
    assert.deepEqual(await normalizeShardwrightPlanningResponse(request(), result), { state: 'PROPOSAL', reason: 'PROPOSAL_ADMITTED', requestId: 'request-1', injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET, bundleText: 'Exact assembled transcript bundle.', bundleHash: result.bundleHash, capacityProfile: result.capacityProfile });
});

test('binds a frozen presented bundle into the existing request-bound proposal', async () => {
    const result = await createShardwrightTranscriptRecallProposalFromBundle({ request: request(), bundle: Object.freeze({ state: 'BUNDLE', bundleText: 'Presented custody bundle.' }), capacityProfile: Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 0 }) });
    assert.equal(result.state, 'PROPOSAL'); assert.equal(result.bundleText, 'Presented custody bundle.'); assert.equal(Object.isFrozen(result), true);
});

test('refuses mutable, empty, or non-bundle presentation input', async () => {
    const result = await createShardwrightTranscriptRecallProposalFromBundle({ request: request(), bundle: { state: 'BUNDLE', bundleText: 'x' }, capacityProfile: Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 0 }) });
    assert.equal(result.reason, 'BUNDLE_INPUT_INVALID');
});

test('refuses incomplete proposal inputs without producing a hash', async () => {
    const result = await createShardwrightTranscriptRecallProposal({ request: request(), bundleText: '', capacityProfile: Object.freeze({ retrievalCeilingTokens: 24576, safetyHeadroomTokens: 0 }) });
    assert.deepEqual(result, { state: 'PROPOSAL_INVALID', reason: 'PROPOSAL_INPUT_INVALID', requestId: 'request-1', injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET });
});

test('keeps each unavailable planning input diagnostically distinct without creating a request', async () => {
    const input = { requestId: '', api: 'openai', tokenizerModel: 'test-tokenizer', contextWindowTokens: 100000 };
    assert.equal(getShardwrightPlanningRequestRefusalReason(input), 'REQUEST_ID_UNAVAILABLE');
    assert.equal(createShardwrightPlanningRequest(input), null);
    const result = await requestShardwrightTranscriptRecallPlan({
        request: null,
        targetEmpty: true,
        requestFailureReason: getShardwrightPlanningRequestRefusalReason(input),
    });
    assert.equal(result.reason, 'REQUEST_ID_UNAVAILABLE');
});

test('refuses missing explicit character binding or current-user query', () => {
    const base = { requestId: 'request-1', api: 'openai', tokenizerModel: 'test-tokenizer', contextWindowTokens: 100000 };
    assert.equal(getShardwrightPlanningRequestRefusalReason({ ...base, queryText: 'current user message' }), 'CHARACTER_INSTANCE_UNAVAILABLE');
    assert.equal(getShardwrightPlanningRequestRefusalReason({ ...base, characterInstanceId: 'character:jeep' }), 'QUERY_UNAVAILABLE');
    assert.equal(createShardwrightPlanningRequest({ ...base, characterInstanceId: 'character:jeep', queryText: '   ' }), null);
});

test('refuses a mutable or mismatched decline response without accepting a proposal', async () => {
    const mismatched = Object.freeze({
        state: 'DECLINED',
        reason: 'NO_TRANSCRIPT_PROPOSAL',
        requestId: 'other-request',
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
    });
    const result = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => mismatched } } },
    });
    assert.deepEqual(result, {
        state: 'PROPOSAL_INVALID',
        reason: 'REQUEST_BINDING_MISMATCH',
        requestId: 'request-1',
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
    });
});

test('refuses planning when the dedicated target is not empty', async () => {
    const result = await requestShardwrightTranscriptRecallPlan({ request: request(), targetEmpty: false, runtime: {} });
    assert.equal(result.reason, 'PLANNING_TARGET_NOT_EMPTY');
});

test('admits exactly one frozen hash-bound proposal without injecting it', async () => {
    const response = await proposal();
    const result = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => response } } },
    });
    assert.deepEqual(result, {
        state: 'PROPOSAL',
        reason: 'PROPOSAL_ADMITTED',
        requestId: 'request-1',
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        bundleText: 'Exact recall contribution.',
        bundleHash: response.bundleHash,
        capacityProfile: response.capacityProfile,
    });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.injectionTarget), true);
    assert.equal(Object.isFrozen(result.capacityProfile), true);
});

test('refuses mutable, changed, or mismatched proposal values before measurement', async () => {
    const valid = await proposal();
    const cases = [
        { response: { ...valid }, reason: 'REQUEST_BINDING_MISMATCH' },
        { response: await proposal({ bundleText: 'Changed after hashing.', bundleHash: valid.bundleHash }), reason: 'BUNDLE_HASH_MISMATCH' },
        { response: await proposal({ requestId: 'other-request' }), reason: 'REQUEST_BINDING_MISMATCH' },
        { response: await proposal({ injectionTarget: Object.freeze({ kind: 'variable', tag: 'shardwright_transcript_recall' }) }), reason: 'REQUEST_BINDING_MISMATCH' },
    ];
    for (const { response, reason } of cases) {
        const result = await requestShardwrightTranscriptRecallPlan({
            request: request(),
            targetEmpty: true,
            runtime: { Shardwright: { contextPlanning: { plan: async () => response } } },
        });
        assert.equal(result.state, 'PROPOSAL_INVALID');
        assert.equal(result.reason, reason);
        assert.equal(result.requestId, 'request-1');
    }
});

test('measures an admitted proposal from the host-reassembled final prompt and restores the target', async () => {
    const admitted = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => await proposal() } } },
    });
    const staged = [];
    const restored = [];
    const result = await measureShardwrightTranscriptRecallProposal({
        request: request(),
        proposal: admitted,
        baselinePrompt: [{ role: 'system', content: 'Baseline.' }],
        stageContribution: async (text) => staged.push(text),
        restoreTarget: async () => restored.push('restored'),
        assemblePrompt: async () => [{ role: 'system', content: 'Baseline.' }, { role: 'system', content: 'Exact recall contribution.' }],
        countPrompt: async (prompt) => prompt.length === 1 ? 100 : 137,
    });
    assert.equal(result.state, 'PROPOSAL');
    assert.equal(result.reason, 'PROPOSAL_MEASURED');
    assert.equal(result.baselinePromptTokens, 100);
    assert.equal(result.contributionTokens, 37);
    assert.equal(result.finalPromptTokens, 137);
    assert.equal(result.promptTokenCeiling, 100000);
    assert.deepEqual(staged, ['Exact recall contribution.']);
    assert.deepEqual(restored, ['restored']);
});

test('refuses unavailable measurement and still restores the staged target', async () => {
    const admitted = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => await proposal() } } },
    });
    let restored = false;
    const result = await measureShardwrightTranscriptRecallProposal({
        request: request(),
        proposal: admitted,
        baselinePrompt: [{ role: 'system', content: 'Baseline.' }],
        stageContribution: async () => {},
        restoreTarget: async () => { restored = true; },
        assemblePrompt: async () => { throw new Error('host assembly unavailable'); },
        countPrompt: async () => 0,
    });
    assert.deepEqual(result, {
        state: 'BUDGET_UNAVAILABLE',
        reason: 'HOST_MEASUREMENT_FAILED',
        requestId: 'request-1',
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
    });
    assert.equal(restored, true);
});

test('approves only a measured bundle that fits the host ceiling and declared profile', async () => {
    const admitted = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => await proposal() } } },
    });
    const measurement = Object.freeze({
        ...admitted,
        reason: 'PROPOSAL_MEASURED',
        baselinePromptTokens: 100,
        contributionTokens: 37,
        finalPromptTokens: 137,
        promptTokenCeiling: 100000,
    });
    const receipt = finalizeShardwrightTranscriptRecallCapacity({ request: request(), measurement });
    assert.equal(receipt.state, 'APPROVED');
    assert.equal(receipt.reason, 'EXACT_CAPACITY_APPROVED');
    assert.equal(receipt.usableRetrievalTokens, 24576);
    assert.equal(receipt.shortfallTokens, 0);
});

test('returns BUNDLE_OVER_CAPACITY without partial fallback when exact capacity does not fit', async () => {
    const admitted = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => await proposal() } } },
    });
    const tightRequest = Object.freeze({ ...request(), contextWindowTokens: 80000 });
    const measurement = Object.freeze({
        ...admitted,
        reason: 'PROPOSAL_MEASURED',
        baselinePromptTokens: 79844,
        contributionTokens: 268,
        finalPromptTokens: 80112,
        promptTokenCeiling: 80000,
    });
    const receipt = finalizeShardwrightTranscriptRecallCapacity({ request: tightRequest, measurement });
    assert.equal(receipt.state, 'BUNDLE_OVER_CAPACITY');
    assert.equal(receipt.reason, 'EXACT_CAPACITY_EXCEEDED');
    assert.equal(receipt.usableRetrievalTokens, 156);
    assert.equal(receipt.shortfallTokens, 112);
});

test('refuses a measurement whose token or request binding does not survive to finalization', async () => {
    const result = finalizeShardwrightTranscriptRecallCapacity({
        request: request(),
        measurement: Object.freeze({
            state: 'PROPOSAL',
            reason: 'PROPOSAL_MEASURED',
            requestId: 'other-request',
            injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        }),
    });
    assert.equal(result.state, 'PROPOSAL_INVALID');
    assert.equal(result.reason, 'MEASUREMENT_BINDING_INVALID');
});

async function approvedMaterialization() {
    const admitted = await requestShardwrightTranscriptRecallPlan({
        request: request(),
        targetEmpty: true,
        runtime: { Shardwright: { contextPlanning: { plan: async () => await proposal() } } },
    });
    const measurement = Object.freeze({
        ...admitted,
        reason: 'PROPOSAL_MEASURED',
        baselinePromptTokens: 100,
        contributionTokens: 37,
        finalPromptTokens: 137,
        promptTokenCeiling: 100000,
    });
    return { admitted, approval: finalizeShardwrightTranscriptRecallCapacity({ request: request(), measurement }) };
}

test('materializes exactly one matching approved bundle and restores the slot before dispatch', async () => {
    const { admitted, approval } = await approvedMaterialization();
    const calls = [];
    const result = await materializeShardwrightTranscriptRecallForDispatch({
        request: request(), proposal: admitted, approval,
        stageContribution: async (text) => calls.push(['stage', text]),
        assemblePrompt: async () => [[{ role: 'system', content: 'Exact recall contribution.' }], { total: 137 }],
        restoreTarget: async () => calls.push(['restore']),
    });
    assert.equal(result.state, 'MATERIALIZED');
    assert.equal(result.reason, 'EXACT_APPROVED_BUNDLE_MATERIALIZED');
    assert.equal(result.bundleHash, admitted.bundleHash);
    assert.deepEqual(result.prompt, [{ role: 'system', content: 'Exact recall contribution.' }]);
    assert.deepEqual(calls, [['stage', 'Exact recall contribution.'], ['restore']]);
});

test('refuses mismatched approved materialization before touching the target', async () => {
    const { admitted, approval } = await approvedMaterialization();
    let staged = false;
    let assembled = false;
    const result = await materializeShardwrightTranscriptRecallForDispatch({
        request: request(), proposal: admitted,
        approval: Object.freeze({ ...approval, bundleHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
        stageContribution: async () => { staged = true; },
        assemblePrompt: async () => { assembled = true; return [[]]; },
        restoreTarget: async () => {},
    });
    assert.equal(result.state, 'PROPOSAL_INVALID');
    assert.equal(result.reason, 'DISPATCH_MATERIALIZATION_BINDING_INVALID');
    assert.equal(staged, false);
    assert.equal(assembled, false);
});

test('materialization assembly failure restores the target and refuses the bundle', async () => {
    const { admitted, approval } = await approvedMaterialization();
    let restored = false;
    const result = await materializeShardwrightTranscriptRecallForDispatch({
        request: request(), proposal: admitted, approval,
        stageContribution: async () => {},
        assemblePrompt: async () => { throw new Error('assembly failed'); },
        restoreTarget: async () => { restored = true; },
    });
    assert.equal(result.state, 'BUDGET_UNAVAILABLE');
    assert.equal(result.reason, 'DISPATCH_MATERIALIZATION_FAILED');
    assert.equal(restored, true);
});
