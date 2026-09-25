import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { appendVerdict, verifyVerdict } from './ledger.js';
import { createFakeAgent } from './fake-agents.js';
import { computeFingerprint } from './manifest.js';
import { DEFAULT_AGENT_TIMEOUT_MS, runQueue } from './runner.js';

function hash(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

async function withEnvironment(callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-runner-'));
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`), 'runner fixture must be inside the OS temp directory');
    fs.mkdirSync(path.join(root, 'docs', 'verdicts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'contract.md'), 'fixture contract\n');
    fs.writeFileSync(path.join(root, 'source.txt'), 'fixture source\n');
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

function writeQueue(env, entries) {
    fs.writeFileSync(env.queuePath, JSON.stringify({ schemaVersion: 1, entries }, null, 2));
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

test('only valid PASS advances the approved queue; FAIL and ESCALATE stop before the next slice', async () => {
    assert.equal(DEFAULT_AGENT_TIMEOUT_MS, 15 * 60 * 1000);

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
    assert.equal(DEFAULT_AGENT_TIMEOUT_MS, 900_000);

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
            proof: { argv: [process.execPath, '-e', "process.stdout.write('fixture proof')"], cwd: '.', timeoutMs: 500 },
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
        writeQueue(env, [entry(env.root, 'proof-timeout', {
            proof: {
                argv: [process.execPath, '-e', 'setTimeout(() => {}, 1000)'],
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
    });
});

test('an unavailable reviewer halts the queue without writing a verdict or review debt', async () => {
    await withEnvironment(async (env) => {
        writeQueue(env, [entry(env.root, 'reviewer-unavailable'), entry(env.root, 'slice-next')]);
        const adapters = baseAdapters({ reviewer: createFakeAgent('reviewer', [{ error: new Error('reviewer offline') }]) });
        const result = await run(env, adapters);
        assert.equal(result.state, 'HALTED');
        assert.equal(result.reason, 'AGENT_UNAVAILABLE');
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
