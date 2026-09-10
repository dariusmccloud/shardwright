import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import { createTranscriptCharacterInstance } from './transcript-character-binding.js';
import { readTranscriptSourceRegistryLedger, registerTranscriptSource, TranscriptSourceClass } from './transcript-source-registry.js';

function paths() { return getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-transcript-source-'))); }
function character(target) { return createTranscriptCharacterInstance(target, { bindingToken: 'host-token:jeep', operatorActionId: 'create-jeep', recordedAt: '2026-09-06T16:00:00.000Z' }).entry.payload.characterInstanceId; }
function direct(characterInstanceId, overrides = {}) { return { characterInstanceId, sourceClass: TranscriptSourceClass.DIRECT, hostLocator: 'Jeep / direct', sourceResolutionLocator: { kind: TranscriptSourceClass.DIRECT, avatarUrl: 'Jeep.png', chatLocator: 'direct' }, operatorActionId: 'register-direct', recordedAt: '2026-09-06T16:01:00.000Z', ...overrides }; }
function group(characterInstanceId, overrides = {}) { return { characterInstanceId, sourceClass: TranscriptSourceClass.GROUP, hostLocator: 'Team / session', sourceResolutionLocator: { kind: TranscriptSourceClass.GROUP, groupId: 'group-team', chatLocator: 'session' }, operatorActionId: 'register-group', recordedAt: '2026-09-06T16:01:00.000Z', historicalParticipantBasis: { groupSourceId: 'group:team', participantId: characterInstanceId, evidenceHash: 'sha256:participant' }, ...overrides }; }
function code(fn, expected) { assert.throws(fn, (error) => error?.code === expected); }

test('registers direct and historically evidenced group sources as NOT_SCANNED', () => {
    const target = paths(); const instance = character(target);
    const one = registerTranscriptSource(target, direct(instance));
    const two = registerTranscriptSource(target, group(instance));
    assert.equal(one.entry.payload.coverageState, 'NOT_SCANNED');
    assert.equal(two.entry.payload.historicalParticipantBasis.participantId, instance);
    assert.equal(one.entry.payload.sourceResolutionLocator.avatarUrl, 'Jeep.png');
    assert.equal(readTranscriptSourceRegistryLedger(target).length, 2);
});

test('refuses unknown character, missing group basis, and direct group basis without append', () => {
    const target = paths(); const instance = character(target);
    code(() => registerTranscriptSource(target, direct('transcript_character_unknown')), 'TIR_SOURCE_CHARACTER_UNKNOWN');
    code(() => registerTranscriptSource(target, group(instance, { historicalParticipantBasis: null })), 'TIR_SOURCE_GROUP_BASIS_REQUIRED');
    code(() => registerTranscriptSource(target, direct(instance, { historicalParticipantBasis: { groupSourceId: 'g', participantId: instance, evidenceHash: 'h' } })), 'TIR_SOURCE_DIRECT_BASIS_FORBIDDEN');
    assert.equal(readTranscriptSourceRegistryLedger(target).length, 0);
});

test('does not scan, hash, or accept a source revision during registration', () => {
    const target = paths(); const instance = character(target);
    const registered = registerTranscriptSource(target, direct(instance, { sourceRevisionHash: 'sha256:ignored-by-design' }));
    assert.equal(Object.hasOwn(registered.entry.payload, 'sourceRevisionHash'), false);
    assert.equal(registered.entry.payload.coverageState, 'NOT_SCANNED');
});

test('requires a typed locator and never derives it from the display locator', () => {
    const target = paths(); const instance = character(target);
    code(() => registerTranscriptSource(target, direct(instance, { sourceResolutionLocator: null })), 'TIR_SOURCE_RESOLUTION_LOCATOR_REQUIRED');
    code(() => registerTranscriptSource(target, direct(instance, { sourceResolutionLocator: { kind: TranscriptSourceClass.GROUP, groupId: 'group-team', chatLocator: 'session' } })), 'TIR_SOURCE_RESOLUTION_LOCATOR_CLASS_MISMATCH');
    assert.equal(readTranscriptSourceRegistryLedger(target).length, 0);
});
