/**
 * Pure operator-decision preparation for historical fork suggestions.
 * Durable append and source mutation belong to the future lineage ledger.
 */

const DECISIONS = new Set(['ACCEPT_PROPOSED', 'CHOOSE_PARENT', 'LEAVE_INDEPENDENT', 'REJECT']);

function refusal(reason, extra = {}) {
    return Object.freeze({ state: 'REFUSED', reason, ...extra });
}

function validText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

export function prepareLineageDecision({ suggestion, decision, operatorActionId, recordedAt, parentSourceLogicalId, forkAnchor } = {}) {
    if (!suggestion || suggestion.state !== 'REVIEW_REQUIRED' || suggestion.reason !== 'LIKELY_FORK_EXACT_PREFIX') {
        return refusal('SUGGESTION_UNAVAILABLE');
    }
    const sourceLogicalIds = Array.isArray(suggestion.sourceLogicalIds) && suggestion.sourceLogicalIds.length === 2 && suggestion.sourceLogicalIds.every(validText)
        ? Object.freeze(suggestion.sourceLogicalIds.map((id) => id.trim()))
        : validText(suggestion.proposedParentSourceLogicalId) && validText(suggestion.proposedChildSourceLogicalId)
            ? Object.freeze([suggestion.proposedParentSourceLogicalId.trim(), suggestion.proposedChildSourceLogicalId.trim()])
            : null;
    if (!sourceLogicalIds
        || !Number.isInteger(suggestion.matchedPrefixLength) || suggestion.matchedPrefixLength < 1
        || !suggestion.forkAnchor || !Number.isInteger(suggestion.forkAnchor.messageIndex) || suggestion.forkAnchor.messageIndex < 0
        || !validText(suggestion.forkAnchor.contentHash)) {
        return refusal('SUGGESTION_EVIDENCE_INCOMPLETE');
    }
    if (!DECISIONS.has(decision)) return refusal('LINEAGE_DECISION_INVALID');
    if (!validText(operatorActionId) || !validText(recordedAt)) return refusal('OPERATOR_ACTION_METADATA_UNAVAILABLE');

    const associationDecision = decision === 'ACCEPT_PROPOSED' || decision === 'CHOOSE_PARENT';
    if (decision === 'CHOOSE_PARENT' && (!validText(parentSourceLogicalId) || !forkAnchor || !Number.isInteger(forkAnchor.messageIndex) || forkAnchor.messageIndex < 0 || !validText(forkAnchor.contentHash))) {
        return refusal('LINEAGE_SELECTION_INCOMPLETE');
    }
    if (decision === 'ACCEPT_PROPOSED' && !validText(suggestion.proposedParentSourceLogicalId)) return refusal('LINEAGE_SELECTION_INCOMPLETE');
    const selectedParent = decision === 'ACCEPT_PROPOSED' ? suggestion.proposedParentSourceLogicalId : decision === 'CHOOSE_PARENT' ? parentSourceLogicalId.trim() : null;
    const selectedAnchor = decision === 'ACCEPT_PROPOSED' ? suggestion.forkAnchor : decision === 'CHOOSE_PARENT' ? forkAnchor : null;

    return Object.freeze({
        state: 'DECISION_READY',
        decision,
        operatorActionId: operatorActionId.trim(),
        recordedAt: recordedAt.trim(),
        sourceLogicalIds,
        proposedParentSourceLogicalId: suggestion.proposedParentSourceLogicalId || null,
        proposedChildSourceLogicalId: suggestion.proposedChildSourceLogicalId || null,
        parentSourceLogicalId: selectedParent,
        forkAnchor: associationDecision ? Object.freeze({ messageIndex: selectedAnchor.messageIndex, contentHash: selectedAnchor.contentHash.trim() }) : null,
        matchedPrefixLength: suggestion.matchedPrefixLength,
        reviewRequired: true,
        appendRequired: true,
    });
}
