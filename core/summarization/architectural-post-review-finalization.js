import {
    ARCHITECTURAL_FINALIZED_PROFILE,
    ARCHITECTURAL_FINALIZED_SCHEMA_ID,
    ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
    normalizeArchitecturalSourceManifestDescriptor,
    normalizeArchitecturalSourceManifestSet,
    renderFinalizedArchitecturalPayload,
} from './architectural-finalized-semantic.js';
import { ARCHITECTURAL_WEIGHT_BY_EMOJI } from './architectural-record-parser.js';
import { createArchitecturalSemanticReplayArtifact } from './architectural-semantic-replay-artifact.js';

export const ARCHITECTURAL_POST_REVIEW_ERROR_CODES = Object.freeze({
    INVALID_INPUT: 'ARCH_POST_REVIEW_INVALID_INPUT',
    UNKNOWN_RECORD: 'ARCH_POST_REVIEW_UNKNOWN_RECORD',
    RAW_EDIT_UNSUPPORTED: 'ARCH_POST_REVIEW_RAW_EDIT_UNSUPPORTED',
});

export class ArchitecturalPostReviewFinalizationError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'ArchitecturalPostReviewFinalizationError';
        this.code = code;
        this.details = { ...details };
    }
}

const SECTION_KEYS = Object.freeze([
    'timeline', 'decisions', 'events', 'developments', 'dialogue', 'threads', 'current',
]);

export function buildArchitecturalReviewRecordId(sectionKey, itemIndex) {
    return `architectural-review:${sectionKey}:${itemIndex}`;
}

export function createArchitecturalReviewIntent(sectionRows = {}, originalRecordIds = [], options = {}) {
    const rows = Object.values(sectionRows || {}).flatMap((items) => Array.isArray(items) ? items : []);
    const original = new Set(Array.isArray(originalRecordIds) ? originalRecordIds : []);
    const selectedRecordIds = rows
        .filter((row) => row?.selected !== false && original.has(row?.reviewRecordId))
        .map((row) => row.reviewRecordId);
    const selected = new Set(selectedRecordIds);
    const editedRecords = rows
        .filter((row) => !row?.reviewRecordId || String(row.content || '') !== String(row.initialContent || ''))
        .map((row) => ({
            recordId: row?.reviewRecordId || null,
            content: String(row?.content || ''),
        }));
    return {
        selectedRecordIds,
        deselectedRecordIds: [...original].filter((recordId) => !selected.has(recordId)),
        editedRecords,
        reviewDisposition: options.reviewDisposition || 'CONFIRM',
        baselineAuthorityContext: options.baselineAuthorityContext || null,
    };
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function field(record, name) {
    const value = record?.fields?.[name];
    return Array.isArray(value) ? value[0] : value;
}

function splitList(value, separator) {
    return String(value || '').split(separator).map((entry) => entry.trim()).filter(Boolean);
}

function semanticDecisionFromBaseline(entry) {
    const record = entry?.record;
    const sourceManifest = entry?.sourceManifest;
    if (!record?.sourceRef || !sourceManifest?.manifestId) {
        throw new ArchitecturalPostReviewFinalizationError(
            ARCHITECTURAL_POST_REVIEW_ERROR_CODES.INVALID_INPUT,
            'Inherited Architectural decisions require parsed semantic fields and a source manifest.',
        );
    }
    const decision = {
        sourceRef: record.sourceRef,
        weight: ARCHITECTURAL_WEIGHT_BY_EMOJI[record.weightRaw],
        id: String(field(record, 'ID') || '').trim(),
        types: splitList(field(record, 'TYPE'), ','),
        decision: String(field(record, 'DECISION') || '').trim(),
        why: String(field(record, 'WHY') || '').trim(),
        scope: String(field(record, 'SCOPE') || '').trim(),
        status: String(field(record, 'STATUS') || '').trim(),
        evidence: splitList(field(record, 'EVIDENCE'), ';'),
    };
    const optionalFields = [
        ['PROBLEM', 'problem'],
        ['RULED-OUT', 'ruledOut'],
        ['CHANGED', 'changed'],
        ['ANCHOR', 'anchor'],
        ['SUPERSEDES', 'supersedes'],
        ['SUPERSEDED-BY', 'supersededBy'],
    ];
    for (const [source, target] of optionalFields) {
        const value = String(field(record, source) || '').trim();
        if (value) decision[target] = value;
    }
    const references = [decision.sourceRef, ...decision.evidence.filter((value) => /^S[0-9]+:[0-9]+$/u.test(value))];
    const authorityVersion = Number(entry?.authority?.currentRecordVersion);
    return {
        ...decision,
        provenance: {
            originManifestId: sourceManifest.manifestId,
            authorityRecordId: Number.isFinite(authorityVersion)
                ? `architectural-decision:${decision.id}:v${authorityVersion}`
                : null,
            referenceBindings: [...new Set(references)].map((reference) => ({
                reference,
                manifestId: sourceManifest.manifestId,
            })),
        },
    };
}

function referencesForRecord(sectionKey, record) {
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

function bindGeneratedRecord(sectionKey, record, manifestId) {
    return {
        ...cloneJson(record),
        provenance: {
            originManifestId: manifestId,
            authorityRecordId: null,
            referenceBindings: referencesForRecord(sectionKey, record).map((reference) => ({ reference, manifestId })),
        },
    };
}

function mergeDecisionRecords(inherited, generated) {
    const byId = new Map();
    const order = [];
    for (const record of inherited) {
        if (!byId.has(record.id)) order.push(record.id);
        byId.set(record.id, record);
    }
    for (const record of generated) {
        if (!byId.has(record.id)) order.push(record.id);
        byId.set(record.id, record);
    }
    return order.map((id) => byId.get(id));
}

export function createArchitecturalPostReviewPlan(options = {}) {
    const generationPayload = options.generationPayload;
    const currentManifest = options.currentManifest;
    if (!generationPayload?.sections || !currentManifest?.manifestId) {
        throw new ArchitecturalPostReviewFinalizationError(
            ARCHITECTURAL_POST_REVIEW_ERROR_CODES.INVALID_INPUT,
            'Post-review Architectural finalization requires generated records and a current source manifest.',
        );
    }
    const inheritedEntries = Array.isArray(options.inheritedDecisionEntries) ? options.inheritedDecisionEntries : [];
    const inheritedDecisions = inheritedEntries.map(semanticDecisionFromBaseline);
    const manifestById = new Map();
    for (const manifest of [currentManifest, ...inheritedEntries.map((entry) => entry.sourceManifest)]) {
        const normalizedManifest = normalizeArchitecturalSourceManifestDescriptor(manifest);
        const existing = manifestById.get(normalizedManifest.manifestId);
        if (existing && JSON.stringify(existing) !== JSON.stringify(normalizedManifest)) {
            throw new ArchitecturalPostReviewFinalizationError(
                ARCHITECTURAL_POST_REVIEW_ERROR_CODES.INVALID_INPUT,
                `Source manifest ${normalizedManifest.manifestId} has conflicting governed descriptors.`,
                { manifestId: normalizedManifest.manifestId },
            );
        }
        manifestById.set(normalizedManifest.manifestId, normalizedManifest);
    }
    const sourceManifests = normalizeArchitecturalSourceManifestSet([...manifestById.values()]);
    const sections = {};
    for (const sectionKey of SECTION_KEYS) {
        const generated = (generationPayload.sections[sectionKey] || [])
            .map((record) => bindGeneratedRecord(sectionKey, record, currentManifest.manifestId));
        sections[sectionKey] = sectionKey === 'decisions'
            ? mergeDecisionRecords(inheritedDecisions, generated)
            : generated;
    }
    const semanticPayload = {
        schemaVersion: ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
        profile: ARCHITECTURAL_FINALIZED_PROFILE,
        generationContext: {
            rangeStart: generationPayload.source.rangeStart,
            rangeEnd: generationPayload.source.rangeEnd,
            messageIds: [...generationPayload.source.messageIds],
            currentManifestId: currentManifest.manifestId,
        },
        sourceManifests,
        sections,
    };
    const records = SECTION_KEYS.flatMap((sectionKey) => sections[sectionKey].map((record, itemIndex) => ({
        recordId: buildArchitecturalReviewRecordId(sectionKey, itemIndex),
        sectionKey,
        itemIndex,
        record,
    })));
    return { semanticPayload, records };
}

export async function finalizeArchitecturalPostReview(plan, reviewIntent = {}, options = {}) {
    const edits = Array.isArray(reviewIntent.editedRecords) ? reviewIntent.editedRecords : [];
    if (edits.length > 0) {
        throw new ArchitecturalPostReviewFinalizationError(
            ARCHITECTURAL_POST_REVIEW_ERROR_CODES.RAW_EDIT_UNSUPPORTED,
            'Architectural review edits must be structured semantic mutations, not rendered-record text.',
        );
    }
    const known = new Map((plan?.records || []).map((entry) => [entry.recordId, entry]));
    const selectedIds = Array.isArray(reviewIntent.selectedRecordIds)
        ? reviewIntent.selectedRecordIds
        : [...known.keys()];
    for (const recordId of selectedIds) {
        if (!known.has(recordId)) {
            throw new ArchitecturalPostReviewFinalizationError(
                ARCHITECTURAL_POST_REVIEW_ERROR_CODES.UNKNOWN_RECORD,
                `Architectural review intent references unknown record ${recordId}.`,
                { recordId },
            );
        }
    }
    const selected = new Set(selectedIds);
    const semanticPayload = cloneJson(plan.semanticPayload);
    for (const sectionKey of SECTION_KEYS) {
        semanticPayload.sections[sectionKey] = (plan.records || [])
            .filter((entry) => entry.sectionKey === sectionKey && selected.has(entry.recordId))
            .map((entry) => cloneJson(entry.record));
    }
    const rendered = await renderFinalizedArchitecturalPayload(semanticPayload, options);
    const replayArtifact = await createArchitecturalSemanticReplayArtifact({
        semanticPayload: rendered.semanticPayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: Number(options.semanticPromptVersion || 1),
        semanticRendererVersion: rendered.rendererVersion,
        cryptoApi: options.cryptoApi,
    });
    return {
        semanticPayload: rendered.semanticPayload,
        finalOutput: rendered.output,
        semanticSchemaId: ARCHITECTURAL_FINALIZED_SCHEMA_ID,
        semanticSchemaVersion: ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
        sourceManifestSetHash: rendered.sourceManifestSetHash,
        replayArtifact,
    };
}
