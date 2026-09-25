import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { verifyVerdict } from './ledger.js';
import { validateManifestPath } from './manifest.js';

export const REVIEW_BACKLOG_PATH = 'docs/review-pending.jsonl';
const HASH = /^[a-f0-9]{64}$/u;
const GIT_OBJECT = /^[a-f0-9]{40,64}$/u;
const SAFE_SLICE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const PENDING_FIELDS = ['event', 'sliceId', 'commit', 'manifestHash', 'policyHash', 'proofOutputHash', 'recordedAt', 'dependsOn'];
const RESOLVED_FIELDS = ['event', 'sliceId', 'commit', 'outcome', 'ledgerRound', 'recordedAt'];

function backlogError(message) {
    const error = new Error(message);
    error.code = 'BACKLOG_CORRUPT';
    return error;
}

function validTimestamp(value) {
    if (typeof value !== 'string' || !UTC_TIMESTAMP.test(value)) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
}

function exactFields(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    const expected = [...fields].sort();
    return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validatePending(event) {
    if (!exactFields(event, PENDING_FIELDS) || event.event !== 'PENDING'
        || typeof event.sliceId !== 'string' || !SAFE_SLICE_ID.test(event.sliceId)
        || typeof event.commit !== 'string' || !GIT_OBJECT.test(event.commit)
        || typeof event.manifestHash !== 'string' || !HASH.test(event.manifestHash)
        || (event.policyHash !== 'NONE' && (typeof event.policyHash !== 'string' || !HASH.test(event.policyHash)))
        || typeof event.proofOutputHash !== 'string' || !HASH.test(event.proofOutputHash)
        || !validTimestamp(event.recordedAt)
        || !Array.isArray(event.dependsOn)
        || event.dependsOn.some((id) => typeof id !== 'string' || !SAFE_SLICE_ID.test(id))
        || new Set(event.dependsOn).size !== event.dependsOn.length) {
        throw backlogError('A PENDING event is malformed.');
    }
}

function validateResolved(event) {
    if (!exactFields(event, RESOLVED_FIELDS) || event.event !== 'RESOLVED'
        || typeof event.sliceId !== 'string' || !SAFE_SLICE_ID.test(event.sliceId)
        || typeof event.commit !== 'string' || !GIT_OBJECT.test(event.commit)
        || !['PASS', 'FAIL', 'ANCESTOR_FAILED'].includes(event.outcome)
        || (event.outcome === 'ANCESTOR_FAILED'
            ? event.ledgerRound !== null
            : !Number.isSafeInteger(event.ledgerRound) || event.ledgerRound < 1)
        || !validTimestamp(event.recordedAt)) {
        throw backlogError('A RESOLVED event is malformed.');
    }
}

function backlogFile(repoRoot) {
    return path.join(path.resolve(repoRoot), ...REVIEW_BACKLOG_PATH.split('/'));
}

/** Rebuild the active pending set solely from append-only PENDING/RESOLVED events. */
export function replayReviewBacklog(repoRoot, ledgerPath) {
    const filePath = backlogFile(repoRoot);
    let bytes;
    try {
        const stat = fs.lstatSync(filePath);
        if (stat.isSymbolicLink() || !stat.isFile()) throw backlogError('The backlog path is not a regular file.');
        bytes = fs.readFileSync(filePath);
    } catch (error) {
        if (error?.code === 'ENOENT') return { events: [], active: [], resolved: [] };
        if (error?.code === 'BACKLOG_CORRUPT') throw error;
        throw backlogError(`The backlog file could not be read: ${error?.message || error}`);
    }
    if (bytes.length === 0) return { events: [], active: [], resolved: [] };
    if (bytes.includes(0x0d) || bytes.at(-1) !== 0x0a) throw backlogError('The backlog must be LF-terminated JSON Lines.');

    let lines;
    try {
        lines = new TextDecoder('utf-8', { fatal: true }).decode(bytes).slice(0, -1).split('\n');
    } catch {
        throw backlogError('The backlog is not valid UTF-8.');
    }

    const events = [];
    const activeBySlice = new Map();
    const resolved = [];
    for (const line of lines) {
        let event;
        try {
            event = JSON.parse(line);
        } catch {
            throw backlogError('The backlog contains malformed JSON.');
        }
        if (event?.event === 'PENDING') {
            validatePending(event);
            if (activeBySlice.has(event.sliceId)) throw backlogError('A slice has more than one unresolved PENDING event.');
            const expectedDependencies = [...activeBySlice.keys()];
            if (JSON.stringify(event.dependsOn) !== JSON.stringify(expectedDependencies)) {
                throw backlogError('A PENDING event has inconsistent dependencies.');
            }
            activeBySlice.set(event.sliceId, event);
        } else if (event?.event === 'RESOLVED') {
            validateResolved(event);
            const pending = activeBySlice.get(event.sliceId);
            if (!pending || pending.commit !== event.commit) throw backlogError('A RESOLVED event has no matching active PENDING event.');
            if (event.outcome === 'PASS' || event.outcome === 'FAIL') {
                let verification;
                try {
                    verification = verifyVerdict(ledgerPath, repoRoot, event.sliceId, event.ledgerRound);
                } catch (error) {
                    throw backlogError(`The corresponding verdict cannot be verified: ${error?.message || error}`);
                }
                if (verification.state !== 'VALID' || verification.row.verdict !== event.outcome) {
                    throw backlogError('A RESOLVED outcome disagrees with its verified verdict ledger row.');
                }
            } else {
                const failedAncestor = [...resolved].reverse().find((prior) =>
                    prior.event.sliceId !== event.sliceId
                    && ['FAIL', 'ANCESTOR_FAILED'].includes(prior.event.outcome)
                    && pending.dependsOn.includes(prior.event.sliceId));
                if (!failedAncestor) throw backlogError('ANCESTOR_FAILED has no failed pending ancestor.');
            }
            activeBySlice.delete(event.sliceId);
            resolved.push({ event, pending });
        } else {
            throw backlogError('The backlog contains an unsupported event type.');
        }
        events.push(event);
    }
    return { events, active: [...activeBySlice.values()], resolved };
}

function appendLine(repoRoot, event) {
    const filePath = backlogFile(repoRoot);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const descriptor = fs.openSync(filePath, 'a', 0o600);
    try {
        fs.writeSync(descriptor, `${JSON.stringify(event)}\n`, null, 'utf8');
    } finally {
        fs.closeSync(descriptor);
    }
}

export function appendPendingEvent(repoRoot, ledgerPath, event) {
    validatePending(event);
    const state = replayReviewBacklog(repoRoot, ledgerPath);
    if (state.active.some((item) => item.sliceId === event.sliceId)) throw backlogError('A slice is already pending.');
    if (JSON.stringify(event.dependsOn) !== JSON.stringify(state.active.map((item) => item.sliceId))) {
        throw backlogError('PENDING dependencies do not match the active backlog.');
    }
    appendLine(repoRoot, event);
}

export function appendResolvedEvent(repoRoot, ledgerPath, event) {
    validateResolved(event);
    const state = replayReviewBacklog(repoRoot, ledgerPath);
    const pending = state.active.find((item) => item.sliceId === event.sliceId);
    if (!pending || pending.commit !== event.commit) throw backlogError('RESOLVED does not match an active PENDING event.');
    if (event.outcome === 'PASS' || event.outcome === 'FAIL') {
        const verification = verifyVerdict(ledgerPath, repoRoot, event.sliceId, event.ledgerRound);
        if (verification.state !== 'VALID' || verification.row.verdict !== event.outcome) {
            throw backlogError('RESOLVED does not match its verified verdict ledger row.');
        }
    }
    appendLine(repoRoot, event);
}

/** Find reachable REVIEW_PENDING commits that have no corresponding PENDING event. */
export function findOrphanedPendingCommits(repoRoot, events) {
    if (!Array.isArray(events)) throw backlogError('The replayed backlog event list is unavailable.');
    const recordedCommits = new Set(events
        .filter((event) => event.event === 'PENDING')
        .map((event) => event.commit));
    let log;
    try { log = git(repoRoot, ['log', '--format=%H%x09%s', 'HEAD']); }
    catch (error) {
        const failure = new Error(`Could not inspect pending commits reachable from HEAD: ${error?.message || error}`);
        failure.code = 'BACKLOG_INCONSISTENT';
        throw failure;
    }
    if (!log) return [];
    const orphans = [];
    for (const line of log.split('\n')) {
        const separator = line.indexOf('\t');
        if (separator < 0) continue;
        const commit = line.slice(0, separator);
        const subject = line.slice(separator + 1);
        if (subject.startsWith('REVIEW_PENDING ') && !recordedCommits.has(commit)) {
            orphans.push(Object.freeze({ commit, subject }));
        }
    }
    return orphans;
}

function assertTemporaryRepository(repoRoot) {
    const tempRoot = fs.realpathSync(os.tmpdir());
    const actualRoot = fs.realpathSync(path.resolve(repoRoot));
    const relative = path.relative(tempRoot, actualRoot);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error('Review-backlog Git operations are restricted to child repositories under the OS temp directory.');
    }
    return actualRoot;
}

function git(repoRoot, args) {
    const cwd = assertTemporaryRepository(repoRoot);
    return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Commit only the declared paths in an isolated OS-temp fixture repository. */
export function commitPendingSlice(repoRoot, sliceId, inScopePaths) {
    const root = assertTemporaryRepository(repoRoot);
    if (typeof sliceId !== 'string' || !SAFE_SLICE_ID.test(sliceId) || !Array.isArray(inScopePaths) || inScopePaths.length === 0) {
        throw new Error('A safe slice ID and non-empty in-scope path list are required.');
    }
    const paths = inScopePaths.map((value) => validateManifestPath(value, { mode: 'declared' }));
    if (paths.some((value) => value.length === 0)) throw new Error('The repository root itself cannot be committed as a slice path.');
    git(root, ['--literal-pathspecs', 'add', '--', ...paths]);
    git(root, ['--literal-pathspecs', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '--only', '-m', `REVIEW_PENDING ${sliceId}`, '--', ...paths]);
    const commit = git(root, ['rev-parse', 'HEAD']);
    if (!GIT_OBJECT.test(commit)) throw new Error('Git returned an invalid pending commit ID.');
    return commit;
}

/** Re-materialize committed scope from the index after the pending commit. */
export function restoreWorkingTreeFromCommit(repoRoot, commit, inScopePaths) {
    const root = assertTemporaryRepository(repoRoot);
    if (typeof commit !== 'string' || !GIT_OBJECT.test(commit) || !Array.isArray(inScopePaths) || inScopePaths.length === 0) {
        throw new Error('A pending commit and non-empty in-scope path list are required.');
    }
    if (git(root, ['rev-parse', 'HEAD']) !== commit) throw new Error('The pending commit must be HEAD before restoring its working tree.');
    const paths = inScopePaths.map((value) => validateManifestPath(value, { mode: 'declared' }));
    const tracked = git(root, ['--literal-pathspecs', 'ls-files', '--', ...paths]).split('\n').filter(Boolean);
    for (const relativePath of tracked) {
        const absolutePath = path.resolve(root, ...relativePath.split('/'));
        const relative = path.relative(root, absolutePath);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error('A tracked scope path escaped the fixture repository.');
        }
        let parent = root;
        for (const segment of relative.split(path.sep).slice(0, -1)) {
            parent = path.join(parent, segment);
            try {
                if (fs.lstatSync(parent).isSymbolicLink()) throw new Error('A linked parent path cannot be restored.');
            } catch (error) {
                if (error?.code !== 'ENOENT') throw error;
                break;
            }
        }
        fs.rmSync(absolutePath, { force: true });
    }
    if (tracked.length > 0) git(root, ['--literal-pathspecs', 'checkout-index', '--force', '--', ...tracked]);
    return tracked;
}

/** Execute a callback against a detached temporary worktree for an exact commit. */
export async function withCommitWorktree(repoRoot, commit, callback) {
    const root = assertTemporaryRepository(repoRoot);
    if (typeof commit !== 'string' || !GIT_OBJECT.test(commit)) throw new Error('A valid Git commit ID is required.');
    const created = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-backlog-worktree-'));
    fs.rmdirSync(created);
    try {
        git(root, ['worktree', 'add', '--detach', created, commit]);
        return await callback(created);
    } finally {
        try { git(root, ['worktree', 'remove', '--force', created]); } catch { /* cleanup best effort; fixture teardown is the final boundary */ }
        fs.rmSync(created, { recursive: true, force: true });
    }
}

export function readArchivedProof(repoRoot, sliceId, proofOutputHash, command) {
    if (!SAFE_SLICE_ID.test(sliceId) || !HASH.test(proofOutputHash)) throw backlogError('Pending proof reference is malformed.');
    const relativePath = `docs/slices/${sliceId}/proof/${proofOutputHash}.json`;
    const filePath = path.join(path.resolve(repoRoot), ...relativePath.split('/'));
    let bytes;
    try {
        const stat = fs.lstatSync(filePath);
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('not a regular file');
        bytes = fs.readFileSync(filePath);
    } catch (error) {
        throw backlogError(`Pending proof archive is unavailable: ${error?.message || error}`);
    }
    if (createHash('sha256').update(bytes).digest('hex') !== proofOutputHash) throw backlogError('Pending proof archive hash does not match.');
    let output;
    try { output = JSON.parse(bytes.toString('utf8')); } catch { throw backlogError('Pending proof archive JSON is malformed.'); }
    if (!output || !Number.isSafeInteger(output.exitCode) || typeof output.stdout !== 'string' || typeof output.stderr !== 'string') {
        throw backlogError('Pending proof archive has an invalid shape.');
    }
    return Object.freeze({ command: [...command], ...output, outputHash: proofOutputHash, archivePath: relativePath });
}
