/**
 * Browser-safe catalog edit adapter. It validates a proposed operator edit before
 * the UI persists the existing global settings object.
 */

import {
    canEditCatalogEntry,
    getSettingsCatalogEntry,
    isValidCatalogValue,
} from './settings-catalog.js';
import { resolveTranscriptCapacityProfile } from './transcript/capacity-profile.js';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolvePath(root, path) {
    let current = root;
    for (const segment of path) {
        if (!isPlainObject(current) || !Object.hasOwn(current, segment)) return null;
        current = current[segment];
    }
    return current;
}

export function getEditableCatalogEntry(id) {
    const entry = getSettingsCatalogEntry(id);
    return entry && canEditCatalogEntry(entry) ? entry : null;
}

export function parseCatalogIntegerEdit(setting, rawValue) {
    const text = String(rawValue ?? '').trim();
    if (!/^\d+$/u.test(text)) return null;
    const value = Number(text);
    return isValidCatalogValue(setting, value) ? value : null;
}

/**
 * Applies an accepted edit to the existing scoped settings object. Persisting is
 * intentionally left to the caller, which must use the matching scope authority.
 */
export function applyCatalogIntegerEdit(settings, entryId, settingKey, rawValue) {
    const entry = getEditableCatalogEntry(entryId);
    const setting = entry?.settings.find((candidate) => candidate.key === settingKey);
    const value = parseCatalogIntegerEdit(setting, rawValue);
    if (!entry || !setting || value === null) {
        return Object.freeze({ accepted: false, reason: 'SETTING_VALUE_INVALID' });
    }

    const target = resolvePath(settings, entry.path);
    if (!isPlainObject(target)) {
        return Object.freeze({ accepted: false, reason: 'SETTING_SCOPE_UNAVAILABLE' });
    }

    if (entry.id === 'transcript-recall-capacity-profile'
        && resolveTranscriptCapacityProfile(target).state !== 'PROFILE_AVAILABLE') {
        return Object.freeze({ accepted: false, reason: 'SETTING_PROFILE_UNAVAILABLE' });
    }

    target[setting.key] = value;
    return Object.freeze({ accepted: true, value });
}
