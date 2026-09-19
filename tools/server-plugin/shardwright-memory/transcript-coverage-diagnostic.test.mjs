import test from 'node:test';
import assert from 'node:assert/strict';
import { readTranscriptCoverage } from './transcript-coverage-diagnostic.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('refuses missing identity without reading storage', () => {
    assert.deepEqual(readTranscriptCoverage({ transcriptIndexDbPath: 'missing' }, ''), { state: 'REFUSED', reason: 'CHARACTER_INSTANCE_REQUIRED' });
});

test('reports unavailable projection explicitly', () => {
    const result = readTranscriptCoverage({ transcriptIndexDbPath: 'definitely-missing-transcript-index.db' }, 'transcript_character_x');
    assert.deepEqual(result, { state: 'NO_PROJECTION', reason: 'TRANSCRIPT_INDEX_UNAVAILABLE', characterInstanceId: 'transcript_character_x' });
});

test('reports absent schema without throwing on an existing database', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-coverage-')), 'empty.db');
    fs.writeFileSync(file, '');
    const result = readTranscriptCoverage({ transcriptIndexDbPath: file }, 'transcript_character_x');
    assert.equal(result.state, 'NO_PROJECTION');
    assert.equal(result.reason, 'TRANSCRIPT_INDEX_SCHEMA_UNAVAILABLE');
});
