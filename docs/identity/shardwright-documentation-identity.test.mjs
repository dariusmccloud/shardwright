import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const identityRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(identityRoot, '..', '..');

async function readRepoFile(relativePath) {
    return readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('release manifest is independently owned by Shardwright', async () => {
    const manifest = JSON.parse(await readRepoFile('manifest.json'));

    assert.equal(manifest.display_name, 'Shardwright');
    assert.equal(manifest.generate_interceptor, 'shardwright_rearrangeChat');
    assert.equal(manifest.author, 'Darius McCloud');
    assert.equal(manifest.version, '0.10.0');
    assert.equal(manifest.homePage, 'https://github.com/dariusmccloud/shardwright');

    assert.notEqual(manifest.display_name, 'Summary Sharder');
    assert.notEqual(manifest.author, 'Promansis');
    assert.notEqual(manifest.version, '0.9');
    assert.notEqual(manifest.homePage, 'https://github.com/Promansis/summary-sharder');
});

test('ordinary installation and feature documentation use current Shardwright identity', async () => {
    const [readme, features] = await Promise.all([
        readRepoFile('README.md'),
        readRepoFile('FEATURES.md'),
    ]);
    const installation = readme.match(/## Installation(?<body>[\s\S]*?)\n---/u)?.groups?.body || '';

    assert.match(readme, /^# Shardwright$/mu);
    assert.match(readme, /Structured continuity for long-form roleplay\./u);
    assert.match(installation, /https:\/\/github\.com\/dariusmccloud\/shardwright/u);
    assert.match(installation, /third-party\/shardwright/u);
    assert.doesNotMatch(installation, /Promansis\/summary-sharder|third-party\/summary-sharder/u);
    assert.match(features, /^# Shardwright - Feature Documentation$/mu);
    assert.doesNotMatch(features, /Summary Sharder/u);
});

test('current authorship and upstream lineage remain distinct and truthful', async () => {
    const readme = await readRepoFile('README.md');

    assert.match(readme, /## Author[\s\S]*Darius McCloud/u);
    assert.match(readme, /Upstream lineage:[\s\S]*Promansis\/summary-sharder/u);
    assert.match(readme, /originally authored by Promansis/u);
    assert.match(readme, /does not identify Promansis as its current author/u);
});
