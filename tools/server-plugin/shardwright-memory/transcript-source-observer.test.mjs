import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { createTranscriptCharacterInstance } from './transcript-character-binding.js';
import { observeRegisteredTranscriptSource, TranscriptObservationState } from './transcript-source-observer.js';
import { registerTranscriptSource, TranscriptSourceClass } from './transcript-source-registry.js';

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-transcript-observe-'));
    const userRoot = path.join(root, 'user');
    const chats = path.join(userRoot, 'chats'); const groupChats = path.join(userRoot, 'group chats');
    fs.mkdirSync(path.join(chats, 'Jeep'), { recursive: true }); fs.mkdirSync(groupChats, { recursive: true });
    const paths = getStoragePaths(userRoot);
    const instance = createTranscriptCharacterInstance(paths, { bindingToken: 'host:jeep', operatorActionId: 'create-jeep', recordedAt: '2026-09-06T17:00:00.000Z' }).entry.payload.characterInstanceId;
    const source = registerTranscriptSource(paths, { characterInstanceId: instance, sourceClass: TranscriptSourceClass.DIRECT, hostLocator: 'Jeep / current', sourceResolutionLocator: { kind: TranscriptSourceClass.DIRECT, avatarUrl: 'Jeep.png', chatLocator: 'current' }, operatorActionId: 'register-current', recordedAt: '2026-09-06T17:00:01.000Z' }).entry.payload;
    return { paths, request: { user: { directories: { root: userRoot, chats, groupChats } } }, source, chatPath: path.join(chats, 'Jeep', 'current.jsonl') };
}

test('observes one registered source through the safe host resolver without indexing content', () => {
    const value = fixture(); fs.writeFileSync(value.chatPath, '{"mes":"hello"}\n', 'utf8');
    const observed = observeRegisteredTranscriptSource(value.paths, value.request, value.source.sourceLogicalId, { observedAt: '2026-09-06T17:01:00.000Z' });
    assert.equal(observed.observationState, TranscriptObservationState.OBSERVED);
    assert.equal(observed.byteLength, 16);
    assert.match(observed.sourceRevisionHash, /^sha256:/u);
    assert.equal(Object.hasOwn(observed, 'content'), false);
});

test('missing source refuses without cache substitution', () => {
    const value = fixture();
    const observed = observeRegisteredTranscriptSource(value.paths, value.request, value.source.sourceLogicalId, { observedAt: '2026-09-06T17:01:00.000Z' });
    assert.equal(observed.observationState, TranscriptObservationState.MISSING);
    assert.equal(observed.refusalCode, 'TIR_OBSERVATION_SOURCE_MISSING');
    assert.equal(Object.hasOwn(observed, 'sourceRevisionHash'), false);
});

test('unknown source refuses rather than resolving a display locator', () => {
    const value = fixture();
    assert.throws(() => observeRegisteredTranscriptSource(value.paths, value.request, 'unknown-source'), (error) => error?.code === 'TIR_OBSERVATION_SOURCE_UNKNOWN');
});

test('an unresolvable typed locator stays unresolved without display-text fallback', () => {
    const value = fixture();
    const invalid = registerTranscriptSource(value.paths, {
        characterInstanceId: value.source.characterInstanceId,
        sourceClass: TranscriptSourceClass.DIRECT,
        hostLocator: 'Jeep / relocated',
        sourceResolutionLocator: { kind: TranscriptSourceClass.DIRECT, avatarUrl: '../Jeep.png', chatLocator: 'relocated' },
        operatorActionId: 'register-invalid-resolution',
        recordedAt: '2026-09-06T17:02:00.000Z',
    }).entry.payload;
    const observed = observeRegisteredTranscriptSource(value.paths, value.request, invalid.sourceLogicalId, { observedAt: '2026-09-06T17:03:00.000Z' });
    assert.equal(observed.observationState, TranscriptObservationState.UNRESOLVED);
    assert.equal(Object.hasOwn(observed, 'sourceRevisionHash'), false);
});
