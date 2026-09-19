import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateContentOccurrences } from './content-deduplication.js';

test('exact duplicate content shares one canonical record but preserves occurrences', () => {
    const result = deduplicateContentOccurrences([
        { occurrenceId: 'a-1', sourceLogicalId: 'source-a', contentHash: 'sha256:x', content: 'same', custody: 'rev-a' },
        { occurrenceId: 'b-1', sourceLogicalId: 'source-b', contentHash: 'sha256:x', content: 'same', custody: 'rev-b' },
    ]);
    assert.equal(result.state, 'DEDUPLICATED');
    assert.equal(result.canonicalRecords.length, 1);
    assert.equal(result.occurrenceLinks.length, 2);
    assert.deepEqual(result.occurrenceLinks.map((link) => link.sourceLogicalId), ['source-a', 'source-b']);
});

test('different hashes remain separate canonical records', () => {
    const result = deduplicateContentOccurrences([
        { occurrenceId: 'a-1', sourceLogicalId: 'source-a', contentHash: 'sha256:x', content: 'one' },
        { occurrenceId: 'a-2', sourceLogicalId: 'source-a', contentHash: 'sha256:y', content: 'two' },
    ]);
    assert.equal(result.canonicalRecords.length, 2);
    assert.deepEqual(result.canonicalRecords.map((record) => record.contentHash), ['sha256:x', 'sha256:y']);
});

test('visibility and custody remain occurrence-scoped', () => {
    const result = deduplicateContentOccurrences([
        { occurrenceId: 'a-1', sourceLogicalId: 'source-a', contentHash: 'sha256:x', visibility: 'HIDDEN', custody: 'rev-a' },
        { occurrenceId: 'b-1', sourceLogicalId: 'source-b', contentHash: 'sha256:x', visibility: 'VISIBLE', custody: 'rev-b' },
    ]);
    assert.equal(result.occurrenceLinks[0].visibility, 'HIDDEN');
    assert.equal(result.occurrenceLinks[1].visibility, 'VISIBLE');
    assert.deepEqual(result.occurrenceLinks.map((link) => link.custody), ['rev-a', 'rev-b']);
});

test('incomplete occurrence identity refuses without producing a projection', () => {
    const result = deduplicateContentOccurrences([{ occurrenceId: 'a-1', sourceLogicalId: 'source-a' }]);
    assert.deepEqual(result, { state: 'REFUSED', reason: 'OCCURRENCE_IDENTITY_INCOMPLETE' });
});

test('same hash with conflicting content refuses rather than merging', () => {
    const result = deduplicateContentOccurrences([
        { occurrenceId: 'a-1', sourceLogicalId: 'source-a', contentHash: 'sha256:x', content: 'one' },
        { occurrenceId: 'b-1', sourceLogicalId: 'source-b', contentHash: 'sha256:x', content: 'two' },
    ]);
    assert.equal(result.state, 'REFUSED');
    assert.equal(result.reason, 'CONTENT_HASH_CONFLICT');
});
