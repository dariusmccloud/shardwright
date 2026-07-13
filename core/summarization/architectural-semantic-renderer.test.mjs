import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArchitecturalExtractionResponse } from './architectural-sharder-format.js';
import { getSharderSectionRegistry, ARCHITECTURAL_PROFILE } from './sharder-section-registry.js';
import {
    ARCHITECTURAL_SEMANTIC_RENDER_ERROR_CODE,
    ARCHITECTURAL_SEMANTIC_RENDERER_VERSION,
    ArchitecturalSemanticRenderError,
    renderArchitecturalSemanticPayload,
} from './architectural-semantic-renderer.js';
import { validateArchitecturalStructuredSections } from './architectural-structured-validator.js';

function fullPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: 40,
            rangeEnd: 48,
            messageIds: ['msg_40', 'msg_43'],
        },
        sections: {
            timeline: [{
                sourceRef: 'S40:1',
                summary: 'Stress Response jurisdiction corrected',
                weight: 5,
            }],
            decisions: [{
                sourceRef: 'S40:1',
                weight: 5,
                id: 'stress-response-reclassification',
                types: ['JURISDICTION', 'CORRECTION'],
                decision: 'Stress Response belongs under STATE behavioral systems',
                problem: 'It was categorized as narrative law',
                why: 'It converts pressure into observable behavior',
                changed: 'narrative law -> behavioral system',
                scope: 'behavioral expression layer',
                status: 'SEALED',
                evidence: ['S40:1', 'translator | not narrative law'],
            }],
            events: [{
                sourceRef: 'S40:1',
                weight: 4,
                description: 'Classification reviewed -> correction sealed',
                decisionIds: ['stress-response-reclassification'],
            }],
            developments: [{
                sourceRef: 'S40:1',
                weight: 3,
                summary: 'Architecture: Stress Response installed under STATE',
            }],
            dialogue: [{
                sourceRef: 'S40:1',
                weight: 4,
                quote: 'It is a "behavioral translator," not a narrative rule.',
                speaker: 'Jeep',
                context: 'jurisdiction | distinction',
            }],
            threads: [{
                sourceRef: 'S43:1',
                weight: 3,
                subject: 'structural criteria implementation',
                status: 'ACTIVE',
                introRef: 'S43:1',
                lastRef: 'S43:2',
                notes: 'governing update | pending',
            }],
            current: [{
                scope: 'Architecture review',
                currentState: 'Reclassification sealed',
                activeFocus: 'Implement criteria',
                pending: 'Update document',
                blockedBy: 'None identified',
                nextAction: 'Apply replacement',
            }],
        },
    };
}

test('renders a semantic payload into byte-stable canonical shard text', () => {
    const payload = fullPayload();
    const first = renderArchitecturalSemanticPayload(payload);
    const second = renderArchitecturalSemanticPayload(structuredClone(payload));

    assert.deepEqual(second, first);
    assert.equal(first.rendererVersion, ARCHITECTURAL_SEMANTIC_RENDERER_VERSION);
    assert.equal(first.output, `[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1
Legend: #=TIMELINE xref | DEC=stable decision ID
Weight=continuity authority, not sentiment:
🔴 Foundational > 🟠 Governing > 🟡 Operational > 🟢 Contextual
Omit non-continuity material.
Sources: Messages 40-48

[TIMELINE]
[S40:1] 🔴 Stress Response jurisdiction corrected

[DECISIONS]
[S40:1] 🔴 ID: stress-response-reclassification | TYPE: JURISDICTION, CORRECTION | DECISION: Stress Response belongs under STATE behavioral systems | PROBLEM: It was categorized as narrative law | WHY: It converts pressure into observable behavior | CHANGED: narrative law -> behavioral system | SCOPE: behavioral expression layer | STATUS: SEALED | EVIDENCE: S40:1; translator \\| not narrative law

[EVENTS]
[S40:1] 🟠 Classification reviewed -> correction sealed | DEC: stress-response-reclassification

[DEVELOPMENTS]
[S40:1] 🟡 Architecture: Stress Response installed under STATE

[DIALOGUE]
[S40:1] 🟠 "It is a \\"behavioral translator,\\" not a narrative rule." --Jeep | jurisdiction \\| distinction

[THREADS]
[S43:1] 🟡 structural criteria implementation | STATUS: ACTIVE | INTRO: S43:1 | LAST: S43:2 | governing update \\| pending

[CURRENT]
Architecture review | Reclassification sealed | Implement criteria | Update document | None identified | Apply replacement

===END===`);
});

test('rendered output passes the existing canonical parser and structured validator', () => {
    const { output } = renderArchitecturalSemanticPayload(fullPayload());
    const registry = getSharderSectionRegistry(ARCHITECTURAL_PROFILE);
    const sections = parseArchitecturalExtractionResponse(output, registry);
    const diagnostics = validateArchitecturalStructuredSections(sections, { baselineDecisions: {} });

    assert.deepEqual(diagnostics.filter((diagnostic) => diagnostic.level === 'error'), []);
    assert.equal(sections.dialogue[0].content.includes('--Jeep'), true);
    assert.equal(sections.events[0].content.includes('DEC: stress-response-reclassification'), true);
});

test('renders an empty optional CURRENT section without inventing a record', () => {
    const payload = fullPayload();
    payload.sections.current = [];

    const { output } = renderArchitecturalSemanticPayload(payload);
    assert.equal(output.includes('[CURRENT]\n\n===END==='), true);
});

test('rejects schema-invalid payloads before rendering with structured diagnostics', () => {
    const payload = fullPayload();
    payload.sections.decisions[0].types = ['ARCHITECTURE'];

    assert.throws(
        () => renderArchitecturalSemanticPayload(payload),
        (error) => {
            assert.equal(error instanceof ArchitecturalSemanticRenderError, true);
            assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RENDER_ERROR_CODE);
            assert.equal(error.diagnostics.some((diagnostic) => diagnostic.field === 'types'), true);
            return true;
        },
    );
});
