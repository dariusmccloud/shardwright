import assert from 'node:assert/strict';
import test from 'node:test';
import { createHostRecallPlanningRequest } from './host-recall-planning-request.js';

const invocation = Object.freeze({
    state: 'ELIGIBLE',
    context: Object.freeze({ generationId: 'generation-1', characterInstanceId: 'character-1', sourceMessageId: 'message-1', chatId: 'chat-1', queryText: 'What did we decide?' }),
});

test('builds a frozen request from one immutable invocation and host values', () => {
    const result = createHostRecallPlanningRequest({ invocation, hostContext: { mainApi: 'openai', tokenizerModel: 'gpt-3.5-turbo', maxContext: 32256 } });
    assert.equal(result.state, 'READY');
    assert.equal(result.request.requestId, 'generation-1');
    assert.equal(result.request.queryText, 'What did we decide?');
    assert.equal(result.request.contextWindowTokens, 32256);
    assert.equal(Object.isFrozen(result.request), true);
});

test('refuses incomplete host binding instead of guessing', () => {
    const result = createHostRecallPlanningRequest({ invocation, hostContext: { mainApi: 'openai', maxContext: 32256 } });
    assert.deepEqual(result, { state: 'REFUSED', reason: 'PLANNING_REQUEST_UNAVAILABLE' });
});

test('preserves explicit invocation refusal', () => {
    assert.deepEqual(createHostRecallPlanningRequest({ invocation: Object.freeze({ state: 'REFUSED', reason: 'CHARACTER_INSTANCE_UNAVAILABLE' }) }), { state: 'REFUSED', reason: 'CHARACTER_INSTANCE_UNAVAILABLE' });
});
