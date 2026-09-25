import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

function readSchema(name) {
    return JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
}

test('sync-store schemas are strict and identify the authority boundary', () => {
    const manifest = readSchema('sync-store-manifest-v1.schema.json');
    const envelope = readSchema('sync-store-event-envelope-v1.schema.json');
    assert.equal(manifest.$id, 'urn:shardwright:schema:v1:sync-store-manifest-v1');
    assert.equal(envelope.$id, 'urn:shardwright:schema:v1:sync-store-event-envelope-v1');
    assert.equal(manifest.additionalProperties, false);
    assert.equal(envelope.additionalProperties, false);
    assert.equal(manifest.properties.authorityModel.const, 'LEDGER_AUTHORITY_SQLITE_PROJECTION');
    assert.equal(envelope.properties.previousEventHash.type.includes('null'), true);
    assert.equal(envelope.properties.signature.type.includes('null'), true);
});

test('sync-store schema required fields preserve immutable event identity and chain position', () => {
    const envelope = readSchema('sync-store-event-envelope-v1.schema.json');
    assert.deepEqual(envelope.required, [
        'schemaVersion', 'eventId', 'storeId', 'instanceId', 'ledgerName',
        'sequence', 'eventType', 'emittedAt', 'payloadHash', 'previousEventHash', 'payload',
    ]);
});
