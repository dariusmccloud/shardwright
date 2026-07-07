import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDecisionHistoryEntries,
    buildPublicationHistoryEntries,
    buildReviewHistoryEntries,
} from './interpretive-review-history-state.js';

function makeInterpretation(overrides = {}) {
    return {
        memorySubjectId: 'character:jeep.png',
        reviewRequests: [
            {
                reviewRequestId: 'req-jeep',
                reviewerEntityId: 'character:jeep.png',
                reviewerRole: 'MEMORY_SUBJECT',
                status: 'APPROVED',
                createdAt: 100,
            },
            {
                reviewRequestId: 'req-chris',
                reviewerEntityId: 'user:Chris',
                reviewerRole: 'RELATIONAL_PARTICIPANT',
                status: 'PENDING',
                createdAt: 200,
            },
        ],
        reviewDispositions: [
            {
                reviewRequestId: 'req-jeep',
                disposition: 'APPROVE_WITH_EDIT',
                commentary: 'Tighten the wording.',
                submittedAt: 300,
                provenance: {
                    submissionMode: 'SUBJECT_EXPRESSED_AND_RECORDED',
                    submittedByActorId: 'user:Chris',
                    dispositionOwnerId: 'character:jeep.png',
                },
            },
        ],
        subjectDisposition: {
            state: 'GRANTED',
            commentary: 'Final grant recorded.',
            recordedAt: 400,
            provenance: {
                submissionMode: 'SUBJECT_EXPRESSED_AND_RECORDED',
                submittedByActorId: 'user:Chris',
                dispositionOwnerId: 'character:jeep.png',
            },
        },
        ...overrides,
    };
}

test('review history entries keep selected reviewer first and show pending copy', () => {
    const entries = buildReviewHistoryEntries(makeInterpretation(), 'req-chris');

    assert.equal(entries.length, 2);
    assert.equal(entries[0].reviewRequestId, 'req-chris');
    assert.equal(entries[0].title, 'Chris pending');
    assert.deepEqual(entries[0].extraLines, ['Decision still required.']);
    assert.equal(entries[1].title, 'Jeep approved with changes');
});

test('decision history distinguishes recorded reviews from publication decisions', () => {
    const entries = buildDecisionHistoryEntries(makeInterpretation(), 'req-jeep');

    assert.equal(entries.length, 2);
    assert.equal(entries[0].title, 'Review recorded: Jeep approved with changes');
    assert.equal(entries[0].commentaryLabel, 'Recorded note');
    assert.equal(entries[1].title, 'Publication decision: Jeep granted');
    assert.equal(entries[1].commentaryLabel, 'Decision note');
});

test('publication history includes the current active record and deduplicates duplicates', () => {
    const activeRecord = {
        dnmRecordId: 'rec-active',
        lifecycleState: 'ACTIVE',
        publicationState: 'PUBLISHED',
        publishedAt: 300,
    };
    const records = [
        {
            dnmRecordId: 'rec-old',
            lifecycleState: 'WITHDRAWN',
            publicationState: 'PUBLISHED',
            publishedAt: 100,
        },
        {
            dnmRecordId: 'rec-active',
            lifecycleState: 'ACTIVE',
            publicationState: 'PUBLISHED',
            publishedAt: 300,
        },
    ];

    const entries = buildPublicationHistoryEntries(records, activeRecord);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].record.dnmRecordId, 'rec-active');
    assert.equal(entries[0].isCurrent, true);
    assert.equal(entries[0].title, 'Published and active');
    assert.equal(entries[1].title, 'Published and later withdrawn');
});
