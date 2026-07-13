function formatHumanReadableEnumLabel(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .split(/[_\s-]+/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'n/a';
}

function formatHumanEntityLabel(value) {
    const text = String(value || '').trim();
    if (!text) {
        return 'n/a';
    }
    const [, rawName = text] = text.split(':');
    const withoutExtension = rawName.replace(/\.[a-z0-9]+$/i, '');
    return withoutExtension
        .split(/[_-]+/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatHumanRoleLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'RELATIONAL_PARTICIPANT') return 'Relational participant';
    if (normalized === 'MEMORY_SUBJECT') return 'Context owner';
    return formatHumanReadableEnumLabel(normalized || 'REVIEWER');
}

function formatHumanStateLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        PENDING: 'Pending',
        APPROVED: 'Approved',
        APPROVE_WITH_EDIT: 'Approved with changes',
        APPROVE_FOR_SCOPE_ONLY: 'Approved for scope only',
        REJECTED: 'Rejected',
        DEFERRED: 'Deferred',
        CONTESTED: 'Contested',
        GRANTED: 'Granted',
        DENIED: 'Denied',
        PUBLISHED: 'Published',
        SUPERSEDED: 'Superseded',
        WITHDRAWN: 'Withdrawn',
        ACTIVE: 'Active',
        DELTA_PENDING: 'Pending replacement',
    };
    return map[normalized] || formatHumanReadableEnumLabel(normalized);
}

function formatHistoryEventTitle(actorLabel, stateLabel, options = {}) {
    const actor = String(actorLabel || '').trim() || 'Review';
    const state = String(stateLabel || '').trim().toLowerCase();
    const kind = String(options.kind || 'review').trim().toLowerCase();

    if (!state) {
        return actor;
    }

    if (kind === 'decision') {
        if (state === 'granted') return `Publication decision: ${actor} granted`;
        if (state === 'denied') return `Publication decision: ${actor} denied`;
        if (state === 'deferred') return `Publication decision: ${actor} deferred`;
        if (state === 'contested') return `Publication decision: ${actor} contested`;
        return `Publication decision: ${actor}`;
    }

    if (kind === 'recorded-review') {
        if (state === 'approved') return `Review recorded: ${actor} approved`;
        if (state === 'approved with changes') return `Review recorded: ${actor} approved with changes`;
        if (state === 'approved for scope only') return `Review recorded: ${actor} approved for scope only`;
        if (state === 'rejected') return `Review recorded: ${actor} rejected`;
        if (state === 'deferred') return `Review recorded: ${actor} deferred`;
        if (state === 'contested') return `Review recorded: ${actor} contested`;
        return `Review recorded: ${actor}`;
    }

    if (state === 'approved') return `${actor} approved`;
    if (state === 'approved with changes') return `${actor} approved with changes`;
    if (state === 'approved for scope only') return `${actor} approved for scope only`;
    if (state === 'rejected') return `${actor} rejected`;
    if (state === 'deferred') return `${actor} deferred`;
    if (state === 'contested') return `${actor} contested`;
    if (state === 'pending') return `${actor} pending`;
    return `${actor} ${state}`;
}

function describePublicationRecord(record, isActive) {
    const lifecycleState = String(record?.lifecycleState || '').trim().toUpperCase();
    if (isActive || lifecycleState === 'ACTIVE') {
        return {
            title: 'Published and active',
            summary: 'This is the current published memory.',
        };
    }
    if (lifecycleState === 'SUPERSEDED') {
        return {
            title: 'Published and later replaced',
            summary: 'A newer approved memory replaced this published version.',
        };
    }
    if (lifecycleState === 'WITHDRAWN') {
        return {
            title: 'Published and later withdrawn',
            summary: 'This published memory was later removed from active use.',
        };
    }
    if (lifecycleState === 'DELTA_PENDING') {
        return {
            title: 'Published replacement pending',
            summary: 'This memory is published but is not yet the current active version.',
        };
    }
    return {
        title: 'Published memory',
        summary: 'This memory was published in the past.',
    };
}

function hasRecordedSubjectDisposition(subjectDisposition) {
    if (!subjectDisposition || typeof subjectDisposition !== 'object') {
        return false;
    }
    const state = String(subjectDisposition.state || '').trim().toUpperCase();
    if (!state || state === 'PENDING') {
        return false;
    }
    const hasTimestamp = Number.isFinite(Number(subjectDisposition.recordedAt));
    const hasCommentary = String(subjectDisposition.commentary || '').trim().length > 0;
    const hasReasons = Array.isArray(subjectDisposition.reasonCodes) && subjectDisposition.reasonCodes.length > 0;
    const hasProvenance = !!subjectDisposition.provenance
        && (
            String(subjectDisposition.provenance.submissionMode || '').trim().length > 0
            || String(subjectDisposition.provenance.submittedByActorId || '').trim().length > 0
            || String(subjectDisposition.provenance.dispositionOwnerId || '').trim().length > 0
        );
    return hasTimestamp || hasCommentary || hasReasons || hasProvenance;
}

export function buildReviewHistoryEntries(interpretation, selectedReviewRequestId = '', selectedInterpretationRevisionId = '') {
    const requests = Array.isArray(interpretation?.reviewRequests) ? interpretation.reviewRequests : [];
    const interpretationRevisionId = String(interpretation?.interpretationRevisionId || '').trim();
    const normalizedSelectedRevisionId = String(selectedInterpretationRevisionId || '').trim();
    const revisionMatchesSelection = !normalizedSelectedRevisionId || normalizedSelectedRevisionId === interpretationRevisionId;
    const dispositionsByRequestId = new Map(
        (Array.isArray(interpretation?.reviewDispositions) ? interpretation.reviewDispositions : [])
            .map((entry) => [entry.reviewRequestId, entry]),
    );

    return [...requests]
        .map((request) => {
            const disposition = dispositionsByRequestId.get(request.reviewRequestId) || null;
            const reviewerLabel = formatHumanEntityLabel(request.reviewerEntityId);
            const roleLabel = formatHumanRoleLabel(request.reviewerRole || 'REVIEWER');
            const statusLabel = disposition
                ? formatHumanStateLabel(disposition.disposition)
                : formatHumanStateLabel(request.status);
            const isPending = !disposition && String(request.status || '').trim().toUpperCase() === 'PENDING';
            return {
                reviewRequestId: request.reviewRequestId,
                title: formatHistoryEventTitle(reviewerLabel, statusLabel),
                dispositionLabel: statusLabel,
                roleLabel,
                timestamp: disposition?.submittedAt || request.createdAt || null,
                extraLines: isPending ? ['Decision still required.'] : [],
                compact: true,
                selected: revisionMatchesSelection && request.reviewRequestId === selectedReviewRequestId,
            };
        })
        .sort((left, right) => {
            const leftSelected = left.selected ? 1 : 0;
            const rightSelected = right.selected ? 1 : 0;
            if (leftSelected !== rightSelected) {
                return rightSelected - leftSelected;
            }
            return Number(right.timestamp || 0) - Number(left.timestamp || 0);
        });
}

export function buildDecisionHistoryEntries(interpretation, selectedReviewRequestId = '', selectedInterpretationRevisionId = '') {
    const reviewDispositions = Array.isArray(interpretation?.reviewDispositions) ? interpretation.reviewDispositions : [];
    const interpretationRevisionId = String(interpretation?.interpretationRevisionId || '').trim();
    const normalizedSelectedRevisionId = String(selectedInterpretationRevisionId || '').trim();
    const revisionMatchesSelection = !normalizedSelectedRevisionId || normalizedSelectedRevisionId === interpretationRevisionId;
    const subjectDisposition = hasRecordedSubjectDisposition(interpretation?.subjectDisposition)
        ? interpretation.subjectDisposition
        : null;
    const requestMap = new Map(
        (Array.isArray(interpretation?.reviewRequests) ? interpretation.reviewRequests : [])
            .map((request) => [request.reviewRequestId, request]),
    );

    const entries = reviewDispositions.map((disposition) => {
        const request = requestMap.get(disposition.reviewRequestId) || null;
        const reviewerName = formatHumanEntityLabel(
            request?.reviewerEntityId || disposition?.provenance?.dispositionOwnerId || '',
        );
        return {
            kind: 'review',
            reviewRequestId: disposition.reviewRequestId,
            title: formatHistoryEventTitle(
                reviewerName,
                formatHumanStateLabel(disposition.disposition),
                { kind: 'recorded-review' },
            ),
            dispositionLabel: formatHumanStateLabel(disposition.disposition),
            roleLabel: formatHumanRoleLabel(request?.reviewerRole || 'REVIEWER'),
            reasonCodes: disposition.reasonCodes,
            commentary: disposition.commentary,
            provenance: disposition.provenance,
            timestamp: disposition.submittedAt || null,
            contextLabel: 'How it was recorded',
            commentaryLabel: 'Recorded note',
            compact: true,
            selected: revisionMatchesSelection && disposition.reviewRequestId === selectedReviewRequestId,
        };
    });

    if (subjectDisposition) {
        entries.push({
            kind: 'decision',
            reviewRequestId: '',
            title: formatHistoryEventTitle(
                formatHumanEntityLabel(interpretation?.memorySubjectId),
                formatHumanStateLabel(subjectDisposition.state),
                { kind: 'decision' },
            ),
            dispositionLabel: formatHumanStateLabel(subjectDisposition.state),
            roleLabel: formatHumanRoleLabel('MEMORY_SUBJECT'),
            reasonCodes: subjectDisposition.reasonCodes,
            commentary: subjectDisposition.commentary,
            provenance: subjectDisposition.provenance,
            timestamp: subjectDisposition.recordedAt || null,
            contextLabel: 'How it was recorded',
            commentaryLabel: 'Decision note',
            compact: true,
            selected: false,
        });
    }

    return entries.sort((left, right) => {
        const leftSelected = left.selected ? 1 : 0;
        const rightSelected = right.selected ? 1 : 0;
        if (leftSelected !== rightSelected) {
            return rightSelected - leftSelected;
        }
        return Number(right.timestamp || 0) - Number(left.timestamp || 0);
    });
}

export function buildPublicationHistoryEntries(recordsForTarget = [], activeRecord = null) {
    const byRecordId = new Map();
    for (const record of [...(Array.isArray(recordsForTarget) ? recordsForTarget : []), activeRecord].filter(Boolean)) {
        const recordId = String(record?.dnmRecordId || '').trim();
        if (!recordId) {
            continue;
        }
        if (!byRecordId.has(recordId)) {
            byRecordId.set(recordId, record);
        }
    }

    const activeRecordId = String(activeRecord?.dnmRecordId || '').trim();
    return [...byRecordId.values()]
        .sort((left, right) => Number(right?.publishedAt || 0) - Number(left?.publishedAt || 0))
        .map((record) => {
            const isCurrent = String(record?.dnmRecordId || '').trim() === activeRecordId;
            const descriptor = describePublicationRecord(record, isCurrent);
            return {
                record,
                isCurrent,
                title: descriptor.title,
                summary: descriptor.summary,
                timestamp: record?.publishedAt || null,
            };
        });
}
