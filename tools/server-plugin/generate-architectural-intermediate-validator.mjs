import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from './summary-sharder-memory/node_modules/ajv/dist/2020.js';
import standaloneCode from './summary-sharder-memory/node_modules/ajv/dist/standalone/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const schemaPath = path.join(repoRoot, 'core', 'summarization', 'architectural-intermediate-schema-v1.json');
const outputPath = path.join(currentDir, 'summary-sharder-memory', 'architectural-intermediate-validator.generated.cjs');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    code: { source: true },
});
const validate = ajv.compile(schema);
let generated = standaloneCode(ajv, validate);
generated = generated
    .replace(
        /const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/gu,
        'const $1 = (value) => Array.from(value).length;',
    )
    .replace(
        /const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/gu,
        'const $1 = require("node:util").isDeepStrictEqual;',
    );
if (/require\("ajv\//u.test(generated)) {
    throw new Error('Generated architectural validator still depends on the Ajv runtime.');
}

fs.writeFileSync(
    outputPath,
    `// Generated from core/summarization/architectural-intermediate-schema-v1.json. Do not edit.\n${generated}`,
    'utf8',
);
process.stdout.write(`${outputPath}\n`);
