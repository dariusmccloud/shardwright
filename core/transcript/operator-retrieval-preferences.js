/**
 * Operator-local Continuity retrieval preferences.
 * These records never establish identity, custody, truth, or Archaeology
 * visibility; they only remember one explicit occurrence preference.
 */

const PREFERENCE_SCHEMA_VERSION = 1;

function text(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function validTimestamp(value) {
    const normalized = text(value);
    return Boolean(normalized && Number.isFinite(Date.parse(normalized)));
}

function mapOf(settings) {
    const value = settings?.transcriptRecall?.operatorPreferences;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function key(characterInstanceId, contentHash) {
    return `${characterInstanceId}::${contentHash}`;
}

export function recordContinuityRetrievalPreference(settings, {
    characterInstanceId,
    contentHash,
    messageRecordId,
    operatorActionId,
    recordedAt,
} = {}) {
    const id = text(characterInstanceId);
    const hash = text(contentHash);
    const message = text(messageRecordId);
    const action = text(operatorActionId);
    const timestamp = text(recordedAt);
    if (!id || !hash || !message || !action || !validTimestamp(timestamp)) {
        return Object.freeze({ state: 'REFUSED', reason: 'PREFERENCE_INPUT_INVALID', settings });
    }
    if (!settings?.transcriptRecall || !mapOf(settings)) {
        return Object.freeze({ state: 'REFUSED', reason: 'PREFERENCE_SETTINGS_UNAVAILABLE', settings });
    }
    const preference = Object.freeze({
        schemaVersion: PREFERENCE_SCHEMA_VERSION,
        characterInstanceId: id,
        contentHash: hash,
        messageRecordId: message,
        operatorActionId: action,
        recordedAt: timestamp,
    });
    const next = {
        ...settings,
        transcriptRecall: {
            ...settings.transcriptRecall,
            operatorPreferences: {
                ...mapOf(settings),
                [key(id, hash)]: preference,
            },
        },
    };
    return Object.freeze({ state: 'RECORDED', settings: next, preference });
}

export function clearContinuityRetrievalPreference(settings, { characterInstanceId, contentHash } = {}) {
    const id = text(characterInstanceId);
    const hash = text(contentHash);
    const preferences = mapOf(settings);
    if (!id || !hash || !preferences) return Object.freeze({ state: 'REFUSED', reason: 'PREFERENCE_UNAVAILABLE', settings });
    const nextPreferences = { ...preferences };
    delete nextPreferences[key(id, hash)];
    return Object.freeze({
        state: 'CLEARED',
        settings: { ...settings, transcriptRecall: { ...settings.transcriptRecall, operatorPreferences: nextPreferences } },
    });
}

export function resolveContinuityRetrievalPreference(settings, {
    characterInstanceId,
    contentHash,
    eligibleMessageRecordIds = [],
    posture = 'CONTINUITY',
} = {}) {
    const id = text(characterInstanceId);
    const hash = text(contentHash);
    if (posture !== 'CONTINUITY') return Object.freeze({ state: 'NOT_APPLICABLE', reason: 'ARCHAEOLOGY_UNCHANGED' });
    const preferences = mapOf(settings);
    const preference = id && hash && preferences?.[key(id, hash)];
    if (!preference) return Object.freeze({ state: 'UNSET' });
    if (preference.schemaVersion !== PREFERENCE_SCHEMA_VERSION
        || preference.characterInstanceId !== id
        || preference.contentHash !== hash
        || !Array.isArray(eligibleMessageRecordIds)
        || !text(preference.operatorActionId)
        || !validTimestamp(preference.recordedAt)
        || !Array.isArray(eligibleMessageRecordIds)
        || !eligibleMessageRecordIds.includes(preference.messageRecordId)) {
        return Object.freeze({ state: 'UNRESOLVED', reason: 'PREFERENCE_STALE_OR_INELIGIBLE' });
    }
    return Object.freeze({ state: 'PREFERRED', messageRecordId: preference.messageRecordId, preference });
}
