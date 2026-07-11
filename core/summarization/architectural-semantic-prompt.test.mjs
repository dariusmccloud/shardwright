import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_SEMANTIC_PROMPT_VERSION,
    DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT,
} from './architectural-semantic-prompt.js';
import {
    ARCHITECTURAL_DECISION_STATUSES,
    ARCHITECTURAL_DECISION_TYPES,
    ARCHITECTURAL_THREAD_STATUSES,
} from './architectural-sharder-contract.js';

test('semantic prompt identifies the versioned intermediate contract and JSON-only boundary', () => {
    assert.equal(ARCHITECTURAL_SEMANTIC_PROMPT_VERSION, 1);
    assert.match(DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT, /architectural-intermediate-schema-v1/);
    assert.match(DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT, /Return JSON only/);
    assert.match(DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT, /Code owns canonical shard formatting/);
});

test('semantic prompt derives each closed vocabulary from the code-owned contract', () => {
    assert.equal(
        DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT.includes(`Allowed types: ${ARCHITECTURAL_DECISION_TYPES.join(', ')}.`),
        true,
    );
    assert.equal(
        DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT.includes(`Allowed statuses: ${ARCHITECTURAL_DECISION_STATUSES.join(', ')}.`),
        true,
    );
    assert.equal(
        DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT.includes(`Allowed statuses: ${ARCHITECTURAL_THREAD_STATUSES.join(', ')}.`),
        true,
    );
});

test('semantic prompt excludes canonical renderer grammar from the model boundary', () => {
    const forbiddenRendererTokens = [
        '# MEMORY SHARD',
        '[DECISIONS]',
        '| DEC:',
        '--speaker',
        '===END===',
    ];

    for (const token of forbiddenRendererTokens) {
        assert.equal(
            DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT.includes(token),
            false,
            `Semantic prompt must not contain renderer token: ${token}`,
        );
    }
});

test('semantic prompt requires omission instead of placeholder fields', () => {
    assert.match(DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT, /optional non-applicable properties are omitted/);
    assert.match(DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT, /Never write placeholder values such as "none"/);
});
