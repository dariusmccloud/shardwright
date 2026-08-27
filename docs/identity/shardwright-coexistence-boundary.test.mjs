import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const identityRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(identityRoot, '..', '..');

async function readRepoFile(relativePath) {
    return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function collectFiles(directory, extensions) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectFiles(entryPath, extensions);
        return extensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }));
    return nested.flat();
}

function readUpstreamFile(relativePath) {
    const result = spawnSync('git', ['show', `upstream/main:${relativePath}`], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
}

test('upstream and Shardwright manifests define distinct extension-manager identities and load order', async () => {
    const shardwright = JSON.parse(await readRepoFile('manifest.json'));
    const upstream = JSON.parse(readUpstreamFile('manifest.json'));

    for (const field of ['display_name', 'generate_interceptor', 'author', 'version', 'homePage']) {
        assert.notEqual(shardwright[field], upstream[field], `Shared manifest field: ${field}`);
    }
    assert.equal(upstream.generate_interceptor, 'summary_sharder_rearrangeChat');
    assert.equal(shardwright.generate_interceptor, 'shardwright_rearrangeChat');
    assert.ok(upstream.loading_order < shardwright.loading_order);
});

test('Shardwright UI exports no upstream DOM data or CSS variable prefix', async () => {
    const files = await collectFiles(path.join(repoRoot, 'ui'), new Set(['.js', '.css', '.html']));
    const joined = (await Promise.all(files.map((filePath) => readFile(filePath, 'utf8')))).join('\n');

    assert.doesNotMatch(joined, /(?:id|class)=["'][^"']*\bss-/u);
    assert.doesNotMatch(joined, /data-ss-/u);
    assert.doesNotMatch(joined, /--ss-/u);
    assert.match(joined, /--shardwright-primary/u);
});

test('each product owns only its declared interceptor and Shardwright loads after upstream', async () => {
    const indexSource = await readRepoFile('index.js');
    const runtimeIdentity = await readRepoFile('core/shardwright-runtime-identity.js');

    assert.match(indexSource, /registerShardwrightInterceptor\(rearrangeChat, globalThis\)/u);
    assert.doesNotMatch(indexSource, /globalThis\.summary_sharder_rearrangeChat\s*=/u);
    assert.match(runtimeIdentity, /SHARDWRIGHT_INTERCEPTOR_GLOBAL = 'shardwright_rearrangeChat'/u);
    assert.doesNotMatch(runtimeIdentity, /target\[LEGACY_SUMMARY_SHARDER_INTERCEPTOR_GLOBAL\]\s*=/u);
});

test('upstream tree contains no Shardwright-owned runtime namespace', () => {
    const result = spawnSync('git', ['grep', '-n', '-i', 'shardwright', 'upstream/main', '--', 'index.js', 'core', 'ui', 'manifest.json'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });

    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.equal(result.stdout, '');
});

test('Shardwright server route and install guidance are independently owned', async () => {
    const [serverApi, readme] = await Promise.all([
        readRepoFile('core/summarization/architectural-authority-server-api.js'),
        readRepoFile('README.md'),
    ]);

    assert.match(serverApi, /const BASE = '\/api\/plugins\/shardwright-memory'/u);
    assert.doesNotMatch(serverApi, /\/api\/plugins\/summary-sharder-memory/u);
    assert.match(readme, /third-party\/shardwright/u);
    assert.doesNotMatch(readme.match(/## Installation[\s\S]*?\n---/u)?.[0] || '', /third-party\/summary-sharder/u);
});
