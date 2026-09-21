// Static endpoint-surface check (NOT a behavioral test).
// Compares Similharity plugin routes defined in a plugin checkout against the
// plugin paths Shardwright's RAG client code references.
// Usage: node vendor/similharity/check-endpoints.mjs <path-to-similharity-checkout>
import fs from 'node:fs';
import path from 'node:path';

const pluginDir = process.argv[2];
if (!pluginDir) { console.error('Usage: node check-endpoints.mjs <similharity-checkout>'); process.exit(2); }

const pluginSrc = fs.readFileSync(path.join(pluginDir, 'index.js'), 'utf8');
const defined = new Set([...pluginSrc.matchAll(/router\.(?:get|post|put|delete)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
const toPattern = (route) => new RegExp('^' + route.replace(/:[A-Za-z]+/g, '[^/]+') + '$');

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
        else if (/\.js$/.test(e.name) && !/\.test\.[mc]?js$/.test(e.name)) out.push(p);
    }
    return out;
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const referenced = new Map();
for (const file of walk(path.join(root, 'core', 'rag'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/['"`](\/(?:health|collections|sources|get-embedding|batch-embeddings|backend\/[^'"`?]+|chunks\/[A-Za-z-]+(?:\/[^'"`?$]*)?|purge-all|rerank|open-folder))['"`]/g)) {
        const route = m[1].replace(/\/\$\{[^}]*\}.*$/, '/x');
        (referenced.get(route) ?? referenced.set(route, new Set()).get(route)).add(path.relative(root, file));
    }
}

let missing = 0;
console.log('Plugin routes defined:', defined.size);
for (const [route, files] of [...referenced].sort()) {
    const ok = [...defined].some((d) => toPattern(d).test(route) || d === route);
    if (!ok) missing++;
    console.log(`${ok ? 'ok     ' : 'MISSING'} ${route}  <- ${[...files].join(', ')}`);
}
console.log(missing === 0 ? 'RESULT: every referenced route exists in the plugin.' : `RESULT: ${missing} referenced route(s) not defined in the plugin.`);
process.exit(missing === 0 ? 0 : 1);
