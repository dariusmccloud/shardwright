import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { appendCharacterAssociationAudit, readCharacterAssociationAuditLedger } from './character-association-audit.js';

function setup() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-association-audit-'));
    const paths = { characterAssociationAuditLedgerPath: path.join(root, 'character-association-audit-ledger.jsonl'), locksRoot: path.join(root, 'locks') };
    fs.mkdirSync(paths.locksRoot, { recursive: true });
    return { root, paths };
}

const input = { decision: 'CREATE_NEW', characterSelector: { hostCharacterId: 'host:jeep:card-1' }, idempotencyKey: 'operator-action-1', basis: 'operator confirmed active card', recordedAt: '2026-09-12T12:00:00Z' };

test('valid decision appends once and survives fresh read-back', () => {
    const { paths } = setup();
    const first = appendCharacterAssociationAudit(paths, input);
    assert.equal(first.appended, true);
    assert.equal(readCharacterAssociationAuditLedger(paths).length, 1);
    assert.equal(readCharacterAssociationAuditLedger(paths)[0].decision, 'CREATE_NEW');
});

test('same idempotency key and same content returns original without append', () => {
    const { paths } = setup();
    const first = appendCharacterAssociationAudit(paths, input);
    const second = appendCharacterAssociationAudit(paths, input);
    assert.equal(second.appended, false);
    assert.equal(second.entry.eventId, first.entry.eventId);
    assert.equal(readCharacterAssociationAuditLedger(paths).length, 1);
});

test('same key with changed immutable content refuses without append', () => {
    const { paths } = setup();
    appendCharacterAssociationAudit(paths, input);
    assert.throws(() => appendCharacterAssociationAudit(paths, { ...input, basis: 'different' }), (error) => error.code === 'ASSOCIATION_AUDIT_IDEMPOTENCY_COLLISION');
    assert.equal(readCharacterAssociationAuditLedger(paths).length, 1);
});

test('invalid selector refuses before ledger creation and neighboring ledger stays unchanged', () => {
    const { paths } = setup();
    const neighboring = path.join(paths.locksRoot, '..', 'transcript-message-ledger.jsonl');
    fs.writeFileSync(neighboring, '{"untouched":true}\n', 'utf8');
    assert.throws(() => appendCharacterAssociationAudit(paths, { ...input, characterSelector: { hostCharacterId: '' } }), (error) => error.code === 'ASSOCIATION_AUDIT_INVALID');
    assert.throws(() => appendCharacterAssociationAudit(paths, { ...input, decision: 'GUESS' }), (error) => error.code === 'ASSOCIATION_AUDIT_INVALID');
    assert.throws(() => appendCharacterAssociationAudit(paths, { ...input, recordedAt: 'not-a-date' }), (error) => error.code === 'ASSOCIATION_AUDIT_INVALID');
    assert.equal(fs.existsSync(paths.characterAssociationAuditLedgerPath), false);
    assert.equal(fs.readFileSync(neighboring, 'utf8'), '{"untouched":true}\n');
});
