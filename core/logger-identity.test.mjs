import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('active Shardwright console labels do not present the upstream product identity', async () => {
    const loggerSource = await readFile(new URL('./logger.js', import.meta.url), 'utf8');
    const profilerSource = await readFile(new URL('./summarization/load-profiler.js', import.meta.url), 'utf8');

    assert.match(loggerSource, /const PREFIX = '\[Shardwright\]';/u);
    assert.match(loggerSource, /`\[Shardwright:\$\{tag\}\]`/u);
    assert.match(profilerSource, /'\[Shardwright\] Profiling bypass active\./u);
    assert.doesNotMatch(loggerSource, /\[SummarySharder(?:[:\]])/u);
    assert.doesNotMatch(profilerSource, /\[SummarySharder(?:[:\]])/u);
});
