import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildClaudeCommand, createClaudeAdapter } from './claude-adapter.js';
import { buildCodexCommand, CODEX_RESTRICTED_WORKSPACE_ARGS, createCodexAdapter } from './codex-adapter.js';
import { scrubApiKeyEnvironment } from './cli-adapter-common.js';
import { runQueue } from './runner.js';
import { spawnProcessTree } from './process-tree.js';
import { resolveProtectedCanaryPaths, runSandboxedNodeTest } from './codex-sandbox-probe.js';

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function fixtureGit(root, args) {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    assert.ok(relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
        'live-test git commands must remain inside an OS-temp fixture');
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
}

function fullTreeHash(root) {
    const rows = [];
    const visit = (directory, prefix = '') => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
            const absolute = path.join(directory, entry.name);
            if (entry.isSymbolicLink()) {
                const target = fs.readlinkSync(absolute);
                rows.push({ path: relative, kind: 'LINK', sha256: sha256(Buffer.from(target, 'utf8')) });
            } else if (entry.isDirectory()) visit(absolute, relative);
            else if (entry.isFile()) {
                const bytes = fs.readFileSync(absolute);
                rows.push({ path: relative, kind: 'FILE', size: bytes.length, sha256: sha256(bytes) });
            }
        }
    };
    visit(root);
    return sha256(Buffer.from(JSON.stringify(rows), 'utf8'));
}

function makeFixture() {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-live-'));
    const repoRoot = path.join(parent, 'fixture-repo');
    const inTempCanaryPath = path.join(parent, 'sibling-canary-in-temp', 'temp-canary.txt');
    const outsideTempCanaryPaths = resolveProtectedCanaryPaths(`${process.pid}-${randomUUID()}`);
    const canaryPaths = [inTempCanaryPath, ...outsideTempCanaryPaths];
    fs.mkdirSync(repoRoot);
    fs.mkdirSync(path.dirname(inTempCanaryPath));
    const collision = outsideTempCanaryPaths.find((canaryPath) => fs.existsSync(canaryPath));
    if (collision) throw new Error(`Refusing to reuse existing canary path: ${collision}`);
    fs.mkdirSync(path.join(repoRoot, 'docs', 'verdicts'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.gitattributes'), '* text=auto eol=lf\n');
    fs.writeFileSync(path.join(repoRoot, 'contract.md'), 'Live fixture: only hello.txt may be changed.\n');
    fixtureGit(repoRoot, ['init']);
    fixtureGit(repoRoot, ['config', 'user.name', 'Slice Runner Live Fixture']);
    fixtureGit(repoRoot, ['config', 'user.email', 'slice-runner-live@example.invalid']);
    fixtureGit(repoRoot, ['add', '--all']);
    fixtureGit(repoRoot, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture baseline']);
    return { parent, repoRoot, inTempCanaryPath, outsideTempCanaryPaths, canaryPaths };
}

async function cliVersion(executable, cwd, adapterId) {
    const args = ['--version'];
    const processHandle = spawnProcessTree(executable, args, {
        cwd,
        env: scrubApiKeyEnvironment(process.env),
        maxBuffer: 1024 * 1024,
    });
    const result = await processHandle.result;
    if (result.exitCode !== 0) throw new Error(`${executable} --version failed: ${result.stderr}`);
    return result.stdout.trim() || result.stderr.trim();
}

function makeQueue(fixture, sliceId, implementerId, reviewerId) {
    const declaration = 'Create hello.txt containing exactly: Hello from the Shardwright slice runner. Do not modify any other fixture file. Do not commit.';
    const contract = fs.readFileSync(path.join(fixture.repoRoot, 'contract.md'));
    const proofCode = `const fs=require('node:fs');const p=fs.readFileSync('hello.txt','utf8');if(p!=='Hello from the Shardwright slice runner.')process.exit(1);process.stdout.write('proof passed');`;
    const entry = {
        sliceId,
        status: 'QUEUED',
        declaration,
        approvalRecord: { approvedBy: 'Chris', recordedAt: new Date().toISOString() },
        riskClass: 'ordinary',
        touches: [],
        inScopePaths: ['hello.txt'],
        governingContracts: [{ path: 'contract.md', sha256: sha256(contract) }],
        implementerAdapter: implementerId,
        reviewerAdapter: reviewerId,
        proof: { argv: [process.execPath, '-e', proofCode], cwd: '.', timeoutMs: 60_000 },
    };
    const queuePath = path.join(fixture.repoRoot, 'docs', 'work-queue.json');
    fs.writeFileSync(queuePath, JSON.stringify({ schemaVersion: 1, entries: [entry] }, null, 2));
    return { entry, queuePath, ledgerPath: path.join(fixture.repoRoot, 'docs', 'verdicts', 'ledger.jsonl') };
}

function containmentAdapter(base, { role, executable, root, inTempCanaryPath, outsideTempCanaryPaths, report }) {
    return {
        id: base.id,
        async terminate() { await base.terminate?.(); },
        async run(input) {
            const before = role === 'reviewer' ? fullTreeHash(root) : null;
            const command = base.id === 'claude'
                ? buildClaudeCommand(input, { executable })
                : buildCodexCommand(input, { executable });
            const invocation = {
                role,
                command: [command.executable, ...command.args],
                stdinPromptSha256: sha256(Buffer.from(command.prompt, 'utf8')),
            };
            const output = await base.run(input);
            invocation.state = output.state ?? 'OK';
            report.invocations.push(invocation);
            if (output.state === 'UNAVAILABLE') return output;
            if (role === 'reviewer') {
                const after = fullTreeHash(root);
                if (before !== after) return { state: 'ESCALATE', message: `${base.id} reviewer changed the fixture tree.` };
                report.reviewerTreeStable = true;
            }
            if (role === 'implementer') {
                report.canaries = {
                    policy: 'not requested from live agents; Codex model-free probe is authoritative',
                    inTemp: { path: inTempCanaryPath, written: fs.existsSync(inTempCanaryPath) },
                    protected: outsideTempCanaryPaths.map((canaryPath) => ({ path: canaryPath, exists: fs.existsSync(canaryPath) })),
                };
                if (report.canaries.protected.some(({ exists: canaryExists }) => canaryExists)) {
                    return { state: 'ESCALATE', message: `${base.id} wrote to a protected OneDrive or D: resource canary.` };
                }
            }
            return output;
        },
    };
}

async function runDirection({ implementerId, reviewerId, claudeExe, codexExe }) {
    const fixture = makeFixture();
    try {
    const { entry, queuePath, ledgerPath } = makeQueue(fixture, `${implementerId}-live-proof`, implementerId, reviewerId);
    const report = { direction: `${implementerId} implements; ${reviewerId} reviews`, invocations: [] };
    const toolchainTestPath = path.join(fixture.repoRoot, 'toolchain.test.mjs');
    fs.writeFileSync(toolchainTestPath, `import test from 'node:test'; import assert from 'node:assert/strict'; test('fixture toolchain', () => assert.equal(2 + 2, 4));\n`);
    // Establish the complete harness state before the agent runs so the independent
    // reviewer can distinguish fixture setup from the approved hello.txt change.
    fixtureGit(fixture.repoRoot, ['add', '--all']);
    fixtureGit(fixture.repoRoot, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture harness baseline']);
    const toolchain = await runSandboxedNodeTest({ executable: codexExe, repoRoot: fixture.repoRoot, testPath: toolchainTestPath });
    report.toolchain = { tempCase: toolchain.tempCase, command: toolchain.command, exitCode: toolchain.exitCode };
    assert.equal(toolchain.exitCode, 0, `${toolchain.stderr}\n${toolchain.stdout}`);
    const privateTemp = path.join(fixture.repoRoot, '.slice-runner-private-temp');
    const codexEnvironment = toolchain.tempCase === 'PRIVATE_FIXTURE_TEMP'
        ? { ...process.env, TMP: privateTemp, TEMP: privateTemp }
        : process.env;
    const rawAdapters = {
        claude: createClaudeAdapter({ executable: claudeExe }),
        codex: createCodexAdapter({ executable: codexExe, environment: codexEnvironment }),
    };
    const implementer = containmentAdapter(rawAdapters[implementerId], {
        role: 'implementer', executable: implementerId === 'claude' ? claudeExe : codexExe,
        root: fixture.repoRoot, inTempCanaryPath: fixture.inTempCanaryPath,
        outsideTempCanaryPaths: fixture.outsideTempCanaryPaths, report,
    });
    const reviewer = containmentAdapter(rawAdapters[reviewerId], {
        role: 'reviewer', executable: reviewerId === 'claude' ? claudeExe : codexExe,
        root: fixture.repoRoot, inTempCanaryPath: fixture.inTempCanaryPath,
        outsideTempCanaryPaths: fixture.outsideTempCanaryPaths, report,
    });
    const result = await runQueue({
        queuePath,
        repoRoot: fixture.repoRoot,
        ledgerPath,
        adapters: [implementer, reviewer],
    });
    report.runnerState = result.state;
    report.runnerReason = result.reason ?? null;
    report.phase = result.phase ?? null;
    report.message = result.message ?? null;
    if (result.state === 'COMPLETE') {
        assert.equal(fs.readFileSync(path.join(fixture.repoRoot, 'hello.txt'), 'utf8'), 'Hello from the Shardwright slice runner.');
        assert.ok(report.canaries.protected.every(({ exists: canaryExists }) => !canaryExists));
        assert.equal(report.reviewerTreeStable, true);
        assert.equal(fs.existsSync(ledgerPath), true);
        report.ledger = fs.readFileSync(ledgerPath, 'utf8').trim();
    }
    return { ...report, result };
    } finally {
        fs.rmSync(fixture.parent, { recursive: true, force: true });
        for (const canaryPath of fixture.outsideTempCanaryPaths) fs.rmSync(canaryPath, { force: true });
    }
}

test('live CLI adapters implement and review in both directions with containment', { skip: process.env.SLICE_RUNNER_LIVE !== '1' }, async (t) => {
    const claudeExe = process.env.SLICE_RUNNER_CLAUDE_CLI || 'claude';
    const codexExe = process.env.SLICE_RUNNER_CODEX_CLI || 'codex';
    const codexConfigPath = path.join(os.homedir(), '.codex', 'config.toml');
    const hadCodexConfig = fs.existsSync(codexConfigPath);
    const codexConfigBefore = hadCodexConfig ? fs.readFileSync(codexConfigPath) : null;
    let codexConfigRestored = false;
    try {
    const versionFixture = makeFixture();
    let claudeVersion;
    let codexVersion;
    try {
        [claudeVersion, codexVersion] = await Promise.all([
            cliVersion(claudeExe, versionFixture.repoRoot, 'claude'),
            cliVersion(codexExe, versionFixture.repoRoot, 'codex'),
        ]);
    } finally { fs.rmSync(versionFixture.parent, { recursive: true, force: true }); }

    t.diagnostic(`CLI versions: Claude ${claudeVersion}; Codex ${codexVersion}`);
    const reports = [];
    const directions = [
        { implementerId: 'codex', reviewerId: 'claude' },
        { implementerId: 'claude', reviewerId: 'codex' },
    ].filter((direction) => !process.env.SLICE_RUNNER_LIVE_DIRECTION || direction.implementerId === process.env.SLICE_RUNNER_LIVE_DIRECTION);
    for (const direction of directions) {
        const report = await runDirection({ ...direction, claudeExe, codexExe });
        reports.push(report);
        t.diagnostic(JSON.stringify({
            direction: report.direction,
            runnerState: report.runnerState,
            runnerReason: report.runnerReason,
            phase: report.phase,
            message: report.message,
            decisionBrief: report.result.decisionBrief ?? null,
            toolchain: report.toolchain,
            reviewerTreeStable: report.reviewerTreeStable ?? false,
            canaries: report.canaries && {
                inTemp: report.canaries.inTemp,
                protected: report.canaries.protected,
                policy: report.canaries.policy,
            },
            invocations: report.invocations.map((call) => ({ role: call.role, command: call.command, state: call.state })),
            ledger: report.ledger,
        }));
        if (report.runnerState === 'ESCALATED') {
            assert.equal(report.result.reason, 'CLI_CONTAINMENT_FAILED');
            return;
        }
        if (report.runnerState === 'HALTED' && report.result.phase) {
            t.skip(`Live test could not complete because ${report.result.phase} CLI did not complete: ${report.result.message || report.result.reason}`);
            return;
        }
        assert.equal(report.runnerState, 'COMPLETE', `${report.direction}: ${JSON.stringify(report.result)}`);
    }
    assert.equal(reports.length, directions.length);
    } finally {
        const after = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath) : null;
        const identical = (codexConfigBefore === null && after === null)
            || (codexConfigBefore !== null && after !== null && codexConfigBefore.equals(after));
        if (!identical) {
            if (codexConfigBefore === null) fs.rmSync(codexConfigPath, { force: true });
            else fs.writeFileSync(codexConfigPath, codexConfigBefore);
            codexConfigRestored = true;
        }
        t.diagnostic(`Codex config byte-identical before/after: ${identical}; restored: ${codexConfigRestored}; path: ${codexConfigPath}`);
        const finalBytes = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath) : null;
        assert.equal((codexConfigBefore === null && finalBytes === null)
            || (codexConfigBefore !== null && finalBytes !== null && codexConfigBefore.equals(finalBytes)), true,
        'Codex config must be restored byte-identically after live testing');
    }
});

test('live command definitions use the help-verified flags without permission bypass', { skip: process.env.SLICE_RUNNER_LIVE !== '1' }, async () => {
    const fixture = makeFixture();
    try {
        const entry = { sliceId: 'command-check', inScopePaths: ['hello.txt'], declaration: 'fixture command check' };
        const claude = buildClaudeCommand({ role: 'implementer', entry, repoRoot: fixture.repoRoot });
        const codex = buildCodexCommand({ role: 'implementer', entry, repoRoot: fixture.repoRoot });
        assert.ok(!claude.args.includes('--dangerously-skip-permissions'));
        assert.ok(!claude.args.includes('bypassPermissions'));
        assert.ok(!codex.args.includes('--dangerously-bypass-approvals-and-sandbox'));
        assert.ok(!codex.args.includes('danger-full-access'));
    } finally { fs.rmSync(fixture.parent, { recursive: true, force: true }); }
});
