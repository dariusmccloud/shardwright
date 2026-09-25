import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCompiledContextPlan, compileDocumentRegistry, parseCompiledContextDocument, resolveDocumentReferences } from './document-compiler.js';

const rulebook = '# EICF - Documentation Rulebook\n\n## Operators\nUse governed operators.\n';
const guide = '# EICF - Documentation Style Guide\n\nFor construction rules, see the `EICF - Documentation Rulebook`.\nFor historical usage, see the Rulebook.\n\n## Governance Surfaces\nChoose a surface.\n\n## 4. Document Structure\nUse the required structure.\n\n## 5. Example Provenance\nCite the source.\n';

test('derives deterministic structural units and exact source text', () => {
    const first = parseCompiledContextDocument({ documentLogicalId: 'eicf-rulebook', canonicalName: 'EICF - Documentation Rulebook', text: rulebook });
    const second = parseCompiledContextDocument({ documentLogicalId: 'eicf-rulebook', canonicalName: 'EICF - Documentation Rulebook', text: rulebook });
    assert.equal(first.revisionHash, second.revisionHash);
    assert.equal(first.units[0].sourceUnitId, second.units[0].sourceUnitId);
    assert.equal(first.units.find((unit) => unit.headingText === 'Operators').exactText, '## Operators\nUse governed operators.\n');
});

test('resolves canonical references but leaves Rulebook alias unresolved', () => {
    const registry = compileDocumentRegistry([
        { documentLogicalId: 'eicf-rulebook', canonicalName: 'EICF - Documentation Rulebook', text: rulebook },
        { documentLogicalId: 'eicf-guide', canonicalName: 'EICF - Documentation Style Guide', text: guide },
    ]);
    const references = resolveDocumentReferences(registry, 'eicf-guide');
    assert.equal(references.find((reference) => reference.referenceText === 'EICF - Documentation Rulebook').state, 'RESOLVED');
    assert.equal(references.find((reference) => reference.referenceText === 'Rulebook').state, 'UNRESOLVED');
});

test('builds a document-authoring orientation plan with explicit unresolved references', () => {
    const registry = compileDocumentRegistry([
        { documentLogicalId: 'eicf-rulebook', canonicalName: 'EICF - Documentation Rulebook', text: rulebook },
        { documentLogicalId: 'eicf-guide', canonicalName: 'EICF - Documentation Style Guide', text: guide },
    ]);
    const plan = buildCompiledContextPlan(registry, { taskText: 'Draft a document for CDI.' });
    assert.equal(plan.state, 'PLAN');
    assert.equal(plan.task, 'DOCUMENT_AUTHORING');
    assert.equal(plan.dependencies.length, 1);
    assert.equal(plan.unresolvedReferences.length, 1);
    assert.ok(plan.orientationUnitIds.length >= 3);
});
