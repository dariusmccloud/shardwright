import assert from 'node:assert/strict';
import test from 'node:test';
import { clearGenerationBoundaryProbe, getGenerationBoundaryProbeHistory, getLatestGenerationBoundaryProbe, getLatestGenerationDispatchProbe, installGenerationBoundaryProbe, installGenerationBoundaryProbeCapability, recordGenerationBoundaryProbe } from './generation-boundary-probe.js';

test('records only synchronous event and context shape in volatile state', () => {
    clearGenerationBoundaryProbe();
    const result = recordGenerationBoundaryProbe({ eventType: 'GENERATION_AFTER_COMMANDS', generationType: 'normal', options: { mode: 'normal', nested: true }, contextSnapshot: { characterId: 'opaque', chatId: 'chat' }, argumentShapes: ['GENERATION_AFTER_COMMANDS', {}, false] });
    assert.equal(result.eventType, 'GENERATION_AFTER_COMMANDS');
    assert.equal(result.generationType, 'normal');
    assert.deepEqual(result.optionKeys, ['mode', 'nested']);
    assert.deepEqual(result.contextKeys, ['characterId', 'chatId']);
    assert.deepEqual(result.argumentShapes, ['string', 'object', 'boolean']);
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(getLatestGenerationBoundaryProbe(), result);
    assert.deepEqual(getLatestGenerationDispatchProbe(), result);
});

test('installer captures the payload before any later work and does not persist it', () => {
    clearGenerationBoundaryProbe();
    const eventSource = { on(type, handler) { this.handler = handler; this.type = type; } };
    assert.equal(installGenerationBoundaryProbe({ eventSource, eventType: 'GENERATION_AFTER_COMMANDS', resolveContext: (options) => ({ generationType: options.mode }) }), true);
    eventSource.handler('GENERATION_AFTER_COMMANDS', { mode: 'normal' }, false);
    assert.deepEqual(getLatestGenerationBoundaryProbe().contextKeys, ['generationType']);
    clearGenerationBoundaryProbe();
    assert.equal(getLatestGenerationBoundaryProbe(), null);
    assert.equal(getLatestGenerationDispatchProbe(), null);
    assert.equal(getGenerationBoundaryProbeHistory().length, 0);
});

test('exposes only the volatile probe accessors under the owned transcript namespace', () => {
    const target = {};
    const namespace = installGenerationBoundaryProbeCapability(target);
    assert.equal(namespace.getLastGenerationBoundaryProbe, getLatestGenerationBoundaryProbe);
    namespace.clearGenerationBoundaryProbe();
    assert.equal(namespace.getLastGenerationBoundaryProbe(), null);
});
