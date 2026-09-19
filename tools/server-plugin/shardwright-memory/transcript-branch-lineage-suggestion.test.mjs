import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestHistoricalForkSet } from './transcript-branch-lineage-suggestion.js';

const source = (sourceLogicalId, createdAtMs, hashes) => ({
    sourceLogicalId,
    characterInstanceId: 'character-1',
    createdAtMs,
    messages: hashes.map((contentHash) => ({ contentHash })),
});

test('multi-source suggestion returns reviewable pairwise evidence without selecting a global parent', () => {
    const result = suggestHistoricalForkSet({
        sources: [
            source('original', 10, ['a', 'b', 'c']),
            source('checkpoint', 20, ['a', 'b', 'd']),
            source('branch', 30, ['a', 'b', 'e']),
        ],
    });
    assert.equal(result.state, 'REVIEW_REQUIRED_SET');
    assert.equal(result.reason, 'LIKELY_FORK_SET');
    assert.equal(result.suggestions.length, 3);
    assert.equal(result.suggestions.every((suggestion) => suggestion.reviewRequired === true), true);
    assert.equal(result.suggestions.some((suggestion) => suggestion.proposedParentSourceLogicalId === 'original'), true);
});

test('multi-source suggestion refuses when no pair has an exact prefix', () => {
    const result = suggestHistoricalForkSet({
        sources: [source('a', 1, ['a']), source('b', 2, ['b']), source('c', 3, ['c'])],
    });
    assert.equal(result.state, 'REFUSED');
    assert.equal(result.reason, 'NO_REVIEWABLE_FORKS');
    assert.equal(result.refusals.length, 3);
});

test('equal creation timestamps leave the proposed parent unresolved', () => {
    const result = suggestHistoricalForkSet({
        sources: [source('a', 10, ['a', 'b']), source('b', 10, ['a', 'c'])],
    });
    assert.equal(result.state, 'REVIEW_REQUIRED_SET');
    assert.equal(result.suggestions[0].proposedParentSourceLogicalId, null);
});
