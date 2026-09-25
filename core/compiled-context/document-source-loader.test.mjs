import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadCompiledContextDocumentRegistry } from './document-source-loader.js';

test('loads explicit EICF source files with stable revision metadata', () => {
    const base = 'C:/Users/chris/OneDrive/Documents/Personal/Projects/SillyTavern/EICF';
    const result = loadCompiledContextDocumentRegistry([
        { documentLogicalId: 'eicf_rulebook', canonicalName: 'EICF - Documentation Rulebook', filePath: path.join(base, 'EICF - Documentation Rulebook.md') },
        { documentLogicalId: 'eicf_style', canonicalName: 'EICF - Documentation Style Guide', filePath: path.join(base, 'EICF - Documentation Style Guide.md') },
    ]);
    assert.equal(result.registry.documents.length, 2);
    assert.equal(result.sources.length, 2);
    assert.equal(result.sources.every((source) => source.byteLength > 0 && source.sourceRevisionHash.startsWith('sha256:')), true);
});

test('fails closed for missing and empty explicit sources', () => {
    assert.throws(() => loadCompiledContextDocumentRegistry([{ documentLogicalId: 'missing', canonicalName: 'Missing', filePath: 'C:/does-not-exist/shardwright.md' }]), { code: 'COMPILED_CONTEXT_SOURCE_UNREADABLE' });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-source-loader-'));
    const emptyPath = path.join(directory, 'empty.md');
    fs.writeFileSync(emptyPath, '');
    try {
        assert.throws(() => loadCompiledContextDocumentRegistry([{ documentLogicalId: 'empty', canonicalName: 'Empty', filePath: emptyPath }]), { code: 'COMPILED_CONTEXT_SOURCE_EMPTY' });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
