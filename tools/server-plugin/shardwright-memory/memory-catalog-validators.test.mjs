import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

import {
    OUTPUT_PATH,
    SHARED_SCHEMA_FILES,
    VALIDATED_SCHEMA_FILES,
    generateValidatorsSource,
    loadSchema,
} from '../generate-memory-catalog-validators.mjs';

const require = createRequire(import.meta.url);
const prebuilt = require('./memory-catalog-validators.generated.cjs');

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(currentDir, '..', '..', '..', 'docs', 'schemas', 'memory-catalog', 'fixtures');
const DATE_TIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;

// The runtime path identity.js and membership.js used before prebuilding: one Ajv per schema file.
function runtimeValidator(schemaFileName) {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    ajv.addFormat('date-time', { type: 'string', validate: (value) => DATE_TIME_FORMAT.test(value) });
    for (const fileName of SHARED_SCHEMA_FILES) ajv.addSchema(loadSchema(fileName));
    return ajv.compile(loadSchema(schemaFileName));
}

function fixtures() {
    return fs.readdirSync(fixtureDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => ({ name, data: JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8')) }));
}

function leafPaths(value, prefix = []) {
    if (value && typeof value === 'object') {
        return Object.keys(value).flatMap((key) => leafPaths(value[key], [...prefix, key]));
    }
    return [prefix];
}

function withLeaf(data, leafPath, replace) {
    const copy = structuredClone(data);
    let parent = copy;
    for (const key of leafPath.slice(0, -1)) parent = parent[key];
    const last = leafPath.at(-1);
    parent[last] = replace(parent[last]);
    return copy;
}

// Each fixture plus variants that exercise error paths: each top-level property removed,
// set to null, and set to negative zero; and at every depth, each string replaced
// (reaching format and pattern checks), each number set to negative zero, each boolean flipped.
function inputs() {
    const cases = [];
    for (const { name, data } of fixtures()) {
        cases.push({ label: name, value: data });
        if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
        for (const key of Object.keys(data)) {
            const removed = structuredClone(data);
            delete removed[key];
            cases.push({ label: `${name} without ${key}`, value: removed });
            cases.push({ label: `${name} with ${key}=null`, value: { ...structuredClone(data), [key]: null } });
            cases.push({ label: `${name} with ${key}=-0`, value: { ...structuredClone(data), [key]: -0 } });
        }
        for (const leafPath of leafPaths(data)) {
            if (leafPath.length === 0) continue;
            const label = `${name} at /${leafPath.join('/')}`;
            cases.push({
                label,
                value: withLeaf(data, leafPath, (leaf) => {
                    if (typeof leaf === 'string') return 'x';
                    if (typeof leaf === 'number') return -0;
                    if (typeof leaf === 'boolean') return !leaf;
                    return 'x';
                }),
            });
        }
    }
    return cases;
}

function outcome(validate, value) {
    const valid = validate(structuredClone(value));
    return { valid, errors: valid ? [] : structuredClone(validate.errors || []) };
}

test('the prebuilt validators are current with the schemas', () => {
    assert.equal(fs.readFileSync(OUTPUT_PATH, 'utf8'), generateValidatorsSource(),
        'regenerate with node tools/server-plugin/generate-memory-catalog-validators.mjs');
});

test('the prebuilt validators need no runtime package or schema file', () => {
    const source = fs.readFileSync(OUTPUT_PATH, 'utf8');
    assert.equal(/require\(/u.test(source), false);
    assert.deepEqual(Object.keys(prebuilt).sort(), [...VALIDATED_SCHEMA_FILES].sort());
});

test('prebuilt and runtime Ajv agree on validity and errors for every schema and input', () => {
    const cases = inputs();
    let compared = 0;
    for (const schemaFileName of VALIDATED_SCHEMA_FILES) {
        const runtime = runtimeValidator(schemaFileName);
        const built = prebuilt[schemaFileName];
        const base = schemaFileName.replace('.schema.json', '');
        let ownValid = 0;
        let ownInvalid = 0;
        for (const { label, value } of cases) {
            const expected = outcome(runtime, value);
            assert.deepEqual(outcome(built, value), expected, `${schemaFileName} on ${label}`);
            if (/^[^ ]+\.json$/u.test(label) && label.startsWith(`${base}.valid`)) {
                assert.equal(expected.valid, true, `${schemaFileName} accepts ${label}`);
                ownValid += 1;
            }
            if (/^[^ ]+\.json$/u.test(label) && label.startsWith(`${base}.invalid`)) {
                assert.equal(expected.valid, false, `${schemaFileName} rejects ${label}`);
                ownInvalid += 1;
            }
            compared += 1;
        }
        assert.ok(ownValid > 0 && ownInvalid > 0, `${schemaFileName} has its own valid and invalid fixtures`);
    }
    assert.ok(compared > 1000, `compared ${compared} cases`);
});
