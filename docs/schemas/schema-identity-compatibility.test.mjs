import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const schemaRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(schemaRoot, '..', '..');
const canonicalRoot = 'urn:shardwright:schema:v1:';

async function collectSchemaPaths(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectSchemaPaths(entryPath);
        return entry.name.endsWith('.schema.json') ? [entryPath] : [];
    }));
    return nested.flat();
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

function collectRefs(value, refs = []) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectRefs(item, refs));
    } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
            if (key === '$ref') refs.push(item);
            collectRefs(item, refs);
        }
    }
    return refs;
}

test('every pre-release schema has one canonical Shardwright URN and canonical internal references', async () => {
    const paths = await collectSchemaPaths(schemaRoot);
    const schemas = await Promise.all(paths.map(readJson));
    const ids = schemas.map((schema) => schema.$id);

    assert.equal(paths.length, 37);
    assert.equal(new Set(ids).size, ids.length);
    const knownIds = new Set(ids);
    for (const schema of schemas) {
        assert.match(schema.$id, /^urn:shardwright:schema:v1:[a-z0-9-]+$/u);
        for (const ref of collectRefs(schema)) {
            assert.match(ref, /^(?:#\/.*|urn:shardwright:schema:v1:[a-z0-9-]+(?:#.*)?)$/u);
            if (!ref.startsWith('#/')) {
                assert.ok(knownIds.has(ref.split('#', 1)[0]), `Unresolved schema reference: ${ref}`);
            }
        }
    }
});

test('compatibility catalog completely classifies reissued drafts and preserves historical identity', async () => {
    const catalog = await readJson(path.join(schemaRoot, 'schema-identity-compatibility-catalog-v1.json'));
    const schemaPaths = await collectSchemaPaths(schemaRoot);
    const artifactNames = schemaPaths
        .map((filePath) => path.basename(filePath, '.schema.json'))
        .sort();

    assert.equal(catalog.canonicalSchemaRoot, canonicalRoot);
    assert.equal(catalog.reissuedDrafts.classification, 'PRE_RELEASE_UNBOUND_REISSUE');
    assert.equal(catalog.reissuedDrafts.artifacts.length, 27);
    assert.equal(catalog.nativeDrafts.classification, 'PRE_RELEASE_SHARDWRIGHT_NATIVE');
    assert.deepEqual(
        [...catalog.reissuedDrafts.artifacts, ...catalog.nativeDrafts.artifacts].sort(),
        artifactNames,
    );

    const historical = catalog.historicalSchemas.find(
        (entry) => entry.schemaId === 'https://summary-sharder/architectural-intermediate/v1',
    );
    assert.ok(historical);
    assert.equal(historical.classification, 'HISTORICAL_PERSISTED_IDENTITY');
    assert.equal(historical.canonicalSuccessor, null);
    assert.equal(historical.authorityChange, false);

    const historicalSchema = await readJson(path.join(repoRoot, historical.schemaPath));
    assert.equal(historicalSchema.$id, historical.schemaId);
});
