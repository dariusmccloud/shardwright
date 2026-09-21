import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { createError, parseJsonlRecords, resolveChatJsonlPath } from './core.js';
import { readTranscriptSourceRegistryLedger } from './transcript-source-registry.js';
import { projectTranscriptBranchSourceSequences } from './transcript-branch-source-sequences.js';
import { suggestHistoricalForkSet } from './transcript-branch-lineage-suggestion.js';

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function avatarMatches(value, avatarUrl) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try { return decodeURIComponent(value) === avatarUrl || value === avatarUrl; } catch { return value === avatarUrl; }
}

function discoverGroupSources(hostRequest, characterInstanceId, avatarUrl, registeredGroups) {
    if (!hostRequest || typeof avatarUrl !== 'string' || !avatarUrl.trim()) return [];
    const groupDirectory = hostRequest.user?.directories?.groupChats;
    if (!groupDirectory || !fs.existsSync(groupDirectory)) return [];
    const results = [];
    for (const name of fs.readdirSync(groupDirectory)) {
        if (!name.toLowerCase().endsWith('.jsonl')) continue;
        const groupId = name.slice(0, -path.extname(name).length);
        if (registeredGroups.has(groupId.toLowerCase())) continue;
        const filePath = path.join(groupDirectory, name);
        let bytes;
        try { bytes = fs.readFileSync(filePath); } catch { continue; }
        const parsed = parseJsonlRecords(bytes.toString('utf8'));
        if (parsed.invalidLines.length > 0) continue;
        const evidence = [];
        parsed.records.forEach((record, index) => {
            const candidates = [record?.force_avatar, record?.original_avatar, record?.extra?.force_avatar, record?.extra?.original_avatar];
            if (candidates.some((candidate) => avatarMatches(candidate, avatarUrl))) evidence.push({ index, sendDate: record?.send_date || null });
        });
        if (!evidence.length) continue;
        const evidenceHash = hash({ groupId, avatarUrl, evidence });
        results.push({ characterInstanceId, sourceClass: 'GROUP', groupId, chatLocator: groupId, hostLocator: `${groupId}:${groupId}`, coverageState: 'NOT_SCANNED', historicalParticipantBasis: { groupSourceId: groupId, participantId: avatarUrl, evidenceHash }, discoveryEvidence: { evidenceHash, matchedMessageCount: evidence.length } });
    }
    return results;
}

export function discoverTranscriptCharacterBranches(paths, characterInstanceId, hostRequest = null, avatarUrl = null) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim()) throw createError(400, 'A character instance identity is required.', 'TIR_BRANCH_DISCOVERY_CHARACTER_REQUIRED');
    const projected = projectTranscriptBranchSourceSequences(paths);
    const sources = projected.sources.filter((source) => source.characterInstanceId === characterInstanceId);
    const registeredAll = readTranscriptSourceRegistryLedger(paths).map((entry) => entry.payload).filter((source) => source.characterInstanceId === characterInstanceId);
    const registered = registeredAll.filter((source) => source.sourceClass === 'DIRECT');
    const registeredGroups = new Set(registeredAll.filter((source) => source.sourceClass === 'GROUP').map((source) => source.sourceResolutionLocator?.groupId).filter(Boolean).map((value) => value.toLowerCase()));
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
    unregisteredSources.push(...discoverGroupSources(hostRequest, characterInstanceId, avatarUrl, registeredGroups));
    const coverage = Object.freeze({ registeredCount: sources.length, unregisteredCount: unregisteredSources.length, state: hostRequest ? 'SCANNED_FOR_UNREGISTERED' : 'REGISTERED_ONLY' });
    if (sources.length < 2) return Object.freeze({ state: 'NO_DISCOVERY', reason: 'INSUFFICIENT_SOURCES', characterInstanceId, sourceCount: sources.length, sourceLogicalIds: Object.freeze(sources.map((source) => source.sourceLogicalId)), suggestions: Object.freeze([]), coverage, unregisteredSources: Object.freeze(unregisteredSources.map((source) => Object.freeze(source))) });
    const result = suggestHistoricalForkSet({ sources });
    return Object.freeze({ ...result, characterInstanceId, sourceCount: sources.length, sourceLogicalIds: Object.freeze(sources.map((source) => source.sourceLogicalId)), coverage, unregisteredSources: Object.freeze(unregisteredSources.map((source) => Object.freeze(source))) });
}
