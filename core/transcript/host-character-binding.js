import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';
import { requestShardwrightCharacterInstanceId } from './shardwright-context-planning.js';
import { resolveTranscriptCharacterBindingSetting } from './transcript-character-binding-settings.js';
let bindingToken = null; let characterInstanceId = null;
export function setTranscriptCharacterBindingToken(token) { if (typeof token !== 'string' || !token.trim()) { bindingToken = null; characterInstanceId = null; return false; } bindingToken = token.trim(); characterInstanceId = null; return true; }
export function clearTranscriptCharacterBindingToken() { bindingToken = null; characterInstanceId = null; }
export function restoreTranscriptCharacterBindingFromSettings(settings, hostCharacterIdentifier) {
    const result = resolveTranscriptCharacterBindingSetting(settings, hostCharacterIdentifier);
    if (result.state !== 'BOUND') { clearTranscriptCharacterBindingToken(); return result; }
    setTranscriptCharacterBindingToken(result.bindingToken);
    return result;
}
export async function getCurrentCharacterInstanceId(fetchImpl = globalThis.fetch) { if (!bindingToken || characterInstanceId) return characterInstanceId; const resolved = await requestShardwrightCharacterInstanceId(bindingToken, fetchImpl); if (!resolved) return null; characterInstanceId = resolved; return characterInstanceId; }
export function installTranscriptCharacterBindingCapability(target = globalThis) { const namespace = ensureShardwrightNamespace('transcript', target); const owned = { setBindingToken: setTranscriptCharacterBindingToken, clearBindingToken: clearTranscriptCharacterBindingToken, restoreBindingFromSettings: restoreTranscriptCharacterBindingFromSettings, getCurrentCharacterInstanceId }; for (const [key, value] of Object.entries(owned)) { if (namespace[key] !== undefined && namespace[key] !== value) throw new Error('Shardwright transcript capability conflict: ' + key); namespace[key] = value; } return namespace; }
