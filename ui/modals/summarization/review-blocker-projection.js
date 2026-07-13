function getDiagnosticSectionLabel(sectionKey) {
    const key = String(sectionKey || '').trim().toLowerCase();
    switch (key) {
        case 'decisions': return 'Decisions';
        case 'events': return 'Events';
        case 'developments': return 'Developments';
        case 'dialogue': return 'Dialogue';
        case 'threads': return 'Threads';
        case 'timeline': return 'Timeline';
        case 'current': return 'Current';
        default: return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Output';
    }
}

function getBlockingReasonText(diagnostic) {
    const code = String(diagnostic?.code || '').trim().toUpperCase();
    const field = String(diagnostic?.field || '').trim().toUpperCase();
    const invalidValue = diagnostic?.invalidValue;
    const allowedValues = Array.isArray(diagnostic?.allowedValues)
        ? diagnostic.allowedValues.map((value) => String(value)).filter(Boolean)
        : [];
    if (field && invalidValue !== undefined && invalidValue !== null && allowedValues.length > 0) {
        return `ERROR: Invalid ${field} "${String(invalidValue)}" detected | Approved values: ${allowedValues.join(', ')}`;
    }

    switch (code) {
        case 'ARCH_DECISION_TYPE_INVALID':
            return 'A decision uses a TYPE value outside the approved architectural vocabulary.';
        case 'ARCH_DECISION_STATUS_INVALID':
            return 'A decision uses a STATUS value outside the approved architectural vocabulary.';
        case 'ARCH_EVENT_MALFORMED':
            return String(diagnostic?.message || 'Write event prose before any optional field. DEC:<stable-decision-id> is only for linking to a selected decision.').trim();
        case 'ARCH_EVENT_UNKNOWN_FIELD':
            return String(diagnostic?.message || 'Write event prose before any optional field. DEC:<stable-decision-id> is only for linking to a selected decision.').trim();
        case 'ARCH_DIALOGUE_MISSING_SPEAKER':
            return 'A dialogue entry is missing the required speaker marker.';
        case 'ARCH_THREAD_INTRO_INVALID':
            return 'A thread intro reference points outside the current extract range.';
        case 'ARCH_THREAD_LAST_INVALID':
            return 'A thread last-reference points outside the current extract range.';
        default:
            return String(diagnostic?.message || 'A validation rule failed.').trim();
    }
}

function getBlockingNextStepText(diagnostic) {
    const code = String(diagnostic?.code || '').trim().toUpperCase();
    switch (code) {
        case 'ARCH_DECISION_TYPE_INVALID':
            return 'Review the extracted decision wording, then edit or regenerate it using an allowed decision type.';
        case 'ARCH_DECISION_STATUS_INVALID':
            return 'Review the extracted decision wording, then edit or regenerate it using an allowed decision status.';
        case 'ARCH_EVENT_MALFORMED':
        case 'ARCH_EVENT_UNKNOWN_FIELD':
            return 'Review the source content for this event or narrow the extraction scope, then regenerate or edit the event row.';
        case 'ARCH_DIALOGUE_MISSING_SPEAKER':
            return 'Review the source dialogue and ensure the extracted line keeps an explicit speaker before saving.';
        case 'ARCH_THREAD_INTRO_INVALID':
        case 'ARCH_THREAD_LAST_INVALID':
            return 'Review source content or adjust extraction scope so the thread references stay inside this extract.';
        default:
            return 'Review source content or adjust extraction scope, then regenerate or edit the failing section.';
    }
}

export function projectArchitecturalDiagnostic(diagnostic) {
    return {
        reason: getBlockingReasonText(diagnostic),
        nextStep: getBlockingNextStepText(diagnostic),
    };
}

export function buildSaveBlockerProjection(diagnostics, { architectural = false } = {}) {
    const errorDiagnostics = (Array.isArray(diagnostics) ? diagnostics : []).filter((diagnostic) => diagnostic?.level === 'error');
    if (!errorDiagnostics.length) {
        return {
            blocked: false,
            title: '',
            reason: '',
            nextStep: '',
            toastMessage: '',
        };
    }

    const primary = errorDiagnostics[0];
    if (!architectural) {
        return {
            blocked: true,
            title: 'Blocked: review output failed validation',
            reason: String(primary?.message || 'Error-level diagnostics block save.').trim(),
            nextStep: 'Review the failing diagnostic, then edit or regenerate the affected section before saving.',
            toastMessage: 'Blocked: review output failed validation. Review the failing diagnostic before saving.',
        };
    }

    const sectionLabel = getDiagnosticSectionLabel(primary?.sectionKey);
    const { reason, nextStep } = projectArchitecturalDiagnostic(primary);
    return {
        blocked: true,
        title: `Blocked: ${sectionLabel} failed validation`,
        reason,
        nextStep,
        toastMessage: `Blocked: ${sectionLabel} failed validation. ${reason} Next step: ${nextStep}`,
    };
}
