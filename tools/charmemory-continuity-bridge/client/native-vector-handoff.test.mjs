import assert from 'node:assert/strict';
import test from 'node:test';

import { claimNativeVectorHandoff } from './native-vector-handoff.js';

test('claims only the selected logical source and its current attachment URL', () => {
    const extensionSettings = { disabled_attachments: ['unrelated-url'] };
    const changed = claimNativeVectorHandoff(
        extensionSettings,
        'charmemoryContinuityBridge',
        'charmemory-source:["Jeep.png","Jeep-memories.md"]',
        'jeep-memory-url-a',
    );

    assert.equal(changed, true);
    assert.deepEqual(extensionSettings.disabled_attachments, ['unrelated-url', 'jeep-memory-url-a']);
    assert.deepEqual(extensionSettings.charmemoryContinuityBridge.managedSourceIds, [
        'charmemory-source:["Jeep.png","Jeep-memories.md"]',
    ]);
});

test('does not duplicate an already claimed source or attachment URL', () => {
    const extensionSettings = {
        disabled_attachments: ['jeep-memory-url-a'],
        charmemoryContinuityBridge: {
            managedSourceIds: ['charmemory-source:["Jeep.png","Jeep-memories.md"]'],
        },
    };

    assert.equal(claimNativeVectorHandoff(
        extensionSettings,
        'charmemoryContinuityBridge',
        'charmemory-source:["Jeep.png","Jeep-memories.md"]',
        'jeep-memory-url-a',
    ), false);
});

