import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseTranscriptRecall } from './transcript-retrieval-parity-diagnostic.js';

const request = Object.freeze({ requestId: 'diag-1', characterInstanceId: 'character:jeep', queryText: 'OA' });

function transports(overrides = {}) {
    return {
        ensureProjectionCurrent: async () => ({ state: 'CURRENT', generation: 'sha256:g', projectionHash: 'sha256:p' }),
        requestCandidates: async () => ({ state: 'CANDIDATES', characterInstanceId: request.characterInstanceId, posture: 'CONTINUITY', candidates: [{ documentId: 'doc-1', contentHash: 'sha256:c', occurrenceLinks: [{ messageRecordId: 'msg-1' }] }], availableCandidateCount: 1, candidateLimit: 24, truncated: false }),
        requestAnchors: async () => ({ state: 'ANCHOR_RESOLUTIONS', resolutions: [{ contentHash: 'sha256:c', documentIds: ['doc-1'], occurrences: [{ messageRecordId: 'msg-1' }], state: 'SOLE_ANCHOR' }] }),
        requestWindowAssembly: async () => ({ state: 'WINDOWS', windows: [{ documentId: 'doc-1', window: { rows: [] } }] }),
        requestPolicy: async () => ({ state: 'POLICY_EVALUATED', sufficiency: 'SUFFICIENT', adequacy: 'ADEQUATE' }),
        requestBundle: async () => ({ state: 'BUNDLE', bundleText: 'evidence' }),
        ...overrides,
    };
}

test('diagnostic reports the same projection and ready disposition as the live retrieval chain', async () => {
    const result = await diagnoseTranscriptRecall({ request, candidateLimit: 24, transports: transports() });
    assert.equal(result.state, 'DIAGNOSTIC');
    assert.equal(result.expectedDisposition, 'READY_FOR_PLANNING');
    assert.deepEqual(result.projection, { state: 'CURRENT', generation: 'sha256:g', projectionHash: 'sha256:p' });
    assert.equal(result.retrieval.bundle.bundleText, 'evidence');
});

test('diagnostic preserves a live refusal as the expected disposition', async () => {
    const result = await diagnoseTranscriptRecall({ request, transports: transports({ requestPolicy: async () => ({ state: 'INSUFFICIENT_EVIDENCE', sufficiency: 'INSUFFICIENT' }) }) });
    assert.equal(result.state, 'DIAGNOSTIC');
    assert.equal(result.expectedDisposition, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.retrieval.bundle, undefined);
});
