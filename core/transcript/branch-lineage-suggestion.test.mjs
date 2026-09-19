import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestHistoricalFork } from './branch-lineage-suggestion.js';

const source = (sourceLogicalId, createdAtMs, hashes, characterInstanceId = 'character-1') => ({
    sourceLogicalId,
    characterInstanceId,
    createdAtMs,
    messages: hashes.map((contentHash) => ({ contentHash })),
});

test('suggests the oldest source as parent after an exact shared prefix', () => {
    const result = suggestHistoricalFork({
        sources: [source('child', 20, ['a', 'b', 'c']), source('parent', 10, ['a', 'b', 'd', 'e'])],
    });
    assert.equal(result.state, 'REVIEW_REQUIRED');
    assert.equal(result.proposedParentSourceLogicalId, 'parent');
    assert.equal(result.proposedChildSourceLogicalId, 'child');
    assert.equal(result.forkAnchor.contentHash, 'b');
    assert.equal(result.orderingBasis, 'OBSERVED_CREATION_METADATA');
});

test('identical full sources are deduplication candidates, not lineage suggestions', () => {
    assert.equal(suggestHistoricalFork({ sources: [source('a', 1, ['a', 'b']), source('b', 2, ['a', 'b'])] }).reason, 'IDENTICAL_SOURCES_NOT_FORK');
});

test('missing exact prefix refuses suggestion', () => {
    assert.equal(suggestHistoricalFork({ sources: [source('a', 1, ['a']), source('b', 2, ['b'])] }).reason, 'NO_EXACT_PREFIX');
});

test('invalid or incomplete source evidence refuses without inference', () => {
    assert.equal(suggestHistoricalFork({ sources: [{ sourceLogicalId: 'a', messages: [] }, source('b', 2, ['a'])] }).reason, 'FORK_SUGGESTION_INPUT_INVALID');
});

test('different authoritative character identities refuse comparison', () => {
    assert.equal(suggestHistoricalFork({ sources: [source('a', 1, ['a'], 'character-1'), source('b', 2, ['a', 'b'], 'character-2')] }).reason, 'CHARACTER_IDENTITY_MISMATCH');
});

test('exact prefix remains reviewable when creation metadata is unavailable', () => {
    const result = suggestHistoricalFork({ sources: [source('a', null, ['a', 'b']), source('b', null, ['a', 'c'])] });
    assert.equal(result.state, 'REVIEW_REQUIRED');
    assert.equal(result.proposedParentSourceLogicalId, null);
    assert.equal(result.orderingBasis, 'CREATION_METADATA_UNAVAILABLE');
});

test('equal creation timestamps leave parentage unresolved', () => {
    const result = suggestHistoricalFork({ sources: [source('a', 10, ['a', 'b']), source('b', 10, ['a', 'c'])] });
    assert.equal(result.state, 'REVIEW_REQUIRED');
    assert.equal(result.proposedParentSourceLogicalId, null);
    assert.equal(result.orderingBasis, 'CREATION_METADATA_UNAVAILABLE');
});

test('a source with an incomplete message hash refuses comparison', () => {
    assert.equal(suggestHistoricalFork({ sources: [source('a', 1, ['a', '']), source('b', 2, ['a', 'b'])] }).reason, 'FORK_SUGGESTION_INPUT_INVALID');
});
