import { getStoragePaths } from './core.js';
import { resolveTranscriptCharacterInstance } from './transcript-character-binding.js';

const [storageRoot, bindingToken] = process.argv.slice(2);
process.stdout.write(JSON.stringify({
    characterInstanceId: resolveTranscriptCharacterInstance(getStoragePaths(storageRoot), bindingToken),
}));
