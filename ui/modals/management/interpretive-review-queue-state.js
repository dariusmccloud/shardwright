export function summarizeReviewWorkflowCode(reviews) {
    const normalized = (Array.isArray(reviews) ? reviews : [])
        .map((review) => String(review?.status || '').trim().toUpperCase())
        .filter(Boolean);
    if (normalized.some((value) => value === 'PENDING')) return 'PENDING';
    if (normalized.some((value) => value === 'CONTESTED')) return 'CONTESTED';
    if (normalized.some((value) => value === 'DEFERRED')) return 'DEFERRED';
    if (normalized.some((value) => value === 'REJECTED')) return 'REJECTED';
    if (normalized.length > 0 && normalized.every((value) => value === 'APPROVED')) return 'COMPLETE';
    return '';
}

export function buildQueueGroups(reviews) {
    const groups = [];
    const groupsByRevisionId = new Map();

    for (const review of Array.isArray(reviews) ? reviews : []) {
        const revisionId = String(review?.interpretationRevisionId || '').trim();
        if (!revisionId) {
            continue;
        }
        let group = groupsByRevisionId.get(revisionId) || null;
        if (!group) {
            group = {
                interpretationRevisionId: revisionId,
                reviews: [],
            };
            groupsByRevisionId.set(revisionId, group);
            groups.push(group);
        }
        group.reviews.push(review);
    }

    return groups;
}

export function getQueueGroupRepresentativeReview(reviews) {
    const items = Array.isArray(reviews) ? reviews : [];
    return items.find((review) => String(review?.status || '').trim().toUpperCase() === 'PENDING')
        || items[0]
        || null;
}

export function getRevisionLifecycleStatus(interpretation, operatorState) {
    const publicationState = String(interpretation?.publicationState || '').trim().toUpperCase();
    const recordsForTarget = Array.isArray(operatorState?.recordsForTarget) ? operatorState.recordsForTarget : [];
    const activeRecord = operatorState?.currentActiveRecord || null;
    const activeRevisionId = String(activeRecord?.sourceInterpretationRevisionId || '').trim();
    const revisionId = String(interpretation?.interpretationRevisionId || '').trim();
    const reviewWorkflow = summarizeReviewWorkflowCode(interpretation?.reviewRequests);

    const record = !revisionId
        ? null
        : recordsForTarget
            .filter((entry) => String(entry?.sourceInterpretationRevisionId || '').trim() === revisionId)
            .sort((left, right) => Number(right?.publishedAt || 0) - Number(left?.publishedAt || 0))[0] || null;

    if (record?.lifecycleState === 'WITHDRAWN') {
        return 'WITHDRAWN';
    }
    if (record?.supersededByDnmRecordId) {
        return 'SUPERSEDED';
    }
    if (publicationState === 'PUBLISHED' && activeRevisionId === revisionId) {
        return 'ACTIVE';
    }
    if (publicationState === 'PUBLISHED') {
        return 'PUBLISHED';
    }
    if (reviewWorkflow) {
        return reviewWorkflow;
    }
    if (String(interpretation?.subjectDispositionState || '').trim().toUpperCase() === 'GRANTED') {
        return 'GRANTED';
    }
    return String(interpretation?.reviewState || '').trim().toUpperCase() || 'PENDING';
}

export function getRevisionFilterStatus(interpretationLike) {
    const reviewWorkflow = summarizeReviewWorkflowCode(interpretationLike?.reviewRequests)
        || String(interpretationLike?.reviewState || '').trim().toUpperCase();
    const subjectState = String(interpretationLike?.subjectDispositionState || '').trim().toUpperCase() || 'PENDING';
    const publicationState = String(interpretationLike?.publicationState || '').trim().toUpperCase();
    const guidedFlowStatus = String(interpretationLike?.operatorState?.guidedFlow?.status || '').trim().toUpperCase();
    const latestEligibilityVerdict = String(interpretationLike?.operatorState?.latestQualification?.eligibilityVerdict || '').trim().toUpperCase();

    if (reviewWorkflow === 'PENDING') return 'PENDING_APPROVAL';
    if (reviewWorkflow === 'CONTESTED') return 'CONTESTED';
    if (reviewWorkflow === 'DEFERRED') return 'DEFERRED';
    if (reviewWorkflow === 'REJECTED') return 'REJECTED';
    if (publicationState === 'PUBLISHED') return 'PUBLISHED';
    if (reviewWorkflow === 'COMPLETE' && subjectState === 'PENDING') return 'PENDING_DECISION';
    if (subjectState === 'GRANTED' && publicationState !== 'PUBLISHED') {
        if (latestEligibilityVerdict === 'ELIGIBLE' || guidedFlowStatus === 'READY_TO_PUBLISH') {
            return 'READY_FOR_PUBLICATION';
        }
        return 'APPROVED';
    }
    if (subjectState === 'DENIED') return 'REJECTED';
    if (reviewWorkflow === 'COMPLETE') return 'APPROVED';
    return '';
}

export function groupMatchesStatusFilter(group, statusFilter = '') {
    const normalizedFilter = String(statusFilter || '').trim().toUpperCase();
    if (!normalizedFilter) {
        return true;
    }
    const reviews = Array.isArray(group?.reviews) ? group.reviews : [];
    const representativeReview = getQueueGroupRepresentativeReview(reviews);
    if (!representativeReview) {
        return false;
    }
    const canonicalRevisionState = representativeReview?.canonicalRevisionState || null;
    const revisionStatus = getRevisionFilterStatus({
        reviewRequests: reviews,
        reviewState: canonicalRevisionState?.reviewState ?? representativeReview.reviewState,
        subjectDispositionState: canonicalRevisionState?.subjectDispositionState ?? representativeReview.subjectDispositionState,
        publicationState: canonicalRevisionState?.publicationState ?? representativeReview.publicationState,
        operatorState: representativeReview?.operatorState || canonicalRevisionState?.operatorState || null,
    });
    if (revisionStatus === normalizedFilter) {
        return true;
    }
    if (normalizedFilter === 'APPROVE_WITH_EDIT' || normalizedFilter === 'APPROVE_FOR_SCOPE_ONLY') {
        return reviews.some((review) => String(review?.disposition?.disposition || '').trim().toUpperCase() === normalizedFilter);
    }
    return false;
}

export function buildPrimaryWorkflowStatus(interpretation, operatorState) {
    const reviewWorkflow = summarizeReviewWorkflowCode(interpretation?.reviewRequests)
        || String(interpretation?.reviewState || '').trim().toUpperCase();
    const subjectState = String(interpretation?.subjectDispositionState || '').trim().toUpperCase() || 'PENDING';
    const publicationState = String(interpretation?.publicationState || '').trim().toUpperCase();
    const lifecycleStatus = getRevisionLifecycleStatus(interpretation, operatorState);
    const latestEligibilityVerdict = String(operatorState?.latestQualification?.eligibilityVerdict || '').trim().toUpperCase();

    if (reviewWorkflow === 'PENDING') return 'Pending approval';
    if (reviewWorkflow === 'CONTESTED') return 'Contested';
    if (reviewWorkflow === 'DEFERRED') return 'Deferred';
    if (reviewWorkflow === 'REJECTED') return 'Rejected';
    if (lifecycleStatus === 'WITHDRAWN') return 'Withdrawn';
    if (lifecycleStatus === 'SUPERSEDED') return 'Superseded';
    if (publicationState === 'PUBLISHED') return 'Published';
    if (reviewWorkflow === 'COMPLETE' && subjectState === 'PENDING') return 'Pending decision';
    if (subjectState === 'GRANTED') {
        if (latestEligibilityVerdict === 'ELIGIBLE') return 'Ready for publication';
        return 'Approved';
    }
    if (subjectState === 'DENIED') return 'Decision denied';
    if (reviewWorkflow === 'COMPLETE') return 'Approved';
    return 'Pending';
}
