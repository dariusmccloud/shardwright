import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    RAG_COLLECTION_IDENTITY,
    SHARDWRIGHT_RAG_PROMPT_TAG,
    SHARDWRIGHT_RAG_VARIABLE,
    buildLegacyCollectionRebuildPlan,
    classifyRagCollectionId,
    filterShardwrightCollectionIds,
    migrateRecognizedRagInjectionSettings,
} from './collection-identity.js';

test('collection identity distinguishes canonical legacy and unknown ownership', () => {
    assert.equal(classifyRagCollectionId('shardwright_shards_chat_a'), RAG_COLLECTION_IDENTITY.CANONICAL);
    assert.equal(classifyRagCollectionId('shardwright_standard_chat_a'), RAG_COLLECTION_IDENTITY.CANONICAL);
    assert.equal(classifyRagCollectionId('ss_shards_chat_a'), RAG_COLLECTION_IDENTITY.LEGACY);
    assert.equal(classifyRagCollectionId('shared_chat_a'), RAG_COLLECTION_IDENTITY.UNKNOWN);
});

test('recognized legacy injection defaults migrate without changing custom variables', () => {
    const settings = {
        rag: { injectionVariableName: 'ss_rag_memory' },
        ragStandard: { injectionVariableName: 'operator_custom_memory' },
    };
    assert.deepEqual(migrateRecognizedRagInjectionSettings(settings), { changed: true, profiles: ['rag'] });
    assert.equal(settings.rag.injectionVariableName, 'shardwright_rag_memory');
    assert.equal(settings.ragStandard.injectionVariableName, 'operator_custom_memory');
    assert.deepEqual(migrateRecognizedRagInjectionSettings(settings), { changed: false, profiles: [] });
});

test('ordinary retrieval admits only canonical collections and exposes quarantine reasons', () => {
    const result = filterShardwrightCollectionIds([
        'ss_shards_chat_a',
        'shardwright_shards_chat_a',
        'shared_chat_a',
        'shardwright_shards_chat_a',
    ]);

    assert.deepEqual(result.canonicalIds, ['shardwright_shards_chat_a']);
    assert.deepEqual(result.quarantined, [
        {
            collectionId: 'ss_shards_chat_a',
            identity: 'LEGACY_SUMMARY_SHARDER',
            code: 'SHARDWRIGHT_RAG_LEGACY_COLLECTION_REBUILD_REQUIRED',
        },
        {
            collectionId: 'shared_chat_a',
            identity: 'UNKNOWN',
            code: 'SHARDWRIGHT_RAG_COLLECTION_OWNERSHIP_UNKNOWN',
        },
    ]);
    assert.equal(result.mixedIdentityInput, true);
});

test('legacy collections produce a rebuild plan without rename or ordinary retrieval', () => {
    assert.deepEqual(buildLegacyCollectionRebuildPlan('ss_standard_Jeep'), {
        sourceCollectionId: 'ss_standard_Jeep',
        destinationCollectionId: 'shardwright_standard_Jeep',
        migrationMode: 'REBUILD_FROM_EXACT_SOURCES',
        legacySourceRetained: true,
        directRenameAllowed: false,
        ordinaryRetrievalAllowed: false,
    });
    assert.equal(SHARDWRIGHT_RAG_VARIABLE, 'shardwright_rag_memory');
    assert.equal(SHARDWRIGHT_RAG_PROMPT_TAG, '5_shardwright_rag');
});

test('runtime wires canonical collection admission and injection identities at the query boundary', async () => {
    const [manager, retrieval, settings] = await Promise.all([
        readFile(new URL('./collection-manager.js', import.meta.url), 'utf8'),
        readFile(new URL('./retrieval.js', import.meta.url), 'utf8'),
        readFile(new URL('../settings.js', import.meta.url), 'utf8'),
    ]);

    assert.match(manager, /resolveEffectiveBindingState\(resolvedChatId, avatar, settings, ownId\)/);
    assert.match(manager, /canonicalIds:\s*bindingState\.effectiveReadIds/);
    assert.match(manager, /quarantined:\s*bindingState\.quarantinedCollectionIds/);
    assert.match(retrieval, /const collectionIds = collectionIdentityState\.canonicalIds/);
    assert.match(retrieval, /EXTENSION_PROMPT_TAG_SHARDWRIGHT = '5_shardwright_rag'/);
    assert.match(settings, /injectionVariableName:\s*'shardwright_rag_memory'/);
});
