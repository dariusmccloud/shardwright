import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { appendVerdict, verifyVerdict } from './ledger.js';
import { createFakeAgent } from './fake-agents.js';
import { computeFingerprint } from './manifest.js';
import { DEFAULT_AGENT_TIMEOUT_MS, runQueue } from './runner.js';
import { REVIEW_BACKLOG_PATH, replayReviewBacklog } from './review-backlog.js';
import { projectRoot } from './cli-adapter-common.js';

function hash(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

async function withEnvironment(callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-runner-'));
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`), 'runner fixture must be inside the OS temp directory');
    fs.mkdirSync(path.join(root, 'docs', 'verdicts'), { recursive: true });
    fs.writeFileSync(path.join(root, '.gitattributes'), '* text=auto eol=lf\n');
    fs.writeFileSync(path.join(root, 'contract.md'), 'fixture contract\n');
    fs.writeFileSync(path.join(root, 'source.txt'), 'fixture source\n');
    gitFixture(root, ['init']);
    gitFixture(root, ['config', 'user.name', 'Slice Fixture']);
    gitFixture(root, ['config', 'user.email', 'fixture@example.invalid']);
    gitFixture(root, ['add', '--', '.gitattributes', 'contract.md', 'source.txt']);
    gitFixture(root, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture baseline']);
    const env = {
        root,
        queuePath: path.join(root, 'docs', 'work-queue.json'),
        ledgerPath: path.join(root, 'docs', 'verdicts', 'ledger.jsonl'),
    };
    try {
        return await callback(env);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function entry(root, sliceId, overrides = {}) {
    return {
        sliceId,
        status: 'QUEUED',
        approvalRecord: { approvedBy: 'Chris', recordedAt: '2026-09-25T18:00:00Z' },
        riskClass: 'ordinary',
        touches: [],
        inScopePaths: ['source.txt'],
        governingContracts: [{ path: 'contract.md', sha256: hash(fs.readFileSync(path.join(root, 'contract.md'))) }],
        implementerAdapter: 'implementer',
        reviewerAdapter: 'reviewer',
        proof: {
            argv: [process.execPath, '-e', "process.stdout.write('fixture proof')"],
            cwd: '.',
        },
        ...overrides,
    };
}

function writeQueue(env, entries, options = {}) {
    fs.writeFileSync(env.queuePath, JSON.stringify({ schemaVersion: 1, ...options, entries }, null, 2));
}

function gitFixture(root, args) {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`), 'git fixture must remain under OS temp');
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
}

function unavailableReviewer() {
    return createFakeAgent('reviewer', Array.from({ length: 20 }, () => ({ result: { state: 'UNAVAILABLE', reason: 'fixture outage' } })));
}

function pendingEvents(env) {
    return replayReviewBacklog(env.root, env.ledgerPath);
}

function seedVerdict(env, slice, verdict = 'PASS', round = 1, recordedAt = new Date().toISOString(), subtype = null, body = 'Reviewed fixture evidence.') {
    const fingerprint = computeFingerprint(env.root, slice.inScopePaths).fingerprint;
    const input = {
        entry: slice,
        round,
        reviewedFingerprint: fingerprint.manifestHash,
        policyHash: fingerprint.policyHash,
    };
    const document = verdictDocument(input, verdict, subtype, body);
    const relativePath = `docs/verdicts/${slice.sliceId}-r${round}.md`;
    fs.writeFileSync(path.join(env.root, relativePath), document);
    appendVerdict(env.ledgerPath, env.root, {
        sliceId: slice.sliceId,
        round,
        verdictPath: relativePath,
        verdict,
        subtype,
        reviewer: slice.reviewerAdapter,
        recordedAt,
    });
}

function verifyLatest(env, sliceId) {
    return verifyVerdict(env.ledgerPath, env.root, sliceId).state;
}

function verdictDocument(input, verdict = 'PASS', subtype = null, body = 'Reviewed fixture evidence.') {
    return [
        '---',
        `slice_id: ${input.entry.sliceId}`,
        `round: ${input.round}`,
        `verdict: ${verdict}`,
        `subtype: ${subtype ?? 'null'}`,
        `reviewer: ${input.entry.reviewerAdapter}`,
        `reviewed_fingerprint: ${input.reviewedFingerprint}`,
        `policy_hash: ${input.policyHash}`,
        '---',
        body,
        '',
    ].join('\n');
}

function reviewerAgent(verdict = 'PASS', subtype = null, body) {
    return createFakeAgent('reviewer', [{
        run: (input) => ({ verdictDocument: verdictDocument(input, verdict, subtype, body) }),
    }]);
}

function baseAdapters({ implementerSteps = [{ result: { claim: 'implemented' } }], reviewer = reviewerAgent() } = {}) {
    return [createFakeAgent('implementer', implementerSteps), reviewer];
}

function run(env, adapters, options = {}) {
    return runQueue({
        queuePath: env.queuePath,
        repoRoot: env.root,
        ledgerPath: env.ledgerPath,
        adapters,
        defaultAgentTimeoutMs: options.defaultAgentTimeoutMs ?? 100,
        now: options.now ?? (() => new Date('2026-09-26T00:00:00.000Z')),
        humanDecision: options.humanDecision,
    });
}

function deferred() {
    let resolve;
    const promise = new Promise((complete) => { resolve = complete; });
    return { promise, resolve };
}

test('repository root remains refused unless the exact opt-in path is supplied', async () => {
    const repositoryRoot = projectRoot();
    const base = {
        queuePath: path.join(repositoryRoot, 'missing-pilot-queue.json'),
        repoRoot: repositoryRoot,
        ledgerPath: path.join(repositoryRoot, 'missing-pilot-ledger.jsonl'),
        adapters: [],
        defaultAgentTimeoutMs: 100,
        now: () => new Date('2026-09-26T00:00:00.000Z'),
    };
    const refused = await runQueue(base);
    assert.equal(refused.state, 'REFUSED');
    assert.equal(refused.reason, 'RUNNER_ROOT_OUTSIDE_TEMP');
    const optedIn = await runQueue({ ...base, allowedRepositoryRoot: repositoryRoot });
    assert.equal(optedIn.state, 'REFUSED');
    assert.equal(optedIn.reason, 'QUEUE_INVALID');
    for (const invalidOptIn of [
        path.dirname(path.dirname(repositoryRoot)),
        path.dirname(repositoryRoot),
        path.parse(repositoryRoot).root,
        path.join(repositoryRoot, 'child'),
    ]) {
        const invalid = await runQueue({ ...base, allowedRepositoryRoot: invalidOptIn });
        assert.equal(invalid.state, 'REFUSED');
        assert.equal(invalid.reason, 'RUNNER_ALLOWED_REPOSITORY_MISMATCH');
    }
});

test('only valid PASS advances the approved queue; FAIL and ESCALATE stop before the next slice', async () => {
    assert.equal(DEFAULT_AGENT_TIMEOUT_MS, 30 * 60 * 1000);

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'slice-fail'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: createFakeAgent('reviewer', [
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'FAIL') }) },
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
        ]) });
        const result = await run(env, adapters);
        assert.equal(result.state, 'FAIL');
        assert.deepEqual(result.dispatchedSliceIds, ['slice-fail']);
        assert.equal(adapters[0].calls.length, 1);
        assert.equal(result.nextAction, 'IMPLEMENTER');
    });

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'slice-escalate'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: reviewerAgent('ESCALATE', null, 'Need a human decision.') });
        const result = await run(env, adapters, { humanDecision: async () => 'STOP' });
        assert.equal(result.state, 'ESCALATED');
        assert.equal(result.decisionBrief.details, 'Need a human decision.');
        assert.deepEqual(result.dispatchedSliceIds, ['slice-escalate']);
        assert.equal(adapters[0].calls.length, 1);
    });

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'slice-pass'), entry(env.root, 'slice-next')]);
        const adapters = [
            createFakeAgent('implementer', [
                { result: { claim: 'first implementation' } },
                { result: { claim: 'second implementation' } },
            ]),
            createFakeAgent('reviewer', [
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
            ]),
        ];
        const result = await run(env, adapters);
        assert.equal(result.state, 'COMPLETE');
        assert.deepEqual(result.dispatchedSliceIds, ['slice-pass', 'slice-next']);
        assert.equal(result.sliceResults.length, 2);
    });
});

test('agent errors and timeouts halt without FAIL; slice timeout overrides default; human wait has no timeout', async () => {
    assert.equal(DEFAULT_AGENT_TIMEOUT_MS, 1_800_000);

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'impl-timeout'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ implementerSteps: [{ delayMs: 100, result: { claim: 'late' } }] });
        const result = await run(env, adapters, { defaultAgentTimeoutMs: 10 });
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'AGENT_TIMEOUT');
        assert.equal(result.phase, 'implementer');
        assert.equal(fs.existsSync(env.ledgerPath), false);
        assert.equal(adapters[1].calls.length, 0);
    });

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'review-error', {
            proof: { argv: [process.execPath, '-e', "process.stdout.write('fixture proof')"], cwd: '.', timeoutMs: 500 },
        }), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: createFakeAgent('reviewer', [{ error: new Error('fake reviewer unavailable') }]) });
        const result = await run(env, adapters, { defaultAgentTimeoutMs: 10 });
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'AGENT_UNAVAILABLE');
        assert.equal(result.phase, 'reviewer');
        assert.equal(fs.existsSync(env.ledgerPath), false);
    });

    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'timeout-override', {
            agentTimeoutMs: 60,
            proof: { argv: [process.execPath, '-e', "process.stdout.write('fixture proof')"], cwd: '.', timeoutMs: 1000 },
        })]);
        const adapters = baseAdapters({ implementerSteps: [{ delayMs: 20, result: { claim: 'done' } }] });
        const result = await run(env, adapters, { defaultAgentTimeoutMs: 10 });
        assert.equal(result.state, 'COMPLETE');
        assert.equal(result.sliceResults[0].verdict, 'PASS');
    });

    for (const subtype of [null, 'NEEDS_HUMAN_ACTION']) {
        await withEnvironment(async (env) => {
            writeQueue(env, [entry(env.root, `human-${subtype || 'escalate'}`, {
                proof: { argv: [process.execPath, '-e', "process.stdout.write('fixture proof')"], cwd: '.', timeoutMs: 500 },
            }), entry(env.root, 'slice-next')]);
            const adapters = baseAdapters({ reviewer: reviewerAgent('ESCALATE', subtype, 'Human decision required.') });
            const wait = deferred();
            const operation = run(env, adapters, { defaultAgentTimeoutMs: 5, humanDecision: () => wait.promise });
            let settled = false;
            operation.finally(() => { settled = true; });
            await new Promise((resolve) => setTimeout(resolve, 35));
            assert.equal(settled, false, 'human decision must not inherit an agent timeout');
            wait.resolve('STOP');
            const result = await operation;
            assert.equal(result.state, 'ESCALATED');
            assert.deepEqual(result.dispatchedSliceIds, [`human-${subtype || 'escalate'}`]);
        });
    }
});

test('ESCALATE without a decision handler returns immediately for restart-safe resumption', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'escalate-exit'), entry(env.root, 'must-not-run')]);
        const result = await run(env, baseAdapters({ reviewer: reviewerAgent('ESCALATE', 'NEEDS_HUMAN_ACTION', 'Operator decision required.') }));
        assert.equal(result.state, 'ESCALATED');
        assert.equal(result.reason, 'HUMAN_DECISION_REQUIRED');
        assert.equal(result.decisionBrief.sliceId, 'escalate-exit');
        assert.deepEqual(result.dispatchedSliceIds, ['escalate-exit']);
    });
});

test('a fingerprint change after PASS refuses dispatch and returns the slice to review', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'changed-after-review'), entry(env.root, 'slice-next')]);
        const reviewer = createFakeAgent('reviewer', [{
            run: (input) => {
                const document = verdictDocument(input, 'PASS');
                fs.writeFileSync(path.join(env.root, 'source.txt'), 'changed during review\n');
                return { verdictDocument: document };
            },
        }]);
        const adapters = baseAdapters({ reviewer });
        const result = await run(env, adapters);
        assert.equal(result.state, 'REVIEW_REQUIRED');
        assert.equal(result.reason, 'DISPATCH_FINGERPRINT_CHANGED');
        assert.deepEqual(result.dispatchedSliceIds, ['changed-after-review']);
        assert.equal(adapters[0].calls.length, 1);
        assert.equal(fs.existsSync(env.ledgerPath), false);
    });
});

test('changed governing-contract hash makes an already-passed queued entry STALE_REVIEW', async () => {
    await withEnvironment(async (env) => {
        const stale = entry(env.root, 'stale-contract');
        seedVerdict(env, stale);
        writeQueue(env, [stale]);
        fs.writeFileSync(path.join(env.root, 'contract.md'), 'changed governing contract\n');
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'STALE_REVIEW');
        assert.equal(adapters[0].calls.length, 0);
    });
});

test('a tampered recorded verdict is rejected before implementation dispatch', async () => {
    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'tampered-slice');
        const verdictPath = path.join(env.root, 'docs', 'verdicts', 'tampered-slice-r1.md');
        fs.writeFileSync(verdictPath, 'original verdict\n');
        appendVerdict(env.ledgerPath, env.root, {
            sliceId: 'tampered-slice', round: 1, verdictPath: 'docs/verdicts/tampered-slice-r1.md',
            verdict: 'PASS', subtype: null, reviewer: 'reviewer', recordedAt: '2026-09-25T18:00:00Z',
        });
        fs.writeFileSync(verdictPath, 'edited verdict\n');
        writeQueue(env, [slice]);
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'TAMPERED');
        assert.equal(adapters[0].calls.length, 0);
    });
});

test('proof receipt is runner-captured and a failed proof cannot become PASS', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'proof-capture', {
            proof: {
                argv: [process.execPath, '-e', "process.stdout.write('actual-proof-output'); process.exitCode = 7"],
                cwd: '.',
            },
        })]);
        const implementer = createFakeAgent('implementer', [{
            result: { claimedProof: { exitCode: 0, outputHash: 'fake-claim' } },
        }]);
        const reviewer = createFakeAgent('reviewer', [{
            run: (input) => {
                assert.equal(input.repoRoot, env.root);
                assert.equal(input.proofReceipt.exitCode, 7);
                assert.equal(input.proofReceipt.stdout, 'actual-proof-output');
                assert.notEqual(input.proofReceipt.outputHash, 'fake-claim');
                return { verdictDocument: verdictDocument(input, 'FAIL', null, 'Runner-captured proof failed.') };
            },
        }]);
        const result = await run(env, [implementer, reviewer]);
        assert.equal(result.state, 'FAIL');
        const receipt = result.sliceResults[0].proofReceipt;
        const archive = fs.readFileSync(path.join(env.root, receipt.archivePath));
        assert.equal(hash(archive), receipt.outputHash);
        assert.deepEqual(JSON.parse(archive.toString('utf8')), {
            exitCode: 7,
            signal: null,
            stdout: 'actual-proof-output',
            stderr: '',
        });
    });
});

test('the same adapter cannot serve as implementer and reviewer', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'no-self-review', {
            implementerAdapter: 'dual',
            reviewerAdapter: 'dual',
        })]);
        const dual = createFakeAgent('dual', [{ result: {} }]);
        const result = await run(env, [dual]);
        assert.equal(result.state, 'REFUSED');
        assert.equal(result.reason, 'SELF_REVIEW_NOT_ALLOWED');
        assert.equal(dual.calls.length, 0);
    });
});

test('SELF_REVIEW_DEFERRED is refused and creates neither a verdict nor review debt', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'deferred-review'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: reviewerAgent('SELF_REVIEW_DEFERRED') });
        const result = await run(env, adapters);
        assert.equal(result.state, 'REFUSED');
        assert.equal(result.reason, 'SELF_REVIEW_DEFERRED_WITHDRAWN');
        assert.equal(verifyLatest(env, 'deferred-review'), 'UNRECORDED');
        const debtPath = path.join(env.root, 'docs', 'review-debt.jsonl');
        assert.equal(fs.existsSync(debtPath), false);
        assert.equal(fs.existsSync(path.join(env.root, 'docs', 'verdicts', 'deferred-review-r1.md')), false);
        assert.deepEqual(result.dispatchedSliceIds, ['deferred-review']);
    });
});

test('an entry without an approval record is never dispatched', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'unapproved', { approvalRecord: null })]);
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'UNAPPROVED');
        assert.equal(adapters[0].calls.length, 0);
    });
});

test('restart skips a current PASS, requires review after content changes, and marks policy changes stale', async () => {
    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'restart-current');
        seedVerdict(env, slice);
        writeQueue(env, [slice]);
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'COMPLETE');
        assert.deepEqual(result.skippedSliceIds, ['restart-current']);
        assert.deepEqual(result.dispatchedSliceIds, []);
        assert.equal(adapters[0].calls.length, 0);
        assert.equal(adapters[1].calls.length, 0);
    });

    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'restart-content-change');
        seedVerdict(env, slice);
        writeQueue(env, [slice]);
        fs.writeFileSync(path.join(env.root, 'source.txt'), 'new worktree content\n');
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'REVIEW_REQUIRED');
        assert.equal(result.reason, 'CONTENT_CHANGED');
        assert.equal(adapters[0].calls.length, 0);
    });

    await withEnvironment(async (env) => {
        fs.writeFileSync(path.join(env.root, '.gitattributes'), '* text=auto eol=lf\n');
        const slice = entry(env.root, 'restart-policy-change');
        seedVerdict(env, slice);
        writeQueue(env, [slice]);
        fs.writeFileSync(path.join(env.root, '.gitattributes'), '* text eol=lf\n');
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'STALE_REVIEW');
        assert.equal(result.reason, 'STALE_REVIEW');
        assert.equal(adapters[0].calls.length, 0);
    });

    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'restart-after-fail');
        seedVerdict(env, slice, 'FAIL');
        writeQueue(env, [slice]);
        const result = await run(env, baseAdapters());
        assert.equal(result.state, 'COMPLETE');
        assert.equal(result.sliceResults[0].recordedRound, 2);
    });
});

test('invalid verdicts are rejected before writing and ledger append failure removes the orphan for retry', async () => {
    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'crlf-verdict');
        writeQueue(env, [slice]);
        const reviewer = createFakeAgent('reviewer', [{
            run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS', null, 'body\r\nwith CRLF') }),
        }]);
        const result = await run(env, baseAdapters({ reviewer }));
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'VERDICT_INVALID');
        assert.equal(fs.existsSync(path.join(env.root, 'docs', 'verdicts', 'crlf-verdict-r1.md')), false);
        assert.equal(fs.existsSync(env.ledgerPath), false);
    });

    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'append-failure-cleanup');
        writeQueue(env, [slice]);
        const reviewer = createFakeAgent('reviewer', [{
            run: (input) => {
                fs.mkdirSync(env.ledgerPath);
                return { verdictDocument: verdictDocument(input) };
            },
        }]);
        const failedAppend = await run(env, baseAdapters({ reviewer }));
        assert.equal(failedAppend.state, 'HALTED');
        assert.equal(failedAppend.reason, 'LEDGER_PATH_INVALID');
        const verdictPath = path.join(env.root, 'docs', 'verdicts', 'append-failure-cleanup-r1.md');
        assert.equal(fs.existsSync(verdictPath), false);

        fs.rmdirSync(env.ledgerPath);
        const retry = await run(env, baseAdapters());
        assert.equal(retry.state, 'COMPLETE');
        assert.equal(verifyLatest(env, 'append-failure-cleanup'), 'VALID');
    });
});

test('a neutral reviewer verdict placeholder fails closed before recording', async () => {
    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'neutral-verdict-placeholder');
        writeQueue(env, [slice]);
        const reviewer = createFakeAgent('reviewer', [{
            run: (input) => ({ verdictDocument: verdictDocument(input, '<REPLACE_WITH_PASS_FAIL_OR_ESCALATE>') }),
        }]);
        const result = await run(env, baseAdapters({ reviewer }));
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'VERDICT_INVALID');
        assert.equal(fs.existsSync(env.ledgerPath), false);
        assert.equal(fs.existsSync(path.join(env.root, 'docs', 'verdicts', 'neutral-verdict-placeholder-r1.md')), false);
    });
});

test('missing or empty governing contracts refuse dispatch as QUEUE_ENTRY_INVALID', async () => {
    for (const governingContracts of [undefined, []]) {
        await withEnvironment(async (env) => {
            const overrides = governingContracts === undefined ? {} : { governingContracts };
            if (governingContracts === undefined) overrides.governingContracts = undefined;
            writeQueue(env, [entry(env.root, 'missing-governance', overrides)]);
            const adapters = baseAdapters();
            const result = await run(env, adapters);
            assert.equal(result.state, 'REFUSED');
            assert.equal(result.reason, 'QUEUE_ENTRY_INVALID');
            assert.equal(adapters[0].calls.length, 0);
        });
    }
});

test('proof timeout halts without recording a verdict or invoking the reviewer', async () => {
    await withEnvironment(async (env) => {
        const survivorMarker = path.join(env.root, 'proof-grandchild-survived.txt');
        const childCode = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(survivorMarker)}, 'survived'), 1800)`;
        const proofCode = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}], { stdio: 'ignore' }); setInterval(() => {}, 1000);`;
        writeQueue(env, [entry(env.root, 'proof-timeout', {
            proof: {
                argv: [process.execPath, '-e', proofCode],
                cwd: '.',
                timeoutMs: 25,
            },
        })]);
        const adapters = baseAdapters();
        const result = await run(env, adapters);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'PROOF_TIMEOUT');
        assert.equal(fs.existsSync(env.ledgerPath), false);
        assert.equal(adapters[1].calls.length, 0);
        await new Promise((resolve) => setTimeout(resolve, 2100));
        assert.equal(fs.existsSync(survivorMarker), false, 'timed-out proof grandchild must not survive');
    });
});

test('an unavailable reviewer halts the queue without writing a verdict or review debt', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'reviewer-unavailable'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: createFakeAgent('reviewer', [{ error: new Error('reviewer offline') }]) });
        const result = await run(env, adapters);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'AGENT_UNAVAILABLE', JSON.stringify(result));
        assert.equal(result.phase, 'reviewer');
        assert.equal(fs.existsSync(env.ledgerPath), false);
        assert.equal(fs.existsSync(path.join(env.root, 'docs', 'review-debt.jsonl')), false);
        assert.equal(adapters[0].calls.length, 1);
    });
});

test('a recorded ESCALATE blocks restart until a later approval, then resumes the next round', async () => {
    for (const { label, subtype, approvalAt, resumes } of [
        { label: 'no re-approval', subtype: null, approvalAt: '2026-09-25T18:00:00Z', resumes: false },
        { label: 'approval predates escalation', subtype: 'NEEDS_HUMAN_ACTION', approvalAt: '2026-09-25T19:59:59Z', resumes: false },
        { label: 'approval follows escalation', subtype: 'NEEDS_HUMAN_ACTION', approvalAt: '2026-09-25T20:00:01Z', resumes: true },
    ]) {
        await withEnvironment(async (env) => {
            const slice = entry(env.root, `restart-escalate-${label.replaceAll(' ', '-')}`, {
                approvalRecord: { approvedBy: 'Chris', recordedAt: approvalAt },
            });
            const details = 'Chris must choose how this slice proceeds.';
            seedVerdict(env, slice, 'ESCALATE', 1, '2026-09-25T20:00:00Z', subtype, details);
            const laterSlice = entry(env.root, 'must-not-run-after-escalate');
            writeQueue(env, resumes ? [slice] : [slice, laterSlice]);
            const adapters = baseAdapters();
            const result = await run(env, adapters);

            if (!resumes) {
                assert.equal(result.state, 'AWAITING_DECISION', label);
                assert.equal(result.blockedSliceId, slice.sliceId);
                assert.equal(result.round, 1);
                assert.equal(result.decisionBrief.round, 1);
                assert.equal(result.decisionBrief.subtype, subtype);
                assert.equal(result.decisionBrief.details, details);
                assert.deepEqual(result.dispatchedSliceIds, []);
                assert.equal(adapters[0].calls.length, 0);
                assert.equal(adapters[1].calls.length, 0);
                return;
            }

            assert.equal(result.state, 'COMPLETE', `${label}: ${JSON.stringify(result)}`);
            assert.deepEqual(result.dispatchedSliceIds, [slice.sliceId]);
            assert.equal(result.sliceResults[0].recordedRound, 2);
            assert.equal(adapters[0].calls.length, 1);
            assert.equal(verifyVerdict(env.ledgerPath, env.root, slice.sliceId).row.verdict, 'PASS');
        });
    }
});

test('future approvals are UNAPPROVED; current and past approvals are accepted against the injected clock', async () => {
    const now = new Date('2026-09-25T20:00:00Z');
    for (const { label, recordedAt, accepted } of [
        { label: 'one second future', recordedAt: '2026-09-25T20:00:01Z', accepted: false },
        { label: 'exactly now', recordedAt: '2026-09-25T20:00:00Z', accepted: true },
        { label: 'earlier', recordedAt: '2026-09-25T19:59:59Z', accepted: true },
    ]) {
        await withEnvironment(async (env) => {
            writeQueue(env, [entry(env.root, `approval-clock-${label.replaceAll(' ', '-')}`, {
                approvalRecord: { approvedBy: 'Chris', recordedAt },
            })]);
            const adapters = baseAdapters();
            const result = await run(env, adapters, { now: () => now });
            if (accepted) {
                assert.equal(result.state, 'COMPLETE', label);
                assert.equal(adapters[0].calls.length, 1);
            } else {
                assert.equal(result.state, 'UNAPPROVED', label);
                assert.deepEqual(result.dispatchedSliceIds, []);
                assert.equal(adapters[0].calls.length, 0);
            }
        });
    }

    await withEnvironment(async (env) => {
        const slice = entry(env.root, 'future-dated-reapproval', {
            approvalRecord: { approvedBy: 'Chris', recordedAt: '2026-09-25T18:00:00Z' },
        });
        seedVerdict(env, slice, 'ESCALATE', 1, '2026-09-25T17:02:00Z');
        slice.approvalRecord = { approvedBy: 'Chris', recordedAt: '2026-09-25T18:00:00Z' };
        writeQueue(env, [slice, entry(env.root, 'must-not-run-after-future-approval')]);
        const adapters = baseAdapters();
        const result = await run(env, adapters, { now: () => new Date('2026-09-25T17:30:00Z') });
        assert.equal(result.state, 'UNAPPROVED');
        assert.deepEqual(result.dispatchedSliceIds, []);
        assert.equal(adapters[0].calls.length, 0);
        assert.equal(adapters[1].calls.length, 0);
    });
});

test('18: backlog disabled keeps the existing reviewer-unavailable halt', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'offline-disabled')]);
        const head = gitFixture(env.root, ['rev-parse', 'HEAD']);
        const result = await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'fixture outage');
        assert.equal(gitFixture(env.root, ['rev-parse', 'HEAD']), head);
        assert.equal(fs.existsSync(path.join(env.root, REVIEW_BACKLOG_PATH)), false);
    });
});

test('19: reviewer outage records scoped pending commits and continues queue work', async () => {
    await withEnvironment(async (env) => {
        const slices = [entry(env.root, 'offline-one'), entry(env.root, 'offline-two')];
        writeQueue(env, slices, { reviewBacklog: { maxPending: 5 } });
        const implementer = createFakeAgent('implementer', [
            { run: () => { fs.writeFileSync(path.join(env.root, 'source.txt'), 'one\n'); fs.writeFileSync(path.join(env.root, 'outside.txt'), 'excluded\n'); return {}; } },
            { run: () => { fs.writeFileSync(path.join(env.root, 'source.txt'), 'two\n'); return {}; } },
        ]);
        const result = await run(env, [implementer, unavailableReviewer()]);
        assert.equal(result.state, 'REVIEW_PENDING');
        assert.deepEqual(result.dispatchedSliceIds, ['offline-one', 'offline-two']);
        assert.deepEqual(gitFixture(env.root, ['show', '--pretty=format:', '--name-only', 'HEAD']).split(/\r?\n/u).filter(Boolean), ['source.txt']);
        assert.equal(fs.existsSync(path.join(env.root, 'outside.txt')), true);
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), ['offline-one', 'offline-two']);
        assert.deepEqual(pendingEvents(env).active[1].dependsOn, ['offline-one']);
        assert.notEqual(verifyLatest(env, 'offline-one'), 'VALID');
        assert.equal(result.sliceResults.some(({ verdict }) => verdict === 'PASS'), false);
    });
});

test('20: keystone, excluded-touch, and failed-proof slices never enter backlog', async () => {
    const cases = [
        { id: 'keystone', overrides: { riskClass: 'keystone' }, passingProof: true },
        { id: 'excluded', overrides: { touches: ['identity'] }, passingProof: true },
        { id: 'proof-failed', overrides: { proof: { argv: [process.execPath, '-e', 'process.exit(3)'], cwd: '.' } }, passingProof: false },
    ];
    for (const { id, overrides, passingProof } of cases) await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, id, overrides)], { reviewBacklog: { maxPending: 5 } });
        const result = await run(env, baseAdapters({ reviewer: passingProof ? unavailableReviewer() : reviewerAgent('PASS') }));
        assert.notEqual(result.state, 'COMPLETE');
        assert.deepEqual(pendingEvents(env).active, []);
    });
});

test('21: configured cap is enforced and no slice beyond it is dispatched', async () => {
    for (const maxPending of [5, 2]) await withEnvironment(async (env) => {
        const slices = Array.from({ length: 6 }, (_, index) => entry(env.root, `cap-${maxPending}-${index + 1}`));
        writeQueue(env, slices, { reviewBacklog: { maxPending } });
        const implementer = createFakeAgent('implementer', Array.from({ length: 6 }, () => ({ result: {} })));
        const result = await run(env, [implementer, unavailableReviewer()]);
        assert.equal(result.reason, 'BACKLOG_FULL');
        assert.equal(pendingEvents(env).active.length, maxPending);
        assert.equal(implementer.calls.length, maxPending);
    });
});

test('22: backlog validation is oldest-first at each recorded commit before implementation resumes', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'oldest'), entry(env.root, 'newer')], { reviewBacklog: { maxPending: 5 } });
        await run(env, [createFakeAgent('implementer', [{ result: {} }, { result: {} }]), unavailableReviewer()]);
        const commits = pendingEvents(env).active.map(({ commit }) => commit);
        const implementer = createFakeAgent('implementer', [{ result: { claim: 'must not run' } }]);
        const reviewer = createFakeAgent('reviewer', commits.map((commit) => ({ run: (input) => {
            assert.equal(gitFixture(input.repoRoot, ['rev-parse', 'HEAD']), commit);
            return { verdictDocument: verdictDocument(input, 'PASS') };
        } })));
        const result = await run(env, [implementer, reviewer]);
        assert.equal(result.state, 'COMPLETE', JSON.stringify(result));
        assert.equal(implementer.calls.length, 0);
        assert.deepEqual(reviewer.calls.map(({ commit }) => commit), commits);
        assert.deepEqual(pendingEvents(env).active, []);
    });
});

test('23: a pending fingerprint that differs from its commit halts before review', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'tampered-pending')], { reviewBacklog: { maxPending: 5 } });
        await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        const backlogPath = path.join(env.root, REVIEW_BACKLOG_PATH);
        const [pending] = fs.readFileSync(backlogPath, 'utf8').trim().split('\n').map(JSON.parse);
        pending.manifestHash = '0'.repeat(64);
        fs.writeFileSync(backlogPath, `${JSON.stringify(pending)}\n`);
        const reviewer = reviewerAgent('PASS');
        const result = await run(env, [createFakeAgent('implementer', []), reviewer]);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'PENDING_RECORD_MISMATCH');
        assert.equal(reviewer.calls.length, 0);
    });
});

test('24: failed pending ancestor resolves its dependent and stops the run', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'pending-a'), entry(env.root, 'pending-b')], { reviewBacklog: { maxPending: 5 } });
        const initial = await run(env, [createFakeAgent('implementer', [{ result: {} }, { result: {} }]), unavailableReviewer()]);
        assert.equal(initial.state, 'REVIEW_PENDING', JSON.stringify(initial));
        assert.equal(pendingEvents(env).active.length, 2);
        const reviewer = createFakeAgent('reviewer', [{ run: (input) => ({ verdictDocument: verdictDocument(input, 'FAIL') }) }]);
        const result = await run(env, [createFakeAgent('implementer', []), reviewer]);
        assert.equal(result.state, 'FAIL', JSON.stringify(result));
        assert.deepEqual(pendingEvents(env).resolved.map(({ event }) => [event.sliceId, event.outcome]), [
            ['pending-a', 'FAIL'], ['pending-b', 'ANCESTOR_FAILED'],
        ]);
        assert.deepEqual(pendingEvents(env).active, []);
        assert.notEqual(verifyLatest(env, 'pending-b'), 'VALID');
    });
});

test('25: restart validates a pending slice without calling its implementer', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'restart-pending')], { reviewBacklog: { maxPending: 5 } });
        await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        const implementer = createFakeAgent('implementer', [{ result: { claim: 'must not run' } }]);
        const result = await run(env, [implementer, unavailableReviewer()]);
        assert.equal(result.state, 'REVIEW_PENDING', JSON.stringify(result));
        assert.equal(implementer.calls.length, 0);
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), ['restart-pending']);
    });
});

test('26: a pending slice is absent from PASS verdicts and completed slice results', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'pending-not-pass')], { reviewBacklog: { maxPending: 5 } });
        const result = await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        assert.equal(result.sliceResults.length, 0);
        assert.equal(result.state, 'REVIEW_PENDING');
        assert.notEqual(verifyLatest(env, 'pending-not-pass'), 'VALID');
        assert.equal(pendingEvents(env).active[0].sliceId, 'pending-not-pass');
    });
});

test('27: replay resolves PASS/FAIL/ANCESTOR_FAILED and retries descendants only after ancestor PASS', async () => {
    await withEnvironment(async (env) => {
        for (const name of ['a.txt', 'b.txt', 'c.txt']) fs.writeFileSync(path.join(env.root, name), `base ${name}\n`);
        gitFixture(env.root, ['add', '--', 'a.txt', 'b.txt', 'c.txt']);
        gitFixture(env.root, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture scoped files']);
        const slices = ['a', 'b', 'c'].map((name) => entry(env.root, `lineage-${name}`, { inScopePaths: [`${name}.txt`] }));
        writeQueue(env, slices, { reviewBacklog: { maxPending: 5 } });
        const implementer = createFakeAgent('implementer', slices.map((slice) => ({ run: () => {
            fs.writeFileSync(path.join(env.root, slice.inScopePaths[0]), `implemented ${slice.sliceId}\n`);
            return {};
        } })));
        await run(env, [implementer, unavailableReviewer()]);
        const firstReview = createFakeAgent('reviewer', [
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'FAIL') }) },
        ]);
        const firstResult = await run(env, [createFakeAgent('implementer', []), firstReview]);
        assert.equal(firstResult.state, 'FAIL', JSON.stringify(firstResult));
        assert.deepEqual(pendingEvents(env).resolved.map(({ event }) => [event.sliceId, event.outcome]), [
            ['lineage-a', 'PASS'], ['lineage-b', 'FAIL'], ['lineage-c', 'ANCESTOR_FAILED'],
        ]);
        const nextImplementer = createFakeAgent('implementer', [
            { run: () => { fs.writeFileSync(path.join(env.root, 'b.txt'), 'b round two\n'); return {}; } },
            { run: () => { fs.writeFileSync(path.join(env.root, 'c.txt'), 'c after b pass\n'); return {}; } },
        ]);
        const nextReviewer = createFakeAgent('reviewer', [
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
        ]);
        const resumed = await run(env, [nextImplementer, nextReviewer]);
        assert.equal(resumed.state, 'COMPLETE');
        assert.deepEqual(resumed.dispatchedSliceIds, ['lineage-b', 'lineage-c']);
        assert.deepEqual(nextReviewer.calls.map(({ entry: slice, round }) => [slice.sliceId, round]), [['lineage-b', 2], ['lineage-c', 1]]);
        assert.equal(resumed.skippedSliceIds.includes('lineage-a'), true);
    });
});

test('28: pending ESCALATE leaves the entire backlog unresolved', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'escalated-a'), entry(env.root, 'escalated-b')], { reviewBacklog: { maxPending: 5 } });
        const initial = await run(env, [createFakeAgent('implementer', [{ result: {} }, { result: {} }]), unavailableReviewer()]);
        assert.equal(initial.state, 'REVIEW_PENDING', JSON.stringify(initial));
        assert.equal(pendingEvents(env).active.length, 2);
        const result = await run(env, [createFakeAgent('implementer', []), reviewerAgent('ESCALATE', 'NEEDS_HUMAN_ACTION', 'Human decision required.')]);
        assert.equal(result.state, 'AWAITING_DECISION', JSON.stringify(result));
        assert.equal(result.round, 1);
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), ['escalated-a', 'escalated-b']);
        assert.deepEqual(pendingEvents(env).resolved, []);
        const restartAdapters = [createFakeAgent('implementer', []), reviewerAgent('PASS')];
        const restart = await run(env, restartAdapters);
        assert.equal(restart.state, 'AWAITING_DECISION');
        assert.deepEqual(restart.dispatchedSliceIds, []);
        assert.equal(restartAdapters[1].calls.length, 0);
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), ['escalated-a', 'escalated-b']);
    });
});

test('29: malformed and contradictory backlog events halt with BACKLOG_CORRUPT', async () => {
    for (const kind of ['malformed', 'orphan', 'duplicate-resolved', 'ledger-disagreement', 'duplicate-pending']) await withEnvironment(async (env) => {
        const slice = entry(env.root, `corrupt-${kind}`);
        writeQueue(env, [slice], { reviewBacklog: { maxPending: 5 } });
        await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        const file = path.join(env.root, REVIEW_BACKLOG_PATH);
        const [pending] = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
        const resolved = { event: 'RESOLVED', sliceId: pending.sliceId, commit: pending.commit,
            outcome: 'PASS', ledgerRound: 1, recordedAt: '2026-09-25T18:30:00Z' };
        if (kind === 'malformed') fs.writeFileSync(file, '{bad json}\n');
        if (kind === 'orphan') fs.writeFileSync(file, `${JSON.stringify(resolved)}\n`);
        if (kind === 'duplicate-pending') fs.writeFileSync(file, `${JSON.stringify(pending)}\n${JSON.stringify(pending)}\n`);
        if (kind === 'duplicate-resolved' || kind === 'ledger-disagreement') {
            seedVerdict(env, slice, 'PASS', 1, '2026-09-25T18:29:00Z');
            if (kind === 'duplicate-resolved') fs.writeFileSync(file, `${JSON.stringify(pending)}\n${JSON.stringify(resolved)}\n${JSON.stringify(resolved)}\n`);
            else fs.writeFileSync(file, `${JSON.stringify(pending)}\n${JSON.stringify({ ...resolved, outcome: 'FAIL' })}\n`);
        }
        const result = await run(env, baseAdapters());
        assert.equal(result.state, 'HALTED', kind);
        assert.equal(result.reason, 'BACKLOG_CORRUPT', kind);
    });
});

test('30: outage state carries across restarts, then a returning reviewer validates first', async () => {
    await withEnvironment(async (env) => {
        const a = entry(env.root, 'outage-a');
        const b = entry(env.root, 'outage-b');
        writeQueue(env, [a, b], { reviewBacklog: { maxPending: 5 } });
        const firstRun = await run(env, [
            createFakeAgent('implementer', [{ result: {} }, { result: {} }]),
            unavailableReviewer(),
        ]);
        assert.equal(firstRun.state, 'REVIEW_PENDING');
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), ['outage-a', 'outage-b']);

        const c = entry(env.root, 'outage-c');
        const d = entry(env.root, 'outage-d');
        const e = entry(env.root, 'outage-e');
        writeQueue(env, [a, b, c, d, e], { reviewBacklog: { maxPending: 5 } });
        const outageImplementer = createFakeAgent('implementer', [{ result: {} }, { result: {} }, { result: {} }]);
        const outageReviewer = unavailableReviewer();
        const secondRun = await run(env, [outageImplementer, outageReviewer]);
        assert.equal(secondRun.state, 'HALTED');
        assert.equal(secondRun.reason, 'BACKLOG_FULL');
        assert.equal(outageReviewer.calls.length, 1, 'reviewer outage is detected only once in this run');
        assert.equal(outageImplementer.calls.length, 3);
        assert.deepEqual(pendingEvents(env).active.map(({ sliceId }) => sliceId), [
            'outage-a', 'outage-b', 'outage-c', 'outage-d', 'outage-e',
        ]);

        const returningImplementer = createFakeAgent('implementer', [{ result: { claim: 'must not be called' } }]);
        const returningReviewer = createFakeAgent('reviewer', Array.from({ length: 5 }, () => ({
            run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }),
        })));
        const returned = await run(env, [returningImplementer, returningReviewer]);
        assert.equal(returned.state, 'COMPLETE');
        assert.equal(returningImplementer.calls.length, 0);
        assert.deepEqual(returningReviewer.calls.map(({ entry: slice }) => slice.sliceId), [
            'outage-a', 'outage-b', 'outage-c', 'outage-d', 'outage-e',
        ]);
        assert.deepEqual(pendingEvents(env).active, []);
    });
});

test('31: orphan pending commits halt before work; recorded re-parks are not false orphans', async () => {
    await withEnvironment(async (env) => {
        const orphan = entry(env.root, 'lost-pending-record');
        writeQueue(env, [orphan], { reviewBacklog: { maxPending: 5 } });
        const parked = await run(env, baseAdapters({ reviewer: unavailableReviewer() }));
        assert.equal(parked.state, 'REVIEW_PENDING');
        const orphanCommit = pendingEvents(env).active[0].commit;
        fs.rmSync(path.join(env.root, REVIEW_BACKLOG_PATH));
        const headBeforeRestart = gitFixture(env.root, ['rev-parse', 'HEAD']);
        const implementer = createFakeAgent('implementer', [{ result: { claim: 'must not be called' } }]);
        const result = await run(env, [implementer, reviewerAgent('PASS')]);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'BACKLOG_INCONSISTENT');
        assert.deepEqual(result.orphanedCommits.map(({ commit }) => commit), [orphanCommit]);
        assert.equal(implementer.calls.length, 0);
        assert.equal(gitFixture(env.root, ['rev-parse', 'HEAD']), headBeforeRestart);
    });

    await withEnvironment(async (env) => {
        for (const file of ['a.txt', 'b.txt']) fs.writeFileSync(path.join(env.root, file), `base ${file}\n`);
        gitFixture(env.root, ['add', '--', 'a.txt', 'b.txt']);
        gitFixture(env.root, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture repark files']);
        const a = entry(env.root, 'repark-a', { inScopePaths: ['a.txt'] });
        const b = entry(env.root, 'repark-b', { inScopePaths: ['b.txt'] });
        writeQueue(env, [a, b], { reviewBacklog: { maxPending: 5 } });
        await run(env, [createFakeAgent('implementer', [{ result: {} }, { result: {} }]), unavailableReviewer()]);

        const failAncestor = createFakeAgent('reviewer', [{
            run: (input) => ({ verdictDocument: verdictDocument(input, 'FAIL') }),
        }]);
        const failed = await run(env, [createFakeAgent('implementer', []), failAncestor]);
        assert.equal(failed.state, 'FAIL');
        assert.deepEqual(pendingEvents(env).resolved.map(({ event }) => [event.sliceId, event.outcome]), [
            ['repark-a', 'FAIL'], ['repark-b', 'ANCESTOR_FAILED'],
        ]);

        const retryImplementer = createFakeAgent('implementer', [
            { run: () => { fs.writeFileSync(path.join(env.root, 'a.txt'), 'a round two\n'); return {}; } },
            { run: () => { fs.writeFileSync(path.join(env.root, 'b.txt'), 'b after a pass\n'); return {}; } },
        ]);
        const retryReviewer = createFakeAgent('reviewer', [
            { run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }) },
            { result: { state: 'UNAVAILABLE', reason: 'fixture outage' } },
        ]);
        const retried = await run(env, [retryImplementer, retryReviewer]);
        assert.equal(retried.state, 'REVIEW_PENDING');
        assert.deepEqual(retryReviewer.calls.map(({ entry: slice }) => slice.sliceId), ['repark-a', 'repark-b']);
        const active = pendingEvents(env).active;
        assert.deepEqual(active.map(({ sliceId }) => sliceId), ['repark-b']);
        assert.notEqual(active[0].commit, pendingEvents(env).events.find((event) =>
            event.event === 'PENDING' && event.sliceId === 'repark-b').commit);
        const restart = await run(env, [createFakeAgent('implementer', []), unavailableReviewer()]);
        assert.equal(restart.state, 'REVIEW_PENDING');
        assert.equal(restart.reason, 'fixture outage');
    });
});

test('32: parked commits are restored into the working tree before validation resumes the queue', async () => {
    for (const { label, removeAttributes, writeCrlf } of [
        { label: 'autocrlf without attributes', removeAttributes: true, writeCrlf: false },
        { label: 'repository attributes with CRLF implementer output', removeAttributes: false, writeCrlf: true },
    ]) await withEnvironment(async (env) => {
        gitFixture(env.root, ['config', 'core.autocrlf', 'true']);
        for (const name of ['a.txt', 'b.txt', 'c.txt']) fs.writeFileSync(path.join(env.root, name), `base ${name}\n`);
        if (removeAttributes) fs.rmSync(path.join(env.root, '.gitattributes'));
        gitFixture(env.root, ['add', '--all']);
        gitFixture(env.root, ['-c', 'commit.gpgsign=false', 'commit', '-m', `fixture ${label}`]);

        for (const name of ['a.txt', 'b.txt', 'c.txt']) fs.rmSync(path.join(env.root, name));
        gitFixture(env.root, ['checkout-index', '--force', '--', 'a.txt', 'b.txt', 'c.txt']);
        const a = entry(env.root, 'line-end-a', { inScopePaths: ['a.txt'] });
        const b = entry(env.root, 'line-end-b', { inScopePaths: ['b.txt'] });
        const c = entry(env.root, 'line-end-c', { inScopePaths: ['c.txt'] });
        writeQueue(env, [a, b], { reviewBacklog: { maxPending: 5 } });
        const firstImplementer = createFakeAgent('implementer', [a, b].map((slice) => ({ run: () => {
            let contents = `parked ${slice.sliceId}\n`;
            if (writeCrlf) contents = contents.replaceAll('\n', '\r\n');
            fs.writeFileSync(path.join(env.root, slice.inScopePaths[0]), contents);
            return { claim: 'parked' };
        } })));
        const parked = await run(env, [firstImplementer, unavailableReviewer()]);
        assert.equal(parked.state, 'REVIEW_PENDING', `${label}: ${JSON.stringify(parked)}`);
        for (const file of ['a.txt', 'b.txt']) {
            const bytes = fs.readFileSync(path.join(env.root, file));
            assert.equal(bytes.includes(Buffer.from('\r\n')), removeAttributes, `${label}: ${file}`);
        }

        writeQueue(env, [a, b, c], { reviewBacklog: { maxPending: 5 } });
        const resumeImplementer = createFakeAgent('implementer', [{ result: { claim: 'implemented c' } }]);
        const resumeReviewer = createFakeAgent('reviewer', Array.from({ length: 3 }, () => ({
            run: (input) => ({ verdictDocument: verdictDocument(input, 'PASS') }),
        })));
        const resumed = await run(env, [resumeImplementer, resumeReviewer]);
        assert.equal(resumed.state, 'COMPLETE', `${label}: ${JSON.stringify(resumed)}`);
        assert.deepEqual(resumeImplementer.calls.map(({ entry: slice }) => slice.sliceId), ['line-end-c']);
        assert.deepEqual(resumeReviewer.calls.map(({ entry: slice }) => slice.sliceId), [
            'line-end-a', 'line-end-b', 'line-end-c',
        ]);
        assert.deepEqual(pendingEvents(env).active, []);
    });
});
