// Step 4 pilot, slice pilot-1-plugin-engines-node: runner-captured proof. Run from the repository root.
// Passes only when the plugin declares its minimum Node version, the payload manifest
// carries the new package.json bytes, and the packaging suite still passes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const pluginDir = path.join('tools', 'server-plugin', 'shardwright-memory');
const packageBytes = fs.readFileSync(path.join(pluginDir, 'package.json'));
const pkg = JSON.parse(packageBytes.toString('utf8'));
assert.equal(pkg.engines?.node, '>=24.21.0', 'package.json must declare engines.node ">=24.21.0"');

const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'payload-manifest.json'), 'utf8'));
const entry = manifest.payloadFiles.find((file) => file.relativePath === 'package.json');
assert.ok(entry, 'payload-manifest.json must list package.json');
assert.equal(entry.sha256, crypto.createHash('sha256').update(packageBytes).digest('hex'),
    'payload-manifest.json must carry the current package.json hash (rerun the packager)');
console.log('engines.node and payload manifest: ok');

const suite = spawnSync(process.execPath, ['--test', 'package.test.mjs'], { cwd: pluginDir, stdio: 'inherit' });
process.exit(suite.status ?? 1);
