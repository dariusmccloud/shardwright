/**
 * Pure content-level deduplication projection.
 * Canonical content is keyed only by an exact supplied content hash; every
 * source occurrence remains a separate custody-bearing link.
 */

function refusal(reason, extra = {}) {
    return Object.freeze({ state: 'REFUSED', reason, ...extra });
}

function validString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

export function deduplicateContentOccurrences(occurrences) {
    if (!Array.isArray(occurrences)) return refusal('OCCURRENCES_INVALID');
    const canonicalByHash = new Map();
    const links = [];

    for (const occurrence of occurrences) {
        if (!occurrence || !validString(occurrence.contentHash) || !validString(occurrence.sourceLogicalId) || !validString(occurrence.occurrenceId)) {
            return refusal('OCCURRENCE_IDENTITY_INCOMPLETE');
        }
        const hash = occurrence.contentHash.trim();
        const existing = canonicalByHash.get(hash);
        if (existing && existing.content !== occurrence.content) {
            return refusal('CONTENT_HASH_CONFLICT', { contentHash: hash, occurrenceId: occurrence.occurrenceId });
        }
        if (!existing) {
            canonicalByHash.set(hash, {
                canonicalContentId: `content:${hash}`,
                contentHash: hash,
                content: occurrence.content,
            });
        }
        links.push({
            occurrenceId: occurrence.occurrenceId,
            sourceLogicalId: occurrence.sourceLogicalId,
            canonicalContentId: `content:${hash}`,
            contentHash: hash,
            visibility: occurrence.visibility ?? 'VISIBLE',
            custody: occurrence.custody ?? null,
        });
    }

    return Object.freeze({
        state: 'DEDUPLICATED',
        canonicalRecords: Object.freeze([...canonicalByHash.values()]),
        occurrenceLinks: Object.freeze(links),
    });
}
