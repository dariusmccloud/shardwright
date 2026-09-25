import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { compileDocumentRegistry } from '../../../core/compiled-context/document-compiler.js';
import { createNodeSqliteAdapter } from './sqlite-node.js';
import {
    getCompiledContextProjectionStatus,
    listCompiledContextDocuments,
    listCompiledContextReferences,
    materializeCompiledContextProjection,
    readCompiledContextDocument,
} from './compiled-context-document-projection.js';

function createFixture(styleSuffix = '') {
    return compileDocumentRegistry([
        {
            documentLogicalId: 'doc_rulebook',
            canonicalName: 'EICF - Documentation Rulebook',
            text: '# Rules\n\nUse controlled language.\n',
        },
        {
            documentLogicalId: 'doc_style',
            canonicalName: 'EICF - Documentation Style Guide',
            text: '# Governance Surfaces\n\nSee `EICF - Documentation Rulebook`.\n\n# Document Structure\n\nUse a clear structure.\n\n# Example Provenance\n\nSee `EICF - Lexicon`.\n' + styleSuffix,
        },
    ]);
}

test('materializes revision-bound documents and relationships into SQLite', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-compiled-context-'));
    const dbPath = path.join(directory, 'projection.sqlite');
    const adapter = createNodeSqliteAdapter(dbPath);
    try {
        const registry = createFixture();
        assert.equal(getCompiledContextProjectionStatus(adapter, registry).state, 'NOT_MATERIALIZED');
        const first = materializeCompiledContextProjection(adapter, registry, { now: '2026-09-24T00:00:00.000Z' });
        assert.equal(first.state, 'CURRENT');
        assert.equal(first.changed, true);
        assert.equal(first.documentCount, 2);
        assert.ok(first.unitCount >= 4);
        assert.equal(first.relationshipCount, 2);

        const document = readCompiledContextDocument(adapter, registry, 'doc_style');
        assert.equal(document.state, 'CURRENT');
        assert.equal(typeof document.units[0].exactText, 'string');
        assert.equal(document.units[0].exactText.startsWith('# Governance Surfaces'), true);
        const rulebookReference = document.relationships.find((row) => row.referenceText === 'EICF - Documentation Rulebook');
        assert.equal(rulebookReference.resolutionState, 'RESOLVED');
        assert.equal(rulebookReference.relationType, 'REFERENCES');
        assert.equal(Number.isInteger(rulebookReference.sourceLine), true);
        assert.equal(document.relationships.find((row) => row.referenceText === 'EICF - Lexicon').resolutionState, 'UNRESOLVED');

        const inventory = listCompiledContextDocuments(adapter, registry);
        assert.deepEqual(inventory.documents.map((row) => row.canonicalName), ['EICF - Documentation Rulebook', 'EICF - Documentation Style Guide']);
        const references = listCompiledContextReferences(adapter, registry, 'doc_style');
        assert.equal(references.references.length, 2);
        assert.equal(references.references.every((row) => row.relationType === 'REFERENCES'), true);

        const repeat = materializeCompiledContextProjection(adapter, registry, { now: '2026-09-24T00:01:00.000Z' });
        assert.deepEqual(repeat, { state: 'CURRENT', changed: false, projectionHash: first.projectionHash, projectionVersion: first.projectionVersion });
    } finally {
        adapter.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('marks a changed source revision stale until rematerialized', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-compiled-context-'));
    const dbPath = path.join(directory, 'projection.sqlite');
    const adapter = createNodeSqliteAdapter(dbPath);
    try {
        const original = createFixture();
        materializeCompiledContextProjection(adapter, original);
        const changed = createFixture('\nAdditional rule.\n');
        const status = getCompiledContextProjectionStatus(adapter, changed);
        assert.equal(status.state, 'STALE');
        assert.equal(readCompiledContextDocument(adapter, changed, 'doc_style').reason, 'COMPILED_CONTEXT_PROJECTION_STALE');
        assert.equal(listCompiledContextDocuments(adapter, changed).reason, 'COMPILED_CONTEXT_PROJECTION_STALE');
        const rebuilt = materializeCompiledContextProjection(adapter, changed);
        assert.equal(rebuilt.state, 'CURRENT');
        assert.equal(getCompiledContextProjectionStatus(adapter, changed).state, 'CURRENT');
        assert.equal(readCompiledContextDocument(adapter, changed, 'doc_style').state, 'CURRENT');
    } finally {
        adapter.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
