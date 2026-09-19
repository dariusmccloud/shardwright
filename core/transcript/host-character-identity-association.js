import { applyCharacterIdentityAssociation } from './character-identity-association.js';
import { CHARACTER_ASSOCIATION_DECISIONS } from './character-identity-marker.js';
import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';

let lastDecision = null;

export function getLastCharacterIdentityAssociation() { return lastDecision; }
export function clearLastCharacterIdentityAssociation() { lastDecision = null; }

export function installHostCharacterIdentityAssociationCapability({ target = globalThis, contextResolver, writeExtensionField, clearExtensionField, auditDecision } = {}) {
    if (typeof contextResolver !== 'function' || typeof auditDecision !== 'function') return false;
    const namespace = ensureShardwrightNamespace('transcript', target);
    namespace.associateCurrentCharacterIdentity = async (input = {}) => {
        const context = contextResolver();
        const hostWriter = typeof writeExtensionField === 'function' ? writeExtensionField : context?.writeExtensionField;
        if (typeof hostWriter !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_HOST_PRIMITIVES_UNAVAILABLE' });
        const hostClear = typeof clearExtensionField === 'function' ? clearExtensionField : context?.clearExtensionField;
        const characterId = Number(context?.characterId);
        const character = Number.isInteger(characterId) ? context?.characters?.[characterId] : null;
        const currentMarker = character?.data?.extensions?.shardwright ?? character?.json_data?.extensions?.shardwright ?? character?.extensions?.shardwright ?? null;
        const result = await applyCharacterIdentityAssociation({ ...input, characterId, currentMarker, writeExtensionField: hostWriter.bind(context), clearExtensionField: typeof hostClear === 'function' ? hostClear.bind(context) : undefined, auditDecision: async (decision) => { lastDecision = decision; return await auditDecision(decision); } });
        return result;
    };
    namespace.getLastCharacterIdentityAssociation = getLastCharacterIdentityAssociation;
    namespace.clearLastCharacterIdentityAssociation = clearLastCharacterIdentityAssociation;
    return true;
}

export { CHARACTER_ASSOCIATION_DECISIONS };
