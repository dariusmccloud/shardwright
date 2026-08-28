// Invoked only by identity.test.mjs in a separate Node process to prove Context Sheet
// Identity ledger read-back survives process restart.
import { getStoragePaths } from './core.js';
import { readContextSheetIdentityLedger } from './identity.js';

const storageRoot = process.argv[2];
const paths = getStoragePaths(storageRoot);
const entries = readContextSheetIdentityLedger(paths);
process.stdout.write(JSON.stringify(entries));
