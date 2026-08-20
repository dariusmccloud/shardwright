function normalizeCode(value) {
    return String(value || '').trim().toUpperCase();
}

const REVIEWABLE_AUTHORITY_CONFLICT_CODES = new Set([
    'ARCH_SCOPE_VERSION_CONFLICT',
    'ARCH_DECISION_VERSION_CONFLICT',
    'ARCH_DECISION_UNPROVEN_COLLISION',
]);

export function shouldCreateProposalAfterAuthorityResult(result = {}) {
    if (result?.committed === true) {
        return true;
    }

    const code = normalizeCode(result?.reason || result?.error?.code);
    const memoryScopeId = String(result?.projectionMetadata?.memoryScopeId || '').trim();
    return Boolean(memoryScopeId && REVIEWABLE_AUTHORITY_CONFLICT_CODES.has(code));
}

export function getArchitecturalAuthorityWarning(result = {}) {
    if (result?.committed === true || !result?.reason) {
        return null;
    }

    return shouldCreateProposalAfterAuthorityResult(result)
        ? 'Existing architectural authority was preserved.'
        : 'Architectural scope authority was not updated because the saved shard did not match the current authoritative version.';
}

function getPrimaryQuarantine(result) {
    const proposals = Array.isArray(result?.synthesisRun?.proposals) ? result.synthesisRun.proposals : [];
    return proposals.find((proposal) => normalizeCode(proposal?.proposalStatus) === 'QUARANTINED') || proposals[0] || null;
}

function getReasonAndNextStep(code) {
    switch (code) {
        case 'ARCH_SYNTHESIS_TYPE_UNSUPPORTED':
            return {
                reason: 'The generated proposal used an interpretation type outside the approved review vocabulary.',
                nextStep: 'Review source content or adjust extraction scope, then regenerate the shard and try proposal creation again.',
            };
        case 'ARCH_SYNTHESIS_FORBIDDEN_OUTPUT_FIELD':
        case 'ARCH_SYNTHESIS_PROPOSAL_INVALID':
            return {
                reason: 'The generated proposal did not satisfy the governed proposal contract.',
                nextStep: 'Review source content or adjust extraction scope, then regenerate the shard and try proposal creation again.',
            };
        case 'ARCH_SYNTHESIS_BASIS_NOT_FROZEN':
            return {
                reason: 'The generated proposal cited evidence outside the saved shard manifest.',
                nextStep: 'Regenerate the shard from the current source range, then try proposal creation again.',
            };
        case 'SOURCE_MANIFEST_DRIFT':
        case 'STALE_REVISION':
        case 'ARCH_SHARD_SOURCE_RANGE_STALE':
            return {
                reason: 'The saved shard no longer matches the current authoritative source range.',
                nextStep: 'Refresh the extract scope, regenerate the shard from current messages, then try proposal creation again.',
            };
        case 'MISSING_BASIS':
        case 'OUT_OF_SCOPE':
        case 'IDENTITY_UNRESOLVED':
        case 'MALFORMED_REFERENCE':
            return {
                reason: 'The generated proposal could not prove its evidence links against the saved shard sources.',
                nextStep: 'Review source content or adjust extraction scope, then regenerate the shard and try proposal creation again.',
            };
        case 'SEMANTIC_SUPPORT_INSUFFICIENT':
            return {
                reason: 'The generated proposal did not have enough grounded support to enter governed review.',
                nextStep: 'Review the saved shard content, then narrow or strengthen the source extract before trying again.',
            };
        case 'ARCH_SHARD_MANIFEST_MISSING':
            return {
                reason: 'The saved shard does not have the persisted manifest required for governed proposal creation.',
                nextStep: 'Save a fresh architectural shard from the current chat, then try proposal creation again.',
            };
        case 'ARCH_NO_REVIEWABLE_INTERPRETIVE_DECISION':
            return {
                reason: 'The saved shard contains no explicit role or relationship decision about this memory subject.',
                nextStep: 'Keep the shard as architectural evidence; create a proposal only from a source range that explicitly supports subject-level interpretive meaning.',
            };
        default:
            return {
                reason: 'The governed proposal could not be admitted from this saved shard.',
                nextStep: 'Review source content or adjust extraction scope, then regenerate the shard and try proposal creation again.',
            };
    }
}

export function projectArchitecturalProposalLaunchBlocker(result = {}, error = null) {
    const operatorStatus = error?.operatorStatus;
    if (operatorStatus?.governed === true && operatorStatus?.eligible === false) {
        const missingRequirements = Array.isArray(operatorStatus.missingRequirements)
            ? operatorStatus.missingRequirements.filter(Boolean)
            : [];
        const reason = missingRequirements.join(' ') || String(operatorStatus.status || 'This proposal cannot advance.');
        const nextStep = String(operatorStatus.nextAction || 'Review the proposal requirements before trying again.');
        return {
            code: 'SUBJECT_POLICY_REQUIREMENTS_NOT_SATISFIED',
            outcome: 'BLOCKED',
            title: String(operatorStatus.status || 'Blocked: proposal requirements are not satisfied'),
            reason,
            nextStep,
            toastMessage: `${String(operatorStatus.status || 'Blocked: proposal requirements are not satisfied')} Reason: ${reason} Next step: ${nextStep}`,
        };
    }
    const primaryProposal = getPrimaryQuarantine(result);
    const referentialStatus = normalizeCode(primaryProposal?.groundingEvaluation?.referentialStatus);
    const quarantineCode = normalizeCode(primaryProposal?.quarantineCode);
    const failureCode = normalizeCode(result?.synthesisRun?.failureCode);
    const errorCode = normalizeCode(error?.code);
    const code = (referentialStatus && referentialStatus !== 'VALID' ? referentialStatus : '') || quarantineCode || failureCode || errorCode;
    const { reason, nextStep } = getReasonAndNextStep(code);
    const noProposalCreated = code === 'ARCH_NO_REVIEWABLE_INTERPRETIVE_DECISION';
    const title = noProposalCreated
        ? 'Shard saved; no proposal created'
        : 'Blocked: governed proposal creation failed';

    return {
        code: code || 'ARCH_PROPOSAL_HANDOFF_BLOCKED',
        outcome: noProposalCreated ? 'NO_PROPOSAL_CREATED' : 'BLOCKED',
        title,
        reason,
        nextStep,
        toastMessage: `${title}. Reason: ${reason} Next step: ${nextStep}`,
    };
}
