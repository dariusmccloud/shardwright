import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { DEFAULT_ARCHITECTURAL_SHARDER_PROMPT } from './architectural-sharder-prompt.js';
import {
    ARCHITECTURAL_DECISION_STATUSES,
    ARCHITECTURAL_DECISION_TYPES,
    ARCHITECTURAL_SECTION_CAPS,
    ARCHITECTURAL_THREAD_STATUSES,
} from './architectural-sharder-contract.js';

const EXPECTED_PROMPT_SHA256 = 'f54e739dabc5dbe952fd1435f3aff65dd22d9dc06be42e79530a6d0f1e6ddccc';

test('sealed architectural prompt digest remains unchanged', () => {
    const digest = crypto.createHash('sha256')
        .update(DEFAULT_ARCHITECTURAL_SHARDER_PROMPT, 'utf8')
        .digest('hex');

    assert.equal(digest, EXPECTED_PROMPT_SHA256);
});

test('sealed architectural prompt contains the canonical TYPE vocabulary exactly once each', () => {
    const typeValuesMatch = DEFAULT_ARCHITECTURAL_SHARDER_PROMPT.match(/TYPE values:\r?\n\r?\n`([^`]+)`/);

    assert.ok(typeValuesMatch, 'TYPE values list not found in prompt');

    const values = typeValuesMatch[1].split('|').map((entry) => entry.trim()).filter(Boolean);

    assert.deepEqual(values, ARCHITECTURAL_DECISION_TYPES);

    for (const type of ARCHITECTURAL_DECISION_TYPES) {
        assert.equal(values.filter((value) => value === type).length, 1, `TYPE ${type} should appear exactly once`);
    }
});

test('sealed architectural prompt contains the canonical STATUS vocabularies in decision and thread sections', () => {
    const statusMatches = Array.from(
        DEFAULT_ARCHITECTURAL_SHARDER_PROMPT.matchAll(/STATUS values:\r?\n\r?\n`([^`]+)`/g),
    );

    assert.equal(statusMatches.length, 2, 'Expected exactly two STATUS values lists in prompt');

    const decisionStatuses = statusMatches[0][1].split('|').map((entry) => entry.trim()).filter(Boolean);
    const threadStatuses = statusMatches[1][1].split('|').map((entry) => entry.trim()).filter(Boolean);

    assert.deepEqual(decisionStatuses, ARCHITECTURAL_DECISION_STATUSES);
    assert.deepEqual(threadStatuses, ARCHITECTURAL_THREAD_STATUSES);
});

test('sealed architectural prompt contains the canonical section caps', () => {
    const expectedCaps = [
        { section: 'TIMELINE', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.timeline },
        { section: 'DECISIONS', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.decisions },
        { section: 'EVENTS', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.events },
        { section: 'DEVELOPMENTS', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.developments },
        { section: 'DIALOGUE', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.dialogue },
        { section: 'THREADS', operator: '<=', value: ARCHITECTURAL_SECTION_CAPS.threads },
        { section: 'CURRENT', operator: '=', value: `${ARCHITECTURAL_SECTION_CAPS.current} row` },
    ];

    for (const { section, operator, value } of expectedCaps) {
        const expectedLine = `[${section}] ${operator} ${value}`;
        assert.equal(
            DEFAULT_ARCHITECTURAL_SHARDER_PROMPT.includes(expectedLine),
            true,
            `Prompt should include canonical cap line: ${expectedLine}`,
        );
    }
});

test('sealed architectural prompt documents repeated DEC fields for multi-reference events', () => {
    assert.equal(
        DEFAULT_ARCHITECTURAL_SHARDER_PROMPT.includes('When one EVENT references multiple decisions, repeat the pipe-delimited DEC field once per stable ID. Never comma-separate DEC references.'),
        true,
    );
    assert.equal(
        DEFAULT_ARCHITECTURAL_SHARDER_PROMPT.includes('`| DEC:first-id | DEC:second-id`'),
        true,
    );
});
