/**
 * Shardwright-owned operator mapping for explicit transcript character bindings.
 * The map is keyed only by a structured host-supplied stable identifier.  It is
 * not allowed to derive identity from display names, avatars, titles, or paths.
 */

const MAP_KEY = 'transcriptRecall.characterBindingTokens';
const IDENTIFIER_KIND = 'host-character-id';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIdentifier(identifier) {
    if (!isPlainObject(identifier) || identifier.kind !== IDENTIFIER_KIND ||
        typeof identifier.value !== 'string' || !identifier.value.trim()) return null;
    return identifier.value.trim();
}

function readMap(settings) {
    const map = settings?.transcriptRecall?.characterBindingTokens;
    return isPlainObject(map) ? map : null;
}

export function getTranscriptCharacterBindingMapKey() { return MAP_KEY; }

export function resolveTranscriptCharacterBindingSetting(settings, hostCharacterIdentifier) {
    const key = normalizeIdentifier(hostCharacterIdentifier);
    if (!key) return Object.freeze({ state: 'UNRESOLVED', reason: 'HOST_IDENTIFIER_UNAVAILABLE' });
    const map = readMap(settings);
    if (!map) return Object.freeze({ state: 'UNRESOLVED', reason: 'BINDING_MAP_UNAVAILABLE' });
    if (!Object.hasOwn(map, key)) return Object.freeze({ state: 'UNRESOLVED', reason: 'BINDING_NOT_RECORDED' });
    if (typeof map[key] !== 'string' || !map[key].trim()) return Object.freeze({ state: 'UNRESOLVED', reason: 'BINDING_MAPPING_AMBIGUOUS' });
    return Object.freeze({ state: 'BOUND', hostCharacterId: key, bindingToken: map[key].trim() });
}

export function recordTranscriptCharacterBindingSetting(settings, hostCharacterIdentifier, bindingToken) {
    const key = normalizeIdentifier(hostCharacterIdentifier);
    if (!key) return Object.freeze({ state: 'REFUSED', reason: 'HOST_IDENTIFIER_UNAVAILABLE', settings });
    if (typeof bindingToken !== 'string' || !bindingToken.trim()) return Object.freeze({ state: 'REFUSED', reason: 'BINDING_TOKEN_UNAVAILABLE', settings });
    const map = readMap(settings);
    if (!map) return Object.freeze({ state: 'REFUSED', reason: 'BINDING_MAP_UNAVAILABLE', settings });
    if (Object.hasOwn(map, key) && map[key] !== bindingToken.trim()) {
        return Object.freeze({ state: 'REFUSED', reason: 'BINDING_MAPPING_AMBIGUOUS', settings });
    }
    const next = { ...settings, transcriptRecall: { ...settings.transcriptRecall, characterBindingTokens: { ...map, [key]: bindingToken.trim() } } };
    return Object.freeze({ state: 'RECORDED', settings: next, hostCharacterId: key, bindingToken: bindingToken.trim() });
}

export function createHostCharacterIdentifier(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    return Object.freeze({ kind: IDENTIFIER_KIND, value: value.trim() });
}
