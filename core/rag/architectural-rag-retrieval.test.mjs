import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertArchitecturalRetrievalOperation,
    buildArchitecturalAuthoritySourceMap,
    filterArchitecturalRetrievalResults,
    prepareArchitecturalRetrievalInjection,
    reconcileArchitecturalContinuity,
    renderArchitecturalRetrievalEvidence,
    shapeArchitecturalRetrievalResults,
} from './architectural-rag-retrieval.js';

const manifests = buildArchitecturalAuthoritySourceMap([{
    outputUID: 'saved-1',
    sourceIdentityHash: 'sha256:identity',
    sourceRevisionHash: 'sha256:revision',
}], [{ sourceUid: 'saved-1', sourceContentHash: '12345' }]);

function candidate(overrides = {}) {
    return {
        hash: overrides.hash || 'chunk-1',
        text: overrides.text || 'Persisted architectural evidence.',
        score: overrides.score ?? 0.7,
        metadata: {
            shardProfile: 'architectural',
            schemaVersion: 1,
            projectionVersion: 1,
            sourceChatId: 'chat-a',
            sourceUid: 'saved-1',
            sourceMessageIds: ['m1', 'm2', 'm3'],
            sourceIdentityHash: 'sha256:identity',
            sourceRevisionHash: 'sha256:revision',
            sourceContentHash: '12345',
            startIndex: 1,
            endIndex: 3,
            sectionType: 'decisions',
            recordIdentity: 'decision-a',
            ...(overrides.metadata || {}),
        },
    };
}

test('valid Architectural projection survives provenance and freshness validation', () => {
    const result = filterArchitecturalRetrievalResults([candidate()], manifests);
    assert.equal(result.eligible.length, 1);
    assert.deepEqual(result.diagnostics, []);
});

test('mixed profile, incomplete provenance, stale hash, and unverified source are excluded', () => {
    const result = filterArchitecturalRetrievalResults([
        candidate({ hash: 'narrative', metadata: { shardProfile: 'narrative' } }),
        candidate({ hash: 'missing', metadata: { sourceContentHash: '' } }),
        candidate({ hash: 'stale', metadata: { sourceRevisionHash: 'sha256:old' } }),
        candidate({ hash: 'content-stale', metadata: { sourceContentHash: '99999' } }),
        candidate({ hash: 'unknown', metadata: { sourceUid: 'not-persisted' } }),
    ], manifests);
    assert.equal(result.eligible.length, 0);
    assert.deepEqual(result.diagnostics.map((item) => item.code), [
        'ARCH_RAG_RESULT_PROFILE_MISMATCH',
        'ARCH_RAG_RESULT_PROVENANCE_INCOMPLETE',
        'ARCH_RAG_RESULT_SOURCE_STALE',
        'ARCH_RAG_RESULT_SOURCE_STALE',
        'ARCH_RAG_RESULT_SOURCE_UNVERIFIED',
    ]);
});

test('DECISIONS, THREADS, and CURRENT roll forward by stable identity while historical evidence remains', () => {
    const results = shapeArchitecturalRetrievalResults([
        candidate({ hash: 'decision-old', text: 'Old decision', metadata: { endIndex: 3 } }),
        candidate({ hash: 'decision-new', text: 'New decision', metadata: { endIndex: 8, sourceMessageIds: Array(8).fill('m') } }),
        candidate({ hash: 'current-old', metadata: { sectionType: 'current', recordIdentity: 'current', endIndex: 3 } }),
        candidate({ hash: 'current-new', metadata: { sectionType: 'current', recordIdentity: 'current', endIndex: 9, sourceMessageIds: Array(9).fill('m') } }),
        candidate({ hash: 'event-a', metadata: { sectionType: 'events', recordIdentity: 'S1:1' } }),
        candidate({ hash: 'event-b', metadata: { sectionType: 'events', recordIdentity: 'S1:1' } }),
    ]);
    assert.deepEqual(results.map((item) => item.hash), ['current-new', 'decision-new', 'event-a', 'event-b']);
});

test('continuity fallback replaces queried stable records with latest state and pins only latest CURRENT', () => {
    const query = [
        candidate({ hash: 'decision-old', text: 'Old decision', metadata: { endIndex: 3 } }),
        candidate({ hash: 'event-query', metadata: { sectionType: 'events', recordIdentity: 'S1:1' } }),
    ];
    const continuity = [
        candidate({ hash: 'decision-new', text: 'New decision', metadata: { endIndex: 8 } }),
        candidate({ hash: 'unrelated-decision', metadata: { recordIdentity: 'decision-b', endIndex: 9 } }),
        candidate({ hash: 'current-new', metadata: { sectionType: 'current', recordIdentity: 'current', endIndex: 9 } }),
    ];
    assert.deepEqual(
        reconcileArchitecturalContinuity(query, continuity).map((item) => item.hash),
        ['current-new', 'decision-new', 'event-query'],
    );
});

test('rendering labels evidence, exact provenance, hashes, and non-authoritative meaning', () => {
    const text = renderArchitecturalRetrievalEvidence([candidate()]);
    assert.match(text, /NON-AUTHORITATIVE/u);
    assert.match(text, /chat:chat-a/u);
    assert.match(text, /messages:1-3/u);
    assert.match(text, /output:saved-1/u);
    assert.match(text, /content-hash:12345/u);
    assert.match(text, /source-revision:sha256:revision/u);
    assert.match(text, /Ranking is relevance, not truth/u);
});

test('retrieval jurisdiction hard-refuses authority-changing operations', () => {
    assert.equal(assertArchitecturalRetrievalOperation('search'), 'search');
    assert.throws(
        () => assertArchitecturalRetrievalOperation('publish'),
        (error) => error?.code === 'ARCH_RAG_AUTHORITY_MUTATION_FORBIDDEN',
    );
});

test('final prompt boundary revalidates ranked results before labelled rendering', () => {
    const result = prepareArchitecturalRetrievalInjection([
        candidate(),
        candidate({ hash: 'reranker-injected-mixed-profile', metadata: { shardProfile: 'narrative' } }),
    ], manifests);
    assert.deepEqual(result.results.map((item) => item.hash), ['chunk-1']);
    assert.deepEqual(result.diagnostics.map((item) => item.code), ['ARCH_RAG_RESULT_PROFILE_MISMATCH']);
    assert.doesNotMatch(result.injectionText, /reranker-injected/u);
    assert.match(result.injectionText, /NON-AUTHORITATIVE/u);
});
