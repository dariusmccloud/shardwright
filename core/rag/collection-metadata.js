function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function chunkCount(collection) {
    return Math.max(0, Number(collection?.chunkCount) || 0);
}

/**
 * Resolve one plugin collection variant per id.
 *
 * Similharity may expose the same backend-local collection id once per
 * embedding source/model. Prefer the configured source, then the populated
 * variant, so retrieval does not silently bind to an empty legacy variant.
 *
 * @param {Array<Object>} collections
 * @param {string[]} collectionIds
 * @param {string} [preferredSource='']
 * @returns {Map<string, Object>}
 */
export function selectCollectionMetadata(collections, collectionIds, preferredSource = '') {
    const wanted = new Set((collectionIds || []).map(id => String(id || '').trim()).filter(Boolean));
    const preferred = normalize(preferredSource);
    const selected = new Map();

    for (const collection of (collections || [])) {
        const id = String(collection?.id || '').trim();
        if (!id || !wanted.has(id)) continue;

        const current = selected.get(id);
        if (!current) {
            selected.set(id, collection);
            continue;
        }

        const candidatePreferred = preferred && normalize(collection?.source) === preferred;
        const currentPreferred = preferred && normalize(current?.source) === preferred;
        if (candidatePreferred !== currentPreferred) {
            if (candidatePreferred) selected.set(id, collection);
            continue;
        }

        if (chunkCount(collection) > chunkCount(current)) {
            selected.set(id, collection);
        }
    }

    return selected;
}
