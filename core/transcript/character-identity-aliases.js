/**
 * Display-only operator aliases for authoritative character identities.
 * Aliases never participate in binding, custody, or ledger decisions.
 */

const MAX_ALIAS_LENGTH = 100;

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIdentity(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readAliases(settings) {
    const aliases = settings?.transcriptRecall?.characterIdentityAliases;
    return isPlainObject(aliases) ? aliases : null;
}

export function getCharacterIdentityAlias(settings, characterInstanceId) {
    const id = normalizeIdentity(characterInstanceId);
    const aliases = readAliases(settings);
    const alias = id && aliases && aliases[id];
    return typeof alias === 'string' && alias.trim() ? alias.trim() : id;
}

export function setCharacterIdentityAlias(settings, characterInstanceId, alias) {
    const id = normalizeIdentity(characterInstanceId);
    if (!id) return Object.freeze({ state: 'REFUSED', reason: 'CHARACTER_INSTANCE_ID_UNAVAILABLE', settings });
    if (!isPlainObject(settings?.transcriptRecall)) return Object.freeze({ state: 'REFUSED', reason: 'TRANSCRIPT_RECALL_SETTINGS_UNAVAILABLE', settings });
    if (typeof alias !== 'string' || !alias.trim()) return Object.freeze({ state: 'REFUSED', reason: 'ALIAS_UNAVAILABLE', settings });
    const normalized = alias.trim();
    if (normalized.length > MAX_ALIAS_LENGTH) return Object.freeze({ state: 'REFUSED', reason: 'ALIAS_TOO_LONG', settings });
    const aliases = readAliases(settings) ?? {};
    const next = {
        ...settings,
        transcriptRecall: {
            ...settings.transcriptRecall,
            characterIdentityAliases: { ...aliases, [id]: normalized },
        },
    };
    return Object.freeze({ state: 'RECORDED', settings: next, characterInstanceId: id, alias: normalized });
}

export function clearCharacterIdentityAlias(settings, characterInstanceId) {
    const id = normalizeIdentity(characterInstanceId);
    const aliases = readAliases(settings);
    if (!id || !aliases) return Object.freeze({ state: 'REFUSED', reason: 'ALIAS_UNAVAILABLE', settings });
    const nextAliases = { ...aliases };
    delete nextAliases[id];
    return Object.freeze({ state: 'RECORDED', settings: { ...settings, transcriptRecall: { ...settings.transcriptRecall, characterIdentityAliases: nextAliases } }, characterInstanceId: id });
}
