import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArchitecturalDecisionRecord } from './architectural-record-parser.js';
import {
    ARCHITECTURAL_POST_REVIEW_ERROR_CODES,
    buildArchitecturalReviewRecordId,
    createArchitecturalReviewIntent,
    createArchitecturalPostReviewPlan,
    finalizeArchitecturalPostReview,
} from './architectural-post-review-finalization.js';
import { renderArchitecturalSemanticPayload } from './architectural-semantic-renderer.js';

const currentManifest = Object.freeze({
    manifestId: 'manifest:system-shard:current-review',
    sourceIdentityHash: `sha256:${'1'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'2'.repeat(64)}`,
    sourceStartPositionAtCreation: 10,
    sourceEndPositionAtCreation: 10,
});

const historicalManifest = Object.freeze({
    manifestId: 'manifest:system-shard:historical-review',
    sourceIdentityHash: `sha256:${'3'.repeat(64)}`,
    sourceRevisionHash: `sha256:${'4'.repeat(64)}`,
    sourceStartPositionAtCreation: 1,
    sourceEndPositionAtCreation: 2,
});

function generationPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: { rangeStart: 10, rangeEnd: 10, messageIds: ['msg_current'] },
        sections: {
            timeline: [{ sourceRef: 'S10:1', summary: 'Current record is reviewable', weight: 4 }],
            decisions: [{
                sourceRef: 'S10:2',
                weight: 4,
                id: 'current-decision',
                types: ['IMPLEMENTATION'],
                decision: 'Post-review finalization is code-owned.',
                why: 'UI intent is not replay authority.',
                scope: 'Architectural review',
                status: 'PROPOSED',
                evidence: ['S10:3'],
            }],
            events: [], developments: [], dialogue: [], threads: [], current: [],
        },
    };
}

function inheritedEntry() {
    const content = '[S1:1] 🔴 ID:historical-decision | TYPE:GOVERNANCE | DECISION:Historical authority remains consolidated. | WHY:Continuity retains governing decisions. | SCOPE:Architectural continuity | STATUS:SEALED | EVIDENCE:S1:2';
    return {
        record: parseArchitecturalDecisionRecord(content),
        sourceManifest: historicalManifest,
        authority: { currentRecordVersion: 3 },
    };
}

test('review selection produces one finalized payload whose renderer exactly produces finalOutput', async () => {
    const plan = createArchitecturalPostReviewPlan({
        generationPayload: generationPayload(),
        currentManifest,
        inheritedDecisionEntries: [inheritedEntry()],
    });
    const selectedRecordIds = plan.records
        .map((entry) => entry.recordId)
        .filter((recordId) => recordId !== buildArchitecturalReviewRecordId('timeline', 0));
    const finalized = await finalizeArchitecturalPostReview(plan, { selectedRecordIds, editedRecords: [] });

    assert.equal(finalized.semanticPayload.sections.timeline.length, 0);
    assert.equal(finalized.semanticPayload.sections.decisions.length, 2);
    assert.equal(finalized.finalOutput, finalized.replayArtifact.canonicalOutput);
    assert.deepEqual(finalized.replayArtifact.semanticPayload, finalized.semanticPayload);
});

test('inherited baseline decision retains historical provenance and source reference in replay', async () => {
    const plan = createArchitecturalPostReviewPlan({
        generationPayload: generationPayload(),
        currentManifest,
        inheritedDecisionEntries: [inheritedEntry()],
    });
    const finalized = await finalizeArchitecturalPostReview(plan, {});
    const inherited = finalized.semanticPayload.sections.decisions[0];

    assert.equal(inherited.id, 'historical-decision');
    assert.equal(inherited.sourceRef, 'S1:1');
    assert.equal(inherited.provenance.originManifestId, historicalManifest.manifestId);
    assert.equal(inherited.provenance.authorityRecordId, 'architectural-decision:historical-decision:v3');
    assert.match(finalized.finalOutput, /\[S1:1\].*historical-decision/u);
    assert.deepEqual(finalized.replayArtifact.semanticPayload, finalized.semanticPayload);
});

test('no-change review preserves generated semantic meaning and canonical output', async () => {
    const generated = generationPayload();
    const plan = createArchitecturalPostReviewPlan({ generationPayload: generated, currentManifest });
    const finalized = await finalizeArchitecturalPostReview(plan, {});
    const generatedRender = renderArchitecturalSemanticPayload(generated);

    assert.deepEqual(
        finalized.semanticPayload.sections.timeline.map(({ provenance, ...record }) => record),
        generated.sections.timeline,
    );
    assert.equal(finalized.finalOutput, generatedRender.output);
});

test('unknown review record and raw rendered-text edit intent refuse', async () => {
    const plan = createArchitecturalPostReviewPlan({ generationPayload: generationPayload(), currentManifest });

    await assert.rejects(
        finalizeArchitecturalPostReview(plan, { selectedRecordIds: ['architectural-review:timeline:999'] }),
        (error) => error.code === ARCHITECTURAL_POST_REVIEW_ERROR_CODES.UNKNOWN_RECORD,
    );
    await assert.rejects(
        finalizeArchitecturalPostReview(plan, { editedRecords: [{ recordId: plan.records[0].recordId, content: 'raw edit' }] }),
        (error) => error.code === ARCHITECTURAL_POST_REVIEW_ERROR_CODES.RAW_EDIT_UNSUPPORTED,
    );
});

test('review-intent contract reports selection without compiling authority', () => {
    const originalRecordIds = [
        buildArchitecturalReviewRecordId('timeline', 0),
        buildArchitecturalReviewRecordId('decisions', 0),
    ];
    const intent = createArchitecturalReviewIntent({
        timeline: [{
            reviewRecordId: originalRecordIds[0],
            selected: false,
            content: 'Timeline',
            initialContent: 'Timeline',
        }],
        decisions: [{
            reviewRecordId: originalRecordIds[1],
            selected: true,
            content: 'Decision',
            initialContent: 'Decision',
        }],
    }, originalRecordIds, { baselineAuthorityContext: { scope: 'test' } });

    assert.deepEqual(intent.selectedRecordIds, [originalRecordIds[1]]);
    assert.deepEqual(intent.deselectedRecordIds, [originalRecordIds[0]]);
    assert.deepEqual(intent.editedRecords, []);
    assert.deepEqual(intent.baselineAuthorityContext, { scope: 'test' });
});
