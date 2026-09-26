// Step 4 pilot, slice pilot-3-payload-package-json-test: runner-captured proof. Run from the repository root.
// Passes only when package.test.mjs contains, and passes, the named test, and the whole file passes.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const TEST_NAME = 'packaged payload carries package.json declaring an ES module';
const pluginDir = path.join('tools', 'server-plugin', 'shardwright-memory');
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'package.test.mjs'], {
    cwd: pluginDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
process.stdout.write(run.stdout ?? '');
process.stderr.write(run.stderr ?? '');
const escaped = TEST_NAME.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const ranAndPassed = new RegExp(`^\\s*ok \\d+ - ${escaped}\\s*$`, 'mu').test(run.stdout ?? '');
if (!ranAndPassed) {
    console.error(`Required test did not run and pass: "${TEST_NAME}"`);
    process.exit(1);
}
process.exit(run.status ?? 1);
