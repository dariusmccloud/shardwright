import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceTranscriptRecallSentinel, verifyTranscriptRecallReplacement, TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

test('replaces one sentinel in a text-completion payload and verifies postconditions', () => {
    const data = { prompt: `before ${TRANSCRIPT_RECALL_SENTINEL} after` };
    const replaced = replaceTranscriptRecallSentinel(data, { bundleText: 'RECAll' });
    assert.deepEqual(replaced, { state: 'REPLACED', reason: 'SENTINEL_REPLACED', replacedCount: 1 });
    assert.deepEqual(verifyTranscriptRecallReplacement(data, { bundleText: 'RECAll' }), { state: 'VERIFIED', reason: 'SENTINEL_GONE_BUNDLE_PRESENT', sentinelPresent: false, bundlePresent: true });
});

test('replaces the sentinel in a chat-completion message array', () => {
    const data = { prompt: [{ role: 'system', content: TRANSCRIPT_RECALL_SENTINEL }, { role: 'user', content: 'unchanged' }] };
    const result = replaceTranscriptRecallSentinel(data, { bundleText: 'RECALL' });
    assert.equal(result.replacedCount, 1);
    assert.equal(data.prompt[0].content, 'RECALL');
    assert.equal(data.prompt[1].content, 'unchanged');
    assert.equal(verifyTranscriptRecallReplacement(data, { bundleText: 'RECALL' }).state, 'VERIFIED');
});

test('replaces every sentinel occurrence in one content field', () => {
    const data = { prompt: `${TRANSCRIPT_RECALL_SENTINEL}|${TRANSCRIPT_RECALL_SENTINEL}` };
    const result = replaceTranscriptRecallSentinel(data, { bundleText: 'R' });
    assert.equal(result.state, 'REPLACED');
    assert.equal(data.prompt, 'R|R');
    assert.equal(verifyTranscriptRecallReplacement(data, { bundleText: 'R' }).state, 'VERIFIED');
});

test('refuses unsupported or missing sentinel input', () => {
    assert.equal(replaceTranscriptRecallSentinel({ prompt: 'x' }, { bundleText: 'R' }).reason, 'SENTINEL_NOT_FOUND');
    assert.equal(replaceTranscriptRecallSentinel({ prompt: 3 }, { bundleText: 'R' }).reason, 'PROMPT_SHAPE_UNSUPPORTED');
    assert.equal(replaceTranscriptRecallSentinel({ prompt: TRANSCRIPT_RECALL_SENTINEL }, {}).reason, 'SENTINEL_INPUT_INVALID');
});

test('fails loudly when a future host clone leaves the sentinel in the live payload', () => {
    const emitted = { prompt: TRANSCRIPT_RECALL_SENTINEL };
    const handlerCopy = { prompt: emitted.prompt };
    replaceTranscriptRecallSentinel(handlerCopy, { bundleText: 'RECALL' });
    assert.deepEqual(verifyTranscriptRecallReplacement(emitted, { bundleText: 'RECALL' }), { state: 'REFUSED', reason: 'SENTINEL_REPLACEMENT_POSTCONDITION_FAILED', sentinelPresent: true, bundlePresent: false });
});
