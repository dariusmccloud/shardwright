import {
    SAVED_SHARD_CLASSIFICATIONS,
    SAVED_SHARD_FORMATS,
    classifySavedShardText,
} from '../summarization/saved-shard-identity.js';
import {
    ARCHITECTURAL_PROFILE,
    NARRATIVE_PROFILE,
    normalizeSharderProfile,
} from '../summarization/sharder-section-registry.js';

export const ARCHITECTURAL_RAG_REFUSAL = Object.freeze({
    code: 'ARCH_RAG_GOVERNED_ADMISSION_REQUIRED',
    reason: 'architectural-rag-governed-admission-required',
    message: 'Architectural content requires governed persisted-source admission and cannot enter warm archive or an unscoped Narrative RAG path.',
});

function metadataProfile(metadata) {
    return String(
        metadata?.shardProfile
        || metadata?.profile
        || metadata?.extra?.shardProfile
        || metadata?.extra?.profile
        || '',
    ).trim().toLowerCase();
}

export function getArchitecturalRagAdmissionRefusal({ settings = null, text = '', metadata = null } = {}) {
    const activeProfile = normalizeSharderProfile(settings?.sharderProfile || NARRATIVE_PROFILE);
    const storedProfile = metadataProfile(metadata);
    const shardInfo = String(text || '').trim() ? classifySavedShardText(text) : null;
    const architecturalContent = shardInfo?.classification === SAVED_SHARD_CLASSIFICATIONS.ARCHITECTURAL
        || shardInfo?.contentFormat === SAVED_SHARD_FORMATS.ARCHITECTURAL_BRACKET
        || shardInfo?.keyMetadata?.hasMalformedArchitecturalIdentity === true;

    if (activeProfile !== ARCHITECTURAL_PROFILE
        && storedProfile !== ARCHITECTURAL_PROFILE
        && storedProfile !== 'architectural-memory'
        && !architecturalContent) {
        return null;
    }

    return {
        ...ARCHITECTURAL_RAG_REFUSAL,
        detectedBy: activeProfile === ARCHITECTURAL_PROFILE
            ? 'active-profile'
            : (storedProfile ? 'metadata-profile' : 'content-identity'),
    };
}

export function excludeArchitecturalResults(results) {
    return (Array.isArray(results) ? results : []).filter(item => !getArchitecturalRagAdmissionRefusal({
        text: item?.text || item?.metadata?.text || '',
        metadata: item?.metadata || null,
    }));
}

export function filterResultsByOriginBoundary(results) {
    return excludeArchitecturalResults(results);
}
