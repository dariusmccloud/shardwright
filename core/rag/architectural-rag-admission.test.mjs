import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_RAG_PROJECTION_VERSION,
    prepareArchitecturalRagProjection,
} from './architectural-rag-admission.js';

const shard = `[MEMORY SHARD: Messages 1-3]\n\n[KEY]\nProfile: architectural-memory\nSchema: architectural-memory/v1\nSources: Messages 1-3\n\n[TIMELINE]\n(S1:1) Architectural profile selected\n\n[DECISIONS]\n(S1:1) 🔴 ID:profile-shell | TYPE:JURISDICTION | DECISION:Use the Architectural profile | PROBLEM:Memory required a governed profile | WHY:Authority must remain explicit | SCOPE:memory | STATUS:ACCEPTED | EVIDENCE:\"Architectural profile selected\"\n\n[THREADS]\n(S2:1) projection proof|status:ACTIVE|intro:S2:1|last:S2:1|index admission pending\n\n[CURRENT]\nProject|Profile selected|Projection proof|Index admission|None|Run proof\n===END===`;

const envelope = {
    persisted: true,
    sourceType: 'system-message',
    chatId: 'chat-a',
    sourceUid: 'saved-output-1',
    startIndex: 1,
    endIndex: 3,
    sourceMessageIds: ['m1', 'm2', 'm3'],
    sourceIdentityHash: 'sha256:identity',
    sourceRevisionHash: 'sha256:revision',
};

test('persisted Architectural shard produces profile-isolated, provenance-complete projection candidates', () => {
    const before = structuredClone(envelope);
    const result = prepareArchitecturalRagProjection(shard, envelope);
    assert.equal(result.eligible, true);
    assert.ok(result.chunks.length >= 4);
    for (const chunk of result.chunks) {
        assert.equal(chunk.metadata.shardProfile, 'architectural');
        assert.equal(chunk.metadata.schemaVersion, 1);
        assert.equal(chunk.metadata.projectionVersion, ARCHITECTURAL_RAG_PROJECTION_VERSION);
        assert.equal(chunk.metadata.sourceChatId, 'chat-a');
        assert.equal(chunk.metadata.sourceUid, 'saved-output-1');
        assert.deepEqual(chunk.metadata.sourceMessageIds, ['m1', 'm2', 'm3']);
        assert.equal(chunk.metadata.sourceIdentityHash, 'sha256:identity');
        assert.equal(chunk.metadata.sourceRevisionHash, 'sha256:revision');
        assert.ok(chunk.metadata.sourceContentHash);
        assert.ok(chunk.metadata.sectionType);
        assert.ok(chunk.metadata.recordIdentity);
    }
    assert.equal(result.chunks.find((item) => item.metadata.sectionType === 'decisions').metadata.recordIdentity, 'profile-shell');
    assert.equal(result.chunks.find((item) => item.metadata.sectionType === 'threads').metadata.recordIdentity, 'projection proof');
    assert.equal(result.chunks.find((item) => item.metadata.sectionType === 'current').metadata.recordIdentity, 'current');
    assert.deepEqual(envelope, before, 'projection preparation must not mutate persisted authority input');
});

test('post-save canonical body uses its KEY source range with the persisted envelope', () => {
    const body = shard.replace(/^\[MEMORY SHARD:[^\n]+\]\n\n/u, '');
    const result = prepareArchitecturalRagProjection(body, envelope);
    assert.equal(result.eligible, true);
});

test('unsaved Architectural text is refused before candidate creation', () => {
    const result = prepareArchitecturalRagProjection(shard, null);
    assert.equal(result.eligible, false);
    assert.equal(result.code, 'ARCH_RAG_SOURCE_NOT_PERSISTED');
    assert.equal(result.chunks, undefined);
});

test('missing exact provenance is refused before candidate creation', () => {
    const result = prepareArchitecturalRagProjection(shard, { ...envelope, sourceMessageIds: [] });
    assert.equal(result.code, 'ARCH_RAG_SOURCE_NOT_PERSISTED');
});

test('persisted range mismatch is refused before candidate creation', () => {
    const result = prepareArchitecturalRagProjection(shard, {
        ...envelope,
        endIndex: 4,
        sourceMessageIds: ['m1', 'm2', 'm3', 'm4'],
    });
    assert.equal(result.code, 'ARCH_RAG_SOURCE_RANGE_MISMATCH');
});

test('malformed, mixed-profile, and unsupported-schema text is refused', () => {
    assert.equal(prepareArchitecturalRagProjection(shard.replace('===END===', ''), envelope).code, 'ARCH_RAG_SHARD_MALFORMED');
    assert.equal(prepareArchitecturalRagProjection(shard.replace('Profile: architectural-memory', 'Profile: narrative-memory'), envelope).code, 'ARCH_RAG_PROFILE_INVALID');
    assert.equal(prepareArchitecturalRagProjection(shard.replace('architectural-memory/v1', 'architectural-memory/v2'), envelope).code, 'ARCH_RAG_SCHEMA_UNSUPPORTED');
});

test('Narrative shard is not admitted to the Architectural projection', () => {
    const narrative = '[MEMORY SHARD: Messages 1-3]\n\n### 🎨 TONE\nQuiet';
    assert.equal(prepareArchitecturalRagProjection(narrative, envelope).code, 'ARCH_RAG_PROFILE_INVALID');
});
