import assert from 'node:assert/strict';
import test from 'node:test';

import { selectCollectionMetadata } from './collection-metadata.js';

test('duplicate collection ids resolve to the configured populated embedding source', () => {
    const id = 'shardwright_shards_Jeep_Checkpoint';
    const selected = selectCollectionMetadata([
        { id, backend: 'vectra', source: 'bananabread', model: '', chunkCount: 36 },
        { id, backend: 'vectra', source: 'transformers', model: '', chunkCount: 0 },
    ], [id], 'bananabread');

    assert.deepEqual(selected.get(id), {
        id,
        backend: 'vectra',
        source: 'bananabread',
        model: '',
        chunkCount: 36,
    });
});

test('missing preferred source falls back to the populated variant deterministically', () => {
    const id = 'shared-id';
    const selected = selectCollectionMetadata([
        { id, source: 'transformers', chunkCount: 0 },
        { id, source: 'openai', chunkCount: 12 },
    ], [id], 'bananabread');

    assert.equal(selected.get(id)?.source, 'openai');
});
