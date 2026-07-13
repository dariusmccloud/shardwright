import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    ARCHITECTURAL_FINALIZED_ERROR_CODES,
    hashArchitecturalSourceManifestSet,
    renderFinalizedArchitecturalPayload,
    validateFinalizedArchitecturalPayload,
} from './architectural-finalized-semantic.js';

const finalizedSchema = JSON.parse(await readFile(new URL('./architectural-finalized-schema-v1.json', import.meta.url), 'utf8'));

const currentManifest = Object.freeze({
    manifestId: 'manifest:system-shard:current',
    sourceIdentityHash: `sha256:${'1'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'2'.repeat(64)}`,
    sourceStartPositionAtCreation: 10,
    sourceEndPositionAtCreation: 10,
});

const historicalManifest = Object.freeze({
    manifestId: 'manifest:system-shard:historical',
    sourceIdentityHash: `sha256:${'3'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'4'.repeat(64)}`,
    sourceStartPositionAtCreation: 1,
    sourceEndPositionAtCreation: 2,
});

function binding(reference, manifestId) {
    return { reference, manifestId };
}

function payload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory-finalized',
        generationContext: {
            rangeStart: 10,
            rangeEnd: 10,
            messageIds: ['msg_a'],
            currentManifestId: currentManifest.manifestId,
        },
        sourceManifests: [currentManifest, historicalManifest],
        sections: {
            timeline: [{
                sourceRef: 'S10:1',
                summary: 'Current extraction extends consolidated continuity',
                weight: 4,
                provenance: {
                    originManifestId: currentManifest.manifestId,
                    authorityRecordId: null,
                    referenceBindings: [binding('S10:1', currentManifest.manifestId)],
                },
            }],
            decisions: [{
                sourceRef: 'S1:1',
                weight: 5,
                id: 'historical-authority-remains',
                types: ['GOVERNANCE'],
                decision: 'Historical authority retains its original provenance.',
                why: 'Consolidation does not rewrite source ownership.',
                scope: 'Finalized Architectural shard',
                status: 'SEALED',
                evidence: ['S1:2'],
                provenance: {
                    originManifestId: historicalManifest.manifestId,
                    authorityRecordId: 'authority:historical-authority-remains:v1',
                    referenceBindings: [
                        binding('S1:1', historicalManifest.manifestId),
                        binding('S1:2', historicalManifest.manifestId),
                    ],
                },
            }],
            events: [],
            developments: [],
            dialogue: [],
            threads: [],
            current: [],
        },
    };
}

test('finalized schema descriptor is versioned separately from generation schema', () => {
    assert.equal(finalizedSchema.$id, 'https://summary-sharder/architectural-finalized/v1');
    assert.equal(finalizedSchema.properties.schemaVersion.const, 1);
    assert.equal(finalizedSchema.properties.profile.const, 'architectural-memory-finalized');
});

test('current and inherited records resolve against their named source manifests', async () => {
    const finalized = payload();
    const normalized = validateFinalizedArchitecturalPayload(finalized);
    const rendered = await renderFinalizedArchitecturalPayload(finalized);

    assert.equal(normalized.sections.timeline[0].provenance.originManifestId, currentManifest.manifestId);
    assert.equal(normalized.sections.decisions[0].provenance.originManifestId, historicalManifest.manifestId);
    assert.match(rendered.output, /\[S1:1\].*historical-authority-remains/u);
    assert.match(rendered.output, /\[S10:1\].*Current extraction extends/u);
    assert.equal(rendered.output, (await renderFinalizedArchitecturalPayload(rendered.semanticPayload)).output);
});

test('unbound historical reference is refused', () => {
    const finalized = payload();
    finalized.sections.decisions[0].provenance.referenceBindings = [];

    assert.throws(
        () => validateFinalizedArchitecturalPayload(finalized),
        (error) => error.code === ARCHITECTURAL_FINALIZED_ERROR_CODES.REFERENCE_UNBOUND,
    );
});

test('reference bound to the wrong manifest is refused', () => {
    const finalized = payload();
    finalized.sections.decisions[0].provenance.referenceBindings = [
        binding('S1:1', currentManifest.manifestId),
        binding('S1:2', currentManifest.manifestId),
    ];

    assert.throws(
        () => validateFinalizedArchitecturalPayload(finalized),
        (error) => error.code === ARCHITECTURAL_FINALIZED_ERROR_CODES.REFERENCE_WRONG_MANIFEST,
    );
});

test('manifest order does not change the normalized manifest-set hash', async () => {
    const forward = await hashArchitecturalSourceManifestSet([currentManifest, historicalManifest]);
    const reverse = await hashArchitecturalSourceManifestSet([historicalManifest, currentManifest]);
    assert.equal(forward, reverse);
});
