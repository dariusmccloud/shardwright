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
    assert.equal(result.output.startsWith('[KEY]\n'), true);
    assert.equal(result.output.endsWith('===END==='), true);
    assert.deepEqual(result.replayMaterial.semanticPayload, payload());
    assert.equal(result.replayMaterial.canonicalOutput, result.output);
    assert.equal(result.replayMaterial.semanticRendererVersion, result.rendererVersion);
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
    assert.equal(result.output.startsWith('[KEY]\n'), true);
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
