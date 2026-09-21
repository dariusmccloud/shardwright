import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveTranscriptRecall } from './transcript-recall-orchestrator.js';

const request = Object.freeze({ requestId: 'request-1', characterInstanceId: 'character:jeep', queryText: 'CSP' });
const ok = { request, posture: 'CONTINUITY', candidateLimit: 24 };

function transports(overrides = {}) {
    return {
        requestCandidates: async () => ({ state: 'CANDIDATES', candidates: [], availableCandidateCount: 0 }),
        requestAnchors: async () => ({ state: 'ANCHOR_RESOLUTIONS', resolutions: [] }),
        requestWindowAssembly: async () => ({ state: 'WINDOWS_ASSEMBLED', windows: [{ windowId: 'w1' }] }),
        requestPolicy: async () => ({ state: 'POLICY_EVALUATED', adequacy: 'ADEQUATE', sufficiency: 'SUFFICIENT' }),
        requestBundle: async () => ({ state: 'BUNDLE_PRESENTED', bundleText: 'bundle' }),
        ...overrides,
    };
}

test('chains proven transports into a retrieval-ready result in order', async () => {
    const calls = [];
    const result = await retrieveTranscriptRecall({ ...ok, preferenceResolver: ({ contentHash, eligibleMessageRecordIds, posture }) => {
        assert.equal(contentHash, 'sha256:family');
        assert.deepEqual(eligibleMessageRecordIds, ['message-1', 'message-2']);
        assert.equal(posture, 'CONTINUITY');
        return { state: 'PREFERRED', messageRecordId: 'message-2' };
    }, transports: transports({
        requestCandidates: async (value) => { calls.push('candidates'); return { state: 'CANDIDATES', ...value }; },
        requestAnchors: async () => { calls.push('anchors'); return { state: 'ANCHOR_RESOLUTIONS', resolutions: [] }; },
        requestWindowAssembly: async () => { calls.push('assembly'); return { state: 'WINDOWS_ASSEMBLED', windows: [{ windowId: 'w1' }] }; },
        requestPolicy: async () => { calls.push('policy'); return { state: 'POLICY_EVALUATED', sufficiency: 'SUFFICIENT' }; },
        requestBundle: async () => { calls.push('bundle'); return { state: 'BUNDLE_PRESENTED', bundleText: 'bundle' }; },
    }) });
    assert.equal(result.state, 'RETRIEVAL_READY', JSON.stringify({ reason: result.reason, anchors: result.anchors, selection: result.selection }));
    assert.deepEqual(calls, ['candidates', 'anchors', 'assembly', 'policy', 'bundle']);
});

test('accepts the live transport state for retrieved candidates', async () => {
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({
        requestCandidates: async () => ({ state: 'CANDIDATES_RETRIEVED', candidates: [] }),
    }) });
    assert.equal(result.state, 'RETRIEVAL_READY');
});

test('stops at the first refusal and does not call later transports', async () => {
    let called = false;
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({ requestCandidates: async () => ({ state: 'CANDIDATES_UNAVAILABLE', reason: 'NO_SOURCE' }), requestAnchors: async () => { called = true; return {}; } }) });
    assert.match(result.reason, /^CANDIDATE_SELECTION:/);
    assert.equal(called, false);
});

test('refuses insufficient policy without bundle presentation', async () => {
    let called = false;
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({ requestPolicy: async () => ({ state: 'INSUFFICIENT_EVIDENCE', sufficiency: 'INSUFFICIENT' }), requestBundle: async () => { called = true; return {}; } }) });
    assert.equal(result.reason, 'INSUFFICIENT_EVIDENCE');
    assert.equal(called, false);
});

test('requires an explicitly current projection before candidate selection when the service seam is supplied', async () => {
    const calls = [];
    const refused = await retrieveTranscriptRecall({ ...ok, transports: transports({
        ensureProjectionCurrent: async () => ({ state: 'PROJECTION_PENDING', reason: 'WAITING_FOR_PREREQUISITE' }),
        requestCandidates: async () => { calls.push('candidates'); return { state: 'CANDIDATES' }; },
    }) });
    assert.equal(refused.reason, 'WAITING_FOR_PREREQUISITE');
    assert.deepEqual(calls, []);
    const ready = await retrieveTranscriptRecall({ ...ok, transports: transports({
        ensureProjectionCurrent: async () => ({ state: 'CURRENT' }),
        requestCandidates: async () => { calls.push('current-candidates'); return { state: 'CANDIDATES' }; },
    }) });
    assert.equal(ready.state, 'RETRIEVAL_READY');
    assert.deepEqual(calls, ['current-candidates']);
});

test('refuses missing or malformed policy results before bundle presentation', async () => {
    let bundled = false;
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({ requestPolicy: async () => ({ state: 'POLICY_EVALUATED' }), requestBundle: async () => { bundled = true; return {}; } }) });
    assert.equal(result.reason, 'POLICY_EVALUATION_UNAVAILABLE');
    assert.equal(bundled, false);
});

test('retains current projection custody when policy refuses', async () => {
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({
        ensureProjectionCurrent: async () => ({ state: 'CURRENT', generation: 'sha256:g', projectionHash: 'sha256:p' }),
        requestPolicy: async () => ({ state: 'INSUFFICIENT_EVIDENCE', sufficiency: 'INSUFFICIENT' }),
    }) });
    assert.deepEqual(result.projection, { state: 'CURRENT', generation: 'sha256:g', projectionHash: 'sha256:p' });
});

test('applies an explicit Continuity preference without changing custody', async () => {
    let receivedAnchors;
    const result = await retrieveTranscriptRecall({ ...ok, preferenceResolver: ({ contentHash, eligibleMessageRecordIds, posture }) => {
        assert.equal(contentHash, 'sha256:family');
        assert.deepEqual(eligibleMessageRecordIds, ['message-1', 'message-2']);
        assert.equal(posture, 'CONTINUITY');
        return { state: 'PREFERRED', messageRecordId: 'message-2' };
    }, transports: transports({
        requestCandidates: async () => ({ state: 'CANDIDATES', characterInstanceId: request.characterInstanceId, posture: 'CONTINUITY', candidates: [{ documentId: 'doc-1' }] }),
        requestAnchors: async ({ anchorOccurrenceLimit }) => ({
            state: 'ANCHOR_RESOLUTIONS',
            resolutions: [{
                state: 'ELIGIBLE_BUNDLE', contentHash: 'sha256:family', documentIds: ['doc-1'],
                occurrences: [
                    { messageRecordId: 'message-1' },
                    { messageRecordId: 'message-2' },
                ],
                anchorOccurrenceLimit,
            }],
        }),
        requestWindowAssembly: async ({ anchors }) => { receivedAnchors = anchors; return { state: 'WINDOWS_ASSEMBLED', windows: [{ windowId: 'w1' }] }; },
    }) });
    assert.equal(result.state, 'RETRIEVAL_READY', JSON.stringify({ reason: result.reason, anchors: result.anchors, selection: result.selection }));
    assert.deepEqual(receivedAnchors, [{ documentId: 'doc-1', anchorMessageRecordId: 'message-2' }]);
});

test('refuses equivalent Continuity occurrences when no preference resolves them', async () => {
    const result = await retrieveTranscriptRecall({ ...ok, transports: transports({
        requestCandidates: async () => ({ state: 'CANDIDATES', characterInstanceId: request.characterInstanceId, posture: 'CONTINUITY', candidates: [{ documentId: 'doc-1' }] }),
        requestAnchors: async () => ({ state: 'ANCHOR_RESOLUTIONS', resolutions: [{ state: 'ELIGIBLE_BUNDLE', contentHash: 'sha256:family', documentIds: ['doc-1'], occurrences: [{ messageRecordId: 'message-1' }, { messageRecordId: 'message-2' }] }] }),
    }) });
    assert.equal(result.reason, 'AMBIGUOUS_ANCHORS');
});
