import assert from 'node:assert/strict';
import test from 'node:test';

import {
    excludeArchitecturalResults,
    filterResultsByOriginBoundary,
    getArchitecturalRagAdmissionRefusal,
} from './architectural-rag-boundary.js';

function makeChunk(hash, metadata = {}) {
    return {
        hash,
        text: hash,
        metadata: { ...metadata },
    };
}

test('primary-query style results exclude architectural chunks while keeping narrative and legacy chunks', () => {
    const results = [
        makeChunk('arch', { shardProfile: 'architectural' }),
        makeChunk('arch-profile-marker', { shardProfile: 'architectural-memory' }),
        {
            hash: 'untagged-arch',
            text: `[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[CURRENT]
Architecture | Stable | Release | Proof | None | Continue

===END===`,
            metadata: {},
        },
        makeChunk('narrative', { shardProfile: 'narrative' }),
        makeChunk('legacy', {}),
    ];

    const filtered = excludeArchitecturalResults(results);

    assert.deepEqual(filtered.map((item) => item.hash), ['narrative', 'legacy']);
});

test('fallback-style filtering excludes architectural chunks without blocking narrative shared reads', () => {
    const results = [
        makeChunk('arch-fallback', { shardProfile: 'architectural', originChatId: 'chat-a' }),
        makeChunk('narrative-fallback', { shardProfile: 'narrative', originChatId: 'chat-b' }),
        makeChunk('legacy-fallback', { originChatId: 'chat-b' }),
    ];

    const filtered = filterResultsByOriginBoundary(results);

    assert.deepEqual(filtered.map((item) => item.hash), ['narrative-fallback', 'legacy-fallback']);
});

test('shared collections can inject narrative chunks across chats but never architectural chunks', () => {
    const results = [
        makeChunk('wrong-chat', { shardProfile: 'narrative', originChatId: 'chat-b' }),
        makeChunk('arch-right-chat', { shardProfile: 'architectural', originChatId: 'chat-a' }),
        makeChunk('narrative-right-chat', { shardProfile: 'narrative', originChatId: 'chat-a' }),
        makeChunk('legacy-right-chat', { originChatId: 'chat-a' }),
    ];

    const filtered = filterResultsByOriginBoundary(results);

    assert.deepEqual(filtered.map((item) => item.hash), ['wrong-chat', 'narrative-right-chat', 'legacy-right-chat']);
});

test('architectural profile refuses vector admission before content inspection', () => {
    const refusal = getArchitecturalRagAdmissionRefusal({
        settings: { sharderProfile: 'architectural' },
        text: 'arbitrary output',
    });

    assert.deepEqual(refusal, {
        code: 'ARCH_RAG_GOVERNED_ADMISSION_REQUIRED',
        reason: 'architectural-rag-governed-admission-required',
        message: 'Architectural content requires governed persisted-source admission and cannot enter warm archive or an unscoped Narrative RAG path.',
        detectedBy: 'active-profile',
    });
});

test('architectural content refuses vector admission even when narrative settings are supplied', () => {
    const refusal = getArchitecturalRagAdmissionRefusal({
        settings: { sharderProfile: 'narrative' },
        text: `[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[CURRENT]
Architecture | Stable | Release | Proof | None | Continue

===END===`,
    });

    assert.equal(refusal?.code, 'ARCH_RAG_GOVERNED_ADMISSION_REQUIRED');
    assert.equal(refusal?.detectedBy, 'content-identity');
});

test('malformed architectural identity fails closed at vector admission', () => {
    const refusal = getArchitecturalRagAdmissionRefusal({
        settings: { sharderProfile: 'narrative' },
        text: `[KEY]
Profile: architectural-memory
Schema: architectural-memory/v999

[DECISIONS]
Malformed identity must not fall through to narrative indexing.

===END===`,
    });

    assert.equal(refusal?.code, 'ARCH_RAG_GOVERNED_ADMISSION_REQUIRED');
    assert.equal(refusal?.detectedBy, 'content-identity');
});

test('architectural metadata refuses archive admission while narrative input remains eligible', () => {
    assert.equal(getArchitecturalRagAdmissionRefusal({
        settings: { sharderProfile: 'narrative' },
        text: 'Narrative memory.',
        metadata: { shardProfile: 'architectural' },
    })?.detectedBy, 'metadata-profile');

    assert.equal(getArchitecturalRagAdmissionRefusal({
        settings: { sharderProfile: 'narrative' },
        text: 'Narrative memory.',
        metadata: { shardProfile: 'narrative' },
    }), null);
});
