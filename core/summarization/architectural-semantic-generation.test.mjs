import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES,
    ArchitecturalSemanticGenerationError,
    generateArchitecturalSemanticShard,
} from './architectural-semantic-generation.js';

const schema = JSON.parse(await readFile(new URL('./architectural-intermediate-schema-v1.json', import.meta.url), 'utf8'));

function payload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: 10,
            rangeEnd: 11,
            messageIds: ['msg_a', 'msg_b'],
        },
        sections: {
            timeline: [{ sourceRef: 'S10:1', summary: 'Semantic path activated', weight: 4 }],
            decisions: [],
            events: [],
            developments: [],
            dialogue: [],
            threads: [],
            current: [],
        },
    };
}

function options(overrides = {}) {
    return {
        chatText: '[Msg 10] [Chris]: Activate the semantic path.',
        context: { startIndex: 10, endIndex: 11, messageIds: ['msg_a', 'msg_b'] },
        requestDescriptorOptions: {
            fetchImpl: async () => ({ ok: true, json: async () => schema }),
        },
        callApi: async () => JSON.stringify(payload()),
        ...overrides,
    };
}

test('generates deterministic canonical output through the semantic contract', async () => {
    let captured;
    const result = await generateArchitecturalSemanticShard(options({
        callApi: async (systemPrompt, userPrompt, requestOptions) => {
            captured = { systemPrompt, userPrompt, requestOptions };
            return JSON.stringify(payload());
        },
    }));

    assert.match(captured.systemPrompt, /semantic JSON records/u);
    assert.match(captured.userPrompt, /"messageIds":\["msg_a","msg_b"\]/u);
    assert.equal(captured.requestOptions.structuredOutput.type, 'json_schema');
    const sourceSchema = captured.requestOptions.structuredOutput.json_schema.schema.$defs.sourceEnvelope.properties;
    assert.equal(sourceSchema.rangeStart.const, 10);
    assert.equal(sourceSchema.rangeEnd.const, 11);
    assert.deepEqual(sourceSchema.messageIds.const, ['msg_a', 'msg_b']);
    assert.equal(result.output.startsWith('[KEY]\n'), true);
    assert.equal(result.output.endsWith('===END==='), true);
    assert.deepEqual(result.replayMaterial.semanticPayload, payload());
    assert.equal(result.replayMaterial.canonicalOutput, result.output);
    assert.equal(result.replayMaterial.semanticRendererVersion, result.rendererVersion);
});

test('keeps baseline shards context-only while constraining the new persisted source envelope', async () => {
    let captured;
    const result = await generateArchitecturalSemanticShard(options({
        context: {
            startIndex: 10,
            endIndex: 11,
            messageIds: ['msg_a', 'msg_b'],
            existingShards: [{
                identifier: 'Memory Shard 0-9',
                content: '[KEY]\nSources: Messages 0-9\n[TIMELINE]\n[S0:1] Baseline context\n===END===',
            }],
        },
        callApi: async (_systemPrompt, userPrompt, requestOptions) => {
            captured = { userPrompt, requestOptions };
            return JSON.stringify(payload());
        },
    }));
    const sourceSchema = captured.requestOptions.structuredOutput.json_schema.schema.$defs.sourceEnvelope.properties;

    assert.match(captured.userPrompt, /BASELINE SHARDS/u);
    assert.match(captured.userPrompt, /These are context only/u);
    assert.equal(sourceSchema.rangeStart.const, 10);
    assert.equal(sourceSchema.rangeEnd.const, 11);
    assert.deepEqual(sourceSchema.messageIds.const, ['msg_a', 'msg_b']);
    assert.deepEqual(result.replayMaterial.semanticPayload.source, payload().source);
});

test('rejects a semantic response that changes persisted source identity', async () => {
    const changed = payload();
    changed.source.messageIds = ['msg_b', 'msg_a'];

    await assert.rejects(
        generateArchitecturalSemanticShard(options({ callApi: async () => JSON.stringify(changed) })),
        (error) => error instanceof ArchitecturalSemanticGenerationError
            && error.code === ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES.SOURCE_ENVELOPE_MISMATCH,
    );
});

test('rejects missing persisted message IDs before calling the model', async () => {
    let called = false;
    await assert.rejects(
        generateArchitecturalSemanticShard(options({
            context: { startIndex: 10, endIndex: 11, messageIds: [] },
            callApi: async () => {
                called = true;
                return JSON.stringify(payload());
            },
        })),
        (error) => error instanceof ArchitecturalSemanticGenerationError
            && error.code === ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES.SOURCE_ENVELOPE_INVALID,
    );
    assert.equal(called, false);
});

test('does not fall back to canonical text when semantic JSON is malformed', async () => {
    let calls = 0;
    await assert.rejects(
        generateArchitecturalSemanticShard(options({
            callApi: async () => {
                calls += 1;
                return '[KEY]\n[TIMELINE]\n===END===';
            },
        })),
        (error) => error.code === 'ARCH_SEMANTIC_RESPONSE_JSON_INVALID',
    );
    assert.equal(calls, 1);
});

test('retries one schema-invalid semantic response with correction guidance', async () => {
    let calls = 0;
    let retryPrompt = '';
    const result = await generateArchitecturalSemanticShard(options({
        callApi: async (_systemPrompt, userPrompt) => {
            calls += 1;
            if (calls === 1) {
                return JSON.stringify({ timeline: [], decisions: [] });
            }
            retryPrompt = userPrompt;
            return JSON.stringify(payload());
        },
    }));

    assert.equal(calls, 2);
    assert.match(retryPrompt, /SCHEMA CORRECTION REQUIRED/u);
    assert.match(retryPrompt, /root must contain schemaVersion, profile, source, and sections/u);
    assert.equal(result.output.startsWith('[KEY]\n'), true);
});

test('retries a nonconstant root version with the exact governed root values', async () => {
    let calls = 0;
    let retryPrompt = '';
    const wrongVersion = payload();
    wrongVersion.schemaVersion = 'architectural-intermediate/v1';
    const result = await generateArchitecturalSemanticShard(options({
        callApi: async (_systemPrompt, userPrompt) => {
            calls += 1;
            if (calls === 1) return JSON.stringify(wrongVersion);
            retryPrompt = userPrompt;
            return JSON.stringify(payload());
        },
    }));

    assert.equal(calls, 2);
    assert.match(retryPrompt, /expected 1; received "architectural-intermediate\/v1"/u);
    assert.match(retryPrompt, /schemaVersion as the JSON number 1 exactly/u);
    assert.match(retryPrompt, /profile as the JSON string "architectural-memory" exactly/u);
    assert.equal(result.replayMaterial.semanticPayload.schemaVersion, 1);
});

test('stops after one schema retry also fails', async () => {
    let calls = 0;
    await assert.rejects(
        generateArchitecturalSemanticShard(options({
            callApi: async () => {
                calls += 1;
                return JSON.stringify({ timeline: [], decisions: [] });
            },
        })),
        (error) => error.code === 'ARCH_SEMANTIC_RESPONSE_SCHEMA_INVALID',
    );
    assert.equal(calls, 2);
});

test('resolves duplicate-only overflow deterministically without an API retry', async () => {
    const duplicateOverflow = payload();
    const uniqueDecisions = Array.from({ length: 12 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: index === 0 ? 5 : 3,
        id: `decision-${index + 1}`,
        types: ['GOVERNANCE'],
        decision: `Decision ${index + 1}`,
        why: 'Source-grounded reason.',
        scope: 'duplicate overflow proof',
        status: index === 0 ? 'SEALED' : 'PROPOSED',
        evidence: [`S10:${index + 1}`],
    }));
    duplicateOverflow.sections.decisions = [...uniqueDecisions, { ...uniqueDecisions[5] }];
    let calls = 0;
    const run = async () => await generateArchitecturalSemanticShard(options({
        callApi: async () => {
            calls += 1;
            return JSON.stringify(duplicateOverflow);
        },
    }));

    const first = await run();
    const second = await run();

    assert.equal(calls, 2);
    assert.equal(first.repair, null);
    assert.deepEqual(first.normalization, {
        strategy: 'EXACT_DUPLICATE_SECTION_RECORDS_V1',
        removedCount: 1,
        sections: [{
            sectionKey: 'decisions',
            beforeCount: 13,
            afterCount: 12,
            removedCount: 1,
        }],
    });
    assert.deepEqual(first.replayMaterial.semanticPayload.sections.decisions, uniqueDecisions);
    assert.equal(first.replayMaterial.semanticPayload.sections.decisions[0].status, 'SEALED');
    assert.equal(first.output, second.output);
    assert.deepEqual(first.normalization, second.normalization);
});

test('resolves rankable decision overflow deterministically without an API repair', async () => {
    const decisionOverflow = payload();
    decisionOverflow.sections.decisions = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: index === 12 ? 1 : 4,
        id: `ranked-decision-${index + 1}`,
        types: ['IMPLEMENTATION'],
        decision: `Ranked decision ${index + 1}`,
        why: 'Source-grounded reason.',
        scope: 'ranked overflow proof',
        status: 'PROPOSED',
        evidence: [`S10:${index + 1}`],
    }));
    let calls = 0;

    const result = await generateArchitecturalSemanticShard(options({
        callApi: async () => {
            calls += 1;
            return JSON.stringify(decisionOverflow);
        },
    }));

    assert.equal(calls, 1);
    assert.equal(result.repair, null);
    assert.equal(result.replayMaterial.semanticPayload.sections.decisions.length, 12);
    assert.equal(
        result.replayMaterial.semanticPayload.sections.decisions.some((decision) => decision.id === 'ranked-decision-13'),
        false,
    );
    assert.equal(result.normalization.strategy, 'DETERMINISTIC_DECISION_CAP_V1');
});

test('repairs only one overflowing section and preserves all unaffected sections', async () => {
    const overflowing = payload();
    overflowing.sections.events = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));
    const originalTimeline = JSON.stringify(overflowing.sections.timeline);
    let calls = 0;
    let repairCall;

    const result = await generateArchitecturalSemanticShard(options({
        callApi: async (systemPrompt, userPrompt, requestOptions) => {
            calls += 1;
            if (calls === 1) return JSON.stringify(overflowing);
            repairCall = { systemPrompt, userPrompt, requestOptions };
            return JSON.stringify({ items: overflowing.sections.events.slice(0, 12) });
        },
    }));

    const repairedPayload = JSON.parse(result.rawResponse);
    assert.equal(calls, 2);
    assert.match(repairCall.userPrompt, /^SECTION: events\nCAP: 12\nRECORDS:/u);
    assert.doesNotMatch(repairCall.userPrompt, /Semantic path activated/u);
    assert.equal(repairCall.requestOptions.structuredOutput.json_schema.schema.properties.items.maxItems, 12);
    assert.equal(JSON.stringify(repairedPayload.sections.timeline), originalTimeline);
    assert.equal(repairedPayload.sections.events.length, 12);
    assert.equal(result.repair.strategy, 'TARGETED_SECTION_REPAIR_V1');
    assert.equal(result.repair.sectionKey, 'events');
});

test('falls back to one whole-response schema retry when targeted repair fails', async () => {
    const overflowing = payload();
    overflowing.sections.events = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));
    let calls = 0;
    let retryPrompt = '';

    const result = await generateArchitecturalSemanticShard(options({
        callApi: async (_systemPrompt, userPrompt) => {
            calls += 1;
            if (calls === 1) return JSON.stringify(overflowing);
            if (calls === 2) return JSON.stringify({ items: [] });
            retryPrompt = userPrompt;
            return JSON.stringify(payload());
        },
    }));

    assert.equal(calls, 3);
    assert.match(retryPrompt, /SCHEMA CORRECTION REQUIRED/u);
    assert.equal(result.repair, null);
    assert.deepEqual(result.repairFailure, {
        code: 'ARCH_OVERFLOW_REPAIR_RESPONSE_INVALID',
        message: 'Architectural overflow repair response does not satisfy the section repair contract.',
        sectionKey: 'events',
    });
    assert.equal(result.output.startsWith('[KEY]\n'), true);
});

test('preserves the targeted repair cause when the whole-response retry also fails', async () => {
    const overflowing = payload();
    overflowing.sections.events = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));
    let calls = 0;

    await assert.rejects(
        generateArchitecturalSemanticShard(options({
            callApi: async () => {
                calls += 1;
                if (calls === 1) return JSON.stringify(overflowing);
                return JSON.stringify({ items: [] });
            },
        })),
        (error) => {
            assert.equal(error.code, 'ARCH_SEMANTIC_RESPONSE_SCHEMA_INVALID');
            assert.deepEqual(error.targetedRepairFailure, {
                code: 'ARCH_OVERFLOW_REPAIR_RESPONSE_INVALID',
                message: 'Architectural overflow repair response does not satisfy the section repair contract.',
                sectionKey: 'events',
            });
            assert.match(error.message, /Targeted events repair failed first: ARCH_OVERFLOW_REPAIR_RESPONSE_INVALID/u);
            return true;
        },
    );
    assert.equal(calls, 3);
});

test('does not attempt targeted or whole-response repair for multiple overflowing sections', async () => {
    const overflowing = payload();
    overflowing.sections.events = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));
    overflowing.sections.threads = Array.from({ length: 9 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        subject: `Thread ${index + 1}`,
        status: 'ACTIVE',
        introRef: `S10:${index + 1}`,
        lastRef: `S10:${index + 1}`,
    }));
    let calls = 0;

    await assert.rejects(
        generateArchitecturalSemanticShard(options({
            callApi: async () => {
                calls += 1;
                return JSON.stringify(overflowing);
            },
        })),
        (error) => error.code === 'ARCH_SEMANTIC_RESPONSE_SCHEMA_INVALID'
            && error.repairTarget === null,
    );
    assert.equal(calls, 1);
});
