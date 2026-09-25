import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { runAgentWithTimeout } from './agent-adapter.js';
import { appendVerdict, verifyVerdict } from './ledger.js';
import { compareFingerprints, computeFingerprint } from './manifest.js';

const execFileAsync = promisify(execFile);
export const DEFAULT_AGENT_TIMEOUT_MS = 15 * 60 * 1000;
const FRONT_MATTER_FIELDS = [
    'slice_id',
    'round',
    'verdict',
    'subtype',
    'reviewer',
    'reviewed_fingerprint',
    'policy_hash',
];
function runnerError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function withinRoot(root, absolutePath) {
    const relative = path.relative(root, absolutePath);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveRepositoryPath(repoRoot, relativePath, label, { allowDot = false } = {}) {
    if (typeof relativePath !== 'string' || relativePath.length === 0 || relativePath.includes('\\')
        || relativePath.startsWith('/') || /[\u0000-\u001f\u007f]/u.test(relativePath)) {
        throw runnerError('RUNNER_PATH_INVALID', `${label} must be a repository-relative POSIX path.`);
    }
    const segments = relativePath.split('/');
    if (segments.some((segment) => segment === '..' || segment === '' || (segment === '.' && !allowDot))) {
        throw runnerError('RUNNER_PATH_INVALID', `${label} contains an unsafe path segment.`);
    }
    const resolvedRoot = path.resolve(repoRoot);
    const absolutePath = relativePath === '.' && allowDot
        ? resolvedRoot
        : path.resolve(resolvedRoot, ...segments);
    if (!withinRoot(resolvedRoot, absolutePath)) {
        throw runnerError('RUNNER_PATH_INVALID', `${label} resolves outside the fixture repository.`);
    }
    return absolutePath;
}

function resolveAbsoluteWithinRoot(repoRoot, targetPath, label) {
    if (typeof targetPath !== 'string' || targetPath.length === 0) {
        throw runnerError('RUNNER_PATH_INVALID', `${label} is required.`);
    }
    const resolvedRoot = path.resolve(repoRoot);
    const absolutePath = path.resolve(targetPath);
    if (!withinRoot(resolvedRoot, absolutePath)) {
        throw runnerError('RUNNER_PATH_INVALID', `${label} must remain inside the fixture repository.`);
    }
    return absolutePath;
}

function readQueue(queuePath, repoRoot) {
    const absoluteQueuePath = resolveAbsoluteWithinRoot(repoRoot, queuePath, 'queuePath');
    let queue;
    try {
        queue = JSON.parse(fs.readFileSync(absoluteQueuePath, 'utf8'));
    } catch (error) {
        throw runnerError('QUEUE_INVALID', `The approved queue could not be read: ${error?.message || error}`);
    }
    if (!queue || typeof queue !== 'object' || !Array.isArray(queue.entries)) {
        throw runnerError('QUEUE_INVALID', 'The queue must contain an entries array.');
    }
    return queue.entries;
}

function isApproved(entry, currentTimeMs) {
    if (!entry?.approvalRecord) return false;
    if (typeof entry?.approvalRecord?.approvedBy !== 'string' || entry.approvalRecord.approvedBy.trim() === '') return false;
    if (!isValidUtcTimestamp(entry.approvalRecord.recordedAt)) return false;
    return Date.parse(entry.approvalRecord.recordedAt) <= currentTimeMs;
}

function isValidUtcTimestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value)) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
}

function isSafeSliceId(sliceId) {
    return typeof sliceId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(sliceId)
        && sliceId !== '.' && sliceId !== '..';
}

function governanceIsCurrent(repoRoot, governingContracts) {
    if (!Array.isArray(governingContracts)) return false;
    for (const contract of governingContracts) {
        if (!contract || typeof contract.path !== 'string' || !/^[a-f0-9]{64}$/u.test(contract.sha256 || '')) return false;
        try {
            const contractPath = resolveRepositoryPath(repoRoot, contract.path, 'governing contract');
            const stat = fs.statSync(contractPath);
            if (!stat.isFile() || sha256(fs.readFileSync(contractPath)) !== contract.sha256) return false;
        } catch {
            return false;
        }
    }
    return true;
}

function validateEntry(entry, defaultAgentTimeoutMs) {
    if (!entry || typeof entry !== 'object' || !isSafeSliceId(entry.sliceId)
        || entry.status !== 'QUEUED'
        || !Array.isArray(entry.inScopePaths) || entry.inScopePaths.length === 0
        || !Array.isArray(entry.governingContracts) || entry.governingContracts.length === 0
        || typeof entry.implementerAdapter !== 'string'
        || typeof entry.reviewerAdapter !== 'string'
        || !entry.proof || !Array.isArray(entry.proof.argv) || entry.proof.argv.length === 0
        || entry.proof.argv.some((argument) => typeof argument !== 'string')
        || typeof entry.proof.cwd !== 'string') {
        throw runnerError('QUEUE_ENTRY_INVALID', 'A queued slice is missing required runner fields.');
    }
    const timeoutMs = entry.agentTimeoutMs ?? defaultAgentTimeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < defaultAgentTimeoutMs) {
        throw runnerError('QUEUE_ENTRY_INVALID', 'A per-slice agent timeout must be a safe integer no lower than the runner default.');
    }
    const proofTimeoutMs = entry.proof.timeoutMs ?? timeoutMs;
    if (!Number.isSafeInteger(proofTimeoutMs) || proofTimeoutMs < 1) {
        throw runnerError('QUEUE_ENTRY_INVALID', 'A proof timeout must be a positive safe integer.');
    }
    return { timeoutMs, proofTimeoutMs };
}

function getAdapter(adapters, adapterId) {
    const adapter = adapters.find((candidate) => candidate?.id === adapterId);
    if (!adapter) throw runnerError('AGENT_UNAVAILABLE', `No configured adapter exists for ${adapterId}.`);
    return adapter;
}

async function invokeAdapter(adapter, input, timeoutMs, phase) {
    try {
        const value = await runAgentWithTimeout(adapter, input, timeoutMs);
        if (value?.state === 'UNAVAILABLE') {
            return { unavailable: true, reason: value.reason || 'AGENT_UNAVAILABLE', phase };
        }
        return { value };
    } catch (error) {
        return {
            unavailable: true,
            reason: error?.code === 'AGENT_TIMEOUT' ? 'AGENT_TIMEOUT' : 'AGENT_UNAVAILABLE',
            message: error?.message || String(error),
            phase,
        };
    }
}

async function runProof(repoRoot, sliceId, proof, timeoutMs) {
    const cwd = resolveRepositoryPath(repoRoot, proof.cwd, 'proof.cwd', { allowDot: true });
    const output = await execFileAsync(proof.argv[0], proof.argv.slice(1), {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        timeout: timeoutMs,
    }).then(({ stdout, stderr }) => ({ exitCode: 0, stdout, stderr }))
        .catch((error) => {
            if (error?.code === 'ETIMEDOUT' || (error?.killed && error?.signal)) {
                throw runnerError('PROOF_TIMEOUT', `Proof command exceeded its ${timeoutMs} ms limit.`);
            }
            return {
                exitCode: Number.isInteger(error?.code) ? error.code : 127,
                stdout: error?.stdout || '',
                stderr: error?.stderr || '',
            };
        });

    const archiveBytes = Buffer.from(`${JSON.stringify(output)}\n`, 'utf8');
    const outputHash = sha256(archiveBytes);
    const archiveRelativePath = `docs/slices/${sliceId}/proof/${outputHash}.json`;
    const archivePath = resolveRepositoryPath(repoRoot, archiveRelativePath, 'proof archive');
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    try {
        fs.writeFileSync(archivePath, archiveBytes, { flag: 'wx' });
    } catch (error) {
        if (error?.code !== 'EEXIST' || !fs.readFileSync(archivePath).equals(archiveBytes)) throw error;
    }

    return Object.freeze({
        command: [...proof.argv],
        exitCode: output.exitCode,
        stdout: output.stdout,
        stderr: output.stderr,
        outputHash,
        archivePath: archiveRelativePath,
    });
}

function parseVerdictDocument(document) {
    if (typeof document !== 'string' || document.includes('\r') || !document.startsWith('---\n')) {
        throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer output must begin with a fenced front-matter block.');
    }
    const end = document.indexOf('\n---\n', 4);
    if (end < 0) throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer front matter is not closed.');
    const frontMatter = document.slice(4, end);
    const fields = {};
    for (const line of frontMatter.split('\n')) {
        const match = /^([a-z_]+): (.*)$/u.exec(line);
        if (!match || Object.hasOwn(fields, match[1])) {
            throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer front matter has a malformed or duplicate field.');
        }
        fields[match[1]] = match[2];
    }
    const keys = Object.keys(fields).sort();
    if (keys.length !== FRONT_MATTER_FIELDS.length
        || keys.some((key, index) => key !== [...FRONT_MATTER_FIELDS].sort()[index])) {
        throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer front matter is missing or has unsupported fields.');
    }
    if (!/^\d+$/u.test(fields.round)) throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer round must be an integer.');
    const round = Number(fields.round);
    if (!Number.isSafeInteger(round) || round < 1) throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer round must be a positive safe integer.');
    const subtype = fields.subtype === 'null' ? null : fields.subtype;
    if (!['PASS', 'FAIL', 'ESCALATE', 'SELF_REVIEW_DEFERRED'].includes(fields.verdict)
        || (subtype !== null && subtype !== 'NEEDS_HUMAN_ACTION')
        || (subtype === 'NEEDS_HUMAN_ACTION' && fields.verdict !== 'ESCALATE')) {
        throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer verdict or subtype is invalid.');
    }
    if (fields.policy_hash !== 'NONE' && !/^[a-f0-9]{64}$/u.test(fields.policy_hash)) {
        throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer policy_hash is invalid.');
    }
    if (!/^[a-f0-9]{64}$/u.test(fields.reviewed_fingerprint)) {
        throw runnerError('VERDICT_DOCUMENT_INVALID', 'Reviewer reviewed_fingerprint is invalid.');
    }
    return Object.freeze({
        sliceId: fields.slice_id,
        round,
        verdict: fields.verdict,
        subtype,
        reviewer: fields.reviewer,
        reviewedFingerprint: fields.reviewed_fingerprint,
        policyHash: fields.policy_hash,
        body: document.slice(end + 5),
    });
}

function readRecordedVerdict(repoRoot, verification, sliceId) {
    if (verification.state !== 'VALID') return { state: verification.state, row: verification.row };
    let document;
    let verdict;
    try {
        const filePath = resolveRepositoryPath(repoRoot, verification.row.verdictPath, 'recorded verdict');
        document = fs.readFileSync(filePath, 'utf8');
        verdict = parseVerdictDocument(document);
    } catch (error) {
        return { state: 'RECORDED_VERDICT_INVALID', message: error.message, row: verification.row };
    }
    if (verdict.sliceId !== sliceId || verdict.round !== verification.row.round
        || verdict.verdict !== verification.row.verdict || verdict.subtype !== verification.row.subtype
        || verdict.reviewer !== verification.row.reviewer) {
        return { state: 'RECORDED_VERDICT_INVALID', row: verification.row };
    }
    return { state: 'VALID', row: verification.row, verdict };
}

function verdictFilePath(sliceId, round) {
    return `docs/verdicts/${sliceId}-r${round}.md`;
}

function makeLedgerRow(verdict, recordedAt) {
    return {
        sliceId: verdict.sliceId,
        round: verdict.round,
        verdictPath: verdictFilePath(verdict.sliceId, verdict.round),
        verdict: verdict.verdict,
        subtype: verdict.subtype,
        reviewer: verdict.reviewer,
        recordedAt,
    };
}

function recordVerdict(repoRoot, ledgerPath, verdictDocument, parsedVerdict) {
    const recordedAt = new Date().toISOString();
    const relativeVerdictPath = verdictFilePath(parsedVerdict.sliceId, parsedVerdict.round);
    const absoluteVerdictPath = resolveRepositoryPath(repoRoot, relativeVerdictPath, 'verdict file');
    fs.mkdirSync(path.dirname(absoluteVerdictPath), { recursive: true });
    fs.writeFileSync(absoluteVerdictPath, verdictDocument, { flag: 'wx' });
    try {
        appendVerdict(ledgerPath, repoRoot, makeLedgerRow(parsedVerdict, recordedAt));
    } catch (error) {
        fs.unlinkSync(absoluteVerdictPath);
        throw error;
    }
    const verification = verifyVerdict(ledgerPath, repoRoot, parsedVerdict.sliceId, parsedVerdict.round);
    return { recordedAt, verification };
}

/**
 * Run an approved JSON fixture queue. Callers supply isolated repository roots
 * and agent adapters; this slice has no real-CLI integration.
 */
export async function runQueue({
    queuePath,
    repoRoot,
    ledgerPath,
    adapters = [],
    defaultAgentTimeoutMs = DEFAULT_AGENT_TIMEOUT_MS,
    now = () => new Date(),
    humanDecision = () => new Promise(() => {}),
}) {
    if (!Number.isSafeInteger(defaultAgentTimeoutMs) || defaultAgentTimeoutMs < 1) {
        throw runnerError('RUNNER_CONFIGURATION_INVALID', 'defaultAgentTimeoutMs must be a positive safe integer.');
    }
    const resolvedRoot = path.resolve(repoRoot);
    const entries = readQueue(queuePath, resolvedRoot);
    const result = { state: 'COMPLETE', dispatchedSliceIds: [], skippedSliceIds: [], sliceResults: [] };

    for (const entry of entries) {
        if (entry?.status !== 'QUEUED') continue;
        if (typeof now !== 'function') {
            return { ...result, state: 'REFUSED', reason: 'RUNNER_CONFIGURATION_INVALID', blockedSliceId: entry?.sliceId || null };
        }
        let currentTimeMs;
        try {
            const currentTime = now();
            currentTimeMs = currentTime instanceof Date ? currentTime.getTime() : Number.NaN;
        } catch {
            currentTimeMs = Number.NaN;
        }
        if (!Number.isFinite(currentTimeMs)) {
            return { ...result, state: 'REFUSED', reason: 'RUNNER_CONFIGURATION_INVALID', blockedSliceId: entry?.sliceId || null };
        }
        if (!isApproved(entry, currentTimeMs)) {
            return { ...result, state: 'UNAPPROVED', blockedSliceId: entry?.sliceId || null };
        }
        let timeouts;
        try {
            timeouts = validateEntry(entry, defaultAgentTimeoutMs);
        } catch (error) {
            return { ...result, state: 'REFUSED', reason: error?.code || 'QUEUE_ENTRY_INVALID', blockedSliceId: entry?.sliceId || null };
        }
        const latest = readRecordedVerdict(resolvedRoot, verifyVerdict(ledgerPath, resolvedRoot, entry.sliceId), entry.sliceId);
        if (latest.state === 'LEDGER_CORRUPT' || latest.state === 'TAMPERED' || latest.state === 'RECORDED_VERDICT_INVALID') {
            return { ...result, state: 'HALTED', reason: latest.state, message: latest.message, blockedSliceId: entry.sliceId };
        }
        if (latest.state === 'VALID' && latest.verdict.verdict === 'ESCALATE') {
            const approvalTime = Date.parse(entry.approvalRecord.recordedAt);
            const escalationTime = Date.parse(latest.row.recordedAt);
            if (!Number.isFinite(approvalTime) || !Number.isFinite(escalationTime) || approvalTime <= escalationTime) {
                const decisionBrief = {
                    sliceId: entry.sliceId,
                    round: latest.row.round,
                    subtype: latest.verdict.subtype,
                    details: latest.verdict.body.trim(),
                    requiredAction: 'Review the decision brief and approve this slice again to resume work.',
                };
                return { ...result, state: 'AWAITING_DECISION', blockedSliceId: entry.sliceId,
                    round: latest.row.round, decisionBrief };
            }
        }
        if (!governanceIsCurrent(resolvedRoot, entry.governingContracts)) {
            return { ...result, state: 'STALE_REVIEW', blockedSliceId: entry.sliceId };
        }
        if (latest.state === 'VALID' && latest.verdict.verdict === 'PASS') {
            const currentFingerprint = computeFingerprint(resolvedRoot, entry.inScopePaths).fingerprint;
            const priorFingerprint = {
                manifestHash: latest.verdict.reviewedFingerprint,
                policyHash: latest.verdict.policyHash,
            };
            const comparison = compareFingerprints(priorFingerprint, currentFingerprint);
            if (comparison === 'MATCH') {
                result.skippedSliceIds.push(entry.sliceId);
                continue;
            }
            return { ...result, state: comparison === 'STALE_REVIEW' ? 'STALE_REVIEW' : 'REVIEW_REQUIRED',
                reason: comparison, blockedSliceId: entry.sliceId, reviewedFingerprint: priorFingerprint,
                currentFingerprint };
        }

        let implementer;
        let reviewer;
        try {
            implementer = getAdapter(adapters, entry.implementerAdapter);
            reviewer = getAdapter(adapters, entry.reviewerAdapter);
        } catch (error) {
            return { ...result, state: 'HALTED', reason: 'AGENT_UNAVAILABLE', message: error.message, blockedSliceId: entry.sliceId };
        }
        if (implementer === reviewer || implementer.id === reviewer.id) {
            return { ...result, state: 'REFUSED', reason: 'SELF_REVIEW_NOT_ALLOWED', blockedSliceId: entry.sliceId };
        }

        const roundInfo = { round: latest.state === 'VALID' ? latest.row.round + 1 : 1 };

        const baseline = computeFingerprint(resolvedRoot, entry.inScopePaths).fingerprint;
        result.dispatchedSliceIds.push(entry.sliceId);
        const implementation = await invokeAdapter(implementer, {
            role: 'implementer',
            entry,
            repoRoot: resolvedRoot,
            baselineFingerprint: baseline,
        }, timeouts.timeoutMs, 'implementer');
        if (implementation.unavailable) {
            return {
                ...result,
                state: 'HALTED',
                reason: implementation.reason,
                phase: implementation.phase,
                message: implementation.message,
                blockedSliceId: entry.sliceId,
            };
        }

        let proofReceipt;
        try {
            proofReceipt = await runProof(resolvedRoot, entry.sliceId, entry.proof, timeouts.proofTimeoutMs);
        } catch (error) {
            return { ...result, state: 'HALTED', reason: error?.code === 'PROOF_TIMEOUT' ? 'PROOF_TIMEOUT' : 'PROOF_CAPTURE_FAILED', message: error.message, blockedSliceId: entry.sliceId };
        }
        const reviewedFingerprint = computeFingerprint(resolvedRoot, entry.inScopePaths).fingerprint;

        const review = await invokeAdapter(reviewer, {
            role: 'reviewer',
            entry,
            proofReceipt,
            reviewedFingerprint: reviewedFingerprint.manifestHash,
            policyHash: reviewedFingerprint.policyHash,
            round: roundInfo.round,
        }, timeouts.timeoutMs, 'reviewer');
        if (review.unavailable) {
            return {
                ...result,
                state: 'HALTED',
                reason: review.reason,
                phase: review.phase,
                message: review.message,
                blockedSliceId: entry.sliceId,
            };
        }

        const verdictDocument = review.value?.verdictDocument;
        let verdict;
        try {
            verdict = parseVerdictDocument(verdictDocument);
        } catch (error) {
            return { ...result, state: 'HALTED', reason: 'VERDICT_INVALID', message: error.message, blockedSliceId: entry.sliceId };
        }
        if (verdict.sliceId !== entry.sliceId || verdict.round !== roundInfo.round
            || verdict.reviewer !== reviewer.id
            || verdict.reviewedFingerprint !== reviewedFingerprint.manifestHash
            || verdict.policyHash !== reviewedFingerprint.policyHash) {
            return { ...result, state: 'HALTED', reason: 'VERDICT_BINDING_MISMATCH', blockedSliceId: entry.sliceId };
        }

        const dispatchFingerprint = computeFingerprint(resolvedRoot, entry.inScopePaths).fingerprint;
        if (compareFingerprints(reviewedFingerprint, dispatchFingerprint) !== 'MATCH') {
            return {
                ...result,
                state: 'REVIEW_REQUIRED',
                reason: 'DISPATCH_FINGERPRINT_CHANGED',
                blockedSliceId: entry.sliceId,
                reviewedFingerprint,
                dispatchFingerprint,
            };
        }

        if (verdict.verdict === 'SELF_REVIEW_DEFERRED') {
            return { ...result, state: 'REFUSED', reason: 'SELF_REVIEW_DEFERRED_WITHDRAWN', blockedSliceId: entry.sliceId };
        }
        if (proofReceipt.exitCode !== 0 && verdict.verdict === 'PASS') {
            return { ...result, state: 'FAIL', reason: 'PROOF_COMMAND_FAILED', blockedSliceId: entry.sliceId, proofReceipt };
        }

        let recorded;
        try {
            recorded = recordVerdict(resolvedRoot, ledgerPath, verdictDocument, verdict);
        } catch (error) {
            return { ...result, state: 'HALTED', reason: error?.code || 'LEDGER_WRITE_FAILED', message: error.message, blockedSliceId: entry.sliceId };
        }
        if (recorded.verification.state !== 'VALID') {
            return { ...result, state: 'HALTED', reason: recorded.verification.state, blockedSliceId: entry.sliceId };
        }

        const sliceResult = {
            sliceId: entry.sliceId,
            verdict: verdict.verdict,
            proofReceipt,
            recordedRound: verdict.round,
        };
        result.sliceResults.push(sliceResult);

        if (verdict.verdict === 'FAIL') {
            return { ...result, state: 'FAIL', nextAction: 'IMPLEMENTER', blockedSliceId: entry.sliceId };
        }
        if (verdict.verdict === 'ESCALATE') {
            const decisionBrief = {
                sliceId: entry.sliceId,
                round: verdict.round,
                subtype: verdict.subtype,
                details: verdict.body.trim(),
                requiredAction: 'Review the decision brief and choose how work should proceed.',
            };
            const decision = await humanDecision({ entry, verdict, decisionBrief });
            return { ...result, state: 'ESCALATED', decisionBrief, humanDecision: decision, blockedSliceId: entry.sliceId };
        }
    }

    return result;
}
