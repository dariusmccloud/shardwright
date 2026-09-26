// Step 4 pilot launcher (Work Board entry 17; docs/proposals/STEP4_PILOT_DECLARATION_DRAFT.md).
//
//   node tools/pilot/run-step4-pilot.mjs --check   validate the queue and containment; dispatch nothing
//   node tools/pilot/run-step4-pilot.mjs           the same checks, then run the approved queue
//
// Wraps the reviewed runner (tools/slice-runner) with the pilot's own guards:
//   before: no uncommitted change outside the pilot's scopes and record folders (a relaunch after
//           FAIL continues on top of that slice's own leftovers); queue shape, approvals and governing hashes; a model-free Codex sandbox
//           probe on this repository (writable inside, protected canaries denied); snapshots of the
//           Codex config, sibling project folders, and host plugin folders.
//   after:  every changed path lies inside a declared scope or the runner's own record folders;
//           the snapshots are unchanged (the Codex config is restored byte-for-byte if the CLI wrote to it).
// Exit 0 only when the runner reports COMPLETE and every guard holds. Nothing is committed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { projectRoot } from '../slice-runner/cli-adapter-common.js';
import { createClaudeAdapter } from '../slice-runner/claude-adapter.js';
import { createCodexAdapter } from '../slice-runner/codex-adapter.js';
import { resolveProtectedCanaryPaths, runCodexSandboxCommand } from '../slice-runner/codex-sandbox-probe.js';
import { runQueue } from '../slice-runner/runner.js';

export const QUEUE_RELATIVE_PATH = 'docs/work-queue.json';
export const LEDGER_RELATIVE_PATH = 'docs/verdicts/ledger.jsonl';
export const RUNNER_OWNED_PREFIXES = Object.freeze(['docs/slices/', 'docs/verdicts/']);
const EXPECTED_SLICES = Object.freeze([
    'pilot-1-plugin-engines-node',
    'pilot-2-readme-plugin-troubleshooting',
    'pilot-3-payload-package-json-test',
]);
const HOST_FOLDERS = Object.freeze([
    'D:\\SillyTavern', 'D:\\SillyBunny', 'D:\\AI\\Projects\\SillyTavern', 'D:\\AI\\Projects\\SillyBunny',
]);

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function git(root, args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).replace(/\n$/u, '');
}

function changedPaths(root) {
    const out = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
    const paths = [];
    const records = out.split('\0').filter(Boolean);
    for (let i = 0; i < records.length; i += 1) {
        const status = records[i].slice(0, 2);
        paths.push(records[i].slice(3));
        if (status.includes('R') || status.includes('C')) i += 1; // skip the rename source
    }
    return paths;
}

// Top-level names, sizes and modification times: detects writes without reading file contents.
function folderSnapshot(folder) {
    if (!fs.existsSync(folder)) return null;
    const entries = [];
    for (const name of fs.readdirSync(folder).sort()) {
        try {
            const stat = fs.lstatSync(path.join(folder, name));
            entries.push(`${name}\t${stat.isDirectory() ? 'd' : stat.size}\t${stat.mtimeMs}`);
        } catch { entries.push(`${name}\tunreadable`); }
    }
    return sha256(entries.join('\n'));
}

function snapshotOutside(root) {
    const codexConfig = path.join(os.homedir(), '.codex', 'config.toml');
    const projects = path.dirname(root);
    const folders = {};
    for (const name of fs.readdirSync(projects).sort()) {
        const full = path.join(projects, name);
        if (full.toLowerCase() === root.toLowerCase()) continue;
        try { if (fs.statSync(full).isDirectory()) folders[full] = folderSnapshot(full); } catch { /* skip unreadable */ }
    }
    folders[projects] = folderSnapshot(projects);
    for (const host of HOST_FOLDERS) {
        for (const sub of ['plugins', path.join('public', 'scripts', 'extensions', 'third-party')]) {
            folders[path.join(host, sub)] = folderSnapshot(path.join(host, sub));
        }
    }
    return { codexConfigPath: codexConfig, codexConfig: fs.existsSync(codexConfig) ? fs.readFileSync(codexConfig) : null, folders };
}

export function checkQueue(root, now = new Date()) {
    const problems = [];
    const queue = JSON.parse(fs.readFileSync(path.join(root, QUEUE_RELATIVE_PATH), 'utf8'));
    if (queue.reviewBacklog !== undefined) problems.push('reviewBacklog must be absent (the pilot runs with the backlog off)');
    const ids = (queue.entries ?? []).map((entry) => entry.sliceId);
    if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_SLICES)) problems.push(`entries must be exactly ${EXPECTED_SLICES.join(', ')}`);
    const directions = new Set();
    for (const entry of queue.entries ?? []) {
        const at = `${entry.sliceId}:`;
        if (entry.status !== 'QUEUED') problems.push(`${at} status must be QUEUED`);
        if (!['claude', 'codex'].includes(entry.implementerAdapter) || !['claude', 'codex'].includes(entry.reviewerAdapter)
            || entry.implementerAdapter === entry.reviewerAdapter) problems.push(`${at} needs two different adapters`);
        directions.add(`${entry.implementerAdapter}->${entry.reviewerAdapter}`);
        const approvedAt = Date.parse(entry.approvalRecord?.recordedAt);
        if (entry.approvalRecord?.approvedBy !== 'Chris' || !Number.isFinite(approvedAt) || approvedAt > now.getTime()) {
            problems.push(`${at} approval record must be Chris, in the past`);
        }
        for (const contract of entry.governingContracts ?? []) {
            const file = path.join(root, contract.path);
            if (!fs.existsSync(file) || sha256(fs.readFileSync(file)) !== contract.sha256) problems.push(`${at} governing contract changed: ${contract.path}`);
        }
        for (const scoped of entry.inScopePaths ?? []) {
            if ((entry.governingContracts ?? []).some((contract) => contract.path === scoped)) problems.push(`${at} ${scoped} is both in scope and hash-bound`);
        }
        if (!(entry.governingContracts ?? []).some((contract) => contract.path === entry.proof?.argv?.[1])) {
            problems.push(`${at} its proof script must be hash-bound as a governing contract`);
        }
    }
    if (directions.size < 2) problems.push('at least one slice must run in each direction');
    return { queue, problems };
}

async function containmentProbe(root) {
    const nonce = `${process.pid}-${crypto.randomUUID()}`;
    const inside = path.join(root, 'docs', 'slices', `.pilot-preflight-${nonce}.txt`);
    const canaries = resolveProtectedCanaryPaths(nonce);
    const script = `const fs=require('fs');const r={};for(const p of ${JSON.stringify([inside, ...canaries])}){try{fs.mkdirSync(require('path').dirname(p),{recursive:true});fs.writeFileSync(p,'probe');r[p]='WROTE';}catch(e){r[p]='DENIED '+(e.code||'');}}console.log(JSON.stringify(r));`;
    const result = await runCodexSandboxCommand({
        executable: process.env.SLICE_RUNNER_CODEX_CLI || 'codex',
        cwd: root,
        command: [process.execPath, '-e', script],
    });
    const insideWritten = fs.existsSync(inside);
    const canariesWritten = canaries.filter((canary) => fs.existsSync(canary));
    fs.rmSync(inside, { force: true });
    for (const canary of canariesWritten) fs.rmSync(canary, { force: true });
    return {
        ok: result.exitCode === 0 && insideWritten && canariesWritten.length === 0,
        insideWritable: insideWritten,
        protectedWritten: canariesWritten,
        exitCode: result.exitCode,
        output: (result.stdout || result.stderr || '').trim().slice(0, 2000),
    };
}

export async function main(argv = process.argv.slice(2)) {
    const checkOnly = argv.includes('--check');
    const root = projectRoot();
    const report = { mode: checkOnly ? 'check' : 'run', repository: root, startedAt: new Date().toISOString(), guards: {} };
    const fail = (guard, detail) => { report.guards[guard] = { ok: false, detail }; };

    const { queue, problems } = checkQueue(root);
    // A relaunch after FAIL continues the next round on top of that slice's uncommitted work,
    // so leftovers inside declared scopes or the runner's record folders are allowed; anything else refuses.
    const pilotOwned = (changed) => (queue.entries ?? []).some((entry) => (entry.inScopePaths ?? []).includes(changed))
        || RUNNER_OWNED_PREFIXES.some((prefix) => changed.startsWith(prefix));
    const dirty = changedPaths(root);
    const foreign = dirty.filter((changed) => !pilotOwned(changed));
    report.guards.cleanWorktree = { ok: foreign.length === 0, detail: { outsidePilot: foreign, pilotLeftovers: dirty.filter(pilotOwned) } };
    report.guards.queue = { ok: problems.length === 0, detail: problems };
    try { report.guards.containment = await containmentProbe(root); }
    catch (error) { fail('containment', error?.message || String(error)); }

    const preflightOk = Object.values(report.guards).every((guard) => guard.ok);
    if (checkOnly || !preflightOk) {
        report.state = preflightOk ? 'CHECK_PASSED' : 'PREFLIGHT_FAILED';
        console.log(JSON.stringify(report, null, 2));
        return preflightOk ? 0 : 1;
    }

    const before = snapshotOutside(root);
    const result = await runQueue({
        queuePath: path.join(root, QUEUE_RELATIVE_PATH),
        repoRoot: root,
        ledgerPath: path.join(root, LEDGER_RELATIVE_PATH),
        adapters: [
            createClaudeAdapter({ executable: process.env.SLICE_RUNNER_CLAUDE_CLI || 'claude' }),
            createCodexAdapter({ executable: process.env.SLICE_RUNNER_CODEX_CLI || 'codex' }),
        ],
        allowedRepositoryRoot: root,
    });
    report.runner = result;

    const after = snapshotOutside(root);
    const configSame = (before.codexConfig === null && after.codexConfig === null)
        || (before.codexConfig !== null && after.codexConfig !== null && before.codexConfig.equals(after.codexConfig));
    if (!configSame && before.codexConfig !== null) fs.writeFileSync(before.codexConfigPath, before.codexConfig);
    report.guards.codexConfig = { ok: true, detail: configSame ? 'unchanged' : 'changed by the CLI; restored byte-for-byte' };
    const changedFolders = Object.keys(before.folders).filter((folder) => before.folders[folder] !== after.folders[folder]);
    report.guards.outsideFolders = { ok: changedFolders.length === 0, detail: changedFolders };
    const scopes = new Set(queue.entries.flatMap((entry) => entry.inScopePaths));
    const outOfScope = changedPaths(root).filter((changed) => !scopes.has(changed)
        && !RUNNER_OWNED_PREFIXES.some((prefix) => changed.startsWith(prefix)));
    report.guards.scope = { ok: outOfScope.length === 0, detail: outOfScope };

    report.finishedAt = new Date().toISOString();
    const allOk = result.state === 'COMPLETE' && Object.values(report.guards).every((guard) => guard.ok);
    report.state = allOk ? 'PILOT_RUN_COMPLETE' : 'PILOT_RUN_STOPPED';
    const reportPath = path.join(root, 'docs', 'slices', `pilot-run-report-${report.startedAt.replaceAll(':', '-')}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    return allOk ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then((code) => { process.exitCode = code; }, (error) => { console.error(error); process.exitCode = 1; });
}
