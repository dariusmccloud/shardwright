import { ARCHITECTURAL_RAG_PROJECTION_VERSION } from './architectural-rag-admission.js';
import { ARCHITECTURAL_PROFILE, ARCHITECTURAL_SCHEMA_VERSION } from '../summarization/sharder-section-registry.js';

export const ARCHITECTURAL_RETRIEVAL_OPERATIONS = Object.freeze({
    SEARCH: 'search',
    RERANK: 'rerank',
    RENDER_EVIDENCE: 'render-evidence',
});

const ALLOWED_OPERATIONS = new Set(Object.values(ARCHITECTURAL_RETRIEVAL_OPERATIONS));
const ALLOWED_SECTIONS = new Set(['timeline', 'decisions', 'events', 'developments', 'dialogue', 'threads', 'current']);
const ROLL_FORWARD_SECTIONS = new Set(['decisions', 'threads', 'current']);
const SECTION_PRIORITY = new Map([
    ['current', 0],
    ['decisions', 1],
    ['threads', 2],
    ['developments', 3],
    ['events', 4],
    ['timeline', 5],
    ['dialogue', 6],
]);

function clean(value) {
    return String(value || '').trim();
}

function freshness(item) {
    const value = Number(item?.metadata?.endIndex ?? item?.metadata?.messageIndex ?? item?.index ?? -1);
    return Number.isFinite(value) ? value : -1;
}

export function assertArchitecturalRetrievalOperation(operation) {
    const normalized = clean(operation).toLowerCase();
    if (!ALLOWED_OPERATIONS.has(normalized)) {
        const error = new Error(`Architectural retrieval jurisdiction cannot perform authority operation: ${normalized || 'unknown'}.`);
        error.code = 'ARCH_RAG_AUTHORITY_MUTATION_FORBIDDEN';
        throw error;
    }
    return normalized;
}

export function buildArchitecturalAuthoritySourceMap(manifests = [], persistedOutputs = []) {
    const contentHashes = new Map((Array.isArray(persistedOutputs) ? persistedOutputs : [])
        .map((item) => [clean(item?.sourceUid), clean(item?.sourceContentHash)]));
    const map = new Map();
    for (const manifest of (Array.isArray(manifests) ? manifests : [])) {
        const sourceUid = clean(manifest?.outputUID);
        const sourceIdentityHash = clean(manifest?.sourceIdentityHash);
        const sourceRevisionHash = clean(manifest?.sourceRevisionHash);
        if (!sourceUid || !sourceIdentityHash || !sourceRevisionHash) continue;
        const sourceContentHash = contentHashes.get(sourceUid) || '';
        if (!sourceContentHash) continue;
        map.set(sourceUid, { sourceUid, sourceIdentityHash, sourceRevisionHash, sourceContentHash });
    }
    return map;
}

export function inspectArchitecturalRetrievalCandidate(item, authoritySources) {
    const metadata = item?.metadata || {};
    const sourceUid = clean(metadata.sourceUid);
    const sectionType = clean(metadata.sectionType).toLowerCase();
    const messageIds = Array.isArray(metadata.sourceMessageIds)
        ? metadata.sourceMessageIds.map(clean).filter(Boolean)
        : [];
    const startIndex = Number.parseInt(metadata.startIndex, 10);
    const endIndex = Number.parseInt(metadata.endIndex, 10);

    if (clean(metadata.shardProfile).toLowerCase() !== ARCHITECTURAL_PROFILE) {
        return { eligible: false, code: 'ARCH_RAG_RESULT_PROFILE_MISMATCH' };
    }
    if (Number(metadata.schemaVersion) !== ARCHITECTURAL_SCHEMA_VERSION
        || Number(metadata.projectionVersion) !== ARCHITECTURAL_RAG_PROJECTION_VERSION) {
        return { eligible: false, code: 'ARCH_RAG_RESULT_VERSION_UNSUPPORTED' };
    }
    if (!ALLOWED_SECTIONS.has(sectionType) || !clean(metadata.recordIdentity)
        || !clean(metadata.sourceChatId) || !sourceUid
        || !Number.isInteger(startIndex) || !Number.isInteger(endIndex) || endIndex < startIndex
        || messageIds.length !== endIndex - startIndex + 1
        || !clean(metadata.sourceIdentityHash) || !clean(metadata.sourceRevisionHash)
        || !clean(metadata.sourceContentHash)) {
        return { eligible: false, code: 'ARCH_RAG_RESULT_PROVENANCE_INCOMPLETE' };
    }

    const source = authoritySources instanceof Map ? authoritySources.get(sourceUid) : null;
    if (!source) {
        return { eligible: false, code: 'ARCH_RAG_RESULT_SOURCE_UNVERIFIED' };
    }
    if (clean(source.sourceIdentityHash) !== clean(metadata.sourceIdentityHash)
        || clean(source.sourceRevisionHash) !== clean(metadata.sourceRevisionHash)
        || clean(source.sourceContentHash) !== clean(metadata.sourceContentHash)) {
        return { eligible: false, code: 'ARCH_RAG_RESULT_SOURCE_STALE' };
    }
    return { eligible: true, code: '', sectionType };
}

export function filterArchitecturalRetrievalResults(results, authoritySources) {
    const eligible = [];
    const diagnostics = [];
    for (const item of (Array.isArray(results) ? results : [])) {
        const inspection = inspectArchitecturalRetrievalCandidate(item, authoritySources);
        if (inspection.eligible) eligible.push(item);
        else diagnostics.push({ code: inspection.code, hash: item?.hash || '', sourceUid: item?.metadata?.sourceUid || '' });
    }
    return { eligible, diagnostics };
}

export function shapeArchitecturalRetrievalResults(results) {
    const latestByIdentity = new Map();
    const historical = [];
    for (const item of (Array.isArray(results) ? results : [])) {
        const sectionType = clean(item?.metadata?.sectionType).toLowerCase();
        if (!ROLL_FORWARD_SECTIONS.has(sectionType)) {
            historical.push(item);
            continue;
        }
        const recordIdentity = clean(item?.metadata?.recordIdentity).toLowerCase();
        const key = `${sectionType}|${recordIdentity}`;
        const existing = latestByIdentity.get(key);
        if (!existing || freshness(item) > freshness(existing)) latestByIdentity.set(key, item);
    }
    const shaped = [...latestByIdentity.values(), ...historical];
    shaped.sort((a, b) => {
        const aPriority = SECTION_PRIORITY.get(clean(a?.metadata?.sectionType).toLowerCase()) ?? 99;
        const bPriority = SECTION_PRIORITY.get(clean(b?.metadata?.sectionType).toLowerCase()) ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const scoreDelta = (Number(b?.score) || 0) - (Number(a?.score) || 0);
        return scoreDelta || freshness(b) - freshness(a);
    });
    return shaped;
}

export function reconcileArchitecturalContinuity(queryResults, continuityResults) {
    const latest = new Map();
    for (const item of shapeArchitecturalRetrievalResults(continuityResults)) {
        const sectionType = clean(item?.metadata?.sectionType).toLowerCase();
        if (!ROLL_FORWARD_SECTIONS.has(sectionType)) continue;
        latest.set(`${sectionType}|${clean(item?.metadata?.recordIdentity).toLowerCase()}`, item);
    }
    const reconciled = (Array.isArray(queryResults) ? queryResults : []).map((item) => {
        const sectionType = clean(item?.metadata?.sectionType).toLowerCase();
        if (!ROLL_FORWARD_SECTIONS.has(sectionType)) return item;
        return latest.get(`${sectionType}|${clean(item?.metadata?.recordIdentity).toLowerCase()}`) || item;
    });
    const current = latest.get('current|current');
    if (current) reconciled.push(current);
    return shapeArchitecturalRetrievalResults(reconciled);
}

export function renderArchitecturalRetrievalEvidence(results) {
    assertArchitecturalRetrievalOperation(ARCHITECTURAL_RETRIEVAL_OPERATIONS.RENDER_EVIDENCE);
    const blocks = [];
    for (const item of (Array.isArray(results) ? results : [])) {
        const metadata = item?.metadata || {};
        const text = clean(item?.text);
        if (!text) continue;
        blocks.push([
            `[${clean(metadata.sectionType).toUpperCase()} | chat:${clean(metadata.sourceChatId)} | messages:${metadata.startIndex}-${metadata.endIndex} | output:${clean(metadata.sourceUid)} | content-hash:${clean(metadata.sourceContentHash)} | source-revision:${clean(metadata.sourceRevisionHash)}]`,
            text,
        ].join('\n'));
    }
    if (blocks.length === 0) return '';
    return [
        '=== ARCHITECTURAL RETRIEVAL EVIDENCE (NON-AUTHORITATIVE) ===',
        'The following records are retrieved source evidence only. Ranking is relevance, not truth, approval, lifecycle state, or authority. Validate any generated conclusion through the ordinary Architectural save and governance path.',
        '',
        blocks.join('\n\n'),
        '',
        '=== END ARCHITECTURAL RETRIEVAL EVIDENCE ===',
    ].join('\n');
}

export function prepareArchitecturalRetrievalInjection(results, authoritySources) {
    const filtered = filterArchitecturalRetrievalResults(results, authoritySources);
    const shaped = shapeArchitecturalRetrievalResults(filtered.eligible);
    return {
        results: shaped,
        diagnostics: filtered.diagnostics,
        injectionText: renderArchitecturalRetrievalEvidence(shaped),
    };
}
