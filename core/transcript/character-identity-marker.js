/** Policy for Shardwright's namespaced character-card identity marker. */

const MARKER_VERSION = 1;

function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0; }

export function createCharacterIdentityMarker({ randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto) } = {}) {
    if (typeof randomUUID !== 'function') throw new Error('TIR_MARKER_RANDOM_SOURCE_UNAVAILABLE');
    const characterInstanceId = `transcript_character_${randomUUID()}`;
    return Object.freeze({ schemaVersion: MARKER_VERSION, characterInstanceId, copyUuid: randomUUID() });
}

export function createDuplicateCharacterIdentityMarker(sourceMarker, { randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto) } = {}) {
    const source = validateCharacterIdentityMarker(sourceMarker);
    if (source.state !== 'VALID') return source;
    if (typeof randomUUID !== 'function') throw new Error('TIR_MARKER_RANDOM_SOURCE_UNAVAILABLE');
    return Object.freeze({ state: 'DUPLICATE_MARKER_CREATED', marker: Object.freeze({ schemaVersion: MARKER_VERSION, characterInstanceId: `transcript_character_${randomUUID()}`, copyUuid: randomUUID(), copiedFromCharacterInstanceId: source.marker.characterInstanceId }) });
}

export function validateCharacterIdentityMarker(marker) {
    if (!marker || marker.schemaVersion !== MARKER_VERSION || !isNonEmptyString(marker.characterInstanceId)) {
        return Object.freeze({ state: 'UNRESOLVED', reason: 'MARKER_MISSING_OR_MALFORMED' });
    }
    if (!isNonEmptyString(marker.copyUuid)) return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'MARKER_COPY_METADATA_MISSING', characterInstanceId: marker.characterInstanceId });
    if (marker.copiedFromCharacterInstanceId !== undefined && !isNonEmptyString(marker.copiedFromCharacterInstanceId)) {
        return Object.freeze({ state: 'UNRESOLVED', reason: 'MARKER_MALFORMED_LINEAGE' });
    }
    return Object.freeze({ state: 'VALID', marker: Object.freeze({ ...marker }) });
}

export function classifyCharacterIdentityMarkers(markers) {
    if (!Array.isArray(markers) || markers.length === 0) return Object.freeze({ state: 'UNRESOLVED', reason: 'NO_MARKERS' });
    const validated = markers.map(validateCharacterIdentityMarker);
    if (validated.some((result) => result.state === 'UNRESOLVED')) return Object.freeze({ state: 'UNRESOLVED', reason: 'MARKER_MISSING_OR_MALFORMED' });
    if (validated.some((result) => result.state === 'REVIEW_REQUIRED')) return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'MARKER_COPY_METADATA_MISSING' });
    const pairs = new Set(validated.map(({ marker }) => `${marker.characterInstanceId}\u0000${marker.copyUuid}`));
    if (pairs.size !== markers.length) return Object.freeze({ state: 'REFUSED', reason: 'DUPLICATE_MARKER_COLLISION' });
    const instances = new Set(validated.map(({ marker }) => marker.characterInstanceId));
    if (instances.size !== markers.length) return Object.freeze({ state: 'REVIEW_REQUIRED', reason: 'LOGICAL_ID_MULTIPLE_CARD_INCARNATIONS' });
    return Object.freeze({ state: 'VALID', markers: Object.freeze(validated.map(({ marker }) => marker)) });
}

export const CHARACTER_ASSOCIATION_DECISIONS = Object.freeze({ ADOPT_EXISTING: 'ADOPT_EXISTING', CREATE_NEW: 'CREATE_NEW', LEAVE_UNRESOLVED: 'LEAVE_UNRESOLVED', RESET_MARKER: 'RESET_MARKER' });

export function createCharacterAssociationDecision({ decision, cardMarker = null, targetCharacterInstanceId = null, operatorActionId, basis, recordedAt }) {
    if (!Object.values(CHARACTER_ASSOCIATION_DECISIONS).includes(decision) || !isNonEmptyString(operatorActionId) || !isNonEmptyString(basis) || !isNonEmptyString(recordedAt)) {
        return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_DECISION_INVALID' });
    }
    if (decision === CHARACTER_ASSOCIATION_DECISIONS.ADOPT_EXISTING && !isNonEmptyString(targetCharacterInstanceId)) return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_TARGET_REQUIRED' });
    const markerResult = cardMarker === null ? { state: 'UNRESOLVED', reason: 'MARKER_MISSING_OR_MALFORMED' } : validateCharacterIdentityMarker(cardMarker);
    return Object.freeze({ state: 'RECORDED', decision, cardMarker: cardMarker ? Object.freeze({ ...cardMarker }) : null, targetCharacterInstanceId: targetCharacterInstanceId ?? null, operatorActionId, basis, recordedAt, markerState: markerResult.state });
}
