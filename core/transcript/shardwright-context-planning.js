export const SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET = Object.freeze({
    kind: 'extension_prompt',
    tag: '5_shardwright_transcript_recall',
});

export const SHARDWRIGHT_TRANSCRIPT_RECALL_PLACEMENT = Object.freeze({
    position: 0,
    depth: 0,
    scan: false,
    role: 0,
});

function sameTarget(value) {
    return value?.kind === SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET.kind
        && value?.tag === SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET.tag;
}

function frozenResult(state, reason, requestId = '', injectionTarget = SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET) {
    return Object.freeze({ state, reason, requestId, injectionTarget });
}

const PROPOSAL_KEYS = Object.freeze([
    'schemaVersion',
    'state',
    'requestId',
    'injectionTarget',
    'bundleText',
    'bundleHash',
    'capacityProfile',
]);
const TARGET_KEYS = Object.freeze(['kind', 'tag']);
const CAPACITY_PROFILE_KEYS = Object.freeze([
    'retrievalCeilingTokens',
    'safetyHeadroomTokens',
]);

function isFrozenPlainObjectWithKeys(value, expectedKeys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || !Object.isFrozen(value) || Object.getPrototypeOf(value) !== Object.prototype) {
        return false;
    }
    const actualKeys = Object.keys(value).sort();
    const sortedExpected = [...expectedKeys].sort();
    return actualKeys.length === sortedExpected.length
        && actualKeys.every((key, index) => key === sortedExpected[index]);
}

function isValidCapacityProfile(profile) {
    return isFrozenPlainObjectWithKeys(profile, CAPACITY_PROFILE_KEYS)
        && Number.isSafeInteger(profile.retrievalCeilingTokens)
        && profile.retrievalCeilingTokens > 0
        && Number.isSafeInteger(profile.safetyHeadroomTokens)
        && profile.safetyHeadroomTokens >= 0;
}

export function createShardwrightCanonicalProposalPayload({ requestId, injectionTarget, bundleText, capacityProfile }) {
    return JSON.stringify({
        schemaVersion: 1,
        requestId,
        injectionTarget: {
            kind: injectionTarget.kind,
            tag: injectionTarget.tag,
        },
        bundleText,
        capacityProfile: {
            retrievalCeilingTokens: capacityProfile.retrievalCeilingTokens,
            safetyHeadroomTokens: capacityProfile.safetyHeadroomTokens,
        },
    });
}

export async function createShardwrightTranscriptRecallProposal({ request, bundleText, capacityProfile, cryptoApi = globalThis.crypto, serverDigest = requestShardwrightCanonicalServerDigest } = {}) {
    if (!request || !Object.isFrozen(request) || typeof bundleText !== 'string' || !bundleText.length
        || !isValidCapacityProfile(Object.freeze({ ...capacityProfile }))) {
        return frozenResult('PROPOSAL_INVALID', 'PROPOSAL_INPUT_INVALID', request?.requestId || '');
    }
    const payload = createShardwrightCanonicalProposalPayload({
        requestId: request.requestId,
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        bundleText,
        capacityProfile,
    });
    let bundleHash;
    try {
        bundleHash = await hashShardwrightCanonicalProposal(payload, cryptoApi, serverDigest);
    } catch {
        return frozenResult('BUDGET_UNAVAILABLE', 'HASH_UNAVAILABLE', request.requestId);
    }
    if (!bundleHash) return frozenResult('BUDGET_UNAVAILABLE', 'HASH_UNAVAILABLE', request.requestId);
    return Object.freeze({
        schemaVersion: 1,
        state: 'PROPOSAL',
        requestId: request.requestId,
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        bundleText,
        bundleHash,
        capacityProfile: Object.freeze({ ...capacityProfile }),
    });
}

export async function createShardwrightTranscriptRecallProposalFromBundle({ request, bundle, capacityProfile, cryptoApi = globalThis.crypto, serverDigest = requestShardwrightCanonicalServerDigest } = {}) {
    if (!bundle || !Object.isFrozen(bundle) || bundle.state !== 'BUNDLE' || typeof bundle.bundleText !== 'string' || !bundle.bundleText.length) {
        return frozenResult('PROPOSAL_INVALID', 'BUNDLE_INPUT_INVALID', request?.requestId || '');
    }
    return createShardwrightTranscriptRecallProposal({ request, bundleText: bundle.bundleText, capacityProfile, cryptoApi, serverDigest });
}

export async function requestShardwrightCanonicalServerDigest(payload, fetchImpl = globalThis.fetch) {
    if (typeof payload !== 'string' || !payload.length || typeof fetchImpl !== 'function') return null;
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/context-planning/canonical-sha256', {
            method: 'POST', headers, body: JSON.stringify({ canonicalPayload: payload }),
        });
        const result = await response.json();
        return response.ok && result?.ok === true && result.algorithm === 'sha256'
            && /^sha256:[0-9a-f]{64}$/u.test(result.digest) ? result.digest : null;
    } catch {
        return null;
    }
}

export async function requestShardwrightCharacterInstanceId(bindingToken, fetchImpl = globalThis.fetch) {
    if (typeof bindingToken !== 'string' || !bindingToken.trim() || typeof fetchImpl !== 'function') return null;
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/character-binding', {
            method: 'POST', headers, body: JSON.stringify({ bindingToken }),
        });
        const result = await response.json();
        return response.ok && result?.ok === true && typeof result.characterInstanceId === 'string'
            && result.characterInstanceId.trim() ? result.characterInstanceId : null;
    } catch {
        return null;
    }
}

export async function requestShardwrightTranscriptCandidates({ request, posture = 'CONTINUITY', candidateLimit = 24, fetchImpl = globalThis.fetch } = {}) {
    if (!request || !Object.isFrozen(request) || typeof request.characterInstanceId !== 'string'
        || !request.characterInstanceId.trim() || typeof request.queryText !== 'string'
        || !request.queryText.trim() || !Number.isSafeInteger(candidateLimit) || candidateLimit <= 0
        || typeof fetchImpl !== 'function') return Object.freeze({ state: 'CANDIDATES_UNAVAILABLE', reason: 'CANDIDATE_INPUT_INVALID', candidates: Object.freeze([]) });
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/candidates', {
            method: 'POST', headers,
            body: JSON.stringify({ characterInstanceId: request.characterInstanceId, queryText: request.queryText, posture, candidateLimit }),
        });
        const result = await response.json();
        if (!response.ok || result?.ok !== true || !Array.isArray(result.candidates)) return Object.freeze({ state: 'CANDIDATES_UNAVAILABLE', reason: 'CANDIDATE_ROUTE_REFUSED', candidates: Object.freeze([]) });
        return Object.freeze({ state: result.state || 'CANDIDATES', reason: 'CANDIDATES_RETRIEVED', characterInstanceId: request.characterInstanceId, candidates: Object.freeze(result.candidates.map((candidate) => Object.freeze({ ...candidate }))), availableCandidateCount: result.availableCandidateCount ?? null, candidateLimit: result.candidateLimit ?? candidateLimit, truncated: result.truncated === true });
    } catch {
        return Object.freeze({ state: 'CANDIDATES_UNAVAILABLE', reason: 'CANDIDATE_ROUTE_UNAVAILABLE', candidates: Object.freeze([]) });
    }
}

export async function requestShardwrightTranscriptAnchors({ selection, anchorOccurrenceLimit = 1, fetchImpl = globalThis.fetch } = {}) {
    if (!selection || !Object.isFrozen(selection) || !Number.isSafeInteger(anchorOccurrenceLimit) || anchorOccurrenceLimit <= 0 || typeof fetchImpl !== 'function') {
        return Object.freeze({ state: 'ANCHORS_UNAVAILABLE', reason: 'ANCHOR_INPUT_INVALID' });
    }
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/anchors', { method: 'POST', headers, body: JSON.stringify({ selection, anchorOccurrenceLimit }) });
        const result = await response.json();
        if (!response.ok || result?.ok !== true) return Object.freeze({ state: 'ANCHORS_UNAVAILABLE', reason: 'ANCHOR_ROUTE_REFUSED' });
        const { ok, ...payload } = result;
        return Object.freeze(payload);
    } catch {
        return Object.freeze({ state: 'ANCHORS_UNAVAILABLE', reason: 'ANCHOR_ROUTE_UNAVAILABLE' });
    }
}

export async function requestShardwrightTranscriptContextWindow({ characterInstanceId, documentId, anchorMessageRecordId, posture = 'CONTINUITY', before = 2, after = 2, fetchImpl = globalThis.fetch } = {}) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim() || typeof documentId !== 'string' || !documentId.trim()
        || typeof anchorMessageRecordId !== 'string' || !anchorMessageRecordId.trim() || !Number.isInteger(before) || before < 0
        || !Number.isInteger(after) || after < 0 || typeof fetchImpl !== 'function') return Object.freeze({ state: 'WINDOW_UNAVAILABLE', reason: 'WINDOW_INPUT_INVALID' });
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/windows', { method: 'POST', headers, body: JSON.stringify({ characterInstanceId, documentId, anchorMessageRecordId, posture, before, after }) });
        const result = await response.json();
        if (!response.ok || result?.ok !== true) return Object.freeze({ state: 'WINDOW_UNAVAILABLE', reason: 'WINDOW_ROUTE_REFUSED' });
        const { ok, ...payload } = result;
        return Object.freeze(payload);
    } catch { return Object.freeze({ state: 'WINDOW_UNAVAILABLE', reason: 'WINDOW_ROUTE_UNAVAILABLE' }); }
}

export async function requestShardwrightTranscriptWindowAssembly({ selection, anchors, before = 2, after = 2, fetchImpl = globalThis.fetch } = {}) {
    if (!selection || !Object.isFrozen(selection) || !Array.isArray(anchors) || !anchors.length || !Number.isInteger(before) || before < 0 || !Number.isInteger(after) || after < 0 || typeof fetchImpl !== 'function') return Object.freeze({ state: 'WINDOW_ASSEMBLY_UNAVAILABLE', reason: 'WINDOW_ASSEMBLY_INPUT_INVALID' });
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' }; if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/window-assembly', { method: 'POST', headers, body: JSON.stringify({ selection, anchors, before, after }) });
        const result = await response.json(); if (!response.ok || result?.ok !== true) return Object.freeze({ state: 'WINDOW_ASSEMBLY_UNAVAILABLE', reason: 'WINDOW_ASSEMBLY_ROUTE_REFUSED' });
        const { ok, ...payload } = result; return Object.freeze(payload);
    } catch { return Object.freeze({ state: 'WINDOW_ASSEMBLY_UNAVAILABLE', reason: 'WINDOW_ASSEMBLY_ROUTE_UNAVAILABLE' }); }
}

export async function requestShardwrightTranscriptBundle({ assembly, fetchImpl = globalThis.fetch } = {}) {
    if (!assembly || !Object.isFrozen(assembly) || typeof fetchImpl !== 'function') return Object.freeze({ state: 'BUNDLE_UNAVAILABLE', reason: 'BUNDLE_INPUT_INVALID' });
    try {
        const csrfResponse = await fetchImpl('/csrf-token', { method: 'GET', headers: { 'Cache-Control': 'no-store' } });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const headers = { 'Content-Type': 'application/json' }; if (csrfPayload?.token && csrfPayload.token !== 'disabled') headers['x-csrf-token'] = csrfPayload.token;
        const response = await fetchImpl('/api/plugins/shardwright-memory/transcript-recall/bundle', { method: 'POST', headers, body: JSON.stringify({ assembly }) });
        const result = await response.json(); if (!response.ok || result?.ok !== true) return Object.freeze({ state: 'BUNDLE_UNAVAILABLE', reason: 'BUNDLE_ROUTE_REFUSED' });
        const { ok, ...payload } = result; return Object.freeze(payload);
    } catch { return Object.freeze({ state: 'BUNDLE_UNAVAILABLE', reason: 'BUNDLE_ROUTE_UNAVAILABLE' }); }
}

export async function hashShardwrightCanonicalProposal(payload, cryptoApi = globalThis.crypto, serverDigest = requestShardwrightCanonicalServerDigest) {
    if (cryptoApi?.subtle?.digest && typeof TextEncoder === 'function') {
        const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(payload));
        return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    }
    const digest = await serverDigest?.(payload);
    return /^sha256:[0-9a-f]{64}$/u.test(digest || '') ? digest : null;
}

export function getShardwrightPlanningRequestRefusalReason({ requestId, api, tokenizerModel, contextWindowTokens, characterInstanceId, queryText }) {
    if (typeof requestId !== 'string' || !requestId.trim()) return 'REQUEST_ID_UNAVAILABLE';
    if (typeof api !== 'string' || !api.trim()) return 'API_IDENTIFIER_UNAVAILABLE';
    if (typeof tokenizerModel !== 'string' || !tokenizerModel.trim()) return 'TOKENIZER_IDENTIFIER_UNAVAILABLE';
    if (!Number.isSafeInteger(contextWindowTokens) || contextWindowTokens < 0) return 'CONTEXT_WINDOW_UNAVAILABLE';
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim()) return 'CHARACTER_INSTANCE_UNAVAILABLE';
    if (typeof queryText !== 'string' || !queryText.trim()) return 'QUERY_UNAVAILABLE';
    return null;
}

export function createShardwrightPlanningRequest(input) {
    const { requestId, api, tokenizerModel, contextWindowTokens, characterInstanceId, queryText } = input;
    if (getShardwrightPlanningRequestRefusalReason(input)) return null;
    return Object.freeze({
        schemaVersion: 1,
        requestId,
        api,
        tokenizerModel,
        contextWindowTokens,
        characterInstanceId,
        queryText,
        injectionTarget: SHARDWRIGHT_TRANSCRIPT_RECALL_TARGET,
        measurementStage: 'PRE_DISPATCH_PLAN',
    });
}

export async function normalizeShardwrightPlanningResponse(request, response, cryptoApi = globalThis.crypto) {
    if (!request || !Object.isFrozen(request)) {
        return frozenResult('PROPOSAL_INVALID', 'PLANNING_REQUEST_INVALID');
    }
    if (!response || !Object.isFrozen(response)
        || response.requestId !== request.requestId
        || !sameTarget(response.injectionTarget)) {
        return frozenResult('PROPOSAL_INVALID', 'REQUEST_BINDING_MISMATCH', request.requestId);
    }
    if (response.state === 'DECLINED') {
        return frozenResult('DECLINED', String(response.reason || 'NO_TRANSCRIPT_PROPOSAL'), request.requestId);
    }
    if (response.state !== 'PROPOSAL'
        || !isFrozenPlainObjectWithKeys(response, PROPOSAL_KEYS)
        || !isFrozenPlainObjectWithKeys(response.injectionTarget, TARGET_KEYS)
        || response.schemaVersion !== 1
        || typeof response.bundleText !== 'string'
        || !response.bundleText.length
        || !isValidCapacityProfile(response.capacityProfile)
        || !/^sha256:[0-9a-f]{64}$/u.test(response.bundleHash)) {
        return frozenResult('PROPOSAL_INVALID', 'PROPOSAL_SHAPE_INVALID', request.requestId);
    }
    const payload = createShardwrightCanonicalProposalPayload(response);
    let expectedHash;
    try {
        expectedHash = await hashShardwrightCanonicalProposal(payload, cryptoApi);
    } catch {
        return frozenResult('BUDGET_UNAVAILABLE', 'HASH_UNAVAILABLE', request.requestId);
    }
    if (!expectedHash) return frozenResult('BUDGET_UNAVAILABLE', 'HASH_UNAVAILABLE', request.requestId);
    if (response.bundleHash !== expectedHash) {
        return frozenResult('PROPOSAL_INVALID', 'BUNDLE_HASH_MISMATCH', request.requestId);
    }
    const injectionTarget = Object.freeze({ ...response.injectionTarget });
    const capacityProfile = Object.freeze({ ...response.capacityProfile });
    return Object.freeze({
        state: 'PROPOSAL',
        reason: 'PROPOSAL_ADMITTED',
        requestId: request.requestId,
        injectionTarget,
        bundleText: response.bundleText,
        bundleHash: response.bundleHash,
        capacityProfile,
    });
}

export async function requestShardwrightTranscriptRecallPlan({ request, targetEmpty, requestFailureReason = 'PLANNING_REQUEST_UNAVAILABLE', runtime = globalThis }) {
    if (!request) return frozenResult('BUDGET_UNAVAILABLE', requestFailureReason);
    if (!targetEmpty) return frozenResult('PROPOSAL_INVALID', 'PLANNING_TARGET_NOT_EMPTY', request.requestId);
    const planner = runtime?.Shardwright?.contextPlanning?.plan;
    if (typeof planner !== 'function') {
        return frozenResult('DECLINED', 'NO_SHARDWRIGHT_PLANNER', request.requestId);
    }
    try {
        return await normalizeShardwrightPlanningResponse(request, await planner(request));
    } catch (error) {
        console.warn('[Shardwright] Transcript Recall planner failed.', error);
        return frozenResult('PROPOSAL_INVALID', 'PLANNER_FAILED', request.requestId);
    }
}

function isAdmittedProposal(result, request) {
    return Boolean(result
        && Object.isFrozen(result)
        && result.state === 'PROPOSAL'
        && result.reason === 'PROPOSAL_ADMITTED'
        && result.requestId === request?.requestId
        && sameTarget(result.injectionTarget));
}

export async function measureShardwrightTranscriptRecallProposal({
    request,
    proposal,
    baselinePrompt,
    stageContribution,
    restoreTarget,
    assemblePrompt,
    countPrompt,
}) {
    if (!isAdmittedProposal(proposal, request) || !Array.isArray(baselinePrompt)
        || typeof stageContribution !== 'function' || typeof restoreTarget !== 'function'
        || typeof assemblePrompt !== 'function' || typeof countPrompt !== 'function') {
        return frozenResult('PROPOSAL_INVALID', 'MEASUREMENT_INPUT_INVALID', request?.requestId || '');
    }
    let staged = false;
    try {
        await stageContribution(proposal.bundleText);
        staged = true;
        const finalPrompt = await assemblePrompt();
        const [baselinePromptTokens, finalPromptTokens] = await Promise.all([
            countPrompt(baselinePrompt),
            countPrompt(finalPrompt),
        ]);
        if (!Array.isArray(finalPrompt)
            || !Number.isSafeInteger(baselinePromptTokens) || baselinePromptTokens < 0
            || !Number.isSafeInteger(finalPromptTokens) || finalPromptTokens < baselinePromptTokens) {
            return frozenResult('BUDGET_UNAVAILABLE', 'HOST_TOKENIZER_UNAVAILABLE', request.requestId);
        }
        return Object.freeze({
            ...proposal,
            reason: 'PROPOSAL_MEASURED',
            baselinePromptTokens,
            contributionTokens: finalPromptTokens - baselinePromptTokens,
            finalPromptTokens,
            promptTokenCeiling: request.contextWindowTokens,
        });
    } catch {
        return frozenResult('BUDGET_UNAVAILABLE', 'HOST_MEASUREMENT_FAILED', request.requestId);
    } finally {
        if (staged) await restoreTarget();
    }
}

function isMeasuredProposal(result, request) {
    return Boolean(result
        && Object.isFrozen(result)
        && result.state === 'PROPOSAL'
        && result.reason === 'PROPOSAL_MEASURED'
        && result.requestId === request?.requestId
        && sameTarget(result.injectionTarget)
        && Number.isSafeInteger(result.baselinePromptTokens) && result.baselinePromptTokens >= 0
        && Number.isSafeInteger(result.contributionTokens) && result.contributionTokens >= 0
        && Number.isSafeInteger(result.finalPromptTokens) && result.finalPromptTokens >= result.baselinePromptTokens
        && result.finalPromptTokens - result.baselinePromptTokens === result.contributionTokens
        && result.promptTokenCeiling === request.contextWindowTokens
        && isValidCapacityProfile(result.capacityProfile));
}

export function finalizeShardwrightTranscriptRecallCapacity({ request, measurement }) {
    if (!isMeasuredProposal(measurement, request)) {
        return frozenResult('PROPOSAL_INVALID', 'MEASUREMENT_BINDING_INVALID', request?.requestId || '');
    }
    const profile = measurement.capacityProfile;
    const measuredRemainingTokens = Math.max(0, request.contextWindowTokens
        - measurement.baselinePromptTokens - profile.safetyHeadroomTokens);
    const usableRetrievalTokens = Math.min(profile.retrievalCeilingTokens, measuredRemainingTokens);
    const fitsHostCeiling = measurement.finalPromptTokens <= request.contextWindowTokens;
    const fitsProfile = measurement.contributionTokens <= usableRetrievalTokens;
    const receipt = {
        requestId: request.requestId,
        injectionTarget: measurement.injectionTarget,
        bundleHash: measurement.bundleHash,
        contributionTokens: measurement.contributionTokens,
        baselinePromptTokens: measurement.baselinePromptTokens,
        finalPromptTokens: measurement.finalPromptTokens,
        promptTokenCeiling: request.contextWindowTokens,
        capacityProfile: profile,
        safetyHeadroomTokens: profile.safetyHeadroomTokens,
        measuredRemainingTokens,
        usableRetrievalTokens,
        shortfallTokens: Math.max(0, measurement.contributionTokens - usableRetrievalTokens),
    };
    if (!fitsHostCeiling || !fitsProfile) {
        return Object.freeze({
            state: 'BUNDLE_OVER_CAPACITY',
            reason: 'EXACT_CAPACITY_EXCEEDED',
            ...receipt,
        });
    }
    return Object.freeze({
        state: 'APPROVED',
        reason: 'EXACT_CAPACITY_APPROVED',
        ...receipt,
    });
}

export async function measureAndFinalizeShardwrightTranscriptRecallProposal(options = {}) {
    const measurement = await measureShardwrightTranscriptRecallProposal(options);
    if (measurement.state !== 'PROPOSAL' || measurement.reason !== 'PROPOSAL_MEASURED') return measurement;
    return finalizeShardwrightTranscriptRecallCapacity({ request: options.request, measurement });
}

function isApprovedTranscriptRecallMaterialization({ request, proposal, approval }) {
    return Boolean(isAdmittedProposal(proposal, request)
        && approval && Object.isFrozen(approval)
        && approval.state === 'APPROVED'
        && approval.reason === 'EXACT_CAPACITY_APPROVED'
        && approval.requestId === request.requestId
        && sameTarget(approval.injectionTarget)
        && approval.bundleHash === proposal.bundleHash
        && isValidCapacityProfile(approval.capacityProfile));
}

/**
 * Rebuilds one provider payload from an already approved, still-live proposal.
 * The host prompt slot is restored before dispatch; no contribution survives this call.
 */
export async function materializeShardwrightTranscriptRecallForDispatch({
    request,
    proposal,
    approval,
    stageContribution,
    restoreTarget,
    assemblePrompt,
}) {
    if (!isApprovedTranscriptRecallMaterialization({ request, proposal, approval })
        || typeof stageContribution !== 'function' || typeof restoreTarget !== 'function'
        || typeof assemblePrompt !== 'function') {
        return frozenResult('PROPOSAL_INVALID', 'DISPATCH_MATERIALIZATION_BINDING_INVALID', request?.requestId || '');
    }

    let stageAttempted = false;
    let materialization;
    try {
        stageAttempted = true;
        await stageContribution(proposal.bundleText);
        const assembled = await assemblePrompt();
        if (!Array.isArray(assembled?.[0])) {
            materialization = frozenResult('BUDGET_UNAVAILABLE', 'DISPATCH_ASSEMBLY_UNAVAILABLE', request.requestId);
        } else {
            materialization = Object.freeze({
                state: 'MATERIALIZED',
                reason: 'EXACT_APPROVED_BUNDLE_MATERIALIZED',
                requestId: request.requestId,
                injectionTarget: proposal.injectionTarget,
                bundleHash: proposal.bundleHash,
                prompt: assembled[0],
                counts: assembled[1],
            });
        }
    } catch {
        materialization = frozenResult('BUDGET_UNAVAILABLE', 'DISPATCH_MATERIALIZATION_FAILED', request.requestId);
    }

    if (stageAttempted) {
        try {
            await restoreTarget();
        } catch {
            return frozenResult('BUDGET_UNAVAILABLE', 'DISPATCH_TARGET_RESTORE_FAILED', request.requestId);
        }
    }
    return materialization;
}

export async function materializeApprovedShardwrightTranscriptRecall({ request, proposal, approval, stageContribution, restoreTarget, assemblePrompt } = {}) {
    return materializeShardwrightTranscriptRecallForDispatch({ request, proposal, approval, stageContribution, restoreTarget, assemblePrompt });
}
