import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runAgentWithTimeout } from './agent-adapter.js';
import { buildClaudeCommand, createClaudeAdapter } from './claude-adapter.js';
import { buildCodexCommand, createCodexAdapter } from './codex-adapter.js';
import { scrubApiKeyEnvironment } from './cli-adapter-common.js';

async function withFixture(callback) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-cli-test-'));
    const repoRoot = path.join(tempRoot, 'fixture');
    fs.mkdirSync(repoRoot);
    try { await callback({ tempRoot, repoRoot }); }
    finally { fs.rmSync(tempRoot, { recursive: true, force: true }); }
}

const entry = (repoRoot) => ({
    sliceId: 'cli-test',
    inScopePaths: ['hello.txt'],
    declaration: 'Create hello.txt with the exact text hello.',
    approvalRecord: { approvedBy: 'Chris', recordedAt: '2026-09-25T18:00:00Z' },
    governingContracts: [],
});

function stubFile(repoRoot, source) {
    const filename = path.join(repoRoot, 'stub-cli.cjs');
    fs.writeFileSync(filename, source);
    return filename;
}

const fixtureVerdict = [
    '---', 'slice_id: cli-test', 'round: 1', 'verdict: PASS', 'subtype: null',
    'reviewer: claude', `reviewed_fingerprint: ${'a'.repeat(64)}`,
    `policy_hash: ${'b'.repeat(64)}`, '---', 'Proof and scope are verified.', '',
].join('\n');

test('CLI command builders use least-privilege modes and never add bypass flags', async () => {
    await withFixture(async ({ repoRoot }) => {
        const claudeImplementer = buildClaudeCommand({ role: 'implementer', entry: entry(repoRoot), repoRoot });
        const claudeReviewer = buildClaudeCommand({ role: 'reviewer', entry: entry(repoRoot), repoRoot,
            proofReceipt: { exitCode: 0 }, reviewedFingerprint: 'a'.repeat(64), policyHash: 'b'.repeat(64), round: 1 });
        assert.ok(claudeImplementer.args.includes('--restricted'));
        assert.ok(claudeImplementer.args.includes('--safe-mode'));
        assert.ok(claudeImplementer.args.includes('dontAsk'));
        assert.ok(claudeImplementer.args.includes('--allowedTools'));
        assert.ok(claudeImplementer.args.includes('Edit(/**)'));
        assert.ok(claudeImplementer.args.includes('Read,Edit'));
        assert.ok(claudeReviewer.args.includes('plan'));
        assert.ok(claudeReviewer.args.includes('Read'));
        assert.ok(!claudeImplementer.args.includes('--dangerously-skip-permissions'));
        assert.ok(!claudeImplementer.args.includes('bypassPermissions'));

        const codexImplementer = buildCodexCommand({ role: 'implementer', entry: entry(repoRoot), repoRoot });
        const codexReviewer = buildCodexCommand({ role: 'reviewer', entry: entry(repoRoot), repoRoot });
        assert.ok(codexImplementer.args.includes('workspace-write'));
        assert.ok(codexReviewer.args.includes('read-only'));
        assert.ok(codexImplementer.args.includes('--ignore-user-config'));
        assert.ok(codexImplementer.args.includes('windows.sandbox="elevated"'));
        assert.ok(codexImplementer.args.includes('--ignore-rules'));
        assert.ok(codexImplementer.args.includes('--ephemeral'));
        assert.ok(codexImplementer.args.includes('-a'));
        assert.ok(codexImplementer.args.includes('never'));
        assert.ok(codexImplementer.args.includes('sandbox_workspace_write.exclude_tmpdir_env_var=true'));
        assert.ok(codexImplementer.args.includes('sandbox_workspace_write.exclude_slash_tmp=true'));
        assert.ok(!codexImplementer.args.includes('--approve-for-me'));
        assert.ok(!codexReviewer.args.includes('--ask-for-approval'));
        assert.ok(!codexImplementer.args.includes('danger-full-access'));
        assert.ok(!codexImplementer.args.includes('--dangerously-bypass-approvals-and-sandbox'));
        assert.ok(!codexImplementer.args.includes('--add-dir'));
        assert.ok(!claudeImplementer.args.includes('Bash'), 'Claude implementer must not receive a shell tool');
    });
});

test('adapter prompt carries declaration, scope, proof receipt, and verdict format', async () => {
    await withFixture(async ({ repoRoot }) => {
        const implementer = buildClaudeCommand({ role: 'implementer', entry: entry(repoRoot), repoRoot });
        assert.match(implementer.prompt, /Create hello\.txt/u);
        assert.match(implementer.prompt, /hello\.txt/u);
        const canaryPath = path.join(repoRoot, 'protected-canary.txt');
        const canaryImplementer = buildCodexCommand({ role: 'implementer', entry: entry(repoRoot), repoRoot,
            containmentCanaryPaths: [path.join(repoRoot, 'temp-canary.txt'), canaryPath] });
        assert.doesNotMatch(canaryImplementer.prompt, /canary path|access-denied|attempt to create/iu);
        const reviewer = buildCodexCommand({ role: 'reviewer', entry: entry(repoRoot), repoRoot,
            proofReceipt: { exitCode: 0, stdout: 'hello' }, reviewedFingerprint: 'a'.repeat(64), policyHash: 'b'.repeat(64), round: 1 });
        assert.match(reviewer.prompt, /Proof receipt/u);
        assert.match(reviewer.prompt, /verdict: <REPLACE_WITH_PASS_FAIL_OR_ESCALATE>/u);
        assert.doesNotMatch(reviewer.prompt, /verdict: PASS\n/u);
        assert.match(reviewer.prompt, /reviewed_fingerprint/u);
    });
});

test('API-key environment values are removed for subscription-authenticated CLI calls', () => {
    const result = scrubApiKeyEnvironment({ PATH: 'fixture', ANTHROPIC_API_KEY: 'secret-a', OPENAI_API_KEY: 'secret-o', CUSTOM: 'ok' });
    assert.deepEqual(result, { PATH: 'fixture', CUSTOM: 'ok' });
});

test('Claude adapter returns plain text and maps malformed/usage-limit output to UNAVAILABLE', async () => {
    await withFixture(async ({ repoRoot }) => {
        const stub = stubFile(repoRoot, `
const mode = process.env.STUB_MODE || 'ok';
if (mode === 'usage') { process.stderr.write('usage limit reached'); process.exit(3); }
if (mode === 'empty') process.exit(0);
process.stdout.write(process.env.STUB_RESPONSE || 'implemented');
`);
        const input = { role: 'implementer', entry: entry(repoRoot), repoRoot };
        const adapter = createClaudeAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_RESPONSE: 'implemented' } });
        assert.equal((await adapter.run(input)).response, 'implemented');
        const usage = createClaudeAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_MODE: 'usage' } });
        assert.equal((await usage.run(input)).state, 'UNAVAILABLE');
        const empty = createClaudeAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_MODE: 'empty' } });
        assert.equal((await empty.run(input)).reason, 'CLI_OUTPUT_EMPTY');
        const missing = createClaudeAdapter({ executable: path.join(repoRoot, 'not-a-cli.exe') });
        assert.equal((await missing.run(input)).state, 'UNAVAILABLE');
    });
});

test('Codex adapter extracts final JSONL agent_message and refuses malformed or quota output', async () => {
    await withFixture(async ({ repoRoot }) => {
        const stub = stubFile(repoRoot, `
const mode = process.env.STUB_MODE || 'ok';
if (mode === 'quota') { process.stderr.write('quota exceeded'); process.exit(2); }
if (mode === 'malformed') { process.stdout.write('not-json\\n'); process.exit(0); }
const text = process.env.STUB_RESPONSE || 'implemented';
process.stdout.write(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}) + '\\n');
`);
        const input = { role: 'implementer', entry: entry(repoRoot), repoRoot };
        const adapter = createCodexAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_RESPONSE: 'implemented' } });
        assert.equal((await adapter.run(input)).response, 'implemented');
        const malformed = createCodexAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_MODE: 'malformed' } });
        assert.equal((await malformed.run(input)).reason, 'CLI_OUTPUT_MALFORMED');
        const quota = createCodexAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_MODE: 'quota' } });
        assert.equal((await quota.run(input)).state, 'UNAVAILABLE');
        const reviewerInput = { role: 'reviewer', entry: entry(repoRoot), repoRoot,
            proofReceipt: { exitCode: 0 }, reviewedFingerprint: 'a'.repeat(64), policyHash: 'b'.repeat(64), round: 1 };
        const reviewer = createCodexAdapter({ executable: process.execPath, prefixArgs: [stub], environment: { ...process.env, STUB_RESPONSE: fixtureVerdict } });
        assert.equal((await reviewer.run(reviewerInput)).verdictDocument, fixtureVerdict);
    });
});

test('agent timeout kills the whole child process tree and leaves no delayed child effect', async () => {
    await withFixture(async ({ repoRoot }) => {
        const marker = path.join(repoRoot, 'surviving-child.txt');
        const stub = stubFile(repoRoot, `
const { spawn } = require('node:child_process');
const fs = require('node:fs');
spawn(process.execPath, ['-e', ${JSON.stringify(`setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'survived'),1800)`)}], {stdio:'ignore'});
setInterval(() => {}, 1000);
`);
        const adapter = createCodexAdapter({ executable: process.execPath, prefixArgs: [stub] });
        await assert.rejects(runAgentWithTimeout(adapter, { role: 'implementer', entry: entry(repoRoot), repoRoot }, 150), { code: 'AGENT_TIMEOUT' });
        await new Promise((resolve) => setTimeout(resolve, 2100));
        assert.equal(fs.existsSync(marker), false, 'timed-out grandchild must not survive to write its marker');
    });
});

test('agent adapter refuses a working directory outside the OS temp fixtures', async () => {
    const adapter = createClaudeAdapter();
    const result = await adapter.run({ role: 'implementer', entry: entry(process.cwd()), repoRoot: process.cwd() });
    assert.equal(result.state, 'UNAVAILABLE');
    assert.equal(result.reason, 'AGENT_CWD_OUTSIDE_TEMP');
});

test('repository working directory requires the exact explicit opt-in path', () => {
    const repositoryRoot = process.cwd();
    const allowed = buildClaudeCommand({
        role: 'implementer', entry: entry(repositoryRoot), repoRoot: repositoryRoot,
        allowedRepositoryRoot: repositoryRoot,
    });
    assert.equal(allowed.cwd, path.resolve(repositoryRoot));
    assert.throws(() => buildClaudeCommand({
        role: 'implementer', entry: entry(repositoryRoot), repoRoot: path.dirname(repositoryRoot),
        allowedRepositoryRoot: repositoryRoot,
    }), { code: 'AGENT_CWD_OUTSIDE_TEMP' });
    assert.throws(() => buildCodexCommand({
        role: 'implementer', entry: entry(repositoryRoot), repoRoot: repositoryRoot,
        allowedRepositoryRoot: path.join(repositoryRoot, 'child'),
    }), { code: 'AGENT_CWD_OUTSIDE_TEMP' });
});
