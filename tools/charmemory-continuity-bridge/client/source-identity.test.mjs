import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCharMemorySourceId } from './source-identity.js';

test('CharMemory source identity is stable across attachment replacement', () => {
    const beforeSaveUrl = '/user/files/1788647591740_7052222600891357.txt';
    const afterSaveUrl = '/user/files/1788651114088_7052222600891357.txt';

    assert.notEqual(beforeSaveUrl, afterSaveUrl);
    assert.equal(
        deriveCharMemorySourceId('Jeep.png', 'Jeep-memories.md'),
        deriveCharMemorySourceId('Jeep.png', 'Jeep-memories.md'),
    );
});

test('CharMemory source identity does not merge distinct character owners', () => {
    assert.notEqual(
        deriveCharMemorySourceId('Jeep.png', 'char-memories.md'),
        deriveCharMemorySourceId('Lyra.png', 'char-memories.md'),
    );
});

test('CharMemory source identity refuses missing ownership inputs', () => {
    assert.equal(deriveCharMemorySourceId('', 'Jeep-memories.md'), null);
    assert.equal(deriveCharMemorySourceId('Jeep.png', ''), null);
});
