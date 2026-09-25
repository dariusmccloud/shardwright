import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { appendVerdict, verifyVerdict } from './ledger.js';

function withFixture(callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-ledger-'));
    const verdictDirectory = path.join(root, 'docs', 'verdicts');
    fs.mkdirSync(verdictDirectory, { recursive: true });
    const ledgerPath = path.join(root, 'temporary-ledger.jsonl');
    const verdictPath = 'docs/verdicts/slice-r1.md';
    fs.writeFileSync(path.join(root, verdictPath), '# Test verdict\n');
    try {
        return callback({ root, ledgerPath, verdictPath });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function row(overrides = {}) {
    return {
        sliceId: 'slice-a',
        round: 1,
        verdictPath: 'docs/verdicts/slice-r1.md',
        verdict: 'PASS',
        subtype: null,
        reviewer: 'Claude',
        recordedAt: '2026-09-25T18:00:00Z',
        ...overrides,
    };
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

test('append then verify returns VALID', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row());
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'VALID');
    });
});

test('editing a verdict after append returns TAMPERED', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row());
        fs.writeFileSync(path.join(root, 'docs/verdicts/slice-r1.md'), '# Edited verdict\n');
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'TAMPERED');
    });
});

test('an absent slice or requested review round returns UNRECORDED', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row());
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-missing').state, 'UNRECORDED');
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a', 2).state, 'UNRECORDED');
    });
});

test('review rounds advance contiguously and the highest round is current', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row({ verdict: 'FAIL' }));
        const secondPath = 'docs/verdicts/slice-r2.md';
        fs.writeFileSync(path.join(root, secondPath), '# Second review\n');
        appendVerdict(ledgerPath, root, row({ round: 2, verdictPath: secondPath, verdict: 'PASS' }));

        const current = verifyVerdict(ledgerPath, root, 'slice-a');
        assert.equal(current.state, 'VALID');
        assert.equal(current.row.round, 2);
        assert.equal(current.row.verdict, 'PASS');
        assert.throws(() => appendVerdict(ledgerPath, root, row({ round: 2, verdictPath: secondPath })), {
            code: 'VERDICT_ROUND_INVALID',
        });
        assert.throws(() => appendVerdict(ledgerPath, root, row()), { code: 'VERDICT_ROUND_INVALID' });
        assert.throws(() => appendVerdict(ledgerPath, root, row({ sliceId: 'slice-gap', round: 3 })), {
            code: 'VERDICT_ROUND_INVALID',
        });
    });
});

test('appending preserves every existing ledger byte as an exact prefix', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row());
        const before = fs.readFileSync(ledgerPath);
        const secondPath = 'docs/verdicts/slice-r2.md';
        fs.writeFileSync(path.join(root, secondPath), '# Second review\n');
        appendVerdict(ledgerPath, root, row({ round: 2, verdictPath: secondPath, verdict: 'FAIL' }));
        const after = fs.readFileSync(ledgerPath);
        assert.deepEqual(after.subarray(0, before.length), before);
        assert.ok(after.length > before.length);
    });
});

test('verdict and subtype are separate and only NEEDS_HUMAN_ACTION with ESCALATE is accepted', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row({ verdict: 'ESCALATE', subtype: 'NEEDS_HUMAN_ACTION' }));

        for (const invalid of [
            row({ verdict: 'PASS', subtype: 'NEEDS_HUMAN_ACTION' }),
            row({ subtype: 'OTHER' }),
            row({ verdict: 'UNKNOWN' }),
        ]) {
            assert.throws(() => appendVerdict(ledgerPath, root, invalid), { code: 'VERDICT_ROW_INVALID' });
        }
    });
});

test('the ledger computes the verdict hash and refuses a caller-supplied hash', () => {
    withFixture(({ root, ledgerPath }) => {
        assert.throws(() => appendVerdict(ledgerPath, root, {
            ...row(),
            verdictSha256: '0'.repeat(64),
        }), { code: 'VERDICT_ROW_INVALID' });

        const verdictBytes = fs.readFileSync(path.join(root, 'docs/verdicts/slice-r1.md'));
        appendVerdict(ledgerPath, root, row());
        const stored = JSON.parse(fs.readFileSync(ledgerPath, 'utf8').trim());
        assert.equal(stored.verdictSha256, digest(verdictBytes));
    });
});

test('malformed JSON or a row missing a required field returns LEDGER_CORRUPT', () => {
    withFixture(({ root, ledgerPath }) => {
        fs.writeFileSync(ledgerPath, '{not json}\n');
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'LEDGER_CORRUPT');

        const incomplete = {
            sliceId: 'slice-a',
            round: 1,
            verdictPath: 'docs/verdicts/slice-r1.md',
            verdictSha256: '0'.repeat(64),
            verdict: 'PASS',
            subtype: null,
            recordedAt: '2026-09-25T18:00:00Z',
        };
        fs.writeFileSync(ledgerPath, `${JSON.stringify(incomplete)}\n`);
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'LEDGER_CORRUPT');
    });
});
