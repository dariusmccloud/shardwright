import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const VERDICTS = new Set(['PASS', 'FAIL', 'ESCALATE', 'SELF_REVIEW_DEFERRED']);
const SUBTYPES = new Set([null, 'NEEDS_HUMAN_ACTION']);
const ROW_FIELDS = [
    'sliceId',
    'round',
    'verdictPath',
    'verdictSha256',
    'verdict',
    'subtype',
    'reviewer',
    'recordedAt',
];
const APPEND_FIELDS = ROW_FIELDS.filter((field) => field !== 'verdictSha256');
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;

function ledgerError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function isValidTimestamp(value) {
    if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) return false;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return false;
    return new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
}

function validateVerdictPath(repoRoot, verdictPath) {
    if (typeof verdictPath !== 'string' || verdictPath.length === 0
        || verdictPath.includes('\\') || verdictPath.startsWith('/')
        || verdictPath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
        || /[\u0000-\u001f\u007f]/u.test(verdictPath)) {
        throw ledgerError('VERDICT_PATH_INVALID', 'verdictPath must be a safe repository-relative POSIX path.');
    }

    const absoluteRoot = path.resolve(repoRoot);
    const realRoot = fs.realpathSync(absoluteRoot);
    const absoluteVerdict = path.resolve(absoluteRoot, ...verdictPath.split('/'));
    const relative = path.relative(absoluteRoot, absoluteVerdict);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw ledgerError('VERDICT_PATH_INVALID', 'verdictPath must remain inside the repository root.');
    }

    let realVerdict;
    try {
        realVerdict = fs.realpathSync(absoluteVerdict);
    } catch (error) {
        throw ledgerError('VERDICT_FILE_UNAVAILABLE', `The verdict file cannot be resolved: ${error?.message || error}`);
    }
    const realRelative = path.relative(realRoot, realVerdict);
    if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
        throw ledgerError('VERDICT_PATH_INVALID', 'verdictPath resolves outside the repository root.');
    }

    const stat = fs.statSync(realVerdict);
    if (!stat.isFile()) throw ledgerError('VERDICT_FILE_INVALID', 'The verdict path must resolve to a regular file.');
    return realVerdict;
}

function validateRow(row, { appendInput = false } = {}) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw ledgerError('VERDICT_ROW_INVALID', 'A verdict row object is required.');
    }
    const expectedFields = appendInput ? APPEND_FIELDS : ROW_FIELDS;
    const actualFields = Object.keys(row).sort();
    if (actualFields.length !== expectedFields.length
        || actualFields.some((field, index) => field !== [...expectedFields].sort()[index])) {
        throw ledgerError('VERDICT_ROW_INVALID', 'The verdict row has missing or unsupported fields.');
    }

    if (typeof row.sliceId !== 'string' || row.sliceId.trim() === '') {
        throw ledgerError('VERDICT_ROW_INVALID', 'sliceId must be a non-empty string.');
    }
    if (!Number.isSafeInteger(row.round) || row.round < 1) {
        throw ledgerError('VERDICT_ROW_INVALID', 'round must be a positive safe integer.');
    }
    if (typeof row.verdictPath !== 'string' || row.verdictPath.length === 0) {
        throw ledgerError('VERDICT_ROW_INVALID', 'verdictPath must be a non-empty string.');
    }
    if (!appendInput && (typeof row.verdictSha256 !== 'string' || !HASH_PATTERN.test(row.verdictSha256))) {
        throw ledgerError('LEDGER_CORRUPT', 'A ledger row has an invalid verdictSha256.');
    }
    if (!VERDICTS.has(row.verdict)) throw ledgerError(appendInput ? 'VERDICT_ROW_INVALID' : 'LEDGER_CORRUPT', 'A ledger row has an unsupported verdict.');
    if (!SUBTYPES.has(row.subtype) || (row.subtype === 'NEEDS_HUMAN_ACTION' && row.verdict !== 'ESCALATE')) {
        throw ledgerError(appendInput ? 'VERDICT_ROW_INVALID' : 'LEDGER_CORRUPT', 'A ledger row has an invalid verdict subtype.');
    }
    if (typeof row.reviewer !== 'string' || row.reviewer.trim() === '' || !isValidTimestamp(row.recordedAt)) {
        throw ledgerError(appendInput ? 'VERDICT_ROW_INVALID' : 'LEDGER_CORRUPT', 'A ledger row has an invalid reviewer or UTC timestamp.');
    }
}

function readLedgerRows(ledgerPath) {
    let bytes;
    try {
        bytes = fs.readFileSync(ledgerPath);
    } catch (error) {
        if (error?.code === 'ENOENT') return [];
        throw error;
    }
    if (bytes.length === 0) return [];

    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        throw ledgerError('LEDGER_CORRUPT', 'The ledger is not valid UTF-8.');
    }
    if (!text.endsWith('\n') || text.includes('\r')) {
        throw ledgerError('LEDGER_CORRUPT', 'The ledger must use LF-terminated JSON Lines.');
    }

    const rows = [];
    const nextRoundBySlice = new Map();
    for (const line of text.slice(0, -1).split('\n')) {
        let row;
        try {
            row = JSON.parse(line);
            validateRow(row);
        } catch (error) {
            if (error?.code === 'LEDGER_CORRUPT') throw error;
            throw ledgerError('LEDGER_CORRUPT', `The ledger contains an invalid row: ${error?.message || error}`);
        }

        const expectedRound = (nextRoundBySlice.get(row.sliceId) ?? 0) + 1;
        if (row.round !== expectedRound) {
            throw ledgerError('LEDGER_CORRUPT', `Slice ${row.sliceId} has a duplicate or skipped review round.`);
        }
        nextRoundBySlice.set(row.sliceId, expectedRound);
        rows.push(row);
    }
    return rows;
}

function validateLedgerPath(ledgerPath) {
    if (typeof ledgerPath !== 'string' || ledgerPath.length === 0) {
        throw ledgerError('LEDGER_PATH_INVALID', 'An explicit ledger path is required.');
    }
    try {
        const stat = fs.lstatSync(ledgerPath);
        if (stat.isSymbolicLink() || !stat.isFile()) {
            throw ledgerError('LEDGER_PATH_INVALID', 'The ledger path must be a regular file, not a link.');
        }
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
    }
}

function assertNextRound(rows, row) {
    const sliceRows = rows.filter((entry) => entry.sliceId === row.sliceId);
    const expectedRound = sliceRows.length === 0 ? 1 : sliceRows.at(-1).round + 1;
    if (row.round !== expectedRound) {
        throw ledgerError('VERDICT_ROUND_INVALID', `Expected review round ${expectedRound} for slice ${row.sliceId}.`);
    }
}

/** Append one validated verdict row, hashing its exact file bytes in this module. */
export function appendVerdict(ledgerPath, repoRoot, row) {
    validateLedgerPath(ledgerPath);
    validateRow(row, { appendInput: true });
    const rows = readLedgerRows(ledgerPath);
    assertNextRound(rows, row);
    const normalizedVerdictPath = row.verdictPath.toLowerCase();
    if (rows.some((entry) => entry.verdictPath.toLowerCase() === normalizedVerdictPath)) {
        throw ledgerError('VERDICT_PATH_REUSED', 'Each verdict round must use a unique verdictPath.');
    }

    const verdictFile = validateVerdictPath(repoRoot, row.verdictPath);
    const verdictBytes = fs.readFileSync(verdictFile);
    if (verdictBytes.includes(0x0d)) {
        throw ledgerError('VERDICT_FILE_LINE_ENDINGS', 'Verdict files must use LF line endings and contain no carriage returns.');
    }
    const verdictSha256 = sha256(verdictBytes);

    const storedRow = {
        sliceId: row.sliceId,
        round: row.round,
        verdictPath: row.verdictPath,
        verdictSha256,
        verdict: row.verdict,
        subtype: row.subtype,
        reviewer: row.reviewer,
        recordedAt: row.recordedAt,
    };
    const descriptor = fs.openSync(ledgerPath, 'a', 0o600);
    try {
        fs.writeSync(descriptor, `${JSON.stringify(storedRow)}\n`, null, 'utf8');
    } finally {
        fs.closeSync(descriptor);
    }
    return Object.freeze({ state: 'APPENDED', row: Object.freeze(storedRow) });
}

/** Verify a requested review round, or the highest recorded round if omitted. */
export function verifyVerdict(ledgerPath, repoRoot, sliceId, round) {
    validateLedgerPath(ledgerPath);
    if (typeof sliceId !== 'string' || sliceId.trim() === '') {
        throw ledgerError('VERDICT_LOOKUP_INVALID', 'sliceId must be a non-empty string.');
    }
    if (round !== undefined && (!Number.isSafeInteger(round) || round < 1)) {
        throw ledgerError('VERDICT_LOOKUP_INVALID', 'round must be a positive safe integer when supplied.');
    }

    let rows;
    try {
        rows = readLedgerRows(ledgerPath);
    } catch (error) {
        if (error?.code === 'LEDGER_CORRUPT') return Object.freeze({ state: 'LEDGER_CORRUPT' });
        throw error;
    }
    const matchingRows = rows.filter((row) => row.sliceId === sliceId);
    const row = round === undefined
        ? matchingRows.at(-1)
        : matchingRows.find((entry) => entry.round === round);
    if (!row) return Object.freeze({ state: 'UNRECORDED' });

    try {
        const verdictFile = validateVerdictPath(repoRoot, row.verdictPath);
        const actualHash = sha256(fs.readFileSync(verdictFile));
        if (actualHash !== row.verdictSha256) return Object.freeze({ state: 'TAMPERED', row });
    } catch (error) {
        if (error?.code === 'VERDICT_FILE_UNAVAILABLE'
            || error?.code === 'VERDICT_FILE_INVALID'
            || error?.code === 'VERDICT_PATH_INVALID'
            || error?.code === 'ENOENT') {
            return Object.freeze({ state: 'TAMPERED', row });
        }
        throw error;
    }
    return Object.freeze({ state: 'VALID', row });
}
