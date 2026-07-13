export async function prepareArchitecturalProposalHandoff(options = {}, deps = {}) {
    const savedOutputUID = String(options.savedOutputUID || '').trim();
    if (!options.didSave || !savedOutputUID) {
        return { outcome: 'NOT_SAVED', savedOutputUID, interpretationRevisionId: '', userMessage: '' };
    }
    const authorityResult = options.authorityResult || null;
    if (!authorityResult?.committed && authorityResult?.reason) {
        deps.warnOperator?.(deps.getAuthorityWarning?.(authorityResult) || String(authorityResult.reason));
    }
    if (!deps.shouldCreateProposal?.(authorityResult)) {
        return { outcome: 'NOT_ELIGIBLE', savedOutputUID, interpretationRevisionId: '', userMessage: '' };
    }
    const launch = await deps.createReviewLaunchRequest({
        outputUID: savedOutputUID,
        activeChatId: options.activeChatId || null,
        authorityResult,
    });
    const interpretationRevisionId = String(launch?.interpretationRevisionId || '').trim();
    const userMessage = String(launch?.userMessage || '').trim();
    if (!interpretationRevisionId) {
        if (userMessage) deps.warnOperator?.(userMessage);
        return {
            outcome: 'BLOCKED',
            savedOutputUID,
            interpretationRevisionId: '',
            userMessage,
        };
    }
    return {
        outcome: 'READY_TO_OPEN',
        savedOutputUID,
        interpretationRevisionId,
        userMessage: '',
    };
}

export function openPreparedArchitecturalProposalHandoff(handoff, deps = {}) {
    const interpretationRevisionId = String(handoff?.interpretationRevisionId || '').trim();
    if (handoff?.outcome !== 'READY_TO_OPEN' || !interpretationRevisionId) return false;
    void deps.openReview({ interpretationRevisionId, detailView: 'review' });
    return true;
}
