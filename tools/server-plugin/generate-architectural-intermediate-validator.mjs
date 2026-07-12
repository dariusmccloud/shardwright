import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from './summary-sharder-memory/node_modules/ajv/dist/2020.js';
import standaloneCode from './summary-sharder-memory/node_modules/ajv/dist/standalone/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const schemaPath = path.join(repoRoot, 'core', 'summarization', 'architectural-intermediate-schema-v1.json');
const serverOutputPath = path.join(currentDir, 'summary-sharder-memory', 'architectural-intermediate-validator.generated.cjs');
const browserOutputPath = path.join(repoRoot, 'core', 'summarization', 'architectural-intermediate-validator.generated.js');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function generateValidator({ esm }) {
    const ajv = new Ajv2020({
        allErrors: true,
        strict: true,
        code: { source: true, esm },
    });
    const validate = ajv.compile(schema);
    let generated = standaloneCode(ajv, validate);
    generated = generated.replace(
        /const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/gu,
        'const $1 = (value) => Array.from(value).length;',
    );

    if (esm) {
        const deepEqual = '(left, right) => { if (left === right) return true; if (!left || !right || typeof left !== "object" || typeof right !== "object") return false; if (Array.isArray(left) !== Array.isArray(right)) return false; const leftKeys = Object.keys(left); const rightKeys = Object.keys(right); return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && $FUNC(left[key], right[key])); }';
        generated = generated.replace(
            /const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/gu,
            (_match, functionName) => `const ${functionName} = ${deepEqual.replaceAll('$FUNC', functionName)};`,
        );
    } else {
        generated = generated.replace(
            /const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/gu,
            'const $1 = require("node:util").isDeepStrictEqual;',
        );
    }

    if (/require\("ajv\//u.test(generated)) {
        throw new Error('Generated architectural validator still depends on the Ajv runtime.');
    }
    if (esm && /(?:module\.exports|require\()/u.test(generated)) {
        throw new Error('Generated browser validator still contains CommonJS runtime syntax.');
    }
    return generated;
}

fs.writeFileSync(
    serverOutputPath,
    `// Generated from core/summarization/architectural-intermediate-schema-v1.json. Do not edit.\n${generateValidator({ esm: false })}`,
    'utf8',
);
fs.writeFileSync(
    browserOutputPath,
    `// Generated from architectural-intermediate-schema-v1.json. Do not edit.\n${generateValidator({ esm: true })}`,
    'utf8',
);
process.stdout.write(`${serverOutputPath}\n${browserOutputPath}\n`);
