/**
 * Transcript recall capacity profile.
 *
 * This is deliberately separate from Shardwright RAG settings.  These values are
 * operational context-accounting preferences, not evidence, relevance, or
 * sufficiency claims.
 */

import {
    TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION,
    createCatalogDefaults,
    getSettingsCatalogEntry,
    isValidCatalogValue,
} from '../settings-catalog.js';

const PROFILE_CATALOG_ENTRY_ID = 'transcript-recall-capacity-profile';
const profileCatalog = getSettingsCatalogEntry(PROFILE_CATALOG_ENTRY_ID);
const LEGACY_PROFILE_SCHEMA_VERSION = 1;
const LEGACY_PROFILE_KEYS = Object.freeze([
    'schemaVersion',
    'retrievalCeilingTokens',
    'systemCardReservationTokens',
    'activeChatReservationTokens',
    'outputReservationTokens',
]);

export { TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION };

export function createDefaultTranscriptCapacityProfile() {
    return {
        schemaVersion: TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION,
        ...createCatalogDefaults(PROFILE_CATALOG_ENTRY_ID),
    };
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function isMigratableLegacyProfile(profile) {
    return isPlainObject(profile)
        && profile.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION
        && LEGACY_PROFILE_KEYS.every((key) => Object.hasOwn(profile, key))
        && isSafeNonNegativeInteger(profile.retrievalCeilingTokens)
        && isSafeNonNegativeInteger(profile.systemCardReservationTokens)
        && isSafeNonNegativeInteger(profile.activeChatReservationTokens)
        && isSafeNonNegativeInteger(profile.outputReservationTokens);
}

/**
 * Adds a missing profile to a settings object without repairing an explicitly
 * malformed profile.  A malformed explicit value must later fail closed rather
 * than being silently replaced with a guessed configuration.
 *
 * @param {object} settings
 * @returns {boolean} true when a missing profile was added
 */
export function ensureTranscriptCapacityProfileSettings(settings) {
    if (!isPlainObject(settings)) return false;

    if (settings.transcriptRecall === undefined) {
        settings.transcriptRecall = {
            capacityProfile: createDefaultTranscriptCapacityProfile(),
        };
        return true;
    }

    if (!isPlainObject(settings.transcriptRecall)) return false;

    if (settings.transcriptRecall.capacityProfile === undefined) {
        settings.transcriptRecall.capacityProfile = createDefaultTranscriptCapacityProfile();
        return true;
    }

    const profile = settings.transcriptRecall.capacityProfile;
    if (!isMigratableLegacyProfile(profile)) return false;

    if (settings.transcriptRecall.legacyCapacityProfileV1 === undefined) {
        settings.transcriptRecall.legacyCapacityProfileV1 = { ...profile };
    }
    settings.transcriptRecall.capacityProfile = {
        schemaVersion: TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION,
        retrievalCeilingTokens: profile.retrievalCeilingTokens,
        safetyHeadroomTokens: 0,
    };
    return true;
}

/**
 * Normalizes only a complete, structurally valid profile.  It intentionally
 * has no fallback to RAG counts, thresholds, model names, or character costs.
 *
 * @param {unknown} profile
 * @returns {Readonly<object>}
 */
export function resolveTranscriptCapacityProfile(profile) {
    if (!isPlainObject(profile) ||
        profile.schemaVersion !== TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION) {
        return Object.freeze({
            state: 'PROFILE_UNAVAILABLE',
            reason: 'PROFILE_INVALID',
        });
    }

    if (!profileCatalog || profileCatalog.path.join('.') !== 'transcriptRecall.capacityProfile') {
        return Object.freeze({
            state: 'PROFILE_UNAVAILABLE',
            reason: 'PROFILE_CATALOG_UNAVAILABLE',
        });
    }

    for (const field of profileCatalog.settings) {
        if (!isValidCatalogValue(field, profile[field.key])) {
            return Object.freeze({
                state: 'PROFILE_UNAVAILABLE',
                reason: 'PROFILE_INVALID',
            });
        }
    }

    return Object.freeze({
        state: 'PROFILE_AVAILABLE',
        schemaVersion: TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION,
        retrievalCeilingTokens: profile.retrievalCeilingTokens,
        safetyHeadroomTokens: profile.safetyHeadroomTokens,
    });
}
