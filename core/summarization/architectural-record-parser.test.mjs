import assert from 'node:assert/strict';
import test from 'node:test';

import {
    escapeArchitecturalFieldValue,
    parseArchitecturalDecisionRecord,
    parseArchitecturalDialogueRecord,
    parseArchitecturalEventRecord,
    parseArchitecturalSourceReference,
    parseArchitecturalThreadRecord,
    splitArchitecturalPipeFields,
} from './architectural-record-parser.js';

test('shared field parser handles quoted and escaped pipes with preserved order', () => {
    const parsed = splitArchitecturalPipeFields('A:one|B:"two | three"|C:four \\| five|D:six:seven');

    assert.deepEqual(parsed.segments, [
        'A:one',
        'B:"two | three"',
        'C:four \\| five',
        'D:six:seven',
    ]);
    assert.deepEqual(parsed.fieldOrder, ['A', 'B', 'C', 'D']);
    assert.equal(parsed.fields.A, 'one');
    assert.equal(parsed.fields.B, '"two | three"');
    assert.equal(parsed.fields.C, 'four | five');
    assert.equal(parsed.fields.D, 'six:seven');
});

test('shared field parser reports unmatched quote, malformed segment, and duplicate field', () => {
    const parsed = splitArchitecturalPipeFields('A:one|bad segment|A:two|"broken');

    assert.equal(parsed.errors.some((entry) => entry.code === 'UNMATCHED_QUOTE'), true);
    assert.equal(parsed.errors.some((entry) => entry.code === 'MALFORMED_SEGMENT'), true);
    assert.equal(parsed.errors.some((entry) => entry.code === 'DUPLICATE_FIELD'), true);
});

test('field escaping round-trips deterministic literal pipes', () => {
    const original = 'input | output \\ review';
    const escaped = escapeArchitecturalFieldValue(original);
    const parsed = splitArchitecturalPipeFields(`WHY:${escaped}`);

    assert.equal(escaped, 'input \\| output \\\\ review');
    assert.equal(parsed.fields.WHY, original);
});

test('field escaping round-trips embedded quotes without splitting fields', () => {
    const original = 'say "alpha | beta" before review';
    const escaped = escapeArchitecturalFieldValue(original);
    const parsed = splitArchitecturalPipeFields(`WHY:${escaped}|SCOPE:test`);

    assert.equal(escaped, 'say \\"alpha \\| beta\\" before review');
    assert.equal(parsed.fields.WHY, original);
    assert.equal(parsed.fields.SCOPE, 'test');
});

test('source reference parser accepts bracket and paren forms and rejects malformed refs', () => {
    assert.deepEqual(parseArchitecturalSourceReference('(S0:1)'), {
        ok: true,
        raw: '(S0:1)',
        normalized: 'S0:1',
        error: null,
    });
    assert.equal(parseArchitecturalSourceReference('[S10:2]').normalized, 'S10:2');
    assert.equal(parseArchitecturalSourceReference('S10:2').ok, false);
    assert.equal(parseArchitecturalSourceReference('(S1:2]').ok, false);
    assert.equal(parseArchitecturalSourceReference('[S1:2)').ok, false);
    assert.equal(parseArchitecturalSourceReference('[S1:2').ok, false);
    assert.equal(parseArchitecturalSourceReference('S1:2]').ok, false);
});

test('decision parser preserves raw data and parses structured fields', () => {
    const record = parseArchitecturalDecisionRecord(
        '[S10:2] 🔴 ID:pipe-escape-proof | TYPE:IMPLEMENTATION,PROCEDURE | DECISION:Escaped pipes remain literal field content during parsing | WHY:input \\| output must survive parsing without data loss | SCOPE:Architectural parser | STATUS:SEALED | EVIDENCE:"Quoted A | B remains one field"'
    );

    assert.equal(record.sourceRef, 'S10:2');
    assert.equal(record.weight, 5);
    assert.equal(record.decisionId, 'pipe-escape-proof');
    assert.deepEqual(record.typeValues, ['IMPLEMENTATION', 'PROCEDURE']);
    assert.equal(record.fields.WHY, 'input | output must survive parsing without data loss');
    assert.equal(record.fields.EVIDENCE, '"Quoted A | B remains one field"');
});

test('decision parser reports duplicate fields and preserves unknown field names', () => {
    const record = parseArchitecturalDecisionRecord(
        '[S10:2] 🔴 ID:test | TYPE:GOVERNANCE | TYPE:PROCEDURE | DECISION:X | WHY:unstated | SCOPE:Y | STATUS:ACCEPTED | EVIDENCE:"z" | EXTRA:nope'
    );

    assert.equal(record.duplicateFields.includes('TYPE'), true);
    assert.equal(record.unknownFields.includes('EXTRA'), true);
});

test('decision parser detects mixed-case duplicate fields in normalized namespace', () => {
    const record = parseArchitecturalDecisionRecord(
        '[S10:2] 🔴 ID:test | TYPE:GOVERNANCE | type:PROCEDURE | DECISION:X | WHY:unstated | SCOPE:Y | STATUS:ACCEPTED | EVIDENCE:"z"'
    );

    assert.equal(record.duplicateFields.includes('TYPE'), true);
    assert.equal(record.warnings.some((entry) => entry.code === 'NONCANONICAL_FIELD_CASE'), true);
});

test('decision parser treats explicit null supersession markers as omitted optional fields', () => {
    const record = parseArchitecturalDecisionRecord(
        '[S10:2] 🔴 ID:test | TYPE:GOVERNANCE | DECISION:X | WHY:unstated | SCOPE:Y | STATUS:SEALED | SUPERSEDES:None | SUPERSEDED-BY:N/A | EVIDENCE:"z"'
    );

    assert.equal(record.fields.SUPERSEDES, undefined);
    assert.equal(record.fields['SUPERSEDED-BY'], undefined);
    assert.equal(record.fieldOrder.includes('SUPERSEDES'), false);
    assert.equal(record.fieldOrder.includes('SUPERSEDED-BY'), false);
});

test('event parser captures description and multiple DEC references', () => {
    const record = parseArchitecturalEventRecord(
        '[S5:3] 🟠 decision superseded by replacement record | DEC:decision-sealed | DEC:decision-sealed-replacement'
    );

    assert.equal(record.sourceRef, 'S5:3');
    assert.equal(record.weight, 4);
    assert.equal(record.description, 'decision superseded by replacement record');
    assert.deepEqual(record.decisionRefs, ['decision-sealed', 'decision-sealed-replacement']);
});

test('event parser safely normalizes comma-delimited DEC lists into repeated references', () => {
    const record = parseArchitecturalEventRecord(
        '[S5:3] 🟠 decision superseded by replacement record | DEC:decision-sealed, DEC:decision-sealed-replacement'
    );

    assert.deepEqual(record.decisionRefs, ['decision-sealed', 'decision-sealed-replacement']);
    assert.equal(record.normalizedDecList, true);
    assert.equal(record.warnings.some((entry) => entry.code === 'DEC_LIST_NORMALIZED'), true);
});

test('event parser folds prose-only pipe segments into the description and omits DEC none', () => {
    const record = parseArchitecturalEventRecord(
        '[S289:1] 🟡 sabrina-character-architecture-completed | Sabrina architecture was cleaned and structured for insertion | DEC:none'
    );

    assert.equal(
        record.description,
        'sabrina-character-architecture-completed | Sabrina architecture was cleaned and structured for insertion'
    );
    assert.deepEqual(record.decisionRefs, []);
    assert.equal(record.fields.DEC, undefined);
    assert.deepEqual(record.malformedSegments, []);
    assert.equal(record.errors.length, 0);
});

test('event parser recovers model-shaped DEC prose as description and omits a trailing DEC none', () => {
    const record = parseArchitecturalEventRecord(
        '[S289:1] 🟡 sabrina-character-architecture-completed | DEC:Sabrina architecture was cleaned and structured for insertion | DEC:none'
    );

    assert.equal(
        record.description,
        'sabrina-character-architecture-completed | Sabrina architecture was cleaned and structured for insertion'
    );
    assert.deepEqual(record.decisionRefs, []);
    assert.equal(record.fields.DEC, undefined);
    assert.equal(record.errors.length, 0);
});

test('dialogue parser enforces quote, speaker, optional context, and line count structure', () => {
    const valid = parseArchitecturalDialogueRecord('[S1:1] "Exact quote" --Speaker | structural context');
    const validWithoutContext = parseArchitecturalDialogueRecord('[S1:1] "Exact quote" --Speaker');
    const invalidEmptyContext = parseArchitecturalDialogueRecord('[S1:1] "Exact quote" --Speaker |');
    const invalid = parseArchitecturalDialogueRecord('[S1:1] "Exact quote"\nline2\nline3');

    assert.equal(valid.quote, 'Exact quote');
    assert.equal(valid.speaker, 'Speaker');
    assert.equal(valid.context, 'structural context');
    assert.equal(validWithoutContext.quote, 'Exact quote');
    assert.equal(validWithoutContext.speaker, 'Speaker');
    assert.equal(validWithoutContext.context, '');
    assert.equal(validWithoutContext.errors.length, 0);
    assert.equal(invalidEmptyContext.errors.some((entry) => entry.code === 'MISSING_CONTEXT'), true);
    assert.equal(invalid.errors.some((entry) => entry.code === 'MISSING_SPEAKER'), true);
    assert.equal(invalid.lineCount, 3);
});

test('thread parser extracts canonical named fields and notes', () => {
    const record = parseArchitecturalThreadRecord(
        '[S2:1] parser-hardening | status:ACTIVE | intro:S2:1 | last:S2:2 | Notes include quoted "A | B" and escaped literal \\| content'
    );

    assert.equal(record.sourceRef, 'S2:1');
    assert.equal(record.subject, 'parser-hardening');
    assert.equal(record.status, 'ACTIVE');
    assert.equal(record.intro, 'S2:1');
    assert.equal(record.last, 'S2:2');
    assert.equal(record.notes, 'Notes include quoted "A | B" and escaped literal | content');
    assert.deepEqual(record.fieldOrder, ['STATUS', 'INTRO', 'LAST']);
});

test('thread parser accepts canonical uppercase thread fields as well as legacy lowercase forms', () => {
    const canonical = parseArchitecturalThreadRecord(
        '[S2:1] parser-hardening | STATUS: ACTIVE | INTRO: S2:1 | LAST: S2:2 | pending normalization cleanup'
    );

    assert.equal(canonical.status, 'ACTIVE');
    assert.equal(canonical.intro, 'S2:1');
    assert.equal(canonical.last, 'S2:2');
    assert.equal(canonical.notes, 'pending normalization cleanup');
    assert.deepEqual(canonical.fieldOrder, ['STATUS', 'INTRO', 'LAST']);
});

test('thread parser accepts named NOTES field and normalizes same-row shorthand refs', () => {
    const record = parseArchitecturalThreadRecord(
        '[S324:1] csp-contract-validation | status:ACTIVE | intro:S324 | last:S324 | notes:Draft submitted; requires review before SDE work begins'
    );

    assert.equal(record.status, 'ACTIVE');
    assert.equal(record.intro, 'S324:1');
    assert.equal(record.last, 'S324:1');
    assert.equal(record.notes, 'Draft submitted; requires review before SDE work begins');
    assert.deepEqual(record.fieldOrder, ['STATUS', 'INTRO', 'LAST', 'NOTES']);
    assert.deepEqual(record.unknownFields, []);
    assert.equal(record.errors.length, 0);
});
