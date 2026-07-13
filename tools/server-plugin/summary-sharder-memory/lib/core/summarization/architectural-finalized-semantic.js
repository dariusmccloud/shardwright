import { hashTextSha256Compat } from './crypto-compat.js';
import { validateArchitecturalIntermediatePayload } from './architectural-intermediate-validator.js';
import { renderArchitecturalSemanticPayload } from './architectural-semantic-renderer.js';

export const ARCHITECTURAL_FINALIZED_SCHEMA_VERSION = 1;
export const ARCHITECTURAL_FINALIZED_SCHEMA_ID = 'https://summary-sharder/architectural-finalized/v1';
export const ARCHITECTURAL_FINALIZED_PROFILE = 'architectural-memory-finalized';

export const ARCHITECTURAL_FINALIZED_ERROR_CODES = Object.freeze({
    INVALID: 'ARCH_FINALIZED_SEMANTIC_INVALID',
    MANIFEST_DUPLICATE: 'ARCH_FINALIZED_MANIFEST_DUPLICATE',
    MANIFEST_MISSING: 'ARCH_FINALIZED_MANIFEST_MISSING',
    REFERENCE_UNBOUND: 'ARCH_FINALIZED_REFERENCE_UNBOUND',
    REFERENCE_WRONG_MANIFEST: 'ARCH_FINALIZED_REFERENCE_WRONG_MANIFEST',
});

export class ArchitecturalFinalizedSemanticError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'ArchitecturalFinalizedSemanticError';
        this.code = code;
        this.details = { ...details };
    }
}

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function requiredString(value, field) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            `Finalized Architectural semantic payload requires ${field}.`,
            { field },
        );
    }
    return normalized;
}

function requiredHash(value, field) {
    const normalized = requiredString(value, field);
    if (!/^sha256:[0-9a-f]{64}$/u.test(normalized)) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            `Finalized Architectural semantic payload requires a valid ${field}.`,
            { field },
        );
    }
    return normalized;
}

export function normalizeArchitecturalSourceManifestDescriptor(manifest) {
    const sourceStartPositionAtCreation = Number(manifest?.sourceStartPositionAtCreation);
    const sourceEndPositionAtCreation = Number(manifest?.sourceEndPositionAtCreation);
    if (!Number.isInteger(sourceStartPositionAtCreation)
        || !Number.isInteger(sourceEndPositionAtCreation)
        || sourceEndPositionAtCreation < sourceStartPositionAtCreation) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            'Finalized Architectural source manifest requires a valid source range.',
        );
    }
    return {
        manifestId: requiredString(manifest?.manifestId, 'sourceManifests[].manifestId'),
        sourceIdentityHash: requiredHash(manifest?.sourceIdentityHash, 'sourceManifests[].sourceIdentityHash'),
        sourceRevisionHash: requiredHash(manifest?.sourceRevisionHash, 'sourceManifests[].sourceRevisionHash'),
        sourceStartPositionAtCreation,
        sourceEndPositionAtCreation,
    };
}

export function normalizeArchitecturalSourceManifestSet(manifests = []) {
    const normalized = (Array.isArray(manifests) ? manifests : [])
        .map(normalizeArchitecturalSourceManifestDescriptor)
        .sort((left, right) => left.manifestId.localeCompare(right.manifestId));
    const seen = new Set();
    for (const manifest of normalized) {
        if (seen.has(manifest.manifestId)) {
            throw new ArchitecturalFinalizedSemanticError(
                ARCHITECTURAL_FINALIZED_ERROR_CODES.MANIFEST_DUPLICATE,
                `Finalized Architectural source manifest ${manifest.manifestId} is duplicated.`,
                { manifestId: manifest.manifestId },
            );
        }
        seen.add(manifest.manifestId);
    }
    if (normalized.length === 0) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.MANIFEST_MISSING,
            'Finalized Architectural semantic payload requires at least one source manifest.',
        );
    }
    return normalized;
}

export async function hashArchitecturalSourceManifestSet(manifests, cryptoApi = globalThis.crypto) {
    const normalized = normalizeArchitecturalSourceManifestSet(manifests);
    return await hashTextSha256Compat(stableStringify({
        version: 'architecturalSourceManifestSetV1',
        manifests: normalized,
    }), cryptoApi);
}

function recordReferences(sectionKey, record) {
    const references = [];
    const add = (value) => {
        const normalized = String(value || '').trim();
        if (/^S[0-9]+:[0-9]+$/u.test(normalized) && !references.includes(normalized)) references.push(normalized);
    };
    add(record?.sourceRef);
    if (sectionKey === 'threads') {
        add(record?.introRef);
        add(record?.lastRef);
    }
    if (sectionKey === 'decisions') {
        for (const evidence of record?.evidence || []) add(evidence);
    }
    return references;
}

function normalizeProvenance(provenance, sectionKey, itemIndex) {
    const originManifestId = String(provenance?.originManifestId || '').trim() || null;
    const authorityRecordId = String(provenance?.authorityRecordId || '').trim() || null;
    if (!originManifestId && !authorityRecordId) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            'Every finalized Architectural record requires a manifest or authority-record origin.',
            { sectionKey, itemIndex },
        );
    }
    const referenceBindings = (Array.isArray(provenance?.referenceBindings) ? provenance.referenceBindings : [])
        .map((binding) => ({
            reference: requiredString(binding?.reference, 'provenance.referenceBindings[].reference'),
            manifestId: requiredString(binding?.manifestId, 'provenance.referenceBindings[].manifestId'),
        }))
        .sort((left, right) => left.reference.localeCompare(right.reference) || left.manifestId.localeCompare(right.manifestId));
    return { originManifestId, authorityRecordId, referenceBindings };
}

function projectRecord(record) {
    const projected = { ...record };
    delete projected.provenance;
    return projected;
}

export function projectFinalizedArchitecturalPayloadForRendering(payload) {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: payload.generationContext.rangeStart,
            rangeEnd: payload.generationContext.rangeEnd,
            messageIds: [...payload.generationContext.messageIds],
        },
        sections: Object.fromEntries(Object.entries(payload.sections || {}).map(([sectionKey, records]) => [
            sectionKey,
            (Array.isArray(records) ? records : []).map(projectRecord),
        ])),
    };
}

export function validateFinalizedArchitecturalPayload(payload) {
    if (!payload || typeof payload !== 'object'
        || payload.schemaVersion !== ARCHITECTURAL_FINALIZED_SCHEMA_VERSION
        || payload.profile !== ARCHITECTURAL_FINALIZED_PROFILE) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            'Finalized Architectural semantic payload has an unsupported schema or profile.',
        );
    }
    const manifests = normalizeArchitecturalSourceManifestSet(payload.sourceManifests);
    const manifestById = new Map(manifests.map((manifest) => [manifest.manifestId, manifest]));
    const generationContext = payload.generationContext || {};
    const currentManifestId = requiredString(generationContext.currentManifestId, 'generationContext.currentManifestId');
    const currentManifest = manifestById.get(currentManifestId);
    if (!currentManifest) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.MANIFEST_MISSING,
            'Generation context does not resolve to a bound current source manifest.',
            { manifestId: currentManifestId },
        );
    }
    if (Number(generationContext.rangeStart) !== currentManifest.sourceStartPositionAtCreation
        || Number(generationContext.rangeEnd) !== currentManifest.sourceEndPositionAtCreation) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            'Generation context range does not match its current source manifest.',
        );
    }

    const projected = projectFinalizedArchitecturalPayloadForRendering(payload);
    const intermediateValidation = validateArchitecturalIntermediatePayload(projected);
    if (!intermediateValidation.ok) {
        throw new ArchitecturalFinalizedSemanticError(
            ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
            'Finalized Architectural records do not satisfy the semantic record schema.',
            { diagnostics: intermediateValidation.errors },
        );
    }

    const normalizedSections = {};
    for (const [sectionKey, records] of Object.entries(payload.sections)) {
        normalizedSections[sectionKey] = records.map((record, itemIndex) => {
            const provenance = normalizeProvenance(record.provenance, sectionKey, itemIndex);
            if (provenance.originManifestId && !manifestById.has(provenance.originManifestId)) {
                throw new ArchitecturalFinalizedSemanticError(
                    ARCHITECTURAL_FINALIZED_ERROR_CODES.MANIFEST_MISSING,
                    'Finalized Architectural record origin manifest is not bound.',
                    { sectionKey, itemIndex, manifestId: provenance.originManifestId },
                );
            }
            const bindings = new Map();
            for (const binding of provenance.referenceBindings) {
                if (bindings.has(binding.reference)) {
                    throw new ArchitecturalFinalizedSemanticError(
                        ARCHITECTURAL_FINALIZED_ERROR_CODES.INVALID,
                        'Finalized Architectural reference has duplicate manifest bindings.',
                        { sectionKey, itemIndex, reference: binding.reference },
                    );
                }
                bindings.set(binding.reference, binding.manifestId);
            }
            for (const reference of recordReferences(sectionKey, record)) {
                const manifestId = bindings.get(reference);
                if (!manifestId) {
                    throw new ArchitecturalFinalizedSemanticError(
                        ARCHITECTURAL_FINALIZED_ERROR_CODES.REFERENCE_UNBOUND,
                        `Finalized Architectural reference ${reference} is not bound to a source manifest.`,
                        { sectionKey, itemIndex, reference },
                    );
                }
                const manifest = manifestById.get(manifestId);
                if (!manifest) {
                    throw new ArchitecturalFinalizedSemanticError(
                        ARCHITECTURAL_FINALIZED_ERROR_CODES.MANIFEST_MISSING,
                        `Finalized Architectural reference ${reference} names an unavailable source manifest.`,
                        { sectionKey, itemIndex, reference, manifestId },
                    );
                }
                const ordinal = Number(/^S([0-9]+):/u.exec(reference)?.[1]);
                if (ordinal < manifest.sourceStartPositionAtCreation || ordinal > manifest.sourceEndPositionAtCreation) {
                    throw new ArchitecturalFinalizedSemanticError(
                        ARCHITECTURAL_FINALIZED_ERROR_CODES.REFERENCE_WRONG_MANIFEST,
                        `Finalized Architectural reference ${reference} falls outside its named source manifest.`,
                        { sectionKey, itemIndex, reference, manifestId },
                    );
                }
            }
            return { ...cloneJson(projectRecord(record)), provenance };
        });
    }

    return {
        schemaVersion: ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
        profile: ARCHITECTURAL_FINALIZED_PROFILE,
        generationContext: cloneJson(generationContext),
        sourceManifests: manifests,
        sections: normalizedSections,
    };
}

export async function renderFinalizedArchitecturalPayload(payload, options = {}) {
    const normalizedPayload = validateFinalizedArchitecturalPayload(payload);
    const rendered = renderArchitecturalSemanticPayload(projectFinalizedArchitecturalPayloadForRendering(normalizedPayload));
    return {
        ...rendered,
        semanticPayload: normalizedPayload,
        semanticSchemaId: ARCHITECTURAL_FINALIZED_SCHEMA_ID,
        semanticSchemaVersion: ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
        sourceManifestSetHash: await hashArchitecturalSourceManifestSet(normalizedPayload.sourceManifests, options.cryptoApi),
    };
}
