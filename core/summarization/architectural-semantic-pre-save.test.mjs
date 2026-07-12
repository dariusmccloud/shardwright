import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_SEMANTIC_PRE_SAVE_ERROR_CODE,
    ArchitecturalSemanticPreSaveError,
    prepareArchitecturalSemanticShardForSave,
    validateRenderedArchitecturalShard,
} from './architectural-semantic-pre-save.js';

function validPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: 320,
            rangeEnd: 342,
            messageIds: ['msg_320', 'msg_324'],
        },
        sections: {
            timeline: [{ sourceRef: 'S320:1', summary: 'Boundary established', weight: 4 }],
            decisions: [{
                sourceRef: 'S324:1',
                weight: 5,
                id: 'semantic-boundary',
                types: ['GOVERNANCE'],
                decision: 'Code owns canonical rendering.',
                why: 'Mechanical legality should not depend on model syntax.',
                scope: 'architectural sharder',
                status: 'SEALED',
                evidence: ['S324:1'],
            }],
            events: [{
                sourceRef: 'S324:1',
                weight: 4,
                description: 'Decision sealed',
                decisionIds: ['semantic-boundary'],
            }],
            developments: [],
            dialogue: [],
            threads: [{
                sourceRef: 'S324:1',
                weight: 3,
                subject: 'live integration',
                status: 'ACTIVE',
                introRef: 'S324:1',
                lastRef: 'S342:1',
                notes: 'Activation remains pending.',
            }],
            current: [{
                scope: 'C0.6.9',
                currentState: 'Renderer proven',
                nextAction: 'Activate the semantic path',
            }],
        },
    };
}

function capturePreSaveError(action) {
    let captured;
    assert.throws(action, (error) => {
        assert.equal(error instanceof ArchitecturalSemanticPreSaveError, true);
        assert.equal(error.code, ARCHITECTURAL_SEMANTIC_PRE_SAVE_ERROR_CODE);
        captured = error;
        return true;
    });
    return captured;
}

test('prepares a proven semantic payload for persistence', () => {
    const result = prepareArchitecturalSemanticShardForSave(validPayload());

    assert.equal(result.output.startsWith('[KEY]\n'), true);
    assert.equal(result.output.endsWith('===END==='), true);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
});

test('blocks every out-of-range semantic source reference without manufacturing provenance', () => {
    const payload = validPayload();
    payload.sections.timeline[0].sourceRef = 'S319:1';
    payload.sections.decisions[0].evidence = ['S343:1'];
    payload.sections.threads[0].lastRef = 'S500:1';

    const error = capturePreSaveError(() => prepareArchitecturalSemanticShardForSave(payload));
    assert.equal(error.phase, 'reference');
    assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.field),
        ['sourceRef', 'evidence[0]', 'lastRef'],
    );
    assert.equal(error.diagnostics.every((diagnostic) => diagnostic.code === 'ARCH_SEMANTIC_SOURCE_REF_OUT_OF_RANGE'), true);
});

test('blocks an invalid source envelope ordering', () => {
    const payload = validPayload();
    payload.source.rangeStart = 342;
    payload.source.rangeEnd = 320;

    const error = capturePreSaveError(() => prepareArchitecturalSemanticShardForSave(payload));
    assert.equal(error.phase, 'reference');
    assert.equal(error.diagnostics[0].code, 'ARCH_SEMANTIC_SOURCE_RANGE_INVALID');
});

test('blocks unresolved decision links after canonical rendering', () => {
    const payload = validPayload();
    payload.sections.events[0].decisionIds = ['missing-decision'];

    const error = capturePreSaveError(() => prepareArchitecturalSemanticShardForSave(payload));
    assert.equal(error.phase, 'canonical');
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.code === 'ARCH_EVENT_DEC_UNRESOLVED'), true);
});

test('blocks invalid supersession semantics after canonical rendering', () => {
    const payload = validPayload();
    payload.sections.decisions[0].status = 'SUPERSEDED';

    const error = capturePreSaveError(() => prepareArchitecturalSemanticShardForSave(payload));
    assert.equal(error.phase, 'canonical');
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.code === 'ARCH_SUPERSESSION_REPLACEMENT_REQUIRED'), true);
});

test('final bridge rejects malformed canonical output independently of the renderer', () => {
    const malformed = `[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[CURRENT]
Scope | State

===END===
trailing content`;
    const result = validateRenderedArchitecturalShard(malformed);

    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === 'ARCH_CANONICAL_TERMINATOR_INVALID'), true);
});

test('allows schema-authorized empty CURRENT without inventing state', () => {
    const payload = validPayload();
    payload.sections.current = [];

    const result = prepareArchitecturalSemanticShardForSave(payload);
    assert.equal(result.output.includes('[CURRENT]\n\n===END==='), true);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
});

test('allows a thread without notes when no additional context is source-grounded', () => {
    const payload = validPayload();
    delete payload.sections.threads[0].notes;

    const result = prepareArchitecturalSemanticShardForSave(payload);
    assert.equal(result.output.includes('STATUS: ACTIVE | INTRO: S324:1 | LAST: S342:1'), true);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
});
