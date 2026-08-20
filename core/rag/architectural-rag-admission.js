import { buildChunkHash } from './chunk-hash.js';
import {
    classifySavedShardText,
    SAVED_SHARD_CLASSIFICATIONS,
} from '../summarization/saved-shard-identity.js';
import {
    ARCHITECTURAL_PROFILE,
    ARCHITECTURAL_SCHEMA_VERSION,
    getSharderSectionRegistry,
} from '../summarization/sharder-section-registry.js';
import { parseArchitecturalExtractionResponse } from '../summarization/architectural-sharder-format.js';
import {
    parseArchitecturalDecisionRecord,
    parseArchitecturalDialogueRecord,
    parseArchitecturalEventRecord,
    parseArchitecturalThreadRecord,
} from '../summarization/architectural-record-parser.js';
import { inspectCanonicalArchitecturalOutput } from '../summarization/architectural-sharder-shell.js';

export const ARCHITECTURAL_RAG_PROJECTION_VERSION = 1;

function refusal(code, message) {
    return { eligible: false, code, reason: 'architectural-rag-admission-refused', message };
}

function clean(value) {
    return String(value || '').trim();
}

function getDeclaredSourceRange(shardInfo) {
    if (Number.isInteger(shardInfo?.startIndex) && Number.isInteger(shardInfo?.endIndex)) {
        return { startIndex: shardInfo.startIndex, endIndex: shardInfo.endIndex };
    }
    const sources = (shardInfo?.keyMetadata?.keyLines || [])
        .map((line) => String(line || '').match(/^Sources\s*:\s*Messages\s*(\d+)\s*[-–]\s*(\d+)\s*$/iu))
        .find(Boolean);
    return sources
        ? { startIndex: Number.parseInt(sources[1], 10), endIndex: Number.parseInt(sources[2], 10) }
        : null;
}

function normalizeEnvelope(envelope) {
    if (!envelope || envelope.persisted !== true) return null;
    const sourceType = clean(envelope.sourceType);
    const chatId = clean(envelope.chatId);
    const sourceUid = clean(envelope.sourceUid);
    const sourceIdentityHash = clean(envelope.sourceIdentityHash);
    const sourceRevisionHash = clean(envelope.sourceRevisionHash);
    const startIndex = Number.parseInt(envelope.startIndex, 10);
    const endIndex = Number.parseInt(envelope.endIndex, 10);
    const messageIds = Array.isArray(envelope.sourceMessageIds)
        ? envelope.sourceMessageIds.map(clean).filter(Boolean)
        : [];

    if (!['system-message', 'lorebook-entry'].includes(sourceType)
        || !chatId || !sourceUid
        || !Number.isInteger(startIndex) || !Number.isInteger(endIndex) || endIndex < startIndex
        || !sourceIdentityHash || !sourceRevisionHash || messageIds.length !== endIndex - startIndex + 1) {
        return null;
    }
    return {
        sourceType,
        chatId,
        sourceUid,
        startIndex,
        endIndex,
        sourceMessageIds: messageIds,
        sourceIdentityHash,
        sourceRevisionHash,
    };
}

function recordIdentity(sectionKey, item, ordinal) {
    if (sectionKey === 'decisions') {
        return clean(parseArchitecturalDecisionRecord(item?.content || '').decisionId);
    }
    if (sectionKey === 'threads') {
        return clean(parseArchitecturalThreadRecord(item?.content || '').subject).toLowerCase();
    }
    if (sectionKey === 'current') return 'current';
    return clean(item?.sourceRef?.normalized || item?.sourceRef || '') || `${sectionKey}-${ordinal + 1}`;
}

function collectRecordErrors(sections) {
    const parserBySection = {
        decisions: parseArchitecturalDecisionRecord,
        events: parseArchitecturalEventRecord,
        dialogue: parseArchitecturalDialogueRecord,
        threads: parseArchitecturalThreadRecord,
    };
    const errors = [];
    for (const [sectionKey, parser] of Object.entries(parserBySection)) {
        const items = Array.isArray(sections?.[sectionKey]) ? sections[sectionKey] : [];
        items.forEach((item, itemIndex) => {
            const record = parser(item?.content || '');
            for (const diagnostic of (record?.errors || [])) {
                errors.push({ sectionKey, itemIndex, ...diagnostic });
            }
        });
    }
    return errors;
}

/**
 * Turn one already-persisted Architectural shard into profile-isolated vector
 * projection candidates. This function never persists or mutates authority.
 */
export function prepareArchitecturalRagProjection(text, envelope) {
    const shardInfo = classifySavedShardText(text);
    if (shardInfo?.keyMetadata?.hasExactProfile === true && shardInfo?.keyMetadata?.hasExactSchema !== true) {
        return refusal('ARCH_RAG_SCHEMA_UNSUPPORTED', 'The Architectural shard schema is not supported by this projection version.');
    }
    if (shardInfo.classification !== SAVED_SHARD_CLASSIFICATIONS.ARCHITECTURAL) {
        return refusal('ARCH_RAG_PROFILE_INVALID', 'Only a valid Architectural shard may enter the Architectural retrieval projection.');
    }
    if (shardInfo.schemaVersion !== ARCHITECTURAL_SCHEMA_VERSION) {
        return refusal('ARCH_RAG_SCHEMA_UNSUPPORTED', 'The Architectural shard schema is not supported by this projection version.');
    }

    const source = normalizeEnvelope(envelope);
    if (!source) {
        return refusal('ARCH_RAG_SOURCE_NOT_PERSISTED', 'Architectural retrieval indexing requires a persisted source envelope with exact source bindings.');
    }
    const declaredRange = getDeclaredSourceRange(shardInfo);
    if (!declaredRange || source.startIndex !== declaredRange.startIndex || source.endIndex !== declaredRange.endIndex) {
        return refusal('ARCH_RAG_SOURCE_RANGE_MISMATCH', 'Architectural shard source range does not match its persisted source envelope.');
    }

    const registry = getSharderSectionRegistry(ARCHITECTURAL_PROFILE);
    const shell = inspectCanonicalArchitecturalOutput(shardInfo.body, registry);
    if (!shell.beginsWithKey || shell.unsupportedHeaders.length > 0
        || shell.currentHeaderCount !== 1 || shell.terminatorCount !== 1
        || !shell.endsWithTerminator || shell.hasTrailingContent) {
        return refusal('ARCH_RAG_SHARD_MALFORMED', 'Architectural retrieval indexing requires a canonical, complete shard shell.');
    }

    const sections = parseArchitecturalExtractionResponse(shardInfo.body, registry);
    const errors = collectRecordErrors(sections);
    if (errors.length > 0) {
        return { ...refusal('ARCH_RAG_SHARD_INVALID', 'Architectural retrieval indexing refused a structurally invalid shard.'), diagnostics: errors };
    }

    const sourceContentHash = buildChunkHash(shardInfo.body);
    const chunks = [];
    for (const section of registry.contentSections) {
        const items = Array.isArray(sections?.[section.key]) ? sections[section.key] : [];
        items.forEach((item, ordinal) => {
            const identity = recordIdentity(section.key, item, ordinal);
            if (!identity) return;
            const chunkText = clean(item?.content);
            if (!chunkText) return;
            const hash = buildChunkHash([
                ARCHITECTURAL_PROFILE,
                ARCHITECTURAL_RAG_PROJECTION_VERSION,
                source.chatId,
                source.sourceUid,
                section.key,
                identity,
                chunkText,
            ].join('|'));
            chunks.push({
                text: chunkText,
                hash,
                index: source.startIndex,
                metadata: {
                    hash,
                    text: chunkText,
                    isSummaryChunk: true,
                    messageIndex: source.startIndex,
                    startIndex: source.startIndex,
                    endIndex: source.endIndex,
                    speaker: 'SummarySharder',
                    characterName: null,
                    shardProfile: ARCHITECTURAL_PROFILE,
                    schemaVersion: ARCHITECTURAL_SCHEMA_VERSION,
                    projectionVersion: ARCHITECTURAL_RAG_PROJECTION_VERSION,
                    sourceType: source.sourceType,
                    sourceChatId: source.chatId,
                    sourceUid: source.sourceUid,
                    sourceMessageIds: [...source.sourceMessageIds],
                    sourceIdentityHash: source.sourceIdentityHash,
                    sourceRevisionHash: source.sourceRevisionHash,
                    sourceContentHash,
                    sectionType: section.key,
                    recordIdentity: identity,
                    keywords: [],
                    importance: 100,
                    sceneCode: null,
                    timestamp: Date.now(),
                },
            });
        });
    }

    if (chunks.length === 0) {
        return refusal('ARCH_RAG_SHARD_EMPTY', 'Architectural retrieval indexing requires at least one eligible content record.');
    }
    return { eligible: true, source, sourceContentHash, chunks };
}
