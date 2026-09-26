// Step 4 pilot, slice pilot-2-readme-plugin-troubleshooting: runner-captured proof. Run from the repository root.
// Passes only when README's Troubleshooting table has a server-plugin-not-loading row that
// names the enableServerPlugins setting, a restart, and the server console.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readme = fs.readFileSync('README.md', 'utf8').replaceAll('\r\n', '\n');
const start = readme.indexOf('\n## Troubleshooting\n');
assert.ok(start >= 0, 'README must keep its "## Troubleshooting" section');
const rest = readme.slice(start + 1);
const end = rest.slice(3).search(/\n(?:## |---\n)/u);
const section = end >= 0 ? rest.slice(0, end + 3) : rest;
const rows = section.split('\n').filter((line) => line.startsWith('|') && !/^\|\s*-/u.test(line));
const row = rows.find((line) => /server plugin/iu.test(line) && /not (?:loading|loaded|load)/iu.test(line));
assert.ok(row, 'Troubleshooting needs a row for the server plugin not loading');
assert.match(row, /enableServerPlugins/u, 'the row must name enableServerPlugins');
assert.match(row, /restart/iu, 'the row must say to restart the server');
assert.match(row, /console/iu, 'the row must point to the server console');
console.log(`README troubleshooting row: ok\n${row}`);
