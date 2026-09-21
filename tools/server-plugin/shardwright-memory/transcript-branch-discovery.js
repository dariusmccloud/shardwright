import fs from 'node:fs';
import path from 'node:path';
import { createError, resolveChatJsonlPath } from './core.js';
import { readTranscriptSourceRegistryLedger } from './transcript-source-registry.js';
import { projectTranscriptBranchSourceSequences } from './transcript-branch-source-sequences.js';
import { suggestHistoricalForkSet } from './transcript-branch-lineage-suggestion.js';

export function discoverTranscriptCharacterBranches(paths, characterInstanceId, hostRequest = null) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim()) throw createError(400, 'A character instance identity is required.', 'TIR_BRANCH_DISCOVERY_CHARACTER_REQUIRED');
    const projected = projectTranscriptBranchSourceSequences(paths);
    const sources = projected.sources.filter((source) => source.characterInstanceId === characterInstanceId);
    const registered = readTranscriptSourceRegistryLedger(paths).map((entry) => entry.payload).filter((source) => source.characterInstanceId === characterInstanceId && source.sourceClass === 'DIRECT');
    const registeredPaths = new Set();
    const unregisteredSources = [];
    if (hostRequest && registered.length > 0) {
        const first = resolveChatJsonlPath(hostRequest, { isGroup: false, avatarUrl: registered[0].sourceResolutionLocator.avatarUrl, chatLocator: '__discovery__' });
        const chatDirectory = path.dirname(first.chatFilePath);
        for (const source of registered) {
            try { registeredPaths.add(resolveChatJsonlPath(hostRequest, { isGroup: false, avatarUrl: source.sourceResolutionLocator.avatarUrl, chatLocator: source.sourceResolutionLocator.chatLocator }).chatFilePath.toLowerCase()); } catch { /* coverage remains partial */ }
        }
        if (fs.existsSync(chatDirectory)) {
            for (const name of fs.readdirSync(chatDirectory)) {
                if (!name.toLowerCase().endsWith('.jsonl')) continue;
                const filePath = path.join(chatDirectory, name);
                if (!registeredPaths.has(filePath.toLowerCase())) unregisteredSources.push({ characterInstanceId, sourceClass: 'DIRECT', avatarUrl: registered[0].sourceResolutionLocator.avatarUrl, chatLocator: name.slice(0, -5), coverageState: 'NOT_SCANNED' });
            }
        }
    }
    const coverage = Object.freeze({ registeredCount: sources.length, unregisteredCount: unregisteredSources.length, state: hostRequest ? 'SCANNED_FOR_UNREGISTERED' : 'REGISTERED_ONLY' });
    if (sources.length < 2) return Object.freeze({ state: 'NO_DISCOVERY', reason: 'INSUFFICIENT_SOURCES', characterInstanceId, sourceCount: sources.length, sourceLogicalIds: Object.freeze(sources.map((source) => source.sourceLogicalId)), suggestions: Object.freeze([]), coverage, unregisteredSources: Object.freeze(unregisteredSources.map((source) => Object.freeze(source))) });
    const result = suggestHistoricalForkSet({ sources });
    return Object.freeze({ ...result, characterInstanceId, sourceCount: sources.length, sourceLogicalIds: Object.freeze(sources.map((source) => source.sourceLogicalId)), coverage, unregisteredSources: Object.freeze(unregisteredSources.map((source) => Object.freeze(source))) });
}
