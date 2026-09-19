/** Server-owned pure fork suggestion; review evidence only, never authority. */
function refusal(reason, extra = {}) { return Object.freeze({ state: 'REFUSED', reason, ...extra }); }
function validSource(source) { return source && typeof source.sourceLogicalId === 'string' && source.sourceLogicalId.trim() && typeof source.characterInstanceId === 'string' && source.characterInstanceId.trim() && Array.isArray(source.messages) && source.messages.length > 0 && source.messages.every((message) => message && typeof message.contentHash === 'string' && message.contentHash.trim()) && (source.createdAtMs == null || (typeof source.createdAtMs === 'number' && Number.isFinite(source.createdAtMs))); }

export function suggestHistoricalFork({ sources } = {}) {
    if (!Array.isArray(sources) || sources.length !== 2 || !sources.every(validSource)) return refusal('FORK_SUGGESTION_INPUT_INVALID');
    const [left, right] = sources;
    if (left.characterInstanceId !== right.characterInstanceId) return refusal('CHARACTER_IDENTITY_MISMATCH');
    const limit = Math.min(left.messages.length, right.messages.length);
    let prefixLength = 0;
    while (prefixLength < limit && left.messages[prefixLength]?.contentHash === right.messages[prefixLength]?.contentHash) prefixLength += 1;
    if (prefixLength === 0) return refusal('NO_EXACT_PREFIX');
    if (prefixLength === left.messages.length && prefixLength === right.messages.length) return refusal('IDENTICAL_SOURCES_NOT_FORK');
    const leftTimed = Number.isFinite(left.createdAtMs);
    const rightTimed = Number.isFinite(right.createdAtMs);
    const parent = leftTimed && rightTimed ? (left.createdAtMs < right.createdAtMs ? left : right.createdAtMs < left.createdAtMs ? right : null) : leftTimed ? left : rightTimed ? right : null;
    const child = parent === left ? right : parent === right ? left : null;
    return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'LIKELY_FORK_EXACT_PREFIX', sourceLogicalIds: Object.freeze([left.sourceLogicalId, right.sourceLogicalId]), proposedParentSourceLogicalId: parent?.sourceLogicalId || null, proposedChildSourceLogicalId: child?.sourceLogicalId || null, forkAnchor: Object.freeze({ messageIndex: prefixLength - 1, contentHash: left.messages[prefixLength - 1].contentHash }), matchedPrefixLength: prefixLength, divergentSuffixLengths: Object.freeze({ [left.sourceLogicalId]: left.messages.length - prefixLength, [right.sourceLogicalId]: right.messages.length - prefixLength }), orderingBasis: parent ? (leftTimed && rightTimed ? 'OBSERVED_CREATION_METADATA' : 'PARTIAL_CREATION_METADATA') : 'CREATION_METADATA_UNAVAILABLE', lineageEvidence: Object.freeze({ [left.sourceLogicalId]: left.lineageHints || null, [right.sourceLogicalId]: right.lineageHints || null }), reviewRequired: true });
}

export function suggestHistoricalForkSet({ sources } = {}) {
    if (!Array.isArray(sources) || sources.length < 2) return refusal('FORK_SUGGESTION_INPUT_INVALID');
    const suggestions = [];
    const refusals = [];
    for (let leftIndex = 0; leftIndex < sources.length - 1; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < sources.length; rightIndex += 1) {
            const result = suggestHistoricalFork({ sources: [sources[leftIndex], sources[rightIndex]] });
            if (result.state === 'REVIEW_REQUIRED') suggestions.push(result);
            else refusals.push(Object.freeze({ sourceLogicalIds: Object.freeze([sources[leftIndex]?.sourceLogicalId || null, sources[rightIndex]?.sourceLogicalId || null]), reason: result.reason }));
        }
    }
    if (suggestions.length === 0) return refusal('NO_REVIEWABLE_FORKS', { refusals: Object.freeze(refusals) });
    return Object.freeze({ state: 'REVIEW_REQUIRED_SET', reason: 'LIKELY_FORK_SET', suggestions: Object.freeze(suggestions), refusals: Object.freeze(refusals), reviewRequired: true });
}
