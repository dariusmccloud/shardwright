import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { previewTranscriptSource } from './transcript-source-preview.js';

function setup(text) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-preview-'));
    const chats = path.join(root, 'chats');
    fs.mkdirSync(path.join(chats, 'Jeep'), { recursive: true });
    fs.writeFileSync(path.join(chats, 'Jeep', 'test.jsonl'), text);
    return { user: { directories: { chats, groupChats: path.join(root, 'groups') } } };
}

const request = { sourceClass: 'DIRECT', sourceResolutionLocator: { kind: 'DIRECT', avatarUrl: 'Jeep.png', chatLocator: 'test' } };

test('previews a readable JSONL source with custody facts', () => {
    const result = previewTranscriptSource(request, setup('{"chat_metadata":{}}\n{"mes":"hello"}\n'));
    assert.equal(result.state, 'READABLE');
    assert.equal(result.messageCount, 1);
    assert.match(result.sourceRevisionHash, /^sha256:/);
});

test('refuses malformed JSONL without registering or ingesting', () => {
    const result = previewTranscriptSource(request, setup('{"chat_metadata":{}}\nnot-json\n'));
    assert.equal(result.state, 'MALFORMED_JSONL');
    assert.equal(result.refusalCode, 'TIR_SOURCE_PREVIEW_INVALID_JSONL');
});

test('classifies all-invalid non-empty input as invalid JSONL', () => {
    const result = previewTranscriptSource(request, setup('not-json\n'));
    assert.equal(result.refusalCode, 'TIR_SOURCE_PREVIEW_INVALID_JSONL');
});

test('distinguishes missing and unresolved sources', () => {
    const host = setup('{"chat_metadata":{}}\n');
    assert.equal(previewTranscriptSource({ ...request, sourceResolutionLocator: { ...request.sourceResolutionLocator, chatLocator: 'missing' } }, host).state, 'MISSING');
    assert.equal(previewTranscriptSource({ ...request, sourceResolutionLocator: { kind: 'DIRECT', avatarUrl: '../bad.png', chatLocator: 'x' } }, host).state, 'LOCATOR_UNRESOLVED');
});
