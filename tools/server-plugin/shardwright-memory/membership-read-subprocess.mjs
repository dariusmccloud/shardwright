// Invoked only by membership.test.mjs, in a separate Node process, to prove the membership
// ledger read-back survives an actual process restart rather than only a stateless re-read
// within the same process.
import { getStoragePaths } from './core.js';
import { readContextSheetMembershipLedger } from './membership.js';

const storageRoot = process.argv[2];
const paths = getStoragePaths(storageRoot);
const entries = readContextSheetMembershipLedger(paths);
process.stdout.write(JSON.stringify(entries));
