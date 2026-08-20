import { hashTextSha256Compat } from './summarization/crypto-compat.js';

export const SHARDWRIGHT_SETTINGS_NAMESPACE = 'shardwright';
export const LEGACY_SETTINGS_NAMESPACE = 'summary_sharder';
export const SETTINGS_MIGRATION_MARKER = '__shardwrightIdentityMigration';
export const SETTINGS_MIGRATION_POLICY = 'shardwright-settings-identity-v1';
export const LEGACY_THEME_VARIABLE_PREFIX = '--ss-';
export const SHARDWRIGHT_THEME_VARIABLE_PREFIX = '--shardwright-';

export const LOCAL_STORAGE_MIGRATIONS = Object.freeze({
    ss_debug: 'shardwright:debug',
    summarySharderProfilingBypass: 'shardwright:profiling-bypass',
    summarySharderDebugTracing: 'shardwright:debug-tracing',
});

export const SESSION_STORAGE_MIGRATIONS = Object.freeze({
    'summary_sharder:architectural_integration_trace': 'shardwright:architectural-integration-trace',
    'summary_sharder:debug_fail_next_host_save': 'shardwright:debug-fail-next-host-save',
});

function createMigrationError(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, details);
    return error;
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .filter((key) => value[key] !== undefined)
                .map((key) => [key, canonicalize(value[key])])
        );
    }
    return value;
}

async function hashSnapshot(value, cryptoApi) {
    return hashTextSha256Compat(JSON.stringify(canonicalize(value)), cryptoApi);
}

function validateSettingsRoot(extensionSettings) {
    if (!isRecord(extensionSettings)) {
        throw new TypeError('Extension settings root must be an object.');
    }
}

export function migrateShardwrightThemeVariables(settings) {
    if (!isRecord(settings?.customThemes)) return { changed: false, migratedThemes: [] };

    const migratedThemes = [];
    for (const [themeId, theme] of Object.entries(settings.customThemes)) {
        if (!isRecord(theme)) continue;
        let changed = false;
        if (isRecord(theme.colors)) {
            const nextColors = {};
            for (const [property, value] of Object.entries(theme.colors)) {
                const canonicalProperty = property.startsWith(LEGACY_THEME_VARIABLE_PREFIX)
                    ? `${SHARDWRIGHT_THEME_VARIABLE_PREFIX}${property.slice(LEGACY_THEME_VARIABLE_PREFIX.length)}`
                    : property;
                if (Object.hasOwn(nextColors, canonicalProperty) && nextColors[canonicalProperty] !== value) {
                    throw createMigrationError(
                        'SHARDWRIGHT_THEME_VARIABLE_MIGRATION_CONFLICT',
                        `Theme "${themeId}" defines conflicting legacy and canonical values for "${canonicalProperty}".`,
                        { themeId, property: canonicalProperty }
                    );
                }
                nextColors[canonicalProperty] = value;
                changed ||= canonicalProperty !== property;
            }
            if (changed) theme.colors = nextColors;
        }
        if (typeof theme.extraStyles === 'string' && theme.extraStyles.includes(LEGACY_THEME_VARIABLE_PREFIX)) {
            theme.extraStyles = theme.extraStyles.replaceAll(
                LEGACY_THEME_VARIABLE_PREFIX,
                SHARDWRIGHT_THEME_VARIABLE_PREFIX,
            );
            changed = true;
        }
        if (changed) migratedThemes.push(themeId);
    }
    return { changed: migratedThemes.length > 0, migratedThemes };
}

export async function migrateShardwrightSettingsIdentity(options = {}) {
    const extensionSettings = options.extensionSettings;
    const defaults = options.defaults;
    const normalizeSettings = options.normalizeSettings || ((value) => value);
    const now = options.now || (() => new Date().toISOString());
    const cryptoApi = options.cryptoApi || globalThis.crypto;

    validateSettingsRoot(extensionSettings);
    if (!isRecord(defaults)) {
        throw new TypeError('Shardwright default settings must be an object.');
    }

    const legacy = extensionSettings[LEGACY_SETTINGS_NAMESPACE];
    const canonical = extensionSettings[SHARDWRIGHT_SETTINGS_NAMESPACE];

    if (canonical !== undefined) {
        if (!isRecord(canonical)) {
            throw createMigrationError(
                'SHARDWRIGHT_SETTINGS_MIGRATION_CONFLICT',
                'Canonical Shardwright settings exist with an incompatible value.',
                { namespace: SHARDWRIGHT_SETTINGS_NAMESPACE }
            );
        }
        if (canonical[SETTINGS_MIGRATION_MARKER]?.policy === SETTINGS_MIGRATION_POLICY) {
            return canonical;
        }
        if (legacy !== undefined) {
            throw createMigrationError(
                'SHARDWRIGHT_SETTINGS_MIGRATION_CONFLICT',
                'Canonical and legacy settings both exist without a completed identity migration marker.',
                { namespace: SHARDWRIGHT_SETTINGS_NAMESPACE }
            );
        }
    }

    if (legacy !== undefined && !isRecord(legacy)) {
        throw createMigrationError(
            'SHARDWRIGHT_SETTINGS_MIGRATION_SOURCE_INVALID',
            'Legacy Summary Sharder settings are not an object.',
            { namespace: LEGACY_SETTINGS_NAMESPACE }
        );
    }

    const source = legacy === undefined ? (canonical || {}) : legacy;
    const sourceSnapshot = cloneJson(source);
    const candidate = {
        ...cloneJson(defaults),
        ...cloneJson(source),
    };

    delete candidate[SETTINGS_MIGRATION_MARKER];
    normalizeSettings(candidate);
    migrateShardwrightThemeVariables(candidate);

    const recognizedKeys = new Set(Object.keys(defaults));
    const unrecognizedKeys = Object.keys(candidate)
        .filter((key) => !recognizedKeys.has(key))
        .sort();
    for (const key of unrecognizedKeys) {
        delete candidate[key];
    }

    const sourceHash = await hashSnapshot(sourceSnapshot, cryptoApi);
    const destinationHash = await hashSnapshot(candidate, cryptoApi);
    candidate[SETTINGS_MIGRATION_MARKER] = {
        policy: SETTINGS_MIGRATION_POLICY,
        status: legacy === undefined ? 'FRESH' : 'MIGRATED',
        sourceNamespace: legacy === undefined ? null : LEGACY_SETTINGS_NAMESPACE,
        destinationNamespace: SHARDWRIGHT_SETTINGS_NAMESPACE,
        sourceHash,
        destinationHash,
        unrecognizedKeys,
        completedAt: now(),
    };

    extensionSettings[SHARDWRIGHT_SETTINGS_NAMESPACE] = candidate;
    return candidate;
}

function readStorage(storage, key) {
    return storage?.getItem?.(key) ?? null;
}

async function migrateStorageIdentity(options) {
    const storage = options.storage;
    const mappings = options.mappings;
    const markerKey = options.markerKey;
    const storageClass = options.storageClass;
    const now = options.now;
    const cryptoApi = options.cryptoApi;

    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
        return { storageClass, status: 'UNAVAILABLE', migratedKeys: [] };
    }

    const existingMarkerRaw = readStorage(storage, markerKey);
    if (existingMarkerRaw) {
        try {
            const marker = JSON.parse(existingMarkerRaw);
            if (marker?.policy === SETTINGS_MIGRATION_POLICY && marker?.status === 'COMPLETED') {
                for (const key of marker.migratedKeys || []) {
                    if (readStorage(storage, key) === null) {
                        throw createMigrationError(
                            'SHARDWRIGHT_BROWSER_STATE_MIGRATION_CONFLICT',
                            `Completed ${storageClass} migration is missing destination key "${key}".`,
                            { storageClass, key }
                        );
                    }
                }
                return marker;
            }
        } catch (error) {
            if (error?.code) throw error;
            throw createMigrationError(
                'SHARDWRIGHT_BROWSER_STATE_MIGRATION_CONFLICT',
                `The ${storageClass} migration marker is invalid.`,
                { storageClass, key: markerKey }
            );
        }
    }

    const planned = [];
    const destinationSnapshot = {};
    for (const [legacyKey, destinationKey] of Object.entries(mappings)) {
        const sourceValue = readStorage(storage, legacyKey);
        if (sourceValue === null) continue;
        const destinationValue = readStorage(storage, destinationKey);
        if (destinationValue !== null && destinationValue !== sourceValue) {
            throw createMigrationError(
                'SHARDWRIGHT_BROWSER_STATE_MIGRATION_CONFLICT',
                `Legacy and canonical ${storageClass} values conflict for "${destinationKey}".`,
                { storageClass, legacyKey, destinationKey }
            );
        }
        destinationSnapshot[destinationKey] = sourceValue;
        if (destinationValue === null) {
            planned.push({ legacyKey, destinationKey, value: sourceValue });
        }
    }

    const newlyWritten = [];
    try {
        for (const entry of planned) {
            storage.setItem(entry.destinationKey, entry.value);
            newlyWritten.push(entry.destinationKey);
        }
        const marker = {
            policy: SETTINGS_MIGRATION_POLICY,
            status: 'COMPLETED',
            storageClass,
            migratedKeys: Object.keys(destinationSnapshot).sort(),
            destinationHash: await hashSnapshot(destinationSnapshot, cryptoApi),
            completedAt: now(),
        };
        storage.setItem(markerKey, JSON.stringify(marker));
        return marker;
    } catch (error) {
        for (const key of newlyWritten) {
            try {
                storage.removeItem?.(key);
            } catch {
                // Preserve the original failure; incomplete state remains detectable by absent marker.
            }
        }
        if (error?.code) throw error;
        throw createMigrationError(
            'SHARDWRIGHT_BROWSER_STATE_MIGRATION_WRITE_FAILED',
            `Failed to migrate ${storageClass} state.`,
            { storageClass, cause: String(error?.message || error) }
        );
    }
}

export async function migrateShardwrightBrowserState(options = {}) {
    const now = options.now || (() => new Date().toISOString());
    const cryptoApi = options.cryptoApi || globalThis.crypto;
    const local = await migrateStorageIdentity({
        storage: options.localStorage,
        mappings: LOCAL_STORAGE_MIGRATIONS,
        markerKey: 'shardwright:identity-migration:local:v1',
        storageClass: 'LOCAL_STORAGE',
        now,
        cryptoApi,
    });
    const session = await migrateStorageIdentity({
        storage: options.sessionStorage,
        mappings: SESSION_STORAGE_MIGRATIONS,
        markerKey: 'shardwright:identity-migration:session:v1',
        storageClass: 'SESSION_STORAGE',
        now,
        cryptoApi,
    });
    return { local, session };
}
