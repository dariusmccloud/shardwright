import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildReviewSelectionKey,
    buildPrimaryWorkflowStatus,
    buildQueueGroups,
    getRevisionFilterStatus,
    groupMatchesStatusFilter,
    isQueueGroupSelected,
    reviewMatchesSelection,
} from './interpretive-review-queue-state.js';

function makeReview(overrides = {}) {
    return {
        reviewRequestId: overrides.reviewRequestId || 'req-1',
        interpretationRevisionId: overrides.interpretationRevisionId || 'rev-1',
        reviewerEntityId: overrides.reviewerEntityId || 'user:Chris',
        reviewerRole: overrides.reviewerRole || 'RELATIONAL_PARTICIPANT',
        status: overrides.status || 'APPROVED',
        reviewState: overrides.reviewState || 'COMPLETE',
        subjectDispositionState: overrides.subjectDispositionState || 'PENDING',
        publicationState: overrides.publicationState || 'NOT_PUBLISHED',
        operatorState: overrides.operatorState || null,
        canonicalRevisionState: overrides.canonicalRevisionState || null,
        disposition: overrides.disposition || null,
    };
}

test('approved but unpublished revisions stay under Approved until eligibility passes', () => {
    const review = makeReview({
        subjectDispositionState: 'GRANTED',
        operatorState: {
            latestQualification: {
                eligibilityVerdict: 'INELIGIBLE',
            },
        },
    });

    assert.equal(getRevisionFilterStatus(review), 'APPROVED');
    assert.equal(buildPrimaryWorkflowStatus(review, review.operatorState), 'Approved');
});

test('granted and eligible revisions move into Ready for publication', () => {
    const review = makeReview({
        subjectDispositionState: 'GRANTED',
        operatorState: {
            latestQualification: {
                eligibilityVerdict: 'ELIGIBLE',
            },
        },
    });

    assert.equal(getRevisionFilterStatus(review), 'READY_FOR_PUBLICATION');
    assert.equal(buildPrimaryWorkflowStatus(review, review.operatorState), 'Ready for publication');
});

test('published revisions classify as Published instead of stale pending states', () => {
    const review = makeReview({
        subjectDispositionState: 'PENDING',
        publicationState: 'PUBLISHED',
        operatorState: {
            currentActiveRecord: {
                sourceInterpretationRevisionId: 'rev-1',
            },
        },
    });

    assert.equal(getRevisionFilterStatus(review), 'PUBLISHED');
    assert.equal(buildPrimaryWorkflowStatus(review, review.operatorState), 'Published');
});

test('queue filters distinguish approved, publishable, and published revisions', () => {
    const reviews = [
        makeReview({
            reviewRequestId: 'approved-1',
            interpretationRevisionId: 'rev-approved',
            subjectDispositionState: 'GRANTED',
            operatorState: {
                latestQualification: {
                    eligibilityVerdict: 'INELIGIBLE',
                },
            },
        }),
        makeReview({
            reviewRequestId: 'ready-1',
            interpretationRevisionId: 'rev-ready',
            subjectDispositionState: 'GRANTED',
            operatorState: {
                latestQualification: {
                    eligibilityVerdict: 'ELIGIBLE',
                },
            },
        }),
        makeReview({
            reviewRequestId: 'published-1',
            interpretationRevisionId: 'rev-published',
            subjectDispositionState: 'GRANTED',
            publicationState: 'PUBLISHED',
            operatorState: {
                currentActiveRecord: {
                    sourceInterpretationRevisionId: 'rev-published',
                },
            },
        }),
    ];

    const groups = buildQueueGroups(reviews);
    assert.equal(groups.length, 3);

    const approvedGroup = groups.find((entry) => entry.interpretationRevisionId === 'rev-approved');
    const readyGroup = groups.find((entry) => entry.interpretationRevisionId === 'rev-ready');
    const publishedGroup = groups.find((entry) => entry.interpretationRevisionId === 'rev-published');

    assert.equal(groupMatchesStatusFilter(approvedGroup, 'APPROVED'), true);
    assert.equal(groupMatchesStatusFilter(approvedGroup, 'READY_FOR_PUBLICATION'), false);
    assert.equal(groupMatchesStatusFilter(approvedGroup, 'PUBLISHED'), false);

    assert.equal(groupMatchesStatusFilter(readyGroup, 'APPROVED'), false);
    assert.equal(groupMatchesStatusFilter(readyGroup, 'READY_FOR_PUBLICATION'), true);
    assert.equal(groupMatchesStatusFilter(readyGroup, 'PUBLISHED'), false);

    assert.equal(groupMatchesStatusFilter(publishedGroup, 'APPROVED'), false);
    assert.equal(groupMatchesStatusFilter(publishedGroup, 'READY_FOR_PUBLICATION'), false);
    assert.equal(groupMatchesStatusFilter(publishedGroup, 'PUBLISHED'), true);
});

test('approve-with-edit remains filterable by reviewer disposition even when the revision state is broader', () => {
    const group = buildQueueGroups([
        makeReview({
            reviewRequestId: 'edit-1',
            interpretationRevisionId: 'rev-edit',
            subjectDispositionState: 'PENDING',
            status: 'APPROVED',
            disposition: {
                disposition: 'APPROVE_WITH_EDIT',
            },
        }),
    ])[0];

    assert.equal(groupMatchesStatusFilter(group, 'APPROVE_WITH_EDIT'), true);
});

test('queue group selection requires an exact request and revision pair when both are known', () => {
    const [groupA, groupB] = buildQueueGroups([
        makeReview({
            reviewRequestId: 'req-a',
            interpretationRevisionId: 'rev-a',
        }),
        makeReview({
            reviewRequestId: 'req-b',
            interpretationRevisionId: 'rev-b',
        }),
    ]);

    assert.equal(isQueueGroupSelected(groupA, 'req-b', 'rev-a'), false);
    assert.equal(isQueueGroupSelected(groupB, 'req-b', 'rev-a'), false);
});

test('queue group selection falls back to request id when no revision id is provided', () => {
    const [groupA, groupB] = buildQueueGroups([
        makeReview({
            reviewRequestId: 'req-a',
            interpretationRevisionId: 'rev-a',
        }),
        makeReview({
            reviewRequestId: 'req-b',
            interpretationRevisionId: 'rev-b',
        }),
    ]);

    assert.equal(isQueueGroupSelected(groupA, 'req-b', ''), false);
    assert.equal(isQueueGroupSelected(groupB, 'req-b', ''), true);
});

test('queue group selection does not bleed across revisions when review request ids are reused', () => {
    const [groupA, groupB] = buildQueueGroups([
        makeReview({
            reviewRequestId: 'req-shared',
            interpretationRevisionId: 'rev-a',
        }),
        makeReview({
            reviewRequestId: 'req-shared',
            interpretationRevisionId: 'rev-b',
        }),
    ]);

    assert.equal(isQueueGroupSelected(groupA, 'req-shared', 'rev-a'), true);
    assert.equal(isQueueGroupSelected(groupB, 'req-shared', 'rev-a'), false);
    assert.equal(isQueueGroupSelected(groupA, 'req-shared', 'rev-b'), false);
    assert.equal(isQueueGroupSelected(groupB, 'req-shared', 'rev-b'), true);
});

test('review selection keys and matching stay revision-specific when request ids are reused', () => {
    const reviewA = makeReview({
        reviewRequestId: 'req-shared',
        interpretationRevisionId: 'rev-a',
    });
    const reviewB = makeReview({
        reviewRequestId: 'req-shared',
        interpretationRevisionId: 'rev-b',
    });

    assert.equal(buildReviewSelectionKey('req-shared', 'rev-a'), 'req-shared::rev-a');
    assert.equal(reviewMatchesSelection(reviewA, 'req-shared', 'rev-a'), true);
    assert.equal(reviewMatchesSelection(reviewB, 'req-shared', 'rev-a'), false);
    assert.equal(reviewMatchesSelection(reviewA, 'req-shared', 'rev-b'), false);
    assert.equal(reviewMatchesSelection(reviewB, 'req-shared', 'rev-b'), true);
});
