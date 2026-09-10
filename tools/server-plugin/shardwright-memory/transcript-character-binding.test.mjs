import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getStoragePaths } from './core.js';
import {
    createTranscriptCharacterInstance,
    readTranscriptCharacterBindingLedger,
    rebindTranscriptCharacterInstance,
    resolveTranscriptCharacterInstance,
} from './transcript-character-binding.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const readSubprocessPath = path.join(currentDir, 'transcript-character-binding-read-subprocess.mjs');

function makePaths() {
    return getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-transcript-binding-')));
}

function createRequest(bindingToken, suffix = 'one') {
    return {
        bindingToken,
        operatorActionId: `operator-action-create-${suffix}`,
        recordedAt: '2026-09-06T15:00:00.000Z',
    };
}

function readInFreshProcess(paths, bindingToken) {
    return JSON.parse(execFileSync(process.execPath, [readSubprocessPath, path.dirname(paths.storageRoot), bindingToken], { encoding: 'utf8' }));
}

function assertCode(fn, code) {
    assert.throws(fn, (error) => error?.code === code);
}

test('fresh bindings create distinct opaque instances and survive a process restart', () => {
    const paths = makePaths();
    const first = createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:one', 'one'));
    const second = createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:two', 'two'));

    assert.equal(first.appended, true);
    assert.notEqual(first.entry.payload.characterInstanceId, second.entry.payload.characterInstanceId);
    assert.equal(resolveTranscriptCharacterInstance(paths, 'host-binding-token:jeep:one'), first.entry.payload.characterInstanceId);
    assert.deepEqual(readInFreshProcess(paths, 'host-binding-token:jeep:two'), {
        characterInstanceId: second.entry.payload.characterInstanceId,
    });
});

test('only an explicit rebind moves an existing instance to a new host binding token', () => {
    const paths = makePaths();
    const created = createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:old', 'old'));
    const characterInstanceId = created.entry.payload.characterInstanceId;

    const rebound = rebindTranscriptCharacterInstance(paths, {
        characterInstanceId,
        previousBindingToken: 'host-binding-token:jeep:old',
        bindingToken: 'host-binding-token:jeep:new',
        operatorActionId: 'operator-action-rebind-one',
        recordedAt: '2026-09-06T15:01:00.000Z',
        rebindBasis: 'Operator confirmed this is the same character instance after reimport.',
    });

    assert.equal(rebound.appended, true);
    assert.equal(resolveTranscriptCharacterInstance(paths, 'host-binding-token:jeep:old'), null);
    assert.equal(resolveTranscriptCharacterInstance(paths, 'host-binding-token:jeep:new'), characterInstanceId);
    assert.equal(readTranscriptCharacterBindingLedger(paths).length, 2);
});

test('identity hints, automatic adoption, and ambiguous rebinds refuse without appending', () => {
    const paths = makePaths();
    const created = createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:old', 'old'));
    const before = readTranscriptCharacterBindingLedger(paths).length;

    assertCode(
        () => createTranscriptCharacterInstance(paths, { ...createRequest('host-binding-token:jeep:path', 'path'), cardPath: 'characters/Jeep.png' }),
        'TIR_BINDING_IDENTITY_HINT_FORBIDDEN',
    );
    assertCode(
        () => createTranscriptCharacterInstance(paths, { ...createRequest('host-binding-token:jeep:adopt', 'adopt'), characterInstanceId: created.entry.payload.characterInstanceId }),
        'TIR_BINDING_CREATE_ADOPTION_FORBIDDEN',
    );
    assertCode(
        () => rebindTranscriptCharacterInstance(paths, {
            characterInstanceId: created.entry.payload.characterInstanceId,
            previousBindingToken: 'host-binding-token:jeep:not-current',
            bindingToken: 'host-binding-token:jeep:new',
            operatorActionId: 'operator-action-rebind-wrong-previous',
            recordedAt: '2026-09-06T15:01:00.000Z',
            rebindBasis: 'Testing refusal.',
        }),
        'TIR_BINDING_PREVIOUS_TOKEN_MISMATCH',
    );
    assert.equal(readTranscriptCharacterBindingLedger(paths).length, before);
});

test('a known binding token cannot silently restore or merge a prior instance', () => {
    const paths = makePaths();
    const created = createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:one', 'one'));
    const before = readTranscriptCharacterBindingLedger(paths).length;

    assertCode(
        () => createTranscriptCharacterInstance(paths, createRequest('host-binding-token:jeep:one', 'second-create')),
        'TIR_BINDING_TOKEN_ALREADY_BOUND',
    );
    assert.equal(readTranscriptCharacterBindingLedger(paths).length, before);
    assert.equal(resolveTranscriptCharacterInstance(paths, 'host-binding-token:jeep:one'), created.entry.payload.characterInstanceId);
});
