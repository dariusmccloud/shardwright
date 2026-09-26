// Step 4 pilot launcher (Work Board entry 17; docs/proposals/STEP4_PILOT_DECLARATION_DRAFT.md).
//
//   node tools/pilot/run-step4-pilot.mjs --check   validate the queue and containment; dispatch nothing
//   node tools/pilot/run-step4-pilot.mjs           the same checks, then run the approved queue
//
// Wraps the reviewed runner (tools/slice-runner) with the pilot's own guards:
//   before: a clean tree on first launch; on relaunch, uncommitted work only inside the scopes of
//           slices the ledger already records, plus the runner's records; queue shape, approvals and governing hashes; a model-free Codex sandbox
//           probe on this repository (writable inside, protected canaries denied); snapshots of the
//           Codex config, sibling project folders, and host plugin folders.
//   after:  every changed path lies inside a declared scope or the runner's own record folders;
//           the recursive snapshots are unchanged; any Codex config change fails the run and is undone.
//           These run in a finally block, so they also happen if the runner throws.
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
const REQUIRED_GOVERNING_CONTRACTS = Object.freeze(['AGENTS.md', 'docs/proposals/STEP4_PILOT_DECLARATION_DRAFT.md']);
const HOST_FOLDERS = Object.freeze([
    'D:\\SillyTavern', 'D:\\SillyBunny', 'D:\\AI\\Projects\\SillyTavern', 'D:\\AI\\Projects\\SillyBunny',
]);

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function git(root, args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).replace(/\n$/u, '');
}

// Every path git reports as changed, including both sides of a rename or copy, so moving a
// file out of a protected location cannot hide that location's deletion.
export function changedPaths(root) {
    const out = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
    const paths = [];
    const records = out.split('\0').filter(Boolean);
    for (let i = 0; i < records.length; i += 1) {
        const status = records[i].slice(0, 2);
        paths.push(records[i].slice(3));
        if ((status.includes('R') || status.includes('C')) && i + 1 < records.length) {
            i += 1;
            paths.push(records[i]); // the rename or copy source
        }
    }
    return paths;
}

// Recursive fingerprint of names, types, sizes and modification times. It never reads file
// contents and never follows links (host plugin links point back into this repository), and it
// skips .git and node_modules, where agent writes are not expected and walks would be slow.
const SNAPSHOT_SKIP = new Set(['.git', 'node_modules']);

function folderSnapshot(folder, excluded = null) {
    if (!fs.existsSync(folder)) return null;
    const hash = crypto.createHash('sha256');
    const walk = (dir, relative) => {
        let names;
        try { names = fs.readdirSync(dir).sort(); } catch { hash.update(`${relative}\tunreadable\n`); return; }
        for (const name of names) {
            const full = path.join(dir, name);
            if (SNAPSHOT_SKIP.has(name) || (excluded && full.toLowerCase() === excluded.toLowerCase())) continue;
            const rel = relative ? `${relative}/${name}` : name;
            let stat;
            try { stat = fs.lstatSync(full); } catch { hash.update(`${rel}\tunreadable\n`); continue; }
            if (stat.isSymbolicLink()) {
                let target = '';
                try { target = fs.readlinkSync(full); } catch { /* unreadable link target */ }
                hash.update(`${rel}\tlink\t${target}\n`);
            } else if (stat.isDirectory()) {
                hash.update(`${rel}\tdir\n`);
                walk(full, rel);
            } else {
                hash.update(`${rel}\t${stat.size}\t${stat.mtimeMs}\n`);
            }
        }
    };
    walk(folder, '');
    return hash.digest('hex');
}

export function snapshotOutside(root) {
    const codexConfig = path.join(os.homedir(), '.codex', 'config.toml');
    const projects = path.dirname(root);
    const folders = {};
    // The Projects folder, recursively, excluding this repository itself.
    folders[projects] = folderSnapshot(projects, root);
    for (const host of HOST_FOLDERS) {
        for (const sub of ['plugins', path.join('public', 'scripts', 'extensions', 'third-party')]) {
            folders[path.join(host, sub)] = folderSnapshot(path.join(host, sub));
        }
    }
    return { codexConfigPath: codexConfig, codexConfig: fs.existsSync(codexConfig) ? fs.readFileSync(codexConfig) : null, folders };
}

// Slice IDs with at least one row in the pilot ledger (read-only; the runner itself verifies the ledger).
function recordedSliceIds(root) {
    const ledger = path.join(root, LEDGER_RELATIVE_PATH);
    const ids = new Set();
    if (!fs.existsSync(ledger)) return ids;
    for (const line of fs.readFileSync(ledger, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const row = JSON.parse(line); if (typeof row.sliceId === 'string') ids.add(row.sliceId); } catch { /* the runner reports corruption */ }
    }
    return ids;
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
        for (const required of REQUIRED_GOVERNING_CONTRACTS) {
            if (!(entry.governingContracts ?? []).some((contract) => contract.path === required)) {
                problems.push(`${at} governingContracts must include ${required}`);
            }
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
    // First launch: the tree must be clean. Relaunch: uncommitted work is accepted only where the
    // ledger shows it belongs to a slice that already has a recorded verdict (a FAIL round to continue,
    // or an earlier PASS the runner will revalidate and skip), plus the runner's own records.
    // Anything else, including work from a run that stopped before any verdict, refuses.
    const recordedSlices = recordedSliceIds(root);
    const pilotOwned = (changed) => (queue.entries ?? []).some((entry) => recordedSlices.has(entry.sliceId)
            && (entry.inScopePaths ?? []).includes(changed))
        || (recordedSlices.size > 0 && RUNNER_OWNED_PREFIXES.some((prefix) => changed.startsWith(prefix)));
    const dirty = changedPaths(root);
    const foreign = dirty.filter((changed) => !pilotOwned(changed));
    report.guards.cleanWorktree = {
        ok: foreign.length === 0,
        detail: { launch: recordedSlices.size > 0 ? 'relaunch' : 'first', recordedSlices: [...recordedSlices],
            refused: foreign, acceptedLeftovers: dirty.filter(pilotOwned) },
    };
    report.guards.queue = { ok: problems.length === 0, detail: problems };
    try { report.guards.containment = await containmentProbe(root); }
    catch (error) { fail('containment', error?.message || String(error)); }
    // Dry dispatch: the real runner, the real queue, and no adapters. It must pass every startup
    // check and stop at the first slice's dispatch gate, having invoked and written nothing.
    try {
        const dry = await runQueue({
            queuePath: path.join(root, QUEUE_RELATIVE_PATH),
            repoRoot: root,
            ledgerPath: path.join(root, LEDGER_RELATIVE_PATH),
            adapters: [],
            allowedRepositoryRoot: root,
        });
        // On a relaunch, earlier slices may already have passed, so the gate may be at a later slice.
        report.guards.runnerDryDispatch = {
            ok: dry.state === 'HALTED' && dry.reason === 'AGENT_UNAVAILABLE' && dry.dispatchedSliceIds.length === 0
                && (queue.entries ?? []).some((entry) => entry.sliceId === dry.blockedSliceId),
            detail: dry,
        };
    } catch (error) { fail('runnerDryDispatch', error?.message || String(error)); }

    const preflightOk = Object.values(report.guards).every((guard) => guard.ok);
    if (checkOnly || !preflightOk) {
        report.state = preflightOk ? 'CHECK_PASSED' : 'PREFLIGHT_FAILED';
        console.log(JSON.stringify(report, null, 2));
        return preflightOk ? 0 : 1;
    }

    const snapshotStarted = Date.now();
    const before = snapshotOutside(root);
    report.snapshotMs = Date.now() - snapshotStarted;
    let result = null;
    let runnerError = null;
    try {
        result = await runQueue({
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
    } catch (error) {
        runnerError = error;
        report.runner = { state: 'RUNNER_THREW', message: error?.stack || String(error) };
    } finally {
        // Whatever the runner did, restore the Codex config, check the outside world, and write the report.
        const after = snapshotOutside(root);
        const configSame = (before.codexConfig === null && after.codexConfig === null)
            || (before.codexConfig !== null && after.codexConfig !== null && before.codexConfig.equals(after.codexConfig));
        let configDetail = 'unchanged';
        if (!configSame) {
            if (before.codexConfig !== null) {
                fs.writeFileSync(before.codexConfigPath, before.codexConfig);
                configDetail = 'changed during the run; restored byte-for-byte';
            } else {
                fs.rmSync(before.codexConfigPath, { force: true });
                configDetail = 'created during the run; removed';
            }
        }
        report.guards.codexConfig = { ok: configSame, detail: configDetail };
        const changedFolders = Object.keys(before.folders).filter((folder) => before.folders[folder] !== after.folders[folder]);
        report.guards.outsideFolders = { ok: changedFolders.length === 0, detail: changedFolders };
        const scopes = new Set(queue.entries.flatMap((entry) => entry.inScopePaths));
        const outOfScope = changedPaths(root).filter((changed) => !scopes.has(changed)
            && !RUNNER_OWNED_PREFIXES.some((prefix) => changed.startsWith(prefix)));
        report.guards.scope = { ok: outOfScope.length === 0, detail: outOfScope };

        report.finishedAt = new Date().toISOString();
        const allOk = result?.state === 'COMPLETE' && Object.values(report.guards).every((guard) => guard.ok);
        report.state = allOk ? 'PILOT_RUN_COMPLETE' : 'PILOT_RUN_STOPPED';
        const reportPath = path.join(root, 'docs', 'slices', `pilot-run-report-${report.startedAt.replaceAll(':', '-')}.json`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify(report, null, 2));
    }
    if (runnerError) throw runnerError;
    return report.state === 'PILOT_RUN_COMPLETE' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then((code) => { process.exitCode = code; }, (error) => { console.error(error); process.exitCode = 1; });
}
