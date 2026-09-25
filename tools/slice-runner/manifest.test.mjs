import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { compareFingerprints, computeFingerprint, validateManifestPath } from './manifest.js';

function withTempDirectory(callback) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-manifest-'));
    try {
        return callback(directory);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

function write(root, relativePath, content) {
    const destination = path.join(root, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
    return destination;
}

function fileHash(value) {
    return createHash('sha256').update(value).digest('hex');
}

test('same tree computed twice produces the same fingerprint', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'notes/a.md', 'one');
        const first = computeFingerprint(root, ['notes']);
        const second = computeFingerprint(root, ['notes']);
        assert.deepEqual(first.fingerprint, second.fingerprint);
        assert.deepEqual(first.entries, second.entries);
    });
});

test('input path order does not affect the fingerprint', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'a.txt', 'a');
        write(root, 'b.txt', 'b');
        assert.deepEqual(
            computeFingerprint(root, ['a.txt', 'b.txt']).fingerprint,
            computeFingerprint(root, ['b.txt', 'a.txt']).fingerprint,
        );
    });
});

test('changing an in-scope byte changes the manifest hash', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        const file = write(root, 'scope/item.txt', 'a');
        const before = computeFingerprint(root, ['scope']).fingerprint;
        fs.writeFileSync(file, 'b');
        const after = computeFingerprint(root, ['scope']).fingerprint;
        assert.notEqual(before.manifestHash, after.manifestHash);
    });
});

test('changing an out-of-scope file does not change the manifest hash', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'scope/item.txt', 'stable');
        const outside = write(root, 'other/item.txt', 'before');
        const before = computeFingerprint(root, ['scope']).fingerprint;
        fs.writeFileSync(outside, 'after');
        const after = computeFingerprint(root, ['scope']).fingerprint;
        assert.deepEqual(before, after);
    });
});

test('missing declared paths are explicit and differ from present files', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        const missing = computeFingerprint(root, ['data/new.json']);
        assert.deepEqual(missing.entries, [{
            path: 'data/new.json', size: '-', state: 'MISSING', contentHash: '',
        }]);
        assert.equal(missing.serialized, 'data/new.json\t-\tMISSING\t');
        write(root, 'data/new.json', 'present');
        const present = computeFingerprint(root, ['data/new.json']);
        assert.notEqual(missing.fingerprint.manifestHash, present.fingerprint.manifestHash);
    });
});

test('golden serialization and manifest hash match the exact format', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'docs/a.md', Buffer.from('hello world\n', 'utf8'));
        write(root, 'docs/empty.bin', Buffer.alloc(0));
        const result = computeFingerprint(root, ['docs/a.md', 'docs/gone.md', 'docs/empty.bin']);
        const expected = [
            `docs/a.md\t12\tPRESENT\t${fileHash(Buffer.from('hello world\n', 'utf8'))}`,
            `docs/empty.bin\t0\tPRESENT\t${fileHash(Buffer.alloc(0))}`,
            'docs/gone.md\t-\tMISSING\t',
        ].join('\n');
        assert.equal(result.serialized, expected);
        assert.equal(result.fingerprint.manifestHash, '6fb193f6f9af26085e43d1123112dc320e965034695c68ae6037e623b9108692');
        assert.deepEqual(result.entries.map(({ path: entryPath, size, state }) => [entryPath, size, state]), [
            ['docs/a.md', '12', 'PRESENT'],
            ['docs/empty.bin', '0', 'PRESENT'],
            ['docs/gone.md', '-', 'MISSING'],
        ]);
    });
});

test('an in-scope directory expands recursively and excludes every .git directory', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'tree/one.txt', '1');
        write(root, 'tree/nested/two.txt', '2');
        write(root, 'tree/.git/config', 'private');
        write(root, 'tree/nested/.git/objects/object', 'private');
        const result = computeFingerprint(root, ['tree']);
        assert.deepEqual(result.entries.map((entry) => entry.path), ['tree/nested/two.txt', 'tree/one.txt']);
    });
});

test('Windows-style declared paths normalize to forward slashes', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'folder/item.txt', 'value');
        const windows = computeFingerprint(root, ['folder\\item.txt']);
        const posix = computeFingerprint(root, ['folder/item.txt']);
        assert.equal(windows.entries[0].path, 'folder/item.txt');
        assert.deepEqual(windows.fingerprint, posix.fingerprint);
    });
});

test('absolute, drive-letter, UNC, and escaped paths are refused', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        const paths = ['../outside', '/absolute', 'C:relative', 'C:/absolute', '\\\\server\\share'];
        for (const candidate of paths) {
            assert.throws(() => computeFingerprint(root, [candidate]), { code: /MANIFEST_PATH_/u });
        }
    });
});

test('links are recorded by target text and their contents are never walked', (t) => {
    withTempDirectory((parent) => {
        const root = path.join(parent, 'repo');
        const outside = path.join(parent, 'outside');
        fs.mkdirSync(root);
        fs.mkdirSync(outside);
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'inside/secret.txt', 'inside');
        write(outside, 'secret.txt', 'outside');
        const linkType = process.platform === 'win32' ? 'junction' : 'dir';
        try {
            fs.symlinkSync(path.join(root, 'inside'), path.join(root, 'inside-link'), linkType);
            fs.symlinkSync(outside, path.join(root, 'outside-link'), linkType);
        } catch (error) {
            t.skip(`Cannot create the required directory links in this environment: ${error?.code || error?.message || error}`);
            return;
        }

        const result = computeFingerprint(root, ['.']);
        const linkEntries = result.entries.filter((entry) => entry.state === 'LINK');
        assert.deepEqual(linkEntries.map((entry) => entry.path), ['inside-link', 'outside-link']);
        for (const entry of linkEntries) {
            const target = fs.readlinkSync(path.join(root, entry.path));
            const targetBytes = Buffer.from(target, 'utf8');
            assert.equal(entry.size, String(targetBytes.byteLength));
            assert.equal(entry.contentHash, fileHash(targetBytes));
        }
        assert.equal(result.entries.some((entry) => entry.path === 'inside-link/secret.txt'), false);
        assert.equal(result.entries.some((entry) => entry.path === 'outside-link/secret.txt'), false);
        assert.equal(result.entries.some((entry) => entry.path === 'secret.txt'), false);
    });
});

test('fingerprint comparison distinguishes match, content change, and stale policy', () => {
    withTempDirectory((parent) => {
        const a = path.join(parent, 'a');
        const b = path.join(parent, 'b');
        const c = path.join(parent, 'c');
        fs.mkdirSync(a);
        fs.mkdirSync(b);
        fs.mkdirSync(c);
        write(a, '.gitattributes', '* text=auto eol=lf\n');
        write(b, '.gitattributes', '* text=auto eol=crlf\n');
        write(c, '.gitattributes', '* text=auto eol=lf\n');
        write(a, 'scope/item.txt', 'same');
        write(b, 'scope/item.txt', 'same');
        write(c, 'scope/item.txt', 'changed');
        const baseline = computeFingerprint(a, ['scope']).fingerprint;
        assert.equal(compareFingerprints(baseline, computeFingerprint(a, ['scope']).fingerprint), 'MATCH');
        assert.equal(compareFingerprints(baseline, computeFingerprint(c, ['scope']).fingerprint), 'CONTENT_CHANGED');
        assert.equal(compareFingerprints(baseline, computeFingerprint(b, ['scope']).fingerprint), 'STALE_REVIEW');

        const withoutPolicy = path.join(parent, 'without-policy');
        fs.mkdirSync(withoutPolicy);
        write(withoutPolicy, 'scope/item.txt', 'same');
        assert.equal(computeFingerprint(withoutPolicy, ['scope']).fingerprint.policyHash, 'NONE');
    });
});

test('control and delimiter characters, including a crafted serialization collision, are refused', () => {
    const invalid = [
        'bad\tname',
        'bad\nname',
        'bad\rname',
        'bad\u001fname',
        'bad\u007fname',
        `a\t1\tPRESENT\t${'0'.repeat(64)}\nb`,
    ];
    for (const candidate of invalid) {
        assert.throws(() => validateManifestPath(candidate), { code: 'MANIFEST_PATH_CONTROL_CHARACTER' });
        assert.throws(() => validateManifestPath(candidate, { mode: 'discovered' }), {
            code: 'MANIFEST_PATH_CONTROL_CHARACTER',
        });
    }

    if (process.platform === 'win32') {
        assert.throws(() => validateManifestPath('filename\twith-control', { mode: 'discovered' }), {
            code: 'MANIFEST_PATH_CONTROL_CHARACTER',
        });
        return;
    }

    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'bad\tname', 'content');
        assert.throws(() => computeFingerprint(root, ['.']), { code: 'MANIFEST_PATH_CONTROL_CHARACTER' });
    });
});

test('discovered backslashes are refused while declared backslashes normalize', (t) => {
    assert.equal(validateManifestPath('a\\b', { mode: 'declared' }), 'a/b');
    assert.throws(() => validateManifestPath('a\\b', { mode: 'discovered' }), {
        code: 'MANIFEST_PATH_BACKSLASH_DISCOVERED',
    });

    if (process.platform === 'win32') {
        t.diagnostic('Real-file expansion substep skipped: Windows cannot create a filename containing a backslash; discovered-mode validator was exercised directly.');
        return;
    }

    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'tree/a\\b', 'ambiguous');
        assert.throws(() => computeFingerprint(root, ['tree']), {
            code: 'MANIFEST_PATH_BACKSLASH_DISCOVERED',
        });
    });
});

test('discovered .git files are excluded and declared .git paths are refused', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'tree/ordinary.txt', 'included');
        write(root, 'tree/nested/.git', 'git worktree marker');

        const expanded = computeFingerprint(root, ['tree']);
        assert.deepEqual(expanded.entries.map((entry) => entry.path), ['tree/ordinary.txt']);
        assert.throws(() => computeFingerprint(root, ['tree/.git/config']), {
            code: 'MANIFEST_PATH_GIT_METADATA_DECLARED',
        });
    });
});

test('overlapping declarations produce one entry and the same fingerprint', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'docs/a.md', 'content');

        const directoryScope = computeFingerprint(root, ['docs']);
        const overlappingScope = computeFingerprint(root, ['docs', 'docs/a.md']);
        assert.deepEqual(overlappingScope.entries, directoryScope.entries);
        assert.equal(overlappingScope.entries.filter((entry) => entry.path === 'docs/a.md').length, 1);
        assert.deepEqual(overlappingScope.fingerprint, directoryScope.fingerprint);
    });
});

test('a declared path through a directory link records only the link prefix', (t) => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'target/x.txt', 'must not be read through the link');
        const linkType = process.platform === 'win32' ? 'junction' : 'dir';
        try {
            fs.symlinkSync(path.join(root, 'target'), path.join(root, 'link'), linkType);
        } catch (error) {
            t.skip(`Cannot create the required directory link in this environment: ${error?.code || error?.message || error}`);
            return;
        }

        const result = computeFingerprint(root, ['link/x.txt']);
        assert.equal(result.entries.length, 1);
        assert.equal(result.entries[0].path, 'link');
        assert.equal(result.entries[0].state, 'LINK');
        assert.equal(result.entries.some((entry) => entry.path.startsWith('link/')), false);
    });
});

test('a declared path passing through a regular file is recorded as missing', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'a.txt', 'regular file');

        const result = computeFingerprint(root, ['a.txt/b']);
        assert.deepEqual(result.entries, [{
            path: 'a.txt/b', size: '-', state: 'MISSING', contentHash: '',
        }]);
    });
});

test('case variants of .git are refused or excluded without matching .git substrings', () => {
    withTempDirectory((root) => {
        write(root, '.gitattributes', '* text=auto eol=lf\n');
        write(root, 'tree/.GIT/secret', 'git metadata');
        write(root, 'tree/.gitignore', 'ordinary ignore file');
        write(root, 'tree/x.git', 'ordinary filename');

        for (const candidate of ['.GIT/HEAD', '.Git/config', 'tree/.gIt/x']) {
            assert.throws(() => computeFingerprint(root, [candidate]), {
                code: 'MANIFEST_PATH_GIT_METADATA_DECLARED',
            });
        }

        const expanded = computeFingerprint(root, ['tree']);
        assert.deepEqual(expanded.entries.map((entry) => entry.path), ['tree/.gitignore', 'tree/x.git']);
    });
});
