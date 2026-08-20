import { ARCHITECTURAL_PROFILE, normalizeSharderProfile } from '../summarization/sharder-section-registry.js';

export const ARCHITECTURAL_RAG_UI_POSTURE = Object.freeze({
    label: 'Architectural Discovery',
    description: 'Indexes only persisted, provenance-complete Architectural shards. Retrieved records are clearly labelled non-authoritative source evidence; ordinary save, validation, and governance still apply.',
    warmArchive: 'Warm archive remains unavailable for Architectural Memory.',
});

export function getArchitecturalRagUiPosture(settings) {
    return settings?.sharderMode === true
        && normalizeSharderProfile(settings?.sharderProfile) === ARCHITECTURAL_PROFILE
        ? ARCHITECTURAL_RAG_UI_POSTURE
        : null;
}
