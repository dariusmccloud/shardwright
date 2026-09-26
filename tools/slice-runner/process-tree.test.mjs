import assert from 'node:assert/strict';
import test from 'node:test';

import { spawnProcessTree } from './process-tree.js';

test('stdin errors reject once while expected broken-pipe errors are ignored', async () => {
    const ignored = spawnProcessTree(process.execPath, ['-e', 'setTimeout(() => {}, 100)']);
    const brokenPipe = Object.assign(new Error('closed'), { code: 'EPIPE' });
    ignored.child.stdin.emit('error', brokenPipe);
    ignored.child.stdin.end();
    const ignoredResult = await ignored.result;
    assert.equal(ignoredResult.exitCode, 0);

    const rejected = spawnProcessTree(process.execPath, ['-e', 'setTimeout(() => {}, 100)']);
    const failure = Object.assign(new Error('unexpected stdin failure'), { code: 'EIO' });
    rejected.child.stdin.emit('error', failure);
    await assert.rejects(rejected.result, (error) => error === failure);
    await rejected.terminate().catch(() => {});
});

test('output-limit termination rejection remains the output-limit failure', async () => {
    const processHandle = spawnProcessTree(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { maxBuffer: 32 });
    await assert.rejects(processHandle.result, { code: 'PROCESS_OUTPUT_LIMIT' });
});
