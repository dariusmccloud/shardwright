export const SHARDWRIGHT_SHARD_COLLECTION_PREFIX = 'shardwright_shards_';
export const SHARDWRIGHT_STANDARD_COLLECTION_PREFIX = 'shardwright_standard_';
export const LEGACY_SHARD_COLLECTION_PREFIX = 'ss_shards_';
export const LEGACY_STANDARD_COLLECTION_PREFIX = 'ss_standard_';
export const SHARDWRIGHT_RAG_VARIABLE = 'shardwright_rag_memory';
export const SHARDWRIGHT_RAG_PROMPT_TAG = '5_shardwright_rag';

export const RAG_COLLECTION_IDENTITY = Object.freeze({
    CANONICAL: 'SHARDWRIGHT',
    LEGACY: 'LEGACY_SUMMARY_SHARDER',
    UNKNOWN: 'UNKNOWN',
});

export function classifyRagCollectionId(collectionId) {
    const id = String(collectionId || '').trim();
    if (id.startsWith(SHARDWRIGHT_SHARD_COLLECTION_PREFIX)
        || id.startsWith(SHARDWRIGHT_STANDARD_COLLECTION_PREFIX)) {
        return RAG_COLLECTION_IDENTITY.CANONICAL;
    }
    if (id.startsWith(LEGACY_SHARD_COLLECTION_PREFIX)
        || id.startsWith(LEGACY_STANDARD_COLLECTION_PREFIX)) {
        return RAG_COLLECTION_IDENTITY.LEGACY;
    }
    return RAG_COLLECTION_IDENTITY.UNKNOWN;
}

export function filterShardwrightCollectionIds(collectionIds = []) {
    const canonicalIds = [];
    const quarantined = [];
    const seen = new Set();
    const classifications = new Set();

    for (const value of (Array.isArray(collectionIds) ? collectionIds : [])) {
        const id = String(value || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const identity = classifyRagCollectionId(id);
        classifications.add(identity);
        if (identity === RAG_COLLECTION_IDENTITY.CANONICAL) {
            canonicalIds.push(id);
        } else {
            quarantined.push({
                collectionId: id,
                identity,
                code: identity === RAG_COLLECTION_IDENTITY.LEGACY
                    ? 'SHARDWRIGHT_RAG_LEGACY_COLLECTION_REBUILD_REQUIRED'
                    : 'SHARDWRIGHT_RAG_COLLECTION_OWNERSHIP_UNKNOWN',
            });
        }
    }

    return {
        canonicalIds,
        quarantined,
        mixedIdentityInput: classifications.size > 1,
    };
}

export function buildLegacyCollectionRebuildPlan(collectionId) {
    const id = String(collectionId || '').trim();
    const identity = classifyRagCollectionId(id);
    if (identity !== RAG_COLLECTION_IDENTITY.LEGACY) return null;
    const canonicalCollectionId = id.startsWith(LEGACY_SHARD_COLLECTION_PREFIX)
        ? `${SHARDWRIGHT_SHARD_COLLECTION_PREFIX}${id.slice(LEGACY_SHARD_COLLECTION_PREFIX.length)}`
        : `${SHARDWRIGHT_STANDARD_COLLECTION_PREFIX}${id.slice(LEGACY_STANDARD_COLLECTION_PREFIX.length)}`;
    return {
        sourceCollectionId: id,
        destinationCollectionId: canonicalCollectionId,
        migrationMode: 'REBUILD_FROM_EXACT_SOURCES',
        legacySourceRetained: true,
        directRenameAllowed: false,
        ordinaryRetrievalAllowed: false,
    };
}

export function migrateRecognizedRagInjectionSettings(settings) {
    if (!settings || typeof settings !== 'object') return { changed: false, profiles: [] };
    const profiles = [];
    for (const key of ['rag', 'ragStandard']) {
        const profile = settings[key];
        if (!profile || typeof profile !== 'object') continue;
        if (profile.injectionVariableName === 'ss_rag_memory') {
            profile.injectionVariableName = SHARDWRIGHT_RAG_VARIABLE;
            profiles.push(key);
        }
    }
    return { changed: profiles.length > 0, profiles };
}
