import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolveProtectedCanaryPaths, runCodexSandboxCommand, runSandboxedNodeTest } from './codex-sandbox-probe.js';

async function withSandboxFixture(callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-codex-sandbox-'));
    const repoRoot = path.join(root, 'fixture-repo');
    const insideCanary = path.join(root, 'sibling-in-temp');
    const outsideCanaryPaths = resolveProtectedCanaryPaths(`${process.pid}-${randomUUID()}`);
    fs.mkdirSync(repoRoot);
    fs.mkdirSync(insideCanary);
    try {
        const collision = outsideCanaryPaths.find((canaryPath) => fs.existsSync(canaryPath));
        if (collision) throw new Error(`Refusing to reuse existing canary: ${collision}`);
        return await callback({ root, repoRoot, insideCanary, outsideCanaryPaths });
    }
    finally {
        fs.rmSync(root, { recursive: true, force: true });
        for (const canaryPath of outsideCanaryPaths) fs.rmSync(canaryPath, { force: true });
    }
}

function installedCodex() {
    const executable = process.env.SLICE_RUNNER_CODEX_CLI || 'codex';
    const result = spawnSync(executable, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (result.error || result.status !== 0) return { executable, reason: result.error?.message || result.stderr || `exit ${result.status}` };
    return { executable, version: result.stdout.trim() || result.stderr.trim() };
}

test('model-free Codex sandbox regression allows the fixture and denies protected-location canaries', async (t) => {
    const codex = installedCodex();
    if (codex.reason) return t.skip(`Codex CLI unavailable: ${codex.reason}`);
    await withSandboxFixture(async ({ repoRoot, insideCanary, outsideCanaryPaths }) => {
        const fixtureFile = path.join(repoRoot, 'fixture-write.txt');
        const inTempCanary = path.join(insideCanary, 'temp-canary.txt');
        const canaryFiles = [inTempCanary, ...outsideCanaryPaths];
        const script = [
            'const fs=require("node:fs");',
            `const fixture=${JSON.stringify(fixtureFile)};`,
            `const canaries=${JSON.stringify(canaryFiles)};`,
            'const result={fixture:"denied",canaries:[]};',
            'try{fs.writeFileSync(fixture,"ok");result.fixture="allowed"}catch(e){result.fixture=`denied:${e.code||e.name}`}',
            'for(const p of canaries){try{fs.writeFileSync(p,"breach");result.canaries.push({path:p,state:"allowed"})}catch(e){result.canaries.push({path:p,state:`denied:${e.code||e.name}`})}}',
            'process.stdout.write(JSON.stringify(result));',
        ].join('');
        const result = await runCodexSandboxCommand({ executable: codex.executable, cwd: repoRoot, command: [process.execPath, '-e', script] });
        assert.equal(result.exitCode, 0, `${result.stderr}\n${result.stdout}`);
        const observed = JSON.parse(result.stdout);
        assert.equal(observed.fixture, 'allowed', 'fixture root must remain writable');
        assert.ok(observed.canaries.slice(1).every(({ state }) => state.startsWith('denied:')), JSON.stringify(observed));
        assert.ok(['allowed', 'denied'].some((state) => observed.canaries[0].state.startsWith(state)), JSON.stringify(observed));
        assert.equal(fs.existsSync(inTempCanary), observed.canaries[0].state === 'allowed', 'recorded temp result must match the filesystem');
        for (const canaryPath of outsideCanaryPaths) assert.equal(fs.existsSync(canaryPath), false, `protected canary must remain absent: ${canaryPath}`);
        t.diagnostic(`Codex ${codex.version}; in-temp canary: ${observed.canaries[0].state}; protected canaries: ${JSON.stringify(observed.canaries.slice(1))}; command: ${result.command.map((part) => JSON.stringify(part)).join(' ')}`);
    });
});

test('ordinary node --test works under the tightened Codex sandbox', async (t) => {
    const codex = installedCodex();
    if (codex.reason) return t.skip(`Codex CLI unavailable: ${codex.reason}`);
    await withSandboxFixture(async ({ repoRoot }) => {
        const testPath = path.join(repoRoot, 'toolchain.test.mjs');
        fs.writeFileSync(testPath, `import test from 'node:test'; import assert from 'node:assert/strict'; test('fixture toolchain', () => assert.equal(2 + 2, 4));\n`);
        const result = await runSandboxedNodeTest({ executable: codex.executable, repoRoot, testPath });
        assert.equal(result.exitCode, 0, `${result.stderr}\n${result.stdout}`);
        assert.match(`${result.stdout}\n${result.stderr}`, /(?:# pass 1|pass 1)/u);
        t.diagnostic(`Codex ${codex.version}; TEMP case: ${result.tempCase}; command: ${result.command.map((part) => JSON.stringify(part)).join(' ')}`);
    });
});
