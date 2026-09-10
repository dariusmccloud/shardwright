import assert from 'node:assert/strict';
import test from 'node:test';
import { BridgeStatus, createDiagnostics } from './diagnostics.js';
import { describeStatus } from './status-view.js';

test('injected status renders only the operational summary', () => {
    const snapshot = {
        ...createDiagnostics(),
        status: BridgeStatus.INJECTED,
        matchedCount: 8,
        injectedCount: 3,
        rerankerApplied: true,
        syncElapsedMs: 34,
        retrievalElapsedMs: 25,
    };
    assert.deepEqual(describeStatus(snapshot), {
        tone: 'success',
        text: 'Injected 3 of 8 matching memories · reranked · sync 34 ms · retrieval 25 ms',
    });
});

test('refusal and error remain visibly distinct', () => {
    assert.match(describeStatus({ ...createDiagnostics(), status: BridgeStatus.REFUSED, refusalReason: 'CONTINUITY_AMBIGUOUS_BLOCK_MATCH' }).text, /refused/i);
    assert.match(describeStatus({ ...createDiagnostics(), status: BridgeStatus.ERROR, lastError: 'Network unavailable.' }).text, /error/i);
});

test('retrieving state is visibly distinct from an idle bridge', () => {
    assert.deepEqual(describeStatus({
        ...createDiagnostics(),
        status: BridgeStatus.RETRIEVING,
        sourceName: 'Jeep-memories.md',
    }), {
        tone: 'neutral',
        text: 'Retrieving continuity · Jeep-memories.md',
    });
});
