import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
            row({ verdict: 'SELF_REVIEW_DEFERRED' }),
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

test('verdict files reject CR bytes and remain valid after git checkout with project attributes', () => {
    withFixture(({ root, ledgerPath, verdictPath }) => {
        const verdictFile = path.join(root, verdictPath);
        fs.writeFileSync(verdictFile, Buffer.from('# CRLF verdict\r\n', 'utf8'));
        assert.throws(() => appendVerdict(ledgerPath, root, row()), {
            code: 'VERDICT_FILE_LINE_ENDINGS',
        });

        fs.writeFileSync(verdictFile, Buffer.from('# Lone CR\rinside\n', 'utf8'));
        assert.throws(() => appendVerdict(ledgerPath, root, row()), {
            code: 'VERDICT_FILE_LINE_ENDINGS',
        });

        fs.writeFileSync(verdictFile, Buffer.from('# LF verdict\n', 'utf8'));
        appendVerdict(ledgerPath, root, row());

        const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
        fs.copyFileSync(path.join(projectRoot, '.gitattributes'), path.join(root, '.gitattributes'));
        execFileSync('git', ['init', '--quiet'], { cwd: root });
        execFileSync('git', ['config', 'core.autocrlf', 'true'], { cwd: root });
        execFileSync('git', ['add', '--', '.gitattributes', verdictPath], { cwd: root });
        execFileSync('git', [
            '-c', 'user.name=Slice Runner Test',
            '-c', 'user.email=slice-runner-test@example.invalid',
            '-c', 'commit.gpgsign=false',
            'commit', '--quiet', '-m', 'Test LF checkout policy',
        ], { cwd: root });

        fs.rmSync(verdictFile);
        execFileSync('git', ['checkout', '--force', 'HEAD', '--', verdictPath], { cwd: root });
        assert.equal(fs.readFileSync(verdictFile).includes(0x0d), false);
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'VALID');
    });
});

test('verdict paths cannot be reused across rounds, slices, or letter case', () => {
    withFixture(({ root, ledgerPath }) => {
        appendVerdict(ledgerPath, root, row());

        assert.throws(() => appendVerdict(ledgerPath, root, row({
            round: 2,
            verdict: 'FAIL',
        })), { code: 'VERDICT_PATH_REUSED' });
        assert.throws(() => appendVerdict(ledgerPath, root, row({
            sliceId: 'slice-b',
        })), { code: 'VERDICT_PATH_REUSED' });

        const caseVariantPath = 'docs/verdicts/Slice-r1.md';
        fs.writeFileSync(path.join(root, caseVariantPath), '# Case variant\n');
        assert.throws(() => appendVerdict(ledgerPath, root, row({
            sliceId: 'slice-c',
            verdictPath: caseVariantPath,
        })), { code: 'VERDICT_PATH_REUSED' });
    });
});

test('a recorded verdict path replaced by a directory returns TAMPERED', () => {
    withFixture(({ root, ledgerPath, verdictPath }) => {
        appendVerdict(ledgerPath, root, row());
        const verdictFile = path.join(root, verdictPath);
        fs.rmSync(verdictFile);
        fs.mkdirSync(verdictFile);
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'TAMPERED');
    });
});

test('SELF_REVIEW_DEFERRED is refused on append and makes an existing ledger corrupt', () => {
    withFixture(({ root, ledgerPath }) => {
        assert.throws(() => appendVerdict(ledgerPath, root, row({ verdict: 'SELF_REVIEW_DEFERRED' })), {
            code: 'VERDICT_ROW_INVALID',
        });
        assert.equal(fs.existsSync(ledgerPath), false);

        const legacyRow = {
            ...row({ verdict: 'SELF_REVIEW_DEFERRED' }),
            verdictSha256: '0'.repeat(64),
        };
        fs.writeFileSync(ledgerPath, `${JSON.stringify(legacyRow)}\n`);
        assert.equal(verifyVerdict(ledgerPath, root, 'slice-a').state, 'LEDGER_CORRUPT');
    });
});
