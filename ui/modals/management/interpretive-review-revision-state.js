function hasPublishedRecordForRevision(revisionId, operatorState = null) {
    const normalizedRevisionId = String(revisionId || '').trim();
    if (!normalizedRevisionId) {
        return false;
    }

    const activeRevisionId = String(operatorState?.currentActiveRecord?.sourceInterpretationRevisionId || '').trim();
    if (activeRevisionId === normalizedRevisionId) {
        return true;
    }

    const recordsForTarget = Array.isArray(operatorState?.recordsForTarget) ? operatorState.recordsForTarget : [];
    return recordsForTarget.some((record) =>
        String(record?.sourceInterpretationRevisionId || '').trim() === normalizedRevisionId
        && String(record?.publicationState || '').trim().toUpperCase() === 'PUBLISHED');
}

export function getRevisionOrigin(interpretation, operatorState = null) {
    const parentRevisionId = String(interpretation?.parentRevisionId || '').trim();
    const revisionReason = String(interpretation?.revisionReason || '').trim().toUpperCase();
    const createdFromDispositionId = String(interpretation?.createdFromDispositionId || '').trim();

    if (!parentRevisionId) {
        return {
            code: 'ROOT_PROPOSAL',
            label: 'Root proposal',
            summary: 'Created as the first proposed wording for this memory line.',
        };
    }

    if (hasPublishedRecordForRevision(parentRevisionId, operatorState)) {
        return {
            code: 'POST_PUBLICATION_SUCCESSOR',
            label: 'Post-publication successor',
            summary: 'Created from a published memory so wording can change without replacing the active memory until the successor is reviewed and published.',
        };
    }

    if (revisionReason === 'REVIEW_REQUESTED_REVISION' || createdFromDispositionId) {
        return {
            code: 'CORRECTIVE_CHILD_REVISION',
            label: 'Corrective child revision',
            summary: 'Created as a child revision after review feedback so corrected wording can complete review before publication.',
        };
    }

    if (revisionReason === 'SUBJECT_EDIT') {
        return {
            code: 'CORRECTIVE_CHILD_REVISION',
            label: 'Corrective child revision',
            summary: 'Created as a child revision to revise the proposed wording before publication.',
        };
    }

    return {
        code: 'CORRECTIVE_CHILD_REVISION',
        label: 'Corrective child revision',
        summary: 'Created as a child revision from an earlier draft in the same memory line.',
    };
}

export function getPublishedRevisionActionProjection() {
    return {
        title: 'Create Successor Revision',
        description: 'Create a new successor revision from this published memory. The current published memory stays active until the successor is reviewed and published.',
        submitLabel: 'Create Successor Revision',
    };
}

export function getLifecycleNavigationActions({
    interpretationRevisionId,
    currentActiveRecord = null,
} = {}) {
    const normalizedRevisionId = String(interpretationRevisionId || '').trim();
    const activeRevisionId = String(currentActiveRecord?.sourceInterpretationRevisionId || '').trim();
    const actions = [];

    if (normalizedRevisionId && activeRevisionId && activeRevisionId !== normalizedRevisionId) {
        actions.push({
            code: 'OPEN_CURRENT_PUBLISHED_MEMORY',
            interpretationRevisionId: activeRevisionId,
            title: 'Current published memory',
            description: 'Open the current published memory on this line to inspect the active wording before continuing here.',
            submitLabel: 'Open Current Published Memory',
        });
    }

    return actions;
}
