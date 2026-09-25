import crypto from 'node:crypto';
import { buildCompiledContextPlan } from './lib/core/compiled-context/document-compiler.js';

const PROJECTION_VERSION = 'compiled-context-document-projection-v1';

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function requireRegistry(registry) {
    if (!registry || !Array.isArray(registry.documents) || registry.documents.length === 0) {
        throw new TypeError('A compiled document registry is required');
    }
    return registry;
}

function projectionRows(registry) {
    const documents = registry.documents.map((document) => ({
        documentLogicalId: document.documentLogicalId,
        canonicalName: document.canonicalName,
        sourceRevisionHash: document.revisionHash,
        unitCount: document.units.length,
    }));
    const units = registry.documents.flatMap((document) => document.units.map((unit) => ({
        sourceUnitId: unit.sourceUnitId,
        documentLogicalId: unit.documentLogicalId,
        headingPath: unit.headingPath,
        headingText: unit.headingText,
        parentSourceUnitId: unit.parentSourceUnitId,
        startLine: unit.startLine,
        endLine: unit.endLine,
        sourceRevisionHash: unit.sourceRevisionHash,
        exactText: unit.exactText,
    })));
    const relationships = registry.documents.flatMap((document) => document.references.map((reference) => {
        const target = registry.byName.get(reference.referenceText) || null;
        return {
            relationshipId: hash(stableStringify({ documentLogicalId: document.documentLogicalId, reference })).slice(0, 48),
            sourceDocumentLogicalId: document.documentLogicalId,
            sourceUnitId: reference.sourceUnitId,
            sourceLine: reference.line,
            referenceText: reference.referenceText,
            relationType: 'REFERENCES',
            targetDocumentLogicalId: target?.documentLogicalId || null,
            targetCanonicalName: target?.canonicalName || null,
            resolutionState: target ? 'RESOLVED' : 'UNRESOLVED',
            sourceRevisionHash: document.revisionHash,
        };
    }));
    return { documents, units, relationships };
}

function rowsHash(rows) {
    return hash(stableStringify({ version: PROJECTION_VERSION, ...rows }));
}

export function ensureCompiledContextProjectionSchema(adapter) {
    adapter.exec(`
        CREATE TABLE IF NOT EXISTS compiled_context_documents (
            document_logical_id TEXT PRIMARY KEY,
            canonical_name TEXT NOT NULL UNIQUE,
            source_revision_hash TEXT NOT NULL,
            unit_count INTEGER NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS compiled_context_units (
            source_unit_id TEXT PRIMARY KEY,
            document_logical_id TEXT NOT NULL,
            heading_path_json TEXT NOT NULL,
            heading_text TEXT NOT NULL,
            parent_source_unit_id TEXT,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            source_revision_hash TEXT NOT NULL,
            exact_text TEXT NOT NULL,
            FOREIGN KEY (document_logical_id) REFERENCES compiled_context_documents(document_logical_id)
        );
        CREATE TABLE IF NOT EXISTS compiled_context_relationships (
            relationship_id TEXT PRIMARY KEY,
            source_document_logical_id TEXT NOT NULL,
            source_unit_id TEXT,
            source_line INTEGER NOT NULL,
            reference_text TEXT NOT NULL,
            relation_type TEXT NOT NULL,
            target_document_logical_id TEXT,
            target_canonical_name TEXT,
            resolution_state TEXT NOT NULL,
            source_revision_hash TEXT NOT NULL,
            FOREIGN KEY (source_document_logical_id) REFERENCES compiled_context_documents(document_logical_id)
        );
        CREATE TABLE IF NOT EXISTS compiled_context_projection_state (
            projection_id TEXT PRIMARY KEY,
            projection_version TEXT NOT NULL,
            projection_hash TEXT NOT NULL,
            status TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
}

export function getCompiledContextProjectionStatus(adapter, registry) {
    const rows = projectionRows(requireRegistry(registry));
    const expectedHash = rowsHash(rows);
    ensureCompiledContextProjectionSchema(adapter);
    const state = adapter.get('SELECT projection_hash, projection_version, status FROM compiled_context_projection_state WHERE projection_id = ?', ['compiled_context']);
    if (!state) return Object.freeze({ state: 'NOT_MATERIALIZED', expectedProjectionHash: expectedHash });
    const storedDocuments = adapter.all('SELECT document_logical_id, source_revision_hash FROM compiled_context_documents ORDER BY document_logical_id');
    const expectedDocuments = rows.documents.map(({ documentLogicalId, sourceRevisionHash }) => ({ document_logical_id: documentLogicalId, source_revision_hash: sourceRevisionHash })).sort((left, right) => left.document_logical_id.localeCompare(right.document_logical_id));
    const documentMatch = stableStringify(storedDocuments) === stableStringify(expectedDocuments);
    const current = state.projection_version === PROJECTION_VERSION && state.projection_hash === expectedHash && documentMatch && state.status === 'CURRENT';
    return Object.freeze({ state: current ? 'CURRENT' : 'STALE', expectedProjectionHash: expectedHash, projectionHash: state.projection_hash, projectionVersion: state.projection_version });
}

export function materializeCompiledContextProjection(adapter, registry, { now = new Date().toISOString() } = {}) {
    const normalized = requireRegistry(registry);
    const rows = projectionRows(normalized);
    const projectionHash = rowsHash(rows);
    ensureCompiledContextProjectionSchema(adapter);
    const prior = adapter.get('SELECT projection_hash, projection_version, status FROM compiled_context_projection_state WHERE projection_id = ?', ['compiled_context']);
    if (prior?.projection_version === PROJECTION_VERSION && prior.projection_hash === projectionHash && prior.status === 'CURRENT') {
        return Object.freeze({ state: 'CURRENT', changed: false, projectionHash, projectionVersion: PROJECTION_VERSION });
    }
    adapter.transaction((db) => {
        db.exec('DELETE FROM compiled_context_relationships');
        db.exec('DELETE FROM compiled_context_units');
        db.exec('DELETE FROM compiled_context_documents');
        for (const document of rows.documents) {
            db.run('INSERT INTO compiled_context_documents (document_logical_id, canonical_name, source_revision_hash, unit_count, updated_at) VALUES (?, ?, ?, ?, ?)', [document.documentLogicalId, document.canonicalName, document.sourceRevisionHash, document.unitCount, now]);
        }
        for (const unit of rows.units) {
            db.run('INSERT INTO compiled_context_units (source_unit_id, document_logical_id, heading_path_json, heading_text, parent_source_unit_id, start_line, end_line, source_revision_hash, exact_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [unit.sourceUnitId, unit.documentLogicalId, JSON.stringify(unit.headingPath), unit.headingText, unit.parentSourceUnitId, unit.startLine, unit.endLine, unit.sourceRevisionHash, unit.exactText]);
        }
        for (const relationship of rows.relationships) {
            db.run('INSERT INTO compiled_context_relationships (relationship_id, source_document_logical_id, source_unit_id, source_line, reference_text, relation_type, target_document_logical_id, target_canonical_name, resolution_state, source_revision_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [relationship.relationshipId, relationship.sourceDocumentLogicalId, relationship.sourceUnitId, relationship.sourceLine, relationship.referenceText, relationship.relationType, relationship.targetDocumentLogicalId, relationship.targetCanonicalName, relationship.resolutionState, relationship.sourceRevisionHash]);
        }
        db.run('INSERT OR REPLACE INTO compiled_context_projection_state (projection_id, projection_version, projection_hash, status, updated_at) VALUES (?, ?, ?, ?, ?)', ['compiled_context', PROJECTION_VERSION, projectionHash, 'CURRENT', now]);
    });
    return Object.freeze({ state: 'CURRENT', changed: true, projectionHash, projectionVersion: PROJECTION_VERSION, documentCount: rows.documents.length, unitCount: rows.units.length, relationshipCount: rows.relationships.length });
}

export function readCompiledContextDocument(adapter, registry, documentLogicalId) {
    const status = getCompiledContextProjectionStatus(adapter, registry);
    if (status.state !== 'CURRENT') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PROJECTION_STALE', ...status });
    const document = adapter.get('SELECT document_logical_id, canonical_name, source_revision_hash, unit_count, updated_at FROM compiled_context_documents WHERE document_logical_id = ?', [documentLogicalId]);
    if (!document) return Object.freeze({ state: 'NOT_FOUND', documentLogicalId });
    const units = adapter.all('SELECT source_unit_id, heading_path_json, heading_text, parent_source_unit_id, start_line, end_line, source_revision_hash, exact_text FROM compiled_context_units WHERE document_logical_id = ? ORDER BY start_line, source_unit_id', [documentLogicalId]).map((unit) => ({
        sourceUnitId: unit.source_unit_id,
        headingPath: JSON.parse(unit.heading_path_json),
        headingText: unit.heading_text,
        parentSourceUnitId: unit.parent_source_unit_id,
        startLine: unit.start_line,
        endLine: unit.end_line,
        sourceRevisionHash: unit.source_revision_hash,
        exactText: unit.exact_text,
    }));
    const relationships = adapter.all('SELECT relationship_id, source_unit_id, source_line, reference_text, relation_type, target_document_logical_id, target_canonical_name, resolution_state, source_revision_hash FROM compiled_context_relationships WHERE source_document_logical_id = ? ORDER BY relationship_id', [documentLogicalId]).map((relationship) => ({
        relationshipId: relationship.relationship_id,
        sourceUnitId: relationship.source_unit_id,
        sourceLine: relationship.source_line,
        referenceText: relationship.reference_text,
        relationType: relationship.relation_type,
        targetDocumentLogicalId: relationship.target_document_logical_id,
        targetCanonicalName: relationship.target_canonical_name,
        resolutionState: relationship.resolution_state,
        sourceRevisionHash: relationship.source_revision_hash,
    }));
    return Object.freeze({ state: 'CURRENT', document: { documentLogicalId: document.document_logical_id, canonicalName: document.canonical_name, sourceRevisionHash: document.source_revision_hash, unitCount: document.unit_count, updatedAt: document.updated_at }, units, relationships });
}

export function listCompiledContextDocuments(adapter, registry) {
    const status = getCompiledContextProjectionStatus(adapter, registry);
    if (status.state !== 'CURRENT') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PROJECTION_STALE', ...status });
    const documents = adapter.all('SELECT document_logical_id, canonical_name, source_revision_hash, unit_count, updated_at FROM compiled_context_documents ORDER BY canonical_name').map((document) => ({
        documentLogicalId: document.document_logical_id,
        canonicalName: document.canonical_name,
        sourceRevisionHash: document.source_revision_hash,
        unitCount: document.unit_count,
        updatedAt: document.updated_at,
    }));
    return Object.freeze({ state: 'CURRENT', documents });
}

export function listCompiledContextReferences(adapter, registry, documentLogicalId = null) {
    const status = getCompiledContextProjectionStatus(adapter, registry);
    if (status.state !== 'CURRENT') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PROJECTION_STALE', ...status });
    const rows = documentLogicalId
        ? adapter.all('SELECT relationship_id, source_document_logical_id, source_unit_id, source_line, reference_text, relation_type, target_document_logical_id, target_canonical_name, resolution_state, source_revision_hash FROM compiled_context_relationships WHERE source_document_logical_id = ? ORDER BY relationship_id', [documentLogicalId])
        : adapter.all('SELECT relationship_id, source_document_logical_id, source_unit_id, source_line, reference_text, relation_type, target_document_logical_id, target_canonical_name, resolution_state, source_revision_hash FROM compiled_context_relationships ORDER BY source_document_logical_id, relationship_id');
    const references = rows.map((relationship) => ({
        relationshipId: relationship.relationship_id,
        sourceDocumentLogicalId: relationship.source_document_logical_id,
        sourceUnitId: relationship.source_unit_id,
        sourceLine: relationship.source_line,
        referenceText: relationship.reference_text,
        relationType: relationship.relation_type,
        targetDocumentLogicalId: relationship.target_document_logical_id,
        targetCanonicalName: relationship.target_canonical_name,
        resolutionState: relationship.resolution_state,
        sourceRevisionHash: relationship.source_revision_hash,
    }));
    return Object.freeze({ state: 'CURRENT', references });
}

export function buildCompiledContextProjectionPlan(adapter, registry, { taskText } = {}) {
    const status = getCompiledContextProjectionStatus(adapter, registry);
    if (status.state !== 'CURRENT') return Object.freeze({ state: 'REFUSED', reason: 'COMPILED_CONTEXT_PROJECTION_STALE', ...status });
    const plan = buildCompiledContextPlan(registry, { taskText });
    if (plan.state !== 'PLAN') return plan;
    const requestedDocumentIds = [plan.orientationDocumentLogicalId, ...plan.dependencyDocumentIds];
    const documents = requestedDocumentIds.map((documentLogicalId) => {
        const document = adapter.get('SELECT document_logical_id, canonical_name, source_revision_hash FROM compiled_context_documents WHERE document_logical_id = ?', [documentLogicalId]);
        const units = adapter.all('SELECT source_unit_id, heading_path_json, heading_text, parent_source_unit_id, start_line, end_line, source_revision_hash, exact_text FROM compiled_context_units WHERE document_logical_id = ? ORDER BY start_line, source_unit_id', [documentLogicalId]).map((unit) => ({
            sourceUnitId: unit.source_unit_id,
            headingPath: JSON.parse(unit.heading_path_json),
            headingText: unit.heading_text,
            parentSourceUnitId: unit.parent_source_unit_id,
            startLine: unit.start_line,
            endLine: unit.end_line,
            sourceRevisionHash: unit.source_revision_hash,
            exactText: unit.exact_text,
        }));
        return { documentLogicalId: document.document_logical_id, canonicalName: document.canonical_name, sourceRevisionHash: document.source_revision_hash, units };
    });
    return Object.freeze({ state: 'PLAN', plan, documents });
}

export { PROJECTION_VERSION };
