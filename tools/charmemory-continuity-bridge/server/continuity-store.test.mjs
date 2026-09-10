import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContinuityBridgeError, ContinuityStore } from './continuity-store.js';

function source(blocks) {
    return blocks.map(({ chat = 'Jeep', date = '2026-09-05', text }) => `<memory chat="${chat}" date="${date}">\n${text}\n</memory>`).join('\n\n');
}

function openFixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuity-bridge-'));
    return { root, store: new ContinuityStore(root) };
}

test('first sync creates current FTS rows and a later identical sync does no indexing work', () => {
    const { root, store } = openFixture();
    try {
        const markdown = source([{ text: '- Jeep chose the desert as home.' }, { text: '- The compass is shared trust.' }]);
        const first = store.sync('file:jeep-memories.md', markdown, 100);
        assert.equal(first.sourceId, 'file:jeep-memories.md');
        assert.equal(first.skipped, false);
        assert.equal(first.insertedRevisions, 2);
        assert.deepEqual(first.source, {
            sourceId: 'file:jeep-memories.md',
            sourceHash: first.source.sourceHash,
            syncedAt: 100,
            activeBlockCount: 2,
            revisionCount: 2,
        });
        const desert = store.search('file:jeep-memories.md', 'desert', 3);
        assert.equal(desert.length, 1);
        assert.equal(desert[0].sourceChat, 'Jeep');
        assert.equal(desert[0].sourceDate, '2026-09-05');
        const repeated = store.sync('file:jeep-memories.md', markdown, 101);
        assert.equal(repeated.skipped, true);
        assert.equal(repeated.parsedBlocks, 0);
        assert.equal(repeated.source.sourceHash, first.source.sourceHash);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('an edited block appends a revision and only its new revision remains in current FTS', () => {
    const { root, store } = openFixture();
    try {
        const sourceId = 'file:jeep-memories.md';
        store.sync(sourceId, source([{ text: '- The old signal was starlight.' }, { text: '- Movement is a separate header.' }]), 100);
        const originalId = store.search(sourceId, 'starlight')[0].stableId;
        const report = store.sync(sourceId, source([{ text: '- The current signal is lanternlight.' }, { text: '- Movement is a separate header.' }]), 200);
        assert.equal(report.insertedRevisions, 1);
        assert.equal(store.search(sourceId, 'starlight').length, 0);
        assert.equal(store.search(sourceId, 'lanternlight')[0].stableId, originalId);
        assert.deepEqual(store.revisions(originalId).map((revision) => revision.revision), [1, 2]);
        assert.match(store.revisions(originalId)[0].content, /starlight/);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('a legacy attachment URL source migrates to stable identity before one edited block is revised', () => {
    const { root, store } = openFixture();
    try {
        const legacySourceId = '/user/files/old-attachment.txt';
        const stableSourceId = 'charmemory-source:["Jeep.png","Jeep-memories.md"]';
        const before = '<memory chat="a" date="1">- [Jeep — first]\n- Unchanged.</memory>\n<memory chat="b" date="2">- [Jeep — second]\n- Original wording.</memory>';
        const after = '<memory chat="a" date="1">- [Jeep — first]\n- Unchanged.</memory>\n<memory chat="b" date="2">- [Jeep — second]\n- Revised wording UNIQUE_EDIT.</memory>';

        store.sync(legacySourceId, before, 1);
        const result = store.sync(stableSourceId, after, 2);
        assert.equal(result.sourceId, stableSourceId);
        assert.equal(result.skipped, false);
        assert.equal(result.insertedRevisions, 1);
        assert.equal(result.migratedLegacySource, true);
        assert.equal(result.source.activeBlockCount, 2);
        assert.equal(result.source.revisionCount, 3);
        assert.equal(store.getActiveBlocks(stableSourceId).length, 2);
        assert.equal(store.getActiveBlocks(legacySourceId).length, 0);
        assert.equal(store.search(stableSourceId, 'UNIQUE_EDIT', 3).length, 1);
        const revised = store.search(stableSourceId, 'UNIQUE_EDIT', 3)[0];
        assert.equal(store.revisions(revised.stableId).length, 2);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('an ambiguous changed duplicate refuses without altering current search results', () => {
    const { root, store } = openFixture();
    try {
        const sourceId = 'file:jeep-memories.md';
        const initial = source([{ text: '- First protected memory.' }, { text: '- Second protected memory.' }]);
        store.sync(sourceId, initial, 100);
        const ambiguous = source([{ text: '- Changed first memory.' }, { text: '- Changed second memory.' }]);
        assert.throws(() => store.sync(sourceId, ambiguous, 200), (error) => error instanceof ContinuityBridgeError && error.code === 'CONTINUITY_AMBIGUOUS_BLOCK_MATCH');
        assert.equal(store.search(sourceId, 'protected', 3).length, 2);
        assert.equal(store.search(sourceId, 'changed', 3).length, 0);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('search admits a bounded evidence window larger than the legacy three-record ceiling', () => {
    const { root, store } = openFixture();
    try {
        const sourceId = 'file:jeep-memories.md';
        const blocks = Array.from({ length: 30 }, (_, index) => ({ text: `- CSP evidence record ${index + 1}.` }));
        store.sync(sourceId, source(blocks), 100);
        assert.equal(store.search(sourceId, 'CSP', 24).length, 24);
        assert.equal(store.search(sourceId, 'CSP', 99).length, 24);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('unchanged legacy rows backfill source provenance without creating revisions or FTS work', () => {
    const { root, store } = openFixture();
    try {
        const sourceId = 'file:jeep-memories.md';
        const markdown = source([{ chat: 'Jeep Architecture Discussion', date: '2026-07-11', text: '- CSP origin record.' }]);
        store.sync(sourceId, markdown, 100);
        store.db.prepare(`UPDATE bridge_block_revisions SET source_chat = '', source_date = '', provenance_recorded = 0`).run();
        const result = store.sync(sourceId, markdown, 200);
        assert.equal(result.insertedRevisions, 0);
        assert.equal(result.backfilledProvenance, 1);
        const found = store.search(sourceId, 'CSP')[0];
        assert.equal(found.sourceChat, 'Jeep Architecture Discussion');
        assert.equal(found.sourceDate, '2026-07-11');
        assert.equal(store.revisions(found.stableId).length, 1);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('a source chat or date change appends a new provenance-bearing revision', () => {
    const { root, store } = openFixture();
    try {
        const sourceId = 'file:jeep-memories.md';
        store.sync(sourceId, source([{ chat: 'Original Chat', date: '2026-07-11', text: '- CSP origin record.' }]), 100);
        const result = store.sync(sourceId, source([{ chat: 'Archived Architecture Review', date: '2026-09-05', text: '- CSP origin record.' }]), 200);
        assert.equal(result.insertedRevisions, 1);
        const found = store.search(sourceId, 'CSP')[0];
        assert.equal(found.sourceChat, 'Archived Architecture Review');
        assert.equal(found.sourceDate, '2026-09-05');
        assert.deepEqual(store.revisions(found.stableId).map(revision => revision.sourceDate), ['2026-07-11', '2026-09-05']);
    } finally {
        store.close();
        fs.rmSync(root, { recursive: true, force: true });
    }
});
