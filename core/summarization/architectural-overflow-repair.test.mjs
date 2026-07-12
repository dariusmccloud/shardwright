import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_OVERFLOW_REPAIR_ERROR_CODE,
    classifyArchitecturalOverflowRepair,
    createArchitecturalOverflowRepairDescriptor,
    parseArchitecturalOverflowRepairResponse,
} from './architectural-overflow-repair.js';

function maxItems(sectionKey, limit) {
    return {
        keyword: 'maxItems',
        instancePath: `/sections/${sectionKey}`,
        params: { limit },
    };
}

test('classifies one exclusively overflowing section as repairable', () => {
    const result = classifyArchitecturalOverflowRepair({
        sections: { events: new Array(13).fill({}) },
    }, [maxItems('events', 12)]);

    assert.deepEqual(result, {
        eligible: true,
        reason: 'SINGLE_SECTION_OVERFLOW',
        sectionKey: 'events',
        limit: 12,
        actualCount: 13,
        overflowCount: 1,
    });
});

test('refuses overflows spanning more than one section', () => {
    const result = classifyArchitecturalOverflowRepair({
        sections: {
            events: new Array(13).fill({}),
            threads: new Array(9).fill({}),
        },
    }, [maxItems('events', 12), maxItems('threads', 8)]);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'MULTIPLE_OVERFLOW_SECTIONS');
});

test('refuses mixed overflow and semantic violations', () => {
    const result = classifyArchitecturalOverflowRepair({
        sections: { events: new Array(13).fill({}) },
    }, [
        maxItems('events', 12),
        { keyword: 'required', instancePath: '/sections/events/0', params: { missingProperty: 'description' } },
    ]);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'NOT_EXCLUSIVE_OVERFLOW');
});

test('builds a strict section-only repair request', () => {
    const descriptor = createArchitecturalOverflowRepairDescriptor({
        $defs: { eventRecord: { type: 'object' } },
    }, {
        sectionKey: 'events',
        limit: 12,
    }, [{ description: 'One' }, { description: 'Two' }]);

    assert.match(descriptor.userPrompt, /^SECTION: events\nCAP: 12\nRECORDS:/u);
    assert.equal(descriptor.structuredOutput.json_schema.schema.properties.items.maxItems, 12);
    assert.equal(descriptor.structuredOutput.json_schema.schema.properties.items.items.$ref, '#/$defs/eventRecord');
});

test('parses one bounded repair object and rejects invalid repair output', () => {
    assert.deepEqual(
        parseArchitecturalOverflowRepairResponse('```json\n{"items":[{"description":"merged"}]}\n```', { limit: 12 }),
        [{ description: 'merged' }],
    );

    for (const rawResponse of [
        '{"items":[]}',
        '{"items":[{}],"other":true}',
        '{"items":',
    ]) {
        assert.throws(
            () => parseArchitecturalOverflowRepairResponse(rawResponse, { limit: 12 }),
            (error) => error.code === ARCHITECTURAL_OVERFLOW_REPAIR_ERROR_CODE,
        );
    }
});
