/**
 * Declarative catalog for operator-facing Shardwright settings.
 *
 * `extension_settings.shardwright` remains the only persisted settings
 * authority. This catalog declares the supported setting surface so defaults,
 * validation, migrations, and future UI can share one definition.
 */

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

function freezeCatalog(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) freezeCatalog(child);
        Object.freeze(value);
    }
    return value;
}

export const TRANSCRIPT_CAPACITY_PROFILE_SCHEMA_VERSION = 2;

export const SETTINGS_CATALOG_SCOPES = freezeCatalog({
    GLOBAL: 'global',
    CHARACTER: 'character',
    CHAT: 'chat',
    SESSION: 'session',
});

const SETTINGS_SCOPE_DEFINITIONS = freezeCatalog({
    [SETTINGS_CATALOG_SCOPES.GLOBAL]: {
        persistenceAuthority: 'extension_settings.shardwright',
        editAuthority: 'extension-settings',
    },
    [SETTINGS_CATALOG_SCOPES.CHARACTER]: {
        persistenceAuthority: null,
        editAuthority: null,
    },
    [SETTINGS_CATALOG_SCOPES.CHAT]: {
        persistenceAuthority: 'chat_metadata.shardwright',
        editAuthority: 'chat-metadata',
    },
    [SETTINGS_CATALOG_SCOPES.SESSION]: {
        persistenceAuthority: null,
        editAuthority: 'runtime-session',
    },
});

export const OPERATOR_SETTINGS_CATALOG = freezeCatalog([
    {
        id: 'transcript-recall-capacity-profile',
        path: ['transcriptRecall', 'capacityProfile'],
        scope: SETTINGS_CATALOG_SCOPES.GLOBAL,
        section: 'Transcript Recall',
        label: 'Capacity',
                help: 'Controls how much transcript recall may use after the host measures the current prompt. These values do not determine what evidence is relevant or sufficient.',
        settings: [
            {
                key: 'retrievalCeilingTokens',
                type: 'integer',
                minimum: 0,
                maximum: MAX_SAFE_INTEGER,
                defaultValue: 24576,
                label: 'Maximum recalled context',
                help: 'The most tokens Transcript Recall may contribute to one assembled context.',
                ui: { control: 'number', step: 256, advanced: true },
            },
            {
                key: 'safetyHeadroomTokens',
                type: 'integer',
                minimum: 0,
                maximum: MAX_SAFE_INTEGER,
                defaultValue: 0,
                label: 'Additional safety headroom',
                help: 'Optional extra prompt capacity held back after the host has already measured the assembled prompt and reserved its configured reply limit.',
                ui: { control: 'number', step: 256, advanced: true },
            },
        ],
    },
]);

export function getSettingsCatalogEntry(id) {
    return OPERATOR_SETTINGS_CATALOG.find((entry) => entry.id === id) ?? null;
}

/**
 * A scope identifies storage and editing jurisdiction; it is never merely a
 * display label. Character scope remains unavailable until a separate owner is
 * declared, so consumers can refuse instead of falling back to global state.
 */
export function getSettingsScopeDefinition(scope) {
    return SETTINGS_SCOPE_DEFINITIONS[scope] ?? null;
}

export function canEditCatalogEntry(entry) {
    const definition = getSettingsScopeDefinition(entry?.scope);
    if (!definition || definition.editAuthority === null) return false;
    return definition.persistenceAuthority !== null || entry?.scope === SETTINGS_CATALOG_SCOPES.SESSION;
}

export function createCatalogDefaults(id) {
    const entry = getSettingsCatalogEntry(id);
    if (!entry) return null;
    return Object.fromEntries(entry.settings.map((setting) => [setting.key, setting.defaultValue]));
}

export function isValidCatalogValue(setting, value) {
    return setting?.type === 'integer' &&
        Number.isSafeInteger(value) &&
        value >= setting.minimum &&
        value <= setting.maximum;
}
