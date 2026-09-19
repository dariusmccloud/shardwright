import test from 'node:test';
import assert from 'node:assert/strict';
import { stageTranscriptRecallSentinel, clearTranscriptRecallSentinel } from './host-recall-sentinel-stage.js';

test('stages the dedicated sentinel before assembly', () => {
    const calls = [];
    const result = stageTranscriptRecallSentinel((...args) => calls.push(args));
    assert.equal(result.state, 'STAGED');
    assert.deepEqual(calls, [['5_shardwright_transcript_recall', '[Shardwright transcript recall sentinel]', 0, 0]]);
});

test('clears only the dedicated slot after dispatch', () => {
    const calls = [];
    const result = clearTranscriptRecallSentinel((...args) => calls.push(args));
    assert.equal(result.state, 'CLEARED');
    assert.deepEqual(calls, [['5_shardwright_transcript_recall', '', 0, 0]]);
});

test('refuses without a host prompt writer', () => {
    assert.equal(stageTranscriptRecallSentinel(null).reason, 'HOST_PROMPT_WRITER_UNAVAILABLE');
    assert.equal(clearTranscriptRecallSentinel(null).reason, 'HOST_PROMPT_WRITER_UNAVAILABLE');
});
