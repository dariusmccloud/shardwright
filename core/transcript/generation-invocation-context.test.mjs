import assert from 'node:assert/strict';
import test from 'node:test';
import { captureTranscriptGenerationInvocation, clearLatestTranscriptGenerationInvocation, getLatestTranscriptGenerationDispatchInvocation, getLatestTranscriptGenerationInvocation, installTranscriptGenerationInvocationAdapter, TranscriptGenerationState } from './generation-invocation-context.js';

const context = { generationId: 'generation:1', generationType: 'NORMAL', characterInstanceId: 'character:jeep', sourceMessageId: 'message:7', chatId: 'chat:jeep' };

test('captures a complete immutable invocation context before handler execution', () => {
    const options = { mode: 'normal' };
    const result = captureTranscriptGenerationInvocation({ eventType: 'GENERATION_AFTER_COMMANDS', options, isEligible: (value) => value.mode === 'normal', resolveContext: () => context });
    assert.equal(result.state, TranscriptGenerationState.ELIGIBLE);
    assert.equal(Object.isFrozen(result.context), true);
    assert.deepEqual(result.context, context);
});

test('distinguishes ineligible and eligible-but-unresolved generations', () => {
    assert.deepEqual(captureTranscriptGenerationInvocation({ options: { mode: 'quiet' }, isEligible: () => false, resolveContext: () => context }), { state: 'NOT_APPLICABLE', reason: 'GENERATION_TYPE_NOT_ELIGIBLE' });
    assert.deepEqual(captureTranscriptGenerationInvocation({ options: { mode: 'normal' }, isEligible: () => true, resolveContext: () => null }), { state: 'REFUSED', reason: 'INVOCATION_CONTEXT_UNAVAILABLE' });
});

test('captures before asynchronous callback and preserves refusal state', () => {
    const calls = [];
    const eventSource = { on(type, handler) { this.type = type; this.handler = handler; } };
    assert.equal(installTranscriptGenerationInvocationAdapter({ eventSource, eventType: 'GENERATION_AFTER_COMMANDS', isEligible: () => true, resolveContext: () => context, onInvocation: (value) => { calls.push(value); } }), true);
    eventSource.handler('GENERATION_AFTER_COMMANDS', { mode: 'normal' }, false);
    eventSource.handler('GENERATION_AFTER_COMMANDS', { mode: 'normal' }, true);
    assert.equal(calls[0].state, 'ELIGIBLE');
    assert.deepEqual(calls[1], { state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
    assert.equal(getLatestTranscriptGenerationInvocation().state, 'NOT_APPLICABLE');
    assert.equal(getLatestTranscriptGenerationDispatchInvocation().state, TranscriptGenerationState.ELIGIBLE);
    clearLatestTranscriptGenerationInvocation();
    assert.equal(getLatestTranscriptGenerationDispatchInvocation(), null);
});
