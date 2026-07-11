import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';

import {
    ARCHITECTURAL_DECISION_STATUSES,
    ARCHITECTURAL_DECISION_TYPES,
    ARCHITECTURAL_SECTION_CAPS,
    ARCHITECTURAL_THREAD_STATUSES,
} from '../../../core/summarization/architectural-sharder-contract.js';

const schema = JSON.parse(fs.readFileSync(
    new URL('../../../core/summarization/architectural-intermediate-schema-v1.json', import.meta.url),
    'utf8',
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

function validPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: 40,
            rangeEnd: 48,
            messageIds: ['msg_alpha', 'msg_beta'],
        },
        sections: {
            timeline: [{ sourceRef: 'S40:1', summary: 'Jurisdiction corrected', weight: 5 }],
            decisions: [{
                sourceRef: 'S40:1',
                weight: 5,
                id: 'stress-response-reclassification',
                types: ['JURISDICTION', 'CORRECTION'],
                decision: 'Stress Response belongs under behavioral systems.',
                why: 'It translates pressure into observable behavior.',
                scope: 'behavioral expression layer',
                status: 'SEALED',
                evidence: ['S40:1'],
            }],
            events: [{
                sourceRef: 'S40:1',
                weight: 5,
                description: 'Classification reviewed and corrected.',
                decisionIds: ['stress-response-reclassification'],
            }],
            developments: [],
            dialogue: [{ sourceRef: 'S40:1', weight: 4, quote: 'It is a behavioral translator.', speaker: 'Jeep' }],
            threads: [],
            current: [{ scope: 'Architecture review', currentState: 'Reclassification sealed.' }],
        },
    };
}

test('Ajv compiles a stable, closed v1 schema with canonical vocabularies and caps', () => {
    assert.equal(schema.$id, 'https://summary-sharder/architectural-intermediate/v1');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.$defs.decisionType.enum, ARCHITECTURAL_DECISION_TYPES);
    assert.deepEqual(schema.$defs.decisionStatus.enum, ARCHITECTURAL_DECISION_STATUSES);
    assert.deepEqual(schema.$defs.threadStatus.enum, ARCHITECTURAL_THREAD_STATUSES);
    for (const [section, cap] of Object.entries(ARCHITECTURAL_SECTION_CAPS)) {
        assert.equal(schema.$defs.sections.properties[section].maxItems, cap, section);
    }
    for (const [name, definition] of Object.entries(schema.$defs)) {
        if (definition.type === 'object') assert.equal(definition.additionalProperties, false, name);
    }
});

test('Ajv accepts a representative v1 semantic payload', () => {
    const payload = validPayload();
    assert.equal(validate(payload), true, JSON.stringify(validate.errors));
});

test('Ajv rejects illegal enums, unknown fields, malformed refs, and section overflow', () => {
    const payload = validPayload();
    payload.sections.decisions[0].types = ['ARCHITECTURE'];
    payload.sections.decisions[0].status = 'ACTIVE';
    payload.sections.decisions[0].sourceRef = 'S40';
    payload.sections.decisions[0].invented = true;
    payload.sections.current = Array.from({ length: 2 }, () => ({ scope: 'x', currentState: 'y' }));

    assert.equal(validate(payload), false);
    const keywords = new Set(validate.errors.map((error) => error.keyword));
    assert.equal(keywords.has('enum'), true);
    assert.equal(keywords.has('pattern'), true);
    assert.equal(keywords.has('additionalProperties'), true);
    assert.equal(keywords.has('maxItems'), true);
});
