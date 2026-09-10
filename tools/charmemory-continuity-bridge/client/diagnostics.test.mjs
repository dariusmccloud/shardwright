import assert from 'node:assert/strict';
import test from 'node:test';
import { BridgeStatus, createDiagnostics, isBridgeRefusal, updateDiagnostics } from './diagnostics.js';

test('diagnostics begin in an unattempted state and retain the defined fields', () => {
    const diagnostics = createDiagnostics();
    assert.equal(diagnostics.status, null);
    assert.equal(diagnostics.queryPresent, false);
    assert.equal(diagnostics.matchedCount, 0);
    assert.equal(diagnostics.injectedCount, 0);
    assert.equal(diagnostics.lastError, null);
});

test('diagnostics snapshot an injected bounded retrieval without mutating prior snapshots', () => {
    const diagnostics = createDiagnostics();
    const snapshot = updateDiagnostics(diagnostics, {
        status: BridgeStatus.INJECTED,
        sourceIdentity: 'charmemory-source:["Jeep.png","Jeep-memories.md"]',
        sourceHash: 'sha256:test',
        sourceRevisionCount: 990,
        queryPresent: true,
        matchedCount: 3,
        injectedCount: 3,
        syncElapsedMs: 12,
        retrievalElapsedMs: 4,
    });
    updateDiagnostics(diagnostics, { status: BridgeStatus.NO_MATCHES, matchedCount: 0, injectedCount: 0 });
    assert.equal(snapshot.status, BridgeStatus.INJECTED);
    assert.equal(snapshot.injectedCount, 3);
});

test('guarded bridge conditions are classified as refusals, not runtime errors', () => {
    assert.equal(isBridgeRefusal({ code: 'CONTINUITY_AMBIGUOUS_BLOCK_MATCH' }), true);
    assert.equal(isBridgeRefusal({ code: 'CONTINUITY_UNEXPECTED' }), false);
    assert.equal(isBridgeRefusal(new Error('network failed')), false);
});
