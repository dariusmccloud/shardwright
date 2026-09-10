import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEFAULT_CANDIDATE_LIMIT,
    DEFAULT_INJECTION_CHARACTER_LIMIT,
    normalizeEvidenceBudget,
    selectEvidenceWithinCharacterBudget,
} from './evidence-budget.js';

test('legacy three-record setting becomes the explicit default evidence budget', () => {
    const current = { enabled: true, resultLimit: 3 };
    const budget = normalizeEvidenceBudget(current);
    assert.equal(budget.candidateLimit, DEFAULT_CANDIDATE_LIMIT);
    assert.equal(budget.injectionCharacterLimit, DEFAULT_INJECTION_CHARACTER_LIMIT);
    assert.equal(budget.changed, true);
    assert.equal(Object.hasOwn(current, 'resultLimit'), false);
});

test('whole records are selected in retrieval order within the character budget', () => {
    const result = selectEvidenceWithinCharacterBudget([
        { stableId: 'first', content: 'first' },
        { stableId: 'too-large', content: 'this record cannot fit' },
        { stableId: 'third', content: 'third' },
    ], 12);
    assert.deepEqual(result.selected.map((entry) => entry.stableId), ['first', 'third']);
    assert.equal(result.usedCharacters, 12);
});
