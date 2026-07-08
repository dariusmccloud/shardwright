import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../../../popup.js';
import {
    bootstrapStandardInterpretivePublicationPolicy,
    createInterpretiveRevision,
    createInterpretivePublicationAuthorization,
    executeInterpretivePublicationAuthorization,
    getInterpretiveCandidate,
    getInterpretivePublicationOperatorState,
    listInterpretiveDelegationPolicies,
    listInterpretiveReviews,
    publishInterpretiveMemory,
    qualifyInterpretivePublication,
    recordDnmDeltaReview,
    recordInterpretiveSubjectDisposition,
    supersedeDnmPublicationRecord,
    submitInterpretiveReviewDisposition,
    withdrawDnmPublicationRecord,
} from '../../../core/summarization/architectural-authority-server-api.js';
import { escapeHtml, formatDate } from '../../common/ui-utils.js';
import {
    buildInterpretiveRevisedCandidatePayload,
    getGovernedFieldState,
    getInterpretiveDispositionFieldState,
    INTERPRETIVE_REASON_CODE_GROUPS,
    REVIEW_DISPOSITION_OPTIONS,
    SUBJECT_DISPOSITION_OPTIONS,
    filterDelegationPoliciesForAction,
    getInterpretiveSubmissionModeOptions,
    parseInterpretiveTokenList,
    resolveDefaultInterpretiveSubmissionMode,
    shouldShowInterpretiveRevisionEditor,
    validateInterpretiveActionPayload,
    validateGovernedSubmissionPayload as validateGovernedSubmissionState,
} from './interpretive-review-form-state.js';
import {
    buildPrimaryWorkflowStatus,
    buildQueueGroups,
    getQueueGroupRepresentativeReview,
    getRevisionFilterStatus,
    getRevisionLifecycleStatus,
    groupMatchesStatusFilter,
    isQueueGroupSelected,
    summarizeReviewWorkflowCode,
} from './interpretive-review-queue-state.js';
import {
    buildDecisionHistoryEntries,
    buildPublicationHistoryEntries,
    buildReviewHistoryEntries,
} from './interpretive-review-history-state.js';
import {
    getLifecycleNavigationActions,
    getPublishedRevisionActionProjection,
    getRevisionOrigin,
} from './interpretive-review-revision-state.js';

const REVIEW_STATUS_OPTIONS = Object.freeze([
    { value: '', label: 'All statuses' },
    { value: 'PENDING_APPROVAL', label: 'Pending approval' },
    { value: 'PENDING_DECISION', label: 'Pending decision' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'APPROVE_WITH_EDIT', label: 'Approved with changes' },
    { value: 'APPROVE_FOR_SCOPE_ONLY', label: 'Approved for scope only' },
    { value: 'READY_FOR_PUBLICATION', label: 'Ready for publication' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CONTESTED', label: 'Contested' },
    { value: 'DEFERRED', label: 'Deferred' },
    { value: 'REJECTED', label: 'Rejected' },
]);

const INTERPRETIVE_REASON_CODE_LABELS = new Map(
    INTERPRETIVE_REASON_CODE_GROUPS.flatMap((group) =>
        group.codes.map((entry) => [entry.value, entry.label])),
);

const INTERPRETIVE_REASON_CODE_DESCRIPTIONS = new Map(
    INTERPRETIVE_REASON_CODE_GROUPS.flatMap((group) =>
        group.codes.map((entry) => [entry.value, entry.description])),
);

function formatTimestamp(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'n/a';
    }
    return formatDate(Number(value));
}

function formatSubmissionModeLabel(value) {
    return String(value || '')
        .trim()
        .split('_')
        .filter(Boolean)
        .map((entry) => entry.charAt(0) + entry.slice(1).toLowerCase())
        .join(' ') || 'n/a';
}

function formatDateTimeLocalValue(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '';
    }
    const date = new Date(Number(value));
    const pad = (entry) => String(entry).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocalValue(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
}

function getCurrentActorEntityId() {
    const context = globalThis.SillyTavern?.getContext?.() || {};
    const userName = String(context?.name1 || context?.user_name || '').trim();
    return userName ? `user:${userName}` : '';
}

function renderBadge(value, { prefix = '', fallback = 'n/a' } = {}) {
    const text = String(value || '').trim() || fallback;
    const stateClass = text.toLowerCase().replace(/[^a-z0-9]+/gu, '-');
    const label = prefix ? `${prefix}${text}` : text;
    return `<span class="ss-interpretive-review-badge state-${escapeHtml(stateClass)}">${escapeHtml(label)}</span>`;
}

function normalizeActionLabel(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
}

function renderKeyValueGrid(rows) {
    return `
        <div class="ss-interpretive-review-grid">
            ${rows.map(({ label, value }) => `
                <div class="ss-interpretive-review-card">
                    <strong>${escapeHtml(label)}</strong>
                    <div>${value}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCollapsibleSection(title, description, content, options = {}) {
    const open = options.open === true;
    const extraClass = String(options.extraClass || '').trim();
    return `
        <details class="ss-interpretive-review-section ss-review-section ss-review-section--disclosure ss-interpretive-review-disclosure${extraClass ? ` ${escapeHtml(extraClass)}` : ''}"${open ? ' open' : ''}>
            <summary class="ss-review-section__header ss-interpretive-review-disclosure-summary">
                <span class="ss-review-section__title ss-interpretive-review-disclosure-title">${escapeHtml(title)}</span>
                ${description ? `<span class="ss-review-section__description ss-interpretive-review-disclosure-description">${escapeHtml(description)}</span>` : ''}
            </summary>
            <div class="ss-review-section__body ss-interpretive-review-disclosure-body">
                ${content}
            </div>
        </details>
    `;
}

function renderStaticSection(title, description, content, options = {}) {
    const extraClass = String(options.extraClass || '').trim();
    const sectionKey = String(options.sectionKey || '').trim();
    return `
        <div
            class="ss-interpretive-review-section ss-review-section ss-review-section--static ss-interpretive-review-static-section${extraClass ? ` ${escapeHtml(extraClass)}` : ''}"
            ${sectionKey ? `data-review-section="${escapeHtml(sectionKey)}"` : ''}
        >
            <div class="ss-review-section__header ss-interpretive-review-static-header">
                <div class="ss-review-section__title">${escapeHtml(title)}</div>
                ${description ? `<div class="ss-review-section__description">${escapeHtml(description)}</div>` : ''}
            </div>
            <div class="ss-review-section__body">
                ${content}
            </div>
        </div>
    `;
}

function renderStringList(items, emptyLabel = '(none)') {
    if (!Array.isArray(items) || items.length === 0) {
        return escapeHtml(emptyLabel);
    }
    return items.map((item) => `<code>${escapeHtml(String(item))}</code>`).join(', ');
}

function renderCopyControl(value, label = 'Copy') {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return '';
    }
    return `
        <button
            type="button"
            class="ss-interpretive-review-copy-btn"
            data-copy-value="${escapeHtml(normalized)}">
            ${escapeHtml(label)}
        </button>
    `;
}

function renderCopyableCode(value, options = {}) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return escapeHtml(options.emptyLabel || 'n/a');
    }
    return `
        <span class="ss-interpretive-review-copyable">
            <code>${escapeHtml(normalized)}</code>
            ${renderCopyControl(normalized, options.copyLabel || 'Copy')}
        </span>
    `;
}

function renderAuditTable(rows) {
    const filteredRows = Array.isArray(rows)
        ? rows.filter((row) => row && String(row.value || '').trim())
        : [];
    if (filteredRows.length === 0) {
        return '<div class="ss-hint">No details available.</div>';
    }
    return `
        <table class="ss-interpretive-review-audit-table">
            <tbody>
                ${filteredRows.map((row) => `
                    <tr>
                        <th scope="row">${escapeHtml(row.label || '')}</th>
                        <td>${row.value}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderStatusMatrix(rows) {
    const filteredRows = Array.isArray(rows)
        ? rows.filter((row) => row && String(row.value || '').trim())
        : [];
    if (filteredRows.length === 0) {
        return '<div class="ss-hint">No details available.</div>';
    }
    return `
        <div class="ss-interpretive-review-status-strip">
            ${filteredRows.map((row) => `
                <div class="ss-interpretive-review-status-strip-cell">
                    <div class="ss-interpretive-review-status-strip-label">${escapeHtml(row.label || '')}</div>
                    <div class="ss-interpretive-review-status-strip-value">${row.value}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPolicyAuditSummary(continuityTargetId, operatorAvailableActions, operatorBlockingReasons, options = {}) {
    const includeBlockingReasons = options.includeBlockingReasons !== false;
    return `
        <div class="ss-interpretive-review-list">
            <div class="ss-interpretive-review-card ss-interpretive-review-policy-audit-card">
                <strong>Memory Line</strong>
                <div class="ss-interpretive-review-summary-note">${renderCopyableCode(continuityTargetId, { emptyLabel: 'n/a' })}</div>
            </div>
            <div class="ss-interpretive-review-card ss-interpretive-review-policy-audit-card">
                <strong>Available Lifecycle Actions</strong>
                <div class="ss-interpretive-review-summary-note">${renderServerReasonList(operatorAvailableActions, 'None')}</div>
            </div>
            ${includeBlockingReasons ? `
                <div class="ss-interpretive-review-card ss-interpretive-review-policy-audit-card">
                    <strong>Blocking Reasons</strong>
                    <div class="ss-interpretive-review-summary-note">${renderServerReasonList(operatorBlockingReasons, 'None')}</div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderAuditSection(title, rows, options = {}) {
    const content = typeof rows === 'string' ? rows : renderAuditTable(rows);
    if (options.collapsible) {
        return renderCollapsibleSection(
            title,
            options.description || '',
            content,
            {
                open: options.open === true,
                extraClass: `ss-interpretive-review-audit-section ${String(options.extraClass || '').trim()}`.trim(),
            },
        );
    }
    return `
        <div class="ss-interpretive-review-section ss-review-section ss-review-section--static ss-interpretive-review-static-section ss-interpretive-review-audit-section">
            <div class="ss-review-section__header ss-interpretive-review-static-header">
                <div class="ss-review-section__title">${escapeHtml(title)}</div>
                ${options.description ? `<div class="ss-review-section__description">${escapeHtml(options.description)}</div>` : ''}
            </div>
            <div class="ss-review-section__body">
                ${content}
            </div>
        </div>
    `;
}

function renderEvidenceBindingsTable(groundingLinks) {
    if (!Array.isArray(groundingLinks) || groundingLinks.length === 0) {
        return '<div class="ss-hint">No bound source records.</div>';
    }
    return `
        <div class="ss-interpretive-review-evidence-table-wrap">
            <table class="ss-interpretive-review-audit-table ss-interpretive-review-evidence-table">
                <thead>
                    <tr>
                        <th scope="col">Role</th>
                        <th scope="col">Source Type</th>
                        <th scope="col">Source</th>
                        <th scope="col">Speaker</th>
                    </tr>
                </thead>
                <tbody>
                    ${groundingLinks.map((link) => {
                        const role = String(link?.groundingRole || 'GROUNDING').trim();
                        const sourceType = String(link?.basisType || 'UNKNOWN').trim();
                        const sourceValue = sourceType === 'SOURCE_OCCURRENCE'
                            ? [String(link?.chatInstanceId || '').trim(), String(link?.messageId || '').trim()].filter(Boolean).join(' / ')
                            : String(link?.basisRecordId || '').trim();
                        const speakerValue = String(link?.speakerEntityId || '').trim();
                        return `
                            <tr>
                                <td>${renderBadge(role, { fallback: role || 'n/a' })}</td>
                                <td>${renderBadge(sourceType, { fallback: sourceType || 'n/a' })}</td>
                                <td>${renderCopyableCode(sourceValue, { emptyLabel: 'n/a' })}</td>
                                <td>${renderCopyableCode(speakerValue, { emptyLabel: 'n/a' })}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function hasDisplayableValues(items) {
    return Array.isArray(items) && items.some((item) => String(item || '').trim());
}

function hasMeaningfulGroundingDetails(details) {
    return !!details
        && typeof details === 'object'
        && !Array.isArray(details)
        && Object.keys(details).length > 0;
}

function renderReasonCodes(reasonCodes, options = {}) {
    if (!Array.isArray(reasonCodes) || reasonCodes.length === 0) {
        return '<span class="ss-hint">No reason codes.</span>';
    }
    const label = String(options.label || '').trim();
    const badges = reasonCodes.map((code) => {
        const normalizedCode = String(code || '').trim();
        const badgeLabel = INTERPRETIVE_REASON_CODE_LABELS.get(normalizedCode) || normalizedCode;
        const badge = renderBadge(badgeLabel, { fallback: normalizedCode || 'n/a' });
        const description = INTERPRETIVE_REASON_CODE_DESCRIPTIONS.get(normalizedCode);
        if (!description) {
            return badge;
        }
        return badge.replace('<span ', `<span title="${escapeHtml(description)}" `);
    }).join('');
    return `
        <div class="ss-interpretive-review-history-block">
            ${label ? `<div class="ss-interpretive-review-history-block-label">${escapeHtml(label)}</div>` : ''}
            <div class="ss-interpretive-review-inline-meta">${badges}</div>
        </div>
    `;
}

function renderServerReasonList(items, emptyLabel = 'None') {
    if (!Array.isArray(items) || items.length === 0) {
        return `<span class="ss-hint">${escapeHtml(emptyLabel)}</span>`;
    }
    return `<div class="ss-interpretive-review-inline-meta">${items.map((item) => {
        const normalized = String(item || '').trim();
        const label = INTERPRETIVE_REASON_CODE_LABELS.get(normalized) || formatLifecycleBlockingReason(normalized);
        return renderBadge(label, { fallback: normalized || 'n/a' });
    }).join('')}</div>`;
}

function renderBlockedActionList(entries, emptyLabel = 'None') {
    if (!Array.isArray(entries) || entries.length === 0) {
        return `<span class="ss-hint">${escapeHtml(emptyLabel)}</span>`;
    }
    return `
        <div class="ss-interpretive-review-list">
            ${entries.map((entry) => `
                <div class="ss-interpretive-review-card">
                    <strong>${escapeHtml(formatLifecycleActionLabel(entry.action || ''))}</strong>
                    <div>${renderServerReasonList(entry.blockingReasons, 'None')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderReasonCodeSelector({ conditional = false } = {}) {
    return `
        <div class="ss-interpretive-review-reason-groups"${conditional ? ' data-field="reasonCodeGroups" hidden' : ''}>
            <input type="hidden" name="reasonCodes" value="" />
            ${INTERPRETIVE_REASON_CODE_GROUPS.map((group) => `
                <section class="ss-interpretive-review-reason-group">
                    <div class="ss-interpretive-review-reason-group-header">
                        <strong>${escapeHtml(group.title)}</strong>
                        <details class="ss-interpretive-review-inline-help">
                            <summary aria-label="Explain ${escapeHtml(group.title)}">?</summary>
                            <div class="ss-interpretive-review-inline-help-body">
                                ${group.codes.map((entry) => `
                                    <div class="ss-interpretive-review-inline-help-row">
                                        <strong>${escapeHtml(entry.label)}</strong>
                                        <span>${escapeHtml(entry.description)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    </div>
                    <div class="ss-interpretive-token-palette">
                        ${group.codes.map((entry) => `
                            <button
                                type="button"
                                class="ss-interpretive-token-button"
                                data-reason-code="${escapeHtml(entry.value)}"
                                aria-pressed="false"
                                title="${escapeHtml(entry.description)}">
                                ${escapeHtml(entry.label)}
                            </button>
                        `).join('')}
                    </div>
                </section>
            `).join('')}
            <div class="ss-hint" data-field-hint="reasonCodeGroups"></div>
        </div>
    `;
}

function renderTechnicalDetailsSection(rows, options = {}) {
    const filteredRows = Array.isArray(rows)
        ? rows.filter((row) => row && String(row.value || '').trim())
        : [];
    if (filteredRows.length === 0) {
        return '';
    }
    return renderCollapsibleSection(
        options.title || 'Technical details',
        options.description || 'Shows the exact identifiers and audit fields without crowding the main view.',
        renderKeyValueGrid(filteredRows),
        { extraClass: `ss-interpretive-review-subsection ${String(options.extraClass || '').trim()}`.trim() },
    );
}

function renderActionStatus(status, kind) {
    if (!status || status.kind !== kind || !status.message) {
        return '';
    }
    return `
        <div class="ss-interpretive-action-status tone-${escapeHtml(status.tone || 'info')}">
            ${escapeHtml(status.message)}
        </div>
    `;
}

function buildNonPublishingTooltip(formKind) {
    return formKind === 'subject'
        ? 'Saves the subject decision only. This does not publish the memory.'
        : 'Saves the review only. Approval does not publish the memory.';
}

function renderProvenance(provenance, policiesById) {
    if (!provenance) {
        return '<div class="ss-hint">No recorded provenance.</div>';
    }
    const delegationPolicy = provenance.delegationPolicyId
        ? policiesById.get(provenance.delegationPolicyId)
        : null;
    const supportingRows = [];
    if (provenance.delegationPolicyId) {
        supportingRows.push({
            label: 'Delegation policy',
            value: delegationPolicy
                ? `<code>${escapeHtml(delegationPolicy.delegationPolicyId)}</code> v${escapeHtml(String(delegationPolicy.policyVersion))} ${renderBadge(delegationPolicy.policyState)}`
                : `<code>${escapeHtml(provenance.delegationPolicyId)}</code>`,
        });
    }
    if (hasDisplayableValues(provenance.subjectEvidenceRefs)) {
        supportingRows.push({
            label: 'Evidence refs',
            value: renderStringList(provenance.subjectEvidenceRefs, 'None recorded'),
        });
    }
    return `
        ${renderKeyValueGrid([
            { label: 'Decision owner', value: `<code>${escapeHtml(provenance.dispositionOwnerId || 'n/a')}</code>` },
            { label: 'Recorded by', value: `<code>${escapeHtml(provenance.submittedByActorId || 'n/a')}</code>` },
            { label: 'How it was recorded', value: renderBadge(formatSubmissionModeLabel(provenance.submissionMode), { fallback: 'n/a' }) },
            { label: 'Recorded on', value: escapeHtml(formatTimestamp(provenance.createdAt)) },
        ])}
        ${supportingRows.length > 0 ? renderKeyValueGrid(supportingRows) : ''}
    `;
}

function renderRevisionOriginCard(origin) {
    if (!origin) {
        return '';
    }
    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-status-card">
            <strong>Revision origin</strong>
            <div class="ss-interpretive-review-badge-row">
                ${renderBadge(origin.label)}
            </div>
            <div class="ss-interpretive-review-summary-note">${escapeHtml(origin.summary || '')}</div>
        </div>
    `;
}

function buildCompactProvenanceText(provenance) {
    if (!provenance) {
        return '';
    }
    const recordedBy = formatHumanEntityLabel(provenance.submittedByActorId);
    const owner = formatHumanEntityLabel(provenance.dispositionOwnerId);
    if (provenance.submissionMode === 'TRUSTED_DELEGATE') {
        return `${recordedBy} recorded this under delegated authority for ${owner}.`;
    }
    if (provenance.submissionMode === 'SUBJECT_EXPRESSED_AND_RECORDED') {
        return `${recordedBy} recorded ${owner}'s stated response.`;
    }
    return `Submitted directly by ${recordedBy}.`;
}

function buildHistoryContextLabel(provenance, label = 'Recorded context') {
    const text = buildCompactProvenanceText(provenance);
    if (!text) {
        return '';
    }
    return `${label}: ${text}`;
}

function normalizeHistoryCommentary(commentary, dispositionLabel) {
    const text = String(commentary || '').trim();
    if (!text) {
        return '';
    }
    const normalizedText = text.replace(/[.!?]+$/u, '').trim().toLowerCase();
    const normalizedDisposition = String(dispositionLabel || '').trim().toLowerCase();
    if (normalizedDisposition && normalizedText === normalizedDisposition) {
        return '';
    }
    return text;
}

function renderHistoryActionCard({
    title,
    dispositionLabel,
    roleLabel = '',
    reasonCodes = [],
    commentary = '',
    provenance = null,
    timestamp = null,
    extraLines = [],
    compact = false,
    bodyHtml = '',
    contextLabel = 'Recorded context',
    commentaryLabel = 'Review comment',
}) {
    const compactProvenance = buildCompactProvenanceText(provenance);
    const historyContextLabel = buildHistoryContextLabel(provenance, contextLabel);
    const normalizedCommentary = normalizeHistoryCommentary(commentary, dispositionLabel);
    const filteredExtraLines = Array.isArray(extraLines)
        ? extraLines.filter((line) => String(line || '').trim())
        : [];
    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-history-card">
            <div class="ss-interpretive-review-history-heading">
                <strong>${escapeHtml(title)}</strong>
                ${timestamp ? `<div class="ss-hint">${escapeHtml(formatTimestamp(timestamp))}</div>` : ''}
            </div>
            <div class="ss-interpretive-review-inline-meta${compact ? ' ss-interpretive-review-inline-meta--compact' : ''}">
                ${compact ? '' : renderBadge(dispositionLabel || 'Submitted')}
                ${roleLabel ? renderBadge(roleLabel) : ''}
            </div>
            ${historyContextLabel ? `
                <div class="ss-interpretive-review-history-block">
                    <div class="ss-interpretive-review-history-block-label">${escapeHtml(contextLabel)}</div>
                    <div class="ss-interpretive-review-summary-note">${escapeHtml(compactProvenance)}</div>
                </div>
            ` : ''}
            ${Array.isArray(reasonCodes) && reasonCodes.length > 0 ? renderReasonCodes(reasonCodes, { label: 'Selected concerns' }) : ''}
            ${normalizedCommentary
                ? `
                    <div class="ss-interpretive-review-history-block">
                        <div class="ss-interpretive-review-history-block-label">${escapeHtml(commentaryLabel)}</div>
                        <div class="ss-interpretive-review-statement">${escapeHtml(normalizedCommentary)}</div>
                    </div>
                `
                : ''
            }
            ${filteredExtraLines.length > 0 ? `
                <div class="ss-interpretive-review-history-meta">
                    ${filteredExtraLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
                </div>
            ` : ''}
            ${String(bodyHtml || '').trim() ? bodyHtml : ''}
        </div>
    `;
}

function renderGroundingLinks(groundingLinks) {
    if (!Array.isArray(groundingLinks) || groundingLinks.length === 0) {
        return '<div class="ss-hint">No evidence linked yet.</div>';
    }
    return `
        <div class="ss-interpretive-review-list">
            ${groundingLinks.map((link) => `
                <div class="ss-interpretive-review-card">
                    <strong>${escapeHtml(link.groundingRole || 'GROUNDING')}</strong>
                    <div class="ss-interpretive-review-inline-meta">
                        ${renderBadge(link.groundingAssessment)}
                        ${renderBadge(link.basisType)}
                    </div>
                    <div><code>${escapeHtml(link.basisRecordId || 'n/a')}</code></div>
                    <div class="ss-hint">
                        chat=<code>${escapeHtml(link.chatInstanceId || 'n/a')}</code>,
                        msg=<code>${escapeHtml(link.messageId || 'n/a')}</code>,
                        speaker=<code>${escapeHtml(link.speakerEntityId || 'n/a')}</code>
                    </div>
                    ${hasMeaningfulGroundingDetails(link.details)
                        ? `<pre class="ss-interpretive-review-pre">${escapeHtml(JSON.stringify(link.details, null, 2))}</pre>`
                        : ''
                    }
                </div>
            `).join('')}
        </div>
    `;
}

function renderHistorySubmissionDetails(provenance, policiesById) {
    if (!provenance) {
        return '';
    }
    return renderTechnicalDetailsSection([
        { label: 'Disposition Owner', value: `<code>${escapeHtml(provenance.dispositionOwnerId || 'n/a')}</code>` },
        { label: 'Recorded By', value: `<code>${escapeHtml(provenance.submittedByActorId || 'n/a')}</code>` },
        { label: 'Submission Mode', value: renderBadge(formatSubmissionModeLabel(provenance.submissionMode), { fallback: 'n/a' }) },
        { label: 'Recorded At', value: escapeHtml(formatTimestamp(provenance.createdAt)) },
        ...(provenance.delegationPolicyId
            ? [{
                label: 'Delegation Policy',
                value: policiesById.has(provenance.delegationPolicyId)
                    ? `<code>${escapeHtml(provenance.delegationPolicyId)}</code> v${escapeHtml(String(policiesById.get(provenance.delegationPolicyId)?.policyVersion || ''))}`
                    : `<code>${escapeHtml(provenance.delegationPolicyId)}</code>`,
            }]
            : []),
        ...(hasDisplayableValues(provenance.subjectEvidenceRefs)
            ? [{
                label: 'Subject Evidence References',
                value: renderStringList(provenance.subjectEvidenceRefs, 'None recorded'),
            }]
            : []),
    ], {
        title: 'Recorded provenance',
        description: '',
        extraClass: 'ss-interpretive-review-history-subdetails',
    });
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

function collectReferencedPolicyIds(interpretation) {
    const policyIds = new Set();
    const maybeAdd = (value) => {
        const text = String(value || '').trim();
        if (text) policyIds.add(text);
    };
    maybeAdd(interpretation?.revisionCreationProvenance?.delegationPolicyId);
    maybeAdd(interpretation?.subjectDisposition?.provenance?.delegationPolicyId);
    for (const disposition of interpretation?.reviewDispositions || []) {
        maybeAdd(disposition?.provenance?.delegationPolicyId);
    }
    return [...policyIds];
}

function renderDelegationPolicies(policies) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return '<div class="ss-hint">No delegation policies referenced here.</div>';
    }
    return `
        <div class="ss-interpretive-review-list">
            ${policies.map((policy) => `
                <div class="ss-interpretive-review-card">
                    <strong><code>${escapeHtml(policy.delegationPolicyId)}</code> v${escapeHtml(String(policy.policyVersion))}</strong>
                    <div class="ss-interpretive-review-inline-meta">
                        ${renderBadge(policy.policyState)}
                        ${renderBadge(policy.evidenceRequirement)}
                    </div>
                    <div>Principal: <code>${escapeHtml(policy.principalEntityId || 'n/a')}</code></div>
                    <div>Delegate: <code>${escapeHtml(policy.delegateEntityId || 'n/a')}</code></div>
                    <div>Allowed Actions: ${renderStringList(policy.allowedActions, 'None')}</div>
                    <div class="ss-hint">Scope <code>${escapeHtml(policy.memoryScopeId || 'n/a')}</code>, continuity <code>${escapeHtml(policy.continuityTargetId || 'n/a')}</code></div>
                </div>
            `).join('')}
        </div>
    `;
}

function buildDelegationPolicyOptions(policies = []) {
    const items = Array.isArray(policies) ? policies : [];
    if (items.length === 0) {
        return '<option value="">No active policy matches</option>';
    }
    if (items.length === 1) {
        const [policy] = items;
        return `
            <option value="${escapeHtml(policy.delegationPolicyId)}" selected>
                ${escapeHtml(`${policy.delegationPolicyId} v${policy.policyVersion} [Evidence ${policy.evidenceRequirement}]`)}
            </option>
        `;
    }
    return [
        '<option value="">Choose a delegation policy</option>',
        ...items.map((policy) => `
            <option value="${escapeHtml(policy.delegationPolicyId)}">
                ${escapeHtml(`${policy.delegationPolicyId} v${policy.policyVersion} [Evidence ${policy.evidenceRequirement}]`)}
            </option>
        `),
    ].join('');
}

function buildPublicationPolicyOptions(policies = [], selectedPolicyId = '') {
    const items = Array.isArray(policies) ? policies : [];
    if (items.length === 0) {
        return '<option value="">No active policy matches</option>';
    }
    return items.map((policy, index) => {
        const isSelected = selectedPolicyId
            ? policy.publicationPolicyId === selectedPolicyId
            : index === 0;
        return `
            <option value="${escapeHtml(policy.publicationPolicyId)}"${isSelected ? ' selected' : ''}>
                ${escapeHtml(`${policy.publicationPolicyId} v${policy.policyVersion} [${policy.policyState}]`)}
            </option>
        `;
    }).join('');
}

function getDefaultActorForMode(mode, ownerId, currentActorId) {
    if (mode === 'DIRECT_REVIEWER_ACTION' || mode === 'DIRECT_SUBJECT_ACTION') {
        return ownerId;
    }
    return currentActorId || ownerId;
}

function renderSubmissionModeOptions(options, selectedValue) {
    return options.map((option) => `
        <option value="${escapeHtml(option.value)}"${option.value === selectedValue ? ' selected' : ''}>
            ${escapeHtml(option.label)}
        </option>
    `).join('');
}

function collectAutoSubjectEvidenceRefs(interpretation) {
    const groundingLinks = Array.isArray(interpretation?.groundingLinks) ? interpretation.groundingLinks : [];
    return [...new Set(
        groundingLinks
            .map((link) => String(link?.messageId || '').trim())
            .filter(Boolean),
    )];
}

function renderActionForm({
    formKind,
    ownerId,
    ownerRoleLabel,
    actionKind,
    interpretation,
    currentActorId,
    policies = [],
    reviewRequest = null,
    actionStatus = null,
}) {
    const autoSubjectEvidenceRefs = collectAutoSubjectEvidenceRefs(interpretation);
    const hasAutoSubjectEvidenceRefs = autoSubjectEvidenceRefs.length > 0;
    const modeOptions = getInterpretiveSubmissionModeOptions({
        ownerId,
        memorySubjectId: interpretation.memorySubjectId,
        hasAutoSubjectEvidenceRefs,
    });
    const defaultMode = resolveDefaultInterpretiveSubmissionMode({
        ownerId,
        memorySubjectId: interpretation.memorySubjectId,
        currentActorId,
        actionKind,
        memoryScopeId: interpretation.memoryScopeId,
        continuityTargetId: interpretation.memorySubjectId,
        policies,
        hasAutoSubjectEvidenceRefs,
    });
    const defaultActorId = getDefaultActorForMode(defaultMode, ownerId, currentActorId);
    const applicablePolicies = filterDelegationPoliciesForAction(policies, {
        principalEntityId: ownerId,
        delegateEntityId: defaultActorId,
        actionKind,
        memoryScopeId: interpretation.memoryScopeId,
        continuityTargetId: interpretation.memorySubjectId,
    });
    const hasApplicablePolicies = applicablePolicies.length > 0;
    const governedFieldState = getGovernedFieldState({
        submissionMode: defaultMode,
        hasApplicablePolicies,
        hasAutoSubjectEvidenceRefs,
    });
    const safeReviewOptions = REVIEW_DISPOSITION_OPTIONS
        .filter((entry) => !['APPROVE_FOR_SCOPE_ONLY', 'CONTEST', 'DEFER'].includes(entry.value));
    const safeSubjectOptions = SUBJECT_DISPOSITION_OPTIONS
        .filter((entry) => !['CONTESTED', 'DEFERRED'].includes(entry.value));
    const selectOptions = formKind === 'review'
        ? (reviewRequest?.reviewerRole === 'MEMORY_SUBJECT'
            ? safeReviewOptions
            : safeReviewOptions.filter((entry) => entry.value !== 'APPROVE_WITH_EDIT'))
        : safeSubjectOptions;
    const defaultDispositionValue = selectOptions[0]?.value || '';
    const submitLabel = formKind === 'review'
        ? 'Submit Review'
        : 'Submit Decision';
    const submitTooltip = buildNonPublishingTooltip(formKind);

    return `
        <div class="ss-interpretive-review-card ss-interpretive-action-card">
            ${renderActionStatus(actionStatus, formKind)}
            <form class="ss-interpretive-action-form"
                data-form-kind="${escapeHtml(formKind)}"
                data-action-kind="${escapeHtml(actionKind)}"
                data-owner-id="${escapeHtml(ownerId)}"
                data-owner-role-label="${escapeHtml(ownerRoleLabel)}"
                data-memory-scope-id="${escapeHtml(interpretation.memoryScopeId || '')}"
                data-memory-subject-id="${escapeHtml(interpretation.memorySubjectId || '')}"
                data-continuity-target-id="${escapeHtml(interpretation.memorySubjectId || '')}"
                data-has-auto-subject-evidence-refs="${hasAutoSubjectEvidenceRefs ? 'true' : 'false'}"
                data-auto-subject-evidence-refs="${escapeHtml(autoSubjectEvidenceRefs.join('\n'))}"
                data-interpretation-revision-id="${escapeHtml(interpretation.interpretationRevisionId)}"
                data-review-envelope-hash="${escapeHtml(reviewRequest?.reviewEnvelopeHash || interpretation.reviewEnvelopeHash || '')}"
                data-review-request-id="${escapeHtml(reviewRequest?.reviewRequestId || '')}"
                data-parent-statement="${escapeHtml(interpretation.statement || '')}"
                data-default-actor-id="${escapeHtml(currentActorId || '')}">
                <input type="hidden" name="submittedByActorId" value="${escapeHtml(defaultActorId)}" />

                <div class="ss-interpretive-review-form-grid">
                    <label class="ss-interpretive-review-field">
                        <span>Decision</span>
                        <select class="text_pole" name="${formKind === 'review' ? 'disposition' : 'state'}">
                            ${selectOptions.map((entry) => `
                                <option value="${escapeHtml(entry.value)}"${entry.value === defaultDispositionValue ? ' selected' : ''}>${escapeHtml(entry.label)}</option>
                            `).join('')}
                        </select>
                    </label>

                    <label class="ss-interpretive-review-field">
                        <span>Recording mode</span>
                        <select class="text_pole" name="submissionMode">
                            ${renderSubmissionModeOptions(modeOptions, defaultMode)}
                        </select>
                    </label>

                    <label class="ss-interpretive-review-field" data-field="delegationPolicyId"${defaultMode === 'TRUSTED_DELEGATE' && hasApplicablePolicies ? '' : ' hidden'}>
                        <span>Delegation policy</span>
                        <select class="text_pole" name="delegationPolicyId">
                            ${buildDelegationPolicyOptions(applicablePolicies)}
                        </select>
                        <span class="ss-hint">Trusted delegation needs a matching active policy.</span>
                    </label>

                    <div class="ss-interpretive-review-field ss-interpretive-review-static-note" data-field="delegationPolicyUnavailable"${defaultMode === 'TRUSTED_DELEGATE' && !hasApplicablePolicies ? '' : ' hidden'}>
                        <span>Delegation policy</span>
                        <span class="ss-hint">No matching active delegation policy is available for this action. Use a direct mode or add a policy first.</span>
                    </div>
                </div>

                <label class="ss-interpretive-review-field" data-field="subjectEvidenceRefs"${governedFieldState.showEvidenceField ? '' : ' hidden'}>
                    <span>Subject Evidence References</span>
                    <textarea class="text_pole" rows="2" name="subjectEvidenceRefs" placeholder="One reference per line or comma-separated">${escapeHtml(autoSubjectEvidenceRefs.join('\n'))}</textarea>
                    <span class="ss-hint" data-field-hint="subjectEvidenceRefs">
                        ${escapeHtml(governedFieldState.evidenceHint)}
                    </span>
                </label>

                ${renderReasonCodeSelector({ conditional: true })}

                <label class="ss-interpretive-review-field ss-interpretive-review-comment-field">
                    <span data-field-label="commentary">Comment</span>
                    <textarea class="text_pole" rows="3" name="commentary" placeholder="Optional notes or context."></textarea>
                    <span class="ss-hint" data-field-hint="commentary"></span>
                </label>

                ${formKind === 'review' ? `
                    <div class="ss-interpretive-review-section" data-field="revisedCandidate"${shouldShowInterpretiveRevisionEditor(formKind, defaultDispositionValue) ? '' : ' hidden'}>
                        <h4>Child revision</h4>
                        <div class="ss-hint">This records the review on the parent revision and creates a new child revision for the next step.</div>
                        <div class="ss-interpretive-review-card">
                            <strong>Parent statement</strong>
                            <div class="ss-interpretive-review-statement">${escapeHtml(interpretation.statement || '')}</div>
                        </div>
                        <label class="ss-interpretive-review-field">
                            <span>Child statement</span>
                            <textarea class="text_pole" rows="5" name="revisedStatement" placeholder="Enter the narrower approved statement.">${escapeHtml(interpretation.statement || '')}</textarea>
                        </label>
                    </div>
                ` : ''}

                <div class="ss-interpretive-review-form-actions">
                    <input class="menu_button" type="submit" value="${escapeHtml(submitLabel)}" title="${escapeHtml(submitTooltip)}" />
                </div>
            </form>
        </div>
    `;
}

function renderPublicationActionForm({
    formKind,
    title,
    description = '',
    actionStatus = null,
    fieldsHtml = '',
    submitLabel,
    dataset = {},
    disabled = false,
}) {
    const attributes = buildDatasetAttributes(dataset);
    return `
        <div class="ss-interpretive-review-card ss-interpretive-action-card">
            <strong>${escapeHtml(title)}</strong>
            ${description ? `<div class="ss-hint">${escapeHtml(description)}</div>` : ''}
            ${renderActionStatus(actionStatus, formKind)}
            <form class="ss-interpretive-action-form" data-form-kind="${escapeHtml(formKind)}" ${attributes}>
                ${fieldsHtml}
                <div class="ss-interpretive-review-form-actions">
                    <input class="menu_button" type="submit" value="${escapeHtml(submitLabel)}"${disabled ? ' disabled' : ''} />
                </div>
            </form>
        </div>
    `;
}

function renderLifecycleGovernanceForm({
    formKind,
    title,
    description = '',
    actionKind,
    ownerId,
    interpretation,
    currentActorId,
    policies = [],
    actionStatus = null,
    extraFieldsHtml = '',
    submitLabel,
    dataset = {},
}) {
    const autoSubjectEvidenceRefs = collectAutoSubjectEvidenceRefs(interpretation);
    const hasAutoSubjectEvidenceRefs = autoSubjectEvidenceRefs.length > 0;
    const modeOptions = getInterpretiveSubmissionModeOptions({
        ownerId,
        memorySubjectId: interpretation.memorySubjectId,
        hasAutoSubjectEvidenceRefs,
    });
    const defaultMode = resolveDefaultInterpretiveSubmissionMode({
        ownerId,
        memorySubjectId: interpretation.memorySubjectId,
        currentActorId,
        actionKind,
        memoryScopeId: interpretation.memoryScopeId,
        continuityTargetId: interpretation.memorySubjectId,
        policies,
        hasAutoSubjectEvidenceRefs,
    });
    const defaultActorId = getDefaultActorForMode(defaultMode, ownerId, currentActorId);
    const applicablePolicies = filterDelegationPoliciesForAction(policies, {
        principalEntityId: ownerId,
        delegateEntityId: defaultActorId,
        actionKind,
        memoryScopeId: interpretation.memoryScopeId,
        continuityTargetId: interpretation.memorySubjectId,
    });
    const hasApplicablePolicies = applicablePolicies.length > 0;
    const governedFieldState = getGovernedFieldState({
        submissionMode: defaultMode,
        hasApplicablePolicies,
        hasAutoSubjectEvidenceRefs,
    });
    const attributes = buildDatasetAttributes(dataset);

    return `
        <div class="ss-interpretive-review-card ss-interpretive-action-card">
            <strong>${escapeHtml(title)}</strong>
            ${description ? `<div class="ss-hint">${escapeHtml(description)}</div>` : ''}
            ${renderActionStatus(actionStatus, formKind)}
            <form class="ss-interpretive-action-form"
                data-form-kind="${escapeHtml(formKind)}"
                data-action-kind="${escapeHtml(actionKind)}"
                data-owner-id="${escapeHtml(ownerId)}"
                data-memory-scope-id="${escapeHtml(interpretation.memoryScopeId || '')}"
                data-memory-subject-id="${escapeHtml(interpretation.memorySubjectId || '')}"
                data-continuity-target-id="${escapeHtml(interpretation.memorySubjectId || '')}"
                data-has-auto-subject-evidence-refs="${hasAutoSubjectEvidenceRefs ? 'true' : 'false'}"
                data-auto-subject-evidence-refs="${escapeHtml(autoSubjectEvidenceRefs.join('\n'))}"
                ${attributes}>
                ${renderKeyValueGrid([
                    { label: 'Decision owner', value: `<code>${escapeHtml(ownerId)}</code>` },
                    { label: 'Recording mode', value: `<select class="text_pole" name="submissionMode">${renderSubmissionModeOptions(modeOptions, defaultMode)}</select>` },
                    { label: 'Recorded by', value: `<input type="hidden" name="submittedByActorId" value="${escapeHtml(defaultActorId)}" /><code>${escapeHtml(defaultActorId)}</code>` },
                ])}

                <div class="ss-interpretive-review-form-grid">
                    <label class="ss-interpretive-review-field" data-field="delegationPolicyId"${defaultMode === 'TRUSTED_DELEGATE' && hasApplicablePolicies ? '' : ' hidden'}>
                        <span>Delegation policy</span>
                        <select class="text_pole" name="delegationPolicyId">
                            ${buildDelegationPolicyOptions(applicablePolicies)}
                        </select>
                        <span class="ss-hint">Trusted delegation locks to the exact policy version and hash on submit.</span>
                    </label>

                    <div class="ss-interpretive-review-field ss-interpretive-review-static-note" data-field="delegationPolicyUnavailable"${defaultMode === 'TRUSTED_DELEGATE' && !hasApplicablePolicies ? '' : ' hidden'}>
                        <span>Delegation policy</span>
                        <span class="ss-hint">No matching active delegation policy is available for this action. Use a direct mode or add a policy first.</span>
                    </div>
                </div>

                <label class="ss-interpretive-review-field" data-field="subjectEvidenceRefs"${governedFieldState.showEvidenceField ? '' : ' hidden'}>
                    <span>Subject Evidence References</span>
                    <textarea class="text_pole" rows="2" name="subjectEvidenceRefs" placeholder="One reference per line or comma-separated">${escapeHtml(autoSubjectEvidenceRefs.join('\n'))}</textarea>
                    <span class="ss-hint" data-field-hint="subjectEvidenceRefs">
                        ${escapeHtml(governedFieldState.evidenceHint)}
                    </span>
                </label>

                ${extraFieldsHtml}

                ${renderReasonCodeSelector()}

                <label class="ss-interpretive-review-field ss-interpretive-review-comment-field">
                    <span>Comment</span>
                    <textarea class="text_pole" rows="3" name="commentary" placeholder="Add any notes or context."></textarea>
                </label>

                <div class="ss-interpretive-review-form-actions">
                    <input class="menu_button" type="submit" value="${escapeHtml(submitLabel)}" />
                </div>
            </form>
        </div>
    `;
}

function buildDatasetAttributes(dataset = {}) {
    return Object.entries(dataset)
        .map(([key, value]) => {
            const normalizedKey = String(key || '')
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .replace(/[_\s]+/g, '-')
                .toLowerCase();
            return `data-${escapeHtml(normalizedKey)}="${escapeHtml(String(value ?? ''))}"`;
        })
        .join(' ');
}

function renderReviewRecords(interpretation, policiesById, selectedReviewRequestId, currentActorId, actionStatus) {
    const requests = Array.isArray(interpretation.reviewRequests) ? interpretation.reviewRequests : [];
    const policies = [...policiesById.values()];
    const dispositionsByRequestId = new Map(
        (Array.isArray(interpretation.reviewDispositions) ? interpretation.reviewDispositions : [])
            .map((entry) => [entry.reviewRequestId, entry]),
    );
    if (requests.length === 0) {
        return '<div class="ss-hint">No review requests yet.</div>';
    }
    return `
        <div class="ss-interpretive-review-list">
            ${requests.map((request) => {
                const disposition = dispositionsByRequestId.get(request.reviewRequestId) || null;
                const showForm = request.reviewRequestId === selectedReviewRequestId && request.status === 'PENDING';
                const ownerRoleLabel = request.reviewerEntityId === interpretation.memorySubjectId
                    ? 'Context owner'
                    : 'Relational participant';
                return `
                    <div class="ss-interpretive-review-card">
                        <strong>${escapeHtml(request.reviewerRole || 'Reviewer')}</strong>
                        <div class="ss-interpretive-review-inline-meta">
                            ${renderBadge(request.status)}
                            <code>${escapeHtml(request.reviewerEntityId || 'n/a')}</code>
                        </div>
                        <div class="ss-hint">Requested ${escapeHtml(formatTimestamp(request.createdAt))}</div>
                        <div class="ss-hint">Envelope <code>${escapeHtml(request.reviewEnvelopeHash || 'n/a')}</code></div>
                        ${disposition ? `
                            <div class="ss-interpretive-review-section">
                                <h4>Decision</h4>
                                <div class="ss-interpretive-review-inline-meta">
                                    ${renderBadge(disposition.disposition)}
                                </div>
                                ${renderReasonCodes(disposition.reasonCodes)}
                                <div class="ss-interpretive-review-statement">${escapeHtml(disposition.commentary || '(no commentary)')}</div>
                                <div class="ss-hint">Submitted ${escapeHtml(formatTimestamp(disposition.submittedAt))}</div>
                                ${renderProvenance(disposition.provenance, policiesById)}
                            </div>
                        ` : '<div class="ss-hint">No decision has been submitted.</div>'}
                        ${showForm ? renderActionForm({
                            formKind: 'review',
                            ownerId: request.reviewerEntityId,
                            ownerRoleLabel,
                            actionKind: 'REVIEW_DISPOSITION',
                            interpretation,
                            currentActorId,
                            policies,
                            reviewRequest: request,
                            actionStatus,
                        }) : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderSubjectDispositionSection(interpretation, policiesById, currentActorId, actionStatus) {
    const pendingRequests = Array.isArray(interpretation.reviewRequests)
        ? interpretation.reviewRequests.filter((entry) => entry.status === 'PENDING' || entry.status === 'DEFERRED')
        : [];
    const recordedSubjectDisposition = hasRecordedSubjectDisposition(interpretation.subjectDisposition)
        ? interpretation.subjectDisposition
        : null;
    const subjectDispositionHtml = recordedSubjectDisposition ? `
        ${renderKeyValueGrid([
            { label: 'State', value: renderBadge(recordedSubjectDisposition.state) },
            { label: 'Authority', value: renderBadge(recordedSubjectDisposition.finalDispositionAuthority || 'n/a') },
            { label: 'Updated', value: escapeHtml(formatTimestamp(recordedSubjectDisposition.updatedAt)) },
        ])}
        ${renderReasonCodes(recordedSubjectDisposition.reasonCodes)}
        <div class="ss-interpretive-review-card ss-interpretive-review-statement">${escapeHtml(recordedSubjectDisposition.commentary || '(no commentary)')}</div>
        ${renderProvenance(recordedSubjectDisposition.provenance, policiesById)}
    ` : '<div class="ss-hint">No subject decision has been recorded.</div>';

    const blocked = pendingRequests.length > 0
        || interpretation.reviewState === 'BLOCKED'
        || interpretation.reviewState === 'PENDING'
        || interpretation.reviewState === 'DEFERRED';

    const supersededByChild = !blocked
        && !recordedSubjectDisposition
        && Array.isArray(interpretation.childRevisionIds)
        && interpretation.childRevisionIds.length > 0;

    const formHtml = recordedSubjectDisposition
        ? '<div class="ss-hint">The subject decision is already recorded for this revision. Any further subject action needs a new governed revision or lifecycle step, not an overwrite.</div>'
        : blocked
        ? '<div class="ss-hint">The subject decision is still blocked until every required review is complete.</div>'
        : supersededByChild
            ? '<div class="ss-hint">The decision moved to the child revision created by Approve with edit. Review that revision instead of changing the parent.</div>'
            : renderActionForm({
            formKind: 'subject',
            ownerId: interpretation.memorySubjectId,
            ownerRoleLabel: 'Context owner',
            actionKind: 'SUBJECT_DISPOSITION',
            interpretation,
            currentActorId,
            policies: [...policiesById.values()],
            actionStatus,
        });

    return `
        ${subjectDispositionHtml}
        <div class="ss-interpretive-review-section">
            <h4>Record subject decision</h4>
            ${formHtml}
        </div>
    `;
}

function renderPublicationPolicyCards(policies) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return '<div class="ss-hint">No active publication policy matches this interpretation type.</div>';
    }
    return `
        <div class="ss-interpretive-review-list">
            ${policies.map((policy) => `
                <div class="ss-interpretive-review-card">
                    <strong><code>${escapeHtml(policy.publicationPolicyId)}</code></strong>
                    <div class="ss-interpretive-review-inline-meta">
                        ${renderBadge(policy.policyState)}
                        ${renderBadge(policy.continuityTargetType)}
                    </div>
                    <div class="ss-interpretive-review-summary-note">Version ${escapeHtml(policy.policyVersion != null ? `v${policy.policyVersion}` : 'n/a')}</div>
                    <div>Required Final Subject State: ${renderBadge(policy.requiredFinalSubjectState)}</div>
                    <div>Required Grounding Outcome: ${renderBadge(policy.requiredGroundingOutcome)}</div>
                    <div>Permitted Types: ${renderStringList(policy.permittedInterpretationTypes, 'None')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderQualificationCard(qualification, options = {}) {
    if (!qualification) {
        return '<div class="ss-hint">No qualification has been recorded yet.</div>';
    }
    const standardPolicyId = options.standardPolicy?.publicationPolicyId || null;
    const standardPolicyVersion = options.standardPolicy?.policyVersion ?? null;
    const continuityTargetId = options.continuityTargetId || null;
    const matchesStandardPolicy = standardPolicyId
        && qualification.publicationPolicyId === standardPolicyId
        && Number(qualification.policyVersion) === Number(standardPolicyVersion)
        && qualification.continuityTargetId === continuityTargetId;
    const refusalCodes = Array.isArray(qualification.refusalCodes) ? qualification.refusalCodes : [];
    return `
        <div class="ss-interpretive-review-card">
            <strong>${matchesStandardPolicy ? 'Latest eligibility check' : 'Previous eligibility check'}</strong>
            ${matchesStandardPolicy ? '' : '<div class="ss-hint">This result was recorded for a different policy or memory line and does not control the next publication step.</div>'}
            ${renderKeyValueGrid([
                { label: 'Verdict', value: renderBadge(qualification.eligibilityVerdict) },
                { label: 'Policy', value: `<code>${escapeHtml(qualification.publicationPolicyId)}</code> v${escapeHtml(String(qualification.policyVersion))}` },
                { label: 'Memory Line', value: `<code>${escapeHtml(qualification.continuityTargetId || 'n/a')}</code>` },
                { label: 'Evaluated At', value: escapeHtml(formatTimestamp(qualification.evaluatedAt)) },
            ])}
            ${refusalCodes.length > 0 ? `
                <div><strong>Why publication is blocked</strong></div>
                <div>${renderServerReasonList(refusalCodes, 'No refusal codes.')}</div>
            ` : ''}
        </div>
    `;
}

function renderAuthorizationCard(authorization) {
    if (!authorization) {
        return '<div class="ss-hint">No publication authorization has been recorded yet.</div>';
    }
    return `
        <div class="ss-interpretive-review-card">
            <strong>Latest publication authorization</strong>
            ${renderKeyValueGrid([
                { label: 'Status', value: renderBadge(authorization.status) },
                { label: 'Authorized By', value: `<code>${escapeHtml(authorization.authorizedBy || 'n/a')}</code>` },
                { label: 'Authorized At', value: escapeHtml(formatTimestamp(authorization.authorizedAt)) },
                { label: 'Expires At', value: escapeHtml(formatTimestamp(authorization.expiresAt)) },
            ])}
        </div>
    `;
}

function renderPublicationGuidanceCard(guidedFlow) {
    if (!guidedFlow) {
        return '';
    }
    const status = String(guidedFlow.status || '').trim().toUpperCase();
    const refusalCodes = Array.isArray(guidedFlow.technicalRefusalCodes) ? guidedFlow.technicalRefusalCodes : [];
    const visibleRefusalCodes = status === 'ALREADY_PUBLISHED'
        ? refusalCodes.filter((code) => String(code || '').trim().toUpperCase() !== 'INTERPRETATION_ALREADY_PUBLISHED')
        : refusalCodes;
    if (status === 'ALREADY_PUBLISHED') {
        return `
            <div class="ss-interpretive-review-card">
                <strong>Already published</strong>
                <div class="ss-interpretive-review-summary-note">No additional publication action is required.</div>
                ${visibleRefusalCodes.length > 0 ? `
                    <div>
                        <strong>Technical refusal codes</strong>
                    </div>
                    <div>${renderServerReasonList(visibleRefusalCodes, 'None')}</div>
                ` : ''}
            </div>
        `;
    }
    return `
        <div class="ss-interpretive-review-card">
            <strong>${escapeHtml(guidedFlow.headline || 'Publication guidance')}</strong>
            <div class="ss-interpretive-review-summary-note">${escapeHtml(guidedFlow.detail || '')}</div>
            ${refusalCodes.length > 0 ? `
                <div>
                    <strong>Technical refusal codes</strong>
                </div>
                <div>${renderServerReasonList(refusalCodes, 'None')}</div>
            ` : ''}
        </div>
    `;
}

function renderDnmRecordCard(record, options = {}) {
    const descriptor = describePublicationRecord(record, !options.compact);
    const statusBadges = [
        renderBadge(record.publicationState),
        renderBadge(record.lifecycleState),
    ];
    if (record.deltaReviewState && record.deltaReviewState !== 'NONE') {
        statusBadges.push(renderBadge(record.deltaReviewState));
    }
    const rows = [
        { label: 'Published At', value: escapeHtml(formatTimestamp(record.publishedAt)) },
    ];
    const availableActions = Array.isArray(record.operatorState?.availableActions) ? record.operatorState.availableActions : [];
    const blockedActions = Array.isArray(record.operatorState?.blockedActions) ? record.operatorState.blockedActions : [];
    const blockingReasons = Array.isArray(record.operatorState?.blockingReasons) ? record.operatorState.blockingReasons : [];
    return `
        <div class="ss-interpretive-review-card">
            <strong>${escapeHtml(descriptor.title)}</strong>
            <div class="ss-interpretive-review-inline-meta">${statusBadges.join('')}</div>
            ${renderKeyValueGrid(rows)}
            <div class="ss-hint">${escapeHtml(descriptor.summary)}</div>
            <div class="ss-interpretive-review-statement">${escapeHtml(record.publishedStatement || '(no statement)')}</div>
            ${options.showOperatorState && availableActions.length > 0 ? `
                <div><strong>Lawful actions now</strong></div>
                <div>${renderServerReasonList(availableActions, 'None')}</div>
            ` : ''}
            ${options.showOperatorState && blockedActions.length > 0 ? `
                <div><strong>Why other steps are unavailable</strong></div>
                <div>${renderBlockedActionList(blockedActions, 'None')}</div>
            ` : ''}
            ${options.showOperatorState && blockingReasons.length > 0 ? `
                <div><strong>Blocking reasons</strong></div>
                <div>${renderServerReasonList(blockingReasons, 'None')}</div>
            ` : ''}
            ${Array.isArray(record.deltaReviews) && record.deltaReviews.length > 0 ? `
                <div class="ss-interpretive-review-section">
                    <h4>Delta Reviews</h4>
                    <div class="ss-interpretive-review-list">
                        ${record.deltaReviews.map((review) => `
                            <div class="ss-interpretive-review-card">
                                <strong><code>${escapeHtml(review.deltaReviewId)}</code></strong>
                                <div class="ss-interpretive-review-inline-meta">
                                    ${renderBadge(review.deltaState)}
                                    ${renderBadge(review.provenance?.submissionMode || 'n/a')}
                                </div>
                                ${renderReasonCodes(review.reasonCodes)}
                                <div class="ss-interpretive-review-statement">${escapeHtml(review.commentary || '(no commentary)')}</div>
                                ${renderProvenance(review.provenance, new Map())}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPublicationHistoryCard(entry) {
    const record = entry?.record;
    if (!record) {
        return '';
    }
    const statusBadges = [
        renderBadge(record.publicationState),
        renderBadge(record.lifecycleState),
    ];
    if (record.deltaReviewState && record.deltaReviewState !== 'NONE') {
        statusBadges.push(renderBadge(record.deltaReviewState));
    }
    if (entry.isCurrent) {
        statusBadges.push(renderBadge('Current active'));
    }
    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-history-card">
            <div class="ss-interpretive-review-history-heading">
                <strong>${escapeHtml(entry.title || 'Published memory')}</strong>
                ${entry.timestamp ? `<div class="ss-hint">${escapeHtml(formatTimestamp(entry.timestamp))}</div>` : ''}
            </div>
            <div class="ss-interpretive-review-inline-meta ss-interpretive-review-inline-meta--compact">
                ${statusBadges.join('')}
            </div>
            <div class="ss-interpretive-review-history-block">
                <div class="ss-interpretive-review-history-block-label">Event summary</div>
                <div class="ss-interpretive-review-summary-note">${escapeHtml(entry.summary || 'No publication summary available.')}</div>
            </div>
            <div class="ss-interpretive-review-history-block">
                <div class="ss-interpretive-review-history-block-label">Published statement</div>
                <div class="ss-interpretive-review-statement">${escapeHtml(record.publishedStatement || '(no statement)')}</div>
            </div>
            ${renderTechnicalDetailsSection([
                { label: 'Published Record ID', value: renderCopyableCode(record.dnmRecordId, { emptyLabel: 'n/a' }) },
                { label: 'Source Revision', value: renderCopyableCode(record.sourceInterpretationRevisionId, { emptyLabel: 'n/a' }) },
                { label: 'Memory Line', value: renderCopyableCode(record.continuityTargetId, { emptyLabel: 'n/a' }) },
                { label: 'Authorization', value: renderCopyableCode(record.authorizationId, { emptyLabel: 'n/a' }) },
            ], {
                title: 'Technical details',
                extraClass: 'ss-interpretive-review-history-subdetails',
            })}
        </div>
    `;
}

function renderPublicationOperatorSection(interpretation, operatorState, policiesById, options = {}) {
    if (!operatorState) {
        return '<div class="ss-hint">Lifecycle controls are unavailable for this memory.</div>';
    }

    const matchingPolicies = Array.isArray(operatorState.matchingPolicies) ? operatorState.matchingPolicies : [];
    const recordsForTarget = Array.isArray(operatorState.recordsForTarget) ? operatorState.recordsForTarget : [];
    const activeRecord = operatorState.currentActiveRecord || null;
    const publicationHistoryRecords = [...recordsForTarget, activeRecord]
        .filter(Boolean)
        .filter((record, index, records) => records.findIndex((candidate) => candidate?.dnmRecordId === record?.dnmRecordId) === index);
    const continuityTargetId = operatorState.continuityTargetId || interpretation.memorySubjectId;
    const guidedFlow = operatorState.guidedFlow || null;
    const standardPolicy = operatorState.standardPolicy || null;
    const latestEligibleQualification = operatorState.latestQualification?.eligibilityVerdict === 'ELIGIBLE'
        ? operatorState.latestQualification
        : null;
    const canQualify = operatorState.availableActions?.includes('QUALIFY_PUBLICATION') === true;
    const governancePolicies = [...policiesById.values()];
    const operatorAvailableActions = getVisibleOperatorActions(interpretation, operatorState);
    const operatorBlockedActions = Array.isArray(operatorState.blockedActions) ? operatorState.blockedActions : [];
    const operatorBlockingReasons = Array.isArray(operatorState.blockingReasons) ? operatorState.blockingReasons : [];
    const actionForms = [];
    const guidanceStatus = String(guidedFlow?.status || '').trim().toUpperCase();
    const isPublishedRevision = String(interpretation.publicationState || '').trim().toUpperCase() === 'PUBLISHED';

    if (guidedFlow?.nextAction?.action === 'BOOTSTRAP_STANDARD_PUBLICATION_POLICY') {
        actionForms.push(renderPublicationActionForm({
            formKind: 'publication-bootstrap',
            title: 'Publication setup required',
            description: 'Create the standard governed publication policy for this host.',
            actionStatus: options.actionStatus,
            submitLabel: 'Set Up Standard Publication Policy',
            dataset: {},
            fieldsHtml: '',
        }));
    }

    if (guidedFlow?.nextAction?.action === 'CHECK_ELIGIBILITY' && canQualify) {
        const guidedPolicyId = standardPolicy?.publicationPolicyId || operatorState.latestQualification?.publicationPolicyId || '';
        const guidedPolicyVersion = standardPolicy?.policyVersion || '';
        actionForms.push(renderPublicationActionForm({
            formKind: 'publication-qualify',
            title: 'Check Eligibility',
            description: 'Check whether this revision can be published.',
            actionStatus: options.actionStatus,
            submitLabel: 'Check Eligibility',
            disabled: !canQualify,
            dataset: {
                interpretationRevisionId: interpretation.interpretationRevisionId,
                publicationPolicyId: guidedPolicyId,
                publicationPolicyVersion: guidedPolicyVersion,
                proposalContentHash: interpretation.proposalContentHash || '',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash || '',
                subjectDispositionRecordId: interpretation.subjectDisposition?.subjectDispositionId || '',
            },
            fieldsHtml: `
                <label class="ss-interpretive-review-field">
                    <span>Publication policy</span>
                    <input class="text_pole" type="text" value="${escapeHtml(`${guidedPolicyId || 'n/a'}${guidedPolicyVersion ? ` v${guidedPolicyVersion}` : ''}`)}" readonly />
                </label>
                <label class="ss-interpretive-review-field">
                    <span>Continuity Target</span>
                    <input class="text_pole" type="text" name="continuityTargetId" value="${escapeHtml(continuityTargetId || '')}" readonly />
                </label>
            `,
        }));
    }

    if (guidedFlow?.nextAction?.action === 'OPEN_CHILD_REVISION') {
        const childRevisionId = String(guidedFlow?.nextAction?.interpretationRevisionId || '').trim();
        actionForms.push(renderPublicationActionForm({
            formKind: 'open-child-revision',
            title: 'Revision required',
            description: 'A newer child revision exists. Open the latest revision to continue review and publication from the current wording.',
            actionStatus: options.actionStatus,
            submitLabel: 'Open Latest Revision',
            disabled: !childRevisionId,
            dataset: {
                interpretationRevisionId: childRevisionId,
            },
            fieldsHtml: childRevisionId ? `
                <label class="ss-interpretive-review-field">
                    <span>Latest revision</span>
                    <input class="text_pole" type="text" value="${escapeHtml(childRevisionId)}" readonly />
                </label>
            ` : '',
        }));
    }

    if (guidedFlow?.nextAction?.action === 'PUBLISH_MEMORY' && latestEligibleQualification) {
        actionForms.push(renderPublicationActionForm({
            formKind: 'publication-publish',
            title: 'Publish Memory',
            description: 'Publish this eligible revision into governed memory.',
            actionStatus: options.actionStatus,
            submitLabel: 'Publish Memory',
            disabled: !latestEligibleQualification,
            dataset: {
                interpretationRevisionId: interpretation.interpretationRevisionId,
                continuityTargetId,
                publicationPolicyId: standardPolicy?.publicationPolicyId || latestEligibleQualification?.publicationPolicyId || '',
                proposalContentHash: interpretation.proposalContentHash || '',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash || '',
                subjectDispositionRecordId: interpretation.subjectDisposition?.subjectDispositionId || '',
            },
            fieldsHtml: `
                <label class="ss-interpretive-review-field">
                    <span>Publication policy</span>
                    <input class="text_pole" type="text" value="${escapeHtml(`${standardPolicy?.publicationPolicyId || latestEligibleQualification?.publicationPolicyId || 'n/a'}${standardPolicy?.policyVersion ? ` v${standardPolicy.policyVersion}` : ''}`)}" readonly />
                </label>
                <label class="ss-interpretive-review-field">
                    <span>Continuity Target</span>
                    <input class="text_pole" type="text" value="${escapeHtml(continuityTargetId || '')}" readonly />
                </label>
                <label class="ss-interpretive-review-field">
                    <span>Published by</span>
                    <input class="text_pole" type="text" value="${escapeHtml(options.currentActorId || '')}" readonly />
                </label>
            `,
        }));
    }

    if (isPublishedRevision && guidedFlow?.nextAction?.action !== 'OPEN_CHILD_REVISION') {
        const successorAction = getPublishedRevisionActionProjection();
        actionForms.push(renderLifecycleGovernanceForm({
            formKind: 'subject-revision',
            title: successorAction.title,
            description: successorAction.description,
            actionKind: 'SUBJECT_REVISION',
            ownerId: interpretation.memorySubjectId,
            interpretation,
            currentActorId: options.currentActorId,
            policies: governancePolicies,
            actionStatus: options.actionStatus,
            submitLabel: successorAction.submitLabel,
            dataset: {
                interpretationRevisionId: interpretation.interpretationRevisionId,
                parentStatement: interpretation.statement || '',
            },
            extraFieldsHtml: `
                <label class="ss-interpretive-review-field" data-field="revisedCandidate">
                    <span>Revised statement</span>
                    <textarea class="text_pole" rows="5" name="revisedStatement" placeholder="Enter the revised published statement.">${escapeHtml(interpretation.statement || '')}</textarea>
                    <span class="ss-hint">The new revision keeps the current statement as parent context and records only the updated wording.</span>
                </label>
            `,
        }));
    }

    if (activeRecord?.operatorState?.availableActions?.includes('WITHDRAW_DNM') === true) {
        actionForms.push(renderLifecycleGovernanceForm({
            formKind: 'dnm-withdraw',
            title: 'Withdraw Current Memory',
            description: '',
            actionKind: 'DNM_WITHDRAWAL',
            ownerId: interpretation.memorySubjectId,
            interpretation,
            currentActorId: options.currentActorId,
            policies: governancePolicies,
            actionStatus: options.actionStatus,
            submitLabel: 'Withdraw Current Memory',
            dataset: {
                dnmRecordId: activeRecord.dnmRecordId,
            },
        }));
    }

    const lifecycleNavigationActions = getLifecycleNavigationActions({
        interpretationRevisionId: interpretation.interpretationRevisionId,
        currentActiveRecord: activeRecord,
    });
    const lifecycleNavigationForms = lifecycleNavigationActions.map((action) => renderPublicationActionForm({
        formKind: 'open-current-published-memory',
        title: action.title,
        description: action.description,
        actionStatus: options.actionStatus,
        submitLabel: action.submitLabel,
        disabled: !action.interpretationRevisionId,
        dataset: {
            interpretationRevisionId: action.interpretationRevisionId || '',
        },
        fieldsHtml: '',
    }));

    const suppressPublishedRedundancy = guidanceStatus === 'ALREADY_PUBLISHED' && isPublishedRevision;
    const showGuidanceCard = actionForms.length === 0 && !suppressPublishedRedundancy;
    const primaryActionHeading = actionForms.length > 1 ? 'Lawful actions now' : 'Next step';
    const latestQualificationCard = !isPublishedRevision && operatorState.latestQualification
        ? renderQualificationCard(operatorState.latestQualification, {
            standardPolicy,
            continuityTargetId,
        })
        : '';

    return `
        ${renderStaticSection(
            'Current Published Memory',
            'Shows the currently published memory for this memory line, if one exists.',
            activeRecord ? `
                ${renderDnmRecordCard(activeRecord, {
                    showContinuityTarget: true,
                    showAuthorization: true,
                })}
            ` : '<div class="ss-hint">No published memory exists yet for this memory line.</div>',
            { extraClass: 'ss-interpretive-review-lifecycle-section', sectionKey: 'current-published-memory' },
        )}

        ${renderStaticSection(
            'Publication Readiness',
            'Shows only lawful publication and active-memory lifecycle operations.',
            `
                ${renderStatusMatrix([
                    { label: 'Granted', value: renderBadge(interpretation.subjectDispositionState || 'NONE') },
                    ...(!isPublishedRevision ? [
                        { label: 'Qualified', value: renderBadge(operatorState.latestQualification?.eligibilityVerdict || 'UNQUALIFIED') },
                        { label: 'Authorized', value: renderBadge(operatorState.latestAuthorization?.status || 'UNAUTHORIZED') },
                    ] : []),
                    { label: 'Published', value: renderBadge(interpretation.publicationState || 'NOT_PUBLISHED') },
                    { label: 'Current Active Memory', value: renderBadge(activeRecord?.lifecycleState || 'NONE') },
                ])}
                ${renderPolicyAuditSummary(continuityTargetId, operatorAvailableActions, operatorBlockingReasons, {
                    includeBlockingReasons: !suppressPublishedRedundancy,
                })}
                ${actionForms.length > 0 ? `
                    <div class="ss-interpretive-review-primary-action">
                        <div><strong>${primaryActionHeading}</strong></div>
                        <div class="ss-interpretive-review-list">${actionForms.join('')}</div>
                    </div>
                ` : ''}
                ${lifecycleNavigationForms.length > 0 ? `
                    <div class="ss-interpretive-review-primary-action">
                        <div><strong>Navigation</strong></div>
                        <div class="ss-interpretive-review-list">${lifecycleNavigationForms.join('')}</div>
                    </div>
                ` : ''}
                ${showGuidanceCard ? renderPublicationGuidanceCard(guidedFlow) : ''}
                ${latestQualificationCard}
                ${actionForms.length === 0 && !suppressPublishedRedundancy ? '<div class="ss-hint">No lifecycle actions are currently lawful for this memory.</div>' : ''}
                ${(operatorBlockedActions.length > 0 || operatorBlockingReasons.length > 0) && !suppressPublishedRedundancy ? renderCollapsibleSection(
                    'Why other steps are unavailable',
                    'Hidden by default to keep only actionable lifecycle work in the main path.',
                    `
                        ${operatorBlockedActions.length > 0 ? `
                            <div><strong>Blocked actions</strong></div>
                            <div>${renderBlockedActionList(operatorBlockedActions, 'None')}</div>
                        ` : ''}
                        ${operatorBlockingReasons.length > 0 ? `
                            <div><strong>Blocking reasons</strong></div>
                            <div>${renderServerReasonList(operatorBlockingReasons, 'None')}</div>
                        ` : ''}
                    `,
                    { extraClass: 'ss-interpretive-review-subsection' },
                ) : ''}
            `,
            { extraClass: 'ss-interpretive-review-lifecycle-section' },
        )}

        ${renderStaticSection(
            'Policy and Audit',
            'Shows lifecycle policy inputs and exact operator-level state without repeating the whole record dump.',
            `
                ${renderPublicationPolicyCards(matchingPolicies)}
            `,
            { extraClass: 'ss-interpretive-review-lifecycle-section' },
        )}

        ${renderStaticSection(
            'Publication History',
            'Shows eligibility, authorization, publication, supersession, and withdrawal over time.',
            publicationHistoryRecords.length > 0 ? `
                <div class="ss-interpretive-review-list">
                    ${buildPublicationHistoryEntries(recordsForTarget, activeRecord)
                        .map((entry) => renderPublicationHistoryCard(entry))
                        .join('')}
                </div>
            ` : `<div class="ss-hint">${activeRecord
                ? 'No earlier publication events have been recorded for this memory line.'
                : 'No publication events have been recorded for this memory line.'}</div>`,
            { extraClass: 'ss-interpretive-review-lifecycle-section', sectionKey: 'publication-history' },
        )}
    `;
}

function buildFilteredQueueGroups(reviews, statusFilter = '') {
    return buildQueueGroups(reviews).filter((group) => groupMatchesStatusFilter(group, statusFilter));
}

function renderQueueGroupItem(group, selectedReviewRequestId, selectedInterpretationRevisionId, duplicateReviewRequestSelection = false) {
    const reviews = Array.isArray(group?.reviews) ? group.reviews : [];
    const representativeReview = getQueueGroupRepresentativeReview(reviews);
    if (!representativeReview) {
        return '';
    }
    const canonicalRevisionState = representativeReview?.canonicalRevisionState || null;
    const publicationOperatorState = representativeReview?.operatorState || canonicalRevisionState?.operatorState || null;
    const createdAt = reviews.reduce((earliest, review) => {
        const created = Number(review?.createdAt || 0);
        if (!Number.isFinite(created) || created <= 0) {
            return earliest;
        }
        return earliest === null ? created : Math.min(earliest, created);
    }, null);

    const groupSelected = isQueueGroupSelected(group, selectedReviewRequestId, selectedInterpretationRevisionId, duplicateReviewRequestSelection);
    const normalizedSelectedReviewRequestId = String(selectedReviewRequestId || '').trim();
    const normalizedSelectedRevisionId = String(selectedInterpretationRevisionId || '').trim();
    const revisionWorkflowBadge = renderBadge(buildPrimaryWorkflowStatus({
        reviewRequests: reviews,
        reviewState: canonicalRevisionState?.reviewState ?? representativeReview.reviewState,
        subjectDispositionState: canonicalRevisionState?.subjectDispositionState ?? representativeReview.subjectDispositionState,
        publicationState: canonicalRevisionState?.publicationState ?? representativeReview.publicationState,
    }, publicationOperatorState));

    return `
        <div
            class="ss-interpretive-review-item ss-interpretive-review-group-item${groupSelected ? ' active' : ''}"
            data-interpretation-revision-id="${escapeHtml(group.interpretationRevisionId)}">
            <div class="ss-interpretive-review-item-title">
                <span>${escapeHtml(formatRevisionLabel(group.interpretationRevisionId))}</span>
                <span class="ss-interpretive-review-inline-meta">${revisionWorkflowBadge}</span>
            </div>
            ${createdAt ? `<div class="ss-hint">${escapeHtml(formatTimestamp(createdAt))}</div>` : ''}
            <div class="ss-interpretive-review-group-rows">
                ${reviews.map((review) => `
                    ${(() => {
                        const reviewRequestId = String(review?.reviewRequestId || '').trim();
                        const rowSelected = reviewRequestId
                            && reviewRequestId === normalizedSelectedReviewRequestId
                            && (!duplicateReviewRequestSelection || !normalizedSelectedRevisionId || normalizedSelectedRevisionId === group.interpretationRevisionId);
                        return `
                    <button
                        type="button"
                        class="ss-interpretive-review-group-row-button${rowSelected ? ' active' : ''}"
                        data-review-request-id="${escapeHtml(review.reviewRequestId)}"
                        data-interpretation-revision-id="${escapeHtml(group.interpretationRevisionId)}">
                        <div class="ss-interpretive-review-group-row-main">
                            <span class="ss-interpretive-review-group-name">${escapeHtml(formatHumanEntityLabel(review.reviewerEntityId || ''))}</span>
                            <span class="ss-hint">${escapeHtml(formatHumanRoleLabel(review.reviewerRole || 'REVIEWER'))}</span>
                        </div>
                        <div class="ss-interpretive-review-inline-meta">
                            ${renderBadge(formatHumanStateLabel(review.status))}
                        </div>
                    </button>
                `;
                    })()}
                `).join('')}
            </div>
        </div>
    `;
}

function renderDetailTabs(selectedView) {
    const views = [
        { id: 'review', label: 'Review' },
        { id: 'history', label: 'History' },
        { id: 'lifecycle', label: 'Publication Lifecycle' },
        { id: 'technical', label: 'Technical Details' },
    ];
    return `
        <div class="ss-interpretive-review-detail-tabs" role="tablist" aria-label="Memory review views">
            ${views.map((view) => `
                <button
                    type="button"
                    class="ss-interpretive-review-detail-tab${selectedView === view.id ? ' active' : ''}"
                    data-detail-view="${escapeHtml(view.id)}"
                    role="tab"
                    aria-selected="${selectedView === view.id ? 'true' : 'false'}">
                    ${escapeHtml(view.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderSummaryFacts(rows) {
    return `
        <div class="ss-interpretive-review-facts">
            ${rows.map(({ label, value }) => `
                <div class="ss-interpretive-review-fact">
                    <span><strong>${escapeHtml(label)}:</strong> ${value}</span>
                </div>
            `).join('')}
        </div>
    `;
}

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

function formatEvidenceFindingRoleLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'PRIMARY') return 'Primary evidence';
    if (normalized === 'SUPPORTING') return 'Supporting evidence';
    if (normalized === 'COUNTEREVIDENCE') return 'Contrary evidence';
    return formatHumanReadableEnumLabel(normalized);
}

function formatEvidenceFindingSupportLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'SUPPORTED') return 'Supported';
    if (normalized === 'PARTIALLY_SUPPORTED') return 'Partially supported';
    if (normalized === 'CONTRADICTED') return 'Contradicted';
    if (normalized === 'NEUTRAL') return 'Neutral';
    return formatHumanReadableEnumLabel(normalized);
}

function renderEvidenceFindingDomains(domains) {
    if (!Array.isArray(domains) || domains.length === 0) {
        return '';
    }
    return domains.map((domain) => renderBadge(formatHumanReadableEnumLabel(domain))).join('');
}

function renderEvidenceFindingCard(finding) {
    const roleBadge = renderBadge(formatEvidenceFindingRoleLabel(finding?.role));
    const supportBadge = renderBadge(formatEvidenceFindingSupportLabel(finding?.supportLevel));
    const domainBadges = renderEvidenceFindingDomains(finding?.domains);
    const basisRefs = Array.isArray(finding?.basisRefs) ? finding.basisRefs : [];
    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-status-card ss-interpretive-review-evidence-finding">
            <div class="ss-interpretive-review-inline-meta">
                ${roleBadge}
                ${supportBadge}
                ${domainBadges}
            </div>
            <div class="ss-interpretive-review-summary-note">${escapeHtml(String(finding?.summary || '').trim() || 'No readable finding summary recorded.')}</div>
            <div class="ss-interpretive-review-evidence-meta">
                <div class="ss-interpretive-review-evidence-meta-row">
                    <strong>Source</strong>
                    <span>${escapeHtml(String(finding?.sourceLabel || '').trim() || 'n/a')}</span>
                </div>
                <div class="ss-interpretive-review-evidence-meta-row">
                    <strong>Basis refs</strong>
                    <span>${renderStringList(basisRefs, 'None recorded')}</span>
                </div>
            </div>
        </div>
    `;
}

function formatHumanRoleLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'RELATIONAL_PARTICIPANT') return 'Relational participant';
    if (normalized === 'MEMORY_SUBJECT') return 'Context owner';
    return formatSubmissionModeLabel(normalized);
}

function formatInterpretationTypeLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'ROLE_EVOLUTION') return 'Role evolution';
    return formatSubmissionModeLabel(normalized || 'INTERPRETATION');
}

function formatRevisionLabel(value) {
    const text = String(value || '').trim();
    const patterns = [
        /(?:^|[_-])v(?:ersion)?[_-]?(\d+)$/i,
        /(?:^|[_-])revision[_-]?(\d+)$/i,
        /(?:^|[_-])rev[_-]?(\d+)$/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return `Revision ${Number(match[1])}`;
        }
    }
    const tail = text.split(/[_-]+/).filter(Boolean).at(-1) || '';
    if (/^\d+$/.test(tail)) {
        return `Revision ${Number(tail)}`;
    }
    return 'Revision';
}

function formatMonthYear(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '';
    }
    return new Date(Number(value)).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
    });
}

function formatHumanStateLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        SEALED_FOR_REVIEW: 'Ready for review',
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        DEFERRED: 'Deferred',
        CONTESTED: 'Contested',
        GRANTED: 'Granted',
        DENIED: 'Denied',
        ELIGIBLE: 'Eligible',
        INELIGIBLE: 'Ineligible',
        AUTHORIZED: 'Authorized',
        CONSUMED: 'Used',
        PUBLISHED: 'Published',
        SUPERSEDED: 'Superseded',
        WITHDRAWN: 'Withdrawn',
        ACTIVE: 'Active',
        NOT_PUBLISHED: 'Not published',
        COMPLETE: 'Complete',
        BLOCKED: 'Blocked',
    };
    return map[normalized] || formatSubmissionModeLabel(normalized);
}

function formatLifecycleActionLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        QUALIFY_PUBLICATION: 'Check publication readiness',
        AUTHORIZE_PUBLICATION: 'Authorize publication',
        EXECUTE_PUBLICATION: 'Publish approved memory',
        OPEN_CHILD_REVISION: 'Open latest revision',
        WITHDRAW_DNM: 'Withdraw current memory',
        SUPERSEDE_ACTIVE_WITH_RECORD: 'Replace current memory',
        RECORD_DNM_DELTA_REVIEW: 'Record follow-up review',
    };
    return map[normalized] || formatSubmissionModeLabel(normalized);
}

function formatLifecycleBlockingReason(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        PUBLICATION_QUALIFICATION_REQUIRED: 'Eligibility check is still required',
        PUBLICATION_AUTHORIZATION_REQUIRED: 'Publication authorization is still required',
        PUBLICATION_AUTHORIZATION_CONSUMED: 'The existing publication authorization has already been used',
        INTERPRETATION_ALREADY_PUBLISHED: 'This memory is already published',
        RECORD_NOT_ACTIVE_FOR_WITHDRAWAL: 'Only an active or pending published memory can be withdrawn',
        RECORD_NOT_DELTA_PENDING_FOR_SUPERSESSION: 'Only a pending replacement can take over as current memory',
        NO_CURRENT_ACTIVE_RECORD_TO_SUPERSEDE: 'There is no current published memory to replace',
        RECORD_ALREADY_ACTIVE: 'This memory is already the current published memory',
        PENDING_REPLACEMENT_ALREADY_EXISTS: 'A pending published replacement already exists for this memory line',
    };
    return map[normalized] || formatSubmissionModeLabel(normalized);
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

function formatEvidenceEvaluationLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        COMPLETE: 'Complete',
        SEALED_FOR_GROUNDING: 'Pending',
        INVALIDATED_SOURCE_MUTATION: 'Invalidated by source change',
        UNSUPPORTED: 'Unsupported',
    };
    return map[normalized] || formatSubmissionModeLabel(normalized || 'UNKNOWN');
}

function formatReviewWorkflowLabel(interpretation) {
    const reviewWorkflow = summarizeReviewWorkflowCode(interpretation?.reviewRequests)
        || String(interpretation?.reviewState || '').trim().toUpperCase();
    const map = {
        COMPLETE: 'Complete',
        PENDING: 'Pending',
        BLOCKED: 'Blocked',
        DEFERRED: 'Deferred',
        CONTESTED: 'Contested',
        REJECTED: 'Rejected',
        NOT_ROUTED: 'Not routed',
    };
    return map[reviewWorkflow] || formatHumanStateLabel(reviewWorkflow || 'PENDING');
}

function formatSubjectDecisionStatusLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        PENDING: 'Pending',
        GRANTED: 'Granted',
        DENIED: 'Denied',
        DEFERRED: 'Deferred',
        CONTESTED: 'Contested',
    };
    return map[normalized] || formatHumanStateLabel(normalized || 'PENDING');
}

function formatPublicationStatusLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        NOT_PUBLISHED: 'Not published',
        PUBLISHED: 'Published',
    };
    return map[normalized] || formatHumanStateLabel(normalized || 'NOT_PUBLISHED');
}

function formatStructuralAuthorityLabel(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const map = {
        DESCRIPTIVE_ONLY: 'Unchanged',
    };
    return map[normalized] || formatHumanStateLabel(normalized || 'UNKNOWN');
}

function getSelectedReviewRequest(interpretation, selectedReviewRequestId) {
    const requests = Array.isArray(interpretation?.reviewRequests) ? interpretation.reviewRequests : [];
    return requests.find((entry) => entry.reviewRequestId === selectedReviewRequestId)
        || requests[0]
        || null;
}

function renderSelectedReviewerSummary(interpretation, selectedReviewRequestId) {
    const selectedRequest = getSelectedReviewRequest(interpretation, selectedReviewRequestId);
    if (!selectedRequest) {
        return '';
    }
    const dispositionsByRequestId = new Map(
        (Array.isArray(interpretation.reviewDispositions) ? interpretation.reviewDispositions : [])
            .map((entry) => [entry.reviewRequestId, entry]),
    );
    const disposition = dispositionsByRequestId.get(selectedRequest.reviewRequestId) || null;
    const commentary = String(disposition?.commentary || '').trim();
    const reviewerLabel = formatHumanEntityLabel(selectedRequest.reviewerEntityId || '');
    const contextLine = disposition
        ? `${formatHumanStateLabel(disposition.disposition)} by ${reviewerLabel}.`
        : `Pending response from ${reviewerLabel}.`;
    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-status-card">
            <div class="ss-interpretive-review-summary-note">
                <strong>Review response:</strong> ${escapeHtml(contextLine)}
            </div>
            ${commentary ? `<div class="ss-interpretive-review-summary-note">${escapeHtml(commentary)}</div>` : ''}
        </div>
    `;
}

function formatPossessiveLabel(value) {
    const text = String(value || '').trim();
    if (!text) {
        return 'its';
    }
    return text.endsWith('s') ? `${text}'` : `${text}'s`;
}

function buildWhyReviewSummary(interpretation) {
    const subject = formatHumanEntityLabel(interpretation.memorySubjectId);
    const participantIds = Array.isArray(interpretation.materialParticipantEntityIds)
        ? interpretation.materialParticipantEntityIds.filter((id) => id && id !== interpretation.memorySubjectId)
        : [];
    const participants = participantIds.map((id) => formatHumanEntityLabel(id));
    const domains = Array.isArray(interpretation.assertionDomains)
        ? interpretation.assertionDomains.map((domain) => String(domain || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const domainText = domains.length > 0
        ? domains.length === 1
            ? domains[0]
            : `${domains.slice(0, -1).join(', ')}, and ${domains[domains.length - 1]}`
        : 'meaning';
    const participantText = participants.length > 0
        ? ` with ${participants.join(' and ')}`
        : '';
    return `Concerns ${subject}'s ${domainText}${participantText}.`;
}

function buildWhyReviewLabel(interpretation) {
    void interpretation;
    return 'Reason for Review';
}

function buildReviewHeadingLabel(interpretation, operatorState) {
    const lifecycleStatus = getRevisionLifecycleStatus(interpretation, operatorState);
    if (lifecycleStatus === 'SUPERSEDED' || lifecycleStatus === 'WITHDRAWN') {
        return 'Previous published context';
    }
    if (lifecycleStatus === 'ACTIVE' || lifecycleStatus === 'PUBLISHED') {
        return 'Published context';
    }
    if (lifecycleStatus === 'GRANTED' || lifecycleStatus === 'COMPLETE') {
        return 'Approved context';
    }
    return 'Context to review';
}

function buildNoActionSummary(interpretation, operatorState) {
    const lifecycleStatus = getRevisionLifecycleStatus(interpretation, operatorState);
    const reviewState = String(interpretation.reviewState || '').trim().toUpperCase();
    const subjectState = String(interpretation.subjectDispositionState || '').trim().toUpperCase();
    const publicationState = String(interpretation.publicationState || '').trim().toUpperCase();
    const isActive = operatorState?.currentActiveRecord?.sourceInterpretationRevisionId === interpretation.interpretationRevisionId;
    const visibleLifecycleActions = getVisibleOperatorActions(interpretation, operatorState);

    if (lifecycleStatus === 'SUPERSEDED') {
        return 'This revision was published and later replaced by a newer approved memory.';
    }
    if (lifecycleStatus === 'WITHDRAWN') {
        return 'This revision was published and later withdrawn from active continuity.';
    }
    if (publicationState === 'PUBLISHED') {
        return isActive
            ? 'Already published and active.'
            : 'Already published.';
    }
    if (visibleLifecycleActions.length > 0) {
        return 'Publication and active-memory actions are available in Publication Lifecycle.';
    }
    if (subjectState === 'GRANTED' && reviewState === 'COMPLETE') {
        return 'No actions available.';
    }
    return 'No actions available.';
}

function renderHumanEvidenceSection(interpretation) {
    const groundingLinks = Array.isArray(interpretation?.groundingLinks) ? interpretation.groundingLinks : [];
    const evidenceFindings = Array.isArray(interpretation?.evidenceFindings) ? interpretation.evidenceFindings : [];
    const evidenceFindingState = String(interpretation?.evidenceFindingState || '').trim().toUpperCase();
    const boundCount = groundingLinks.length;
    const boundLabel = boundCount === 1 ? '1 bound source' : `${boundCount} bound sources`;
    const findingCount = evidenceFindings.length;
    const findingLabel = findingCount === 1 ? '1 readable finding' : `${findingCount} readable findings`;
    const hasReadableFindings = evidenceFindingState === 'AVAILABLE' && findingCount > 0;
    const summaryText = hasReadableFindings
        ? `${findingLabel.charAt(0).toUpperCase()}${findingLabel.slice(1)} derived from ${boundLabel}.`
        : (boundCount > 0
            ? `${boundLabel.charAt(0).toUpperCase()}${boundLabel.slice(1)} are attached. Human-readable findings are not available for this candidate yet.`
            : 'No bound evidence is available for this candidate yet.');
    const hintText = hasReadableFindings
        ? 'Open Technical Details to inspect the exact bound source records for each finding.'
        : (boundCount > 0
            ? 'Open Technical Details to inspect the exact bound source records.'
            : 'See Technical Details for source information.');
    return `
        <div class="ss-interpretive-review-section ss-review-section ss-review-section--static">
            <div class="ss-review-section__header">
                <div class="ss-review-section__title">Evidence</div>
            </div>
            <div class="ss-review-section__body ss-interpretive-review-evidence-body">
                <div class="ss-interpretive-review-card ss-interpretive-review-status-card ss-interpretive-review-evidence-note">
                    <div class="ss-interpretive-review-summary-note">${escapeHtml(summaryText)}</div>
                    <div class="ss-hint">${escapeHtml(hintText)}</div>
                </div>
                ${hasReadableFindings
                    ? `<div class="ss-interpretive-review-list ss-interpretive-review-evidence-findings">
                        ${evidenceFindings.map((finding) => renderEvidenceFindingCard(finding)).join('')}
                    </div>`
                    : ''}
            </div>
        </div>
    `;
}

function renderReviewOverviewCard(interpretation, operatorState) {
    const participantLabels = Array.isArray(interpretation.materialParticipantEntityIds)
        ? interpretation.materialParticipantEntityIds
            .filter((id) => id && id !== interpretation.memorySubjectId)
            .map((id) => formatHumanEntityLabel(id))
        : [];

    return `
        <div class="ss-interpretive-review-card ss-interpretive-review-overview">
            <div class="ss-review-section__header">
                <div class="ss-review-section__title">Review overview</div>
            </div>
            <div class="ss-interpretive-review-overview-grid">
                ${renderSummaryFacts([
                    { label: 'Type', value: escapeHtml(formatInterpretationTypeLabel(interpretation.type || 'Interpretive')) },
                    { label: 'Context owner', value: escapeHtml(formatHumanEntityLabel(interpretation.memorySubjectId)) },
                    { label: 'Involves', value: escapeHtml(participantLabels.join(', ') || 'None') },
                ])}
            </div>
        </div>
    `;
}

function buildLifecycleTrailLabel(interpretation, operatorState) {
    const stages = [];
    const reviewState = summarizeReviewWorkflowCode(interpretation.reviewRequests)
        || String(interpretation.reviewState || '').trim().toUpperCase();
    const subjectState = String(interpretation.subjectDispositionState || '').trim().toUpperCase();
    const publicationState = String(interpretation.publicationState || '').trim().toUpperCase();
    const isActive = operatorState?.currentActiveRecord?.sourceInterpretationRevisionId === interpretation.interpretationRevisionId;
    const lifecycleStatus = getRevisionLifecycleStatus(interpretation, operatorState);

    if (reviewState === 'COMPLETE' || reviewState === 'APPROVED') {
        stages.push('Reviews complete');
    } else if (reviewState) {
        stages.push(formatHumanStateLabel(reviewState));
    }

    if (subjectState === 'GRANTED') {
        stages.push('Continuity granted');
    } else if (subjectState === 'DENIED') {
        stages.push('Continuity denied');
    }

    if (publicationState === 'PUBLISHED') {
        stages.push(isActive ? 'Published and active' : 'Published');
    }

    if (lifecycleStatus === 'SUPERSEDED') {
        stages.push('Superseded');
    } else if (lifecycleStatus === 'WITHDRAWN') {
        stages.push('Withdrawn');
    }

    return stages.join(' -> ');
}

function getVisibleOperatorActions(interpretation, operatorState) {
    const rawActions = Array.isArray(operatorState?.availableActions) ? operatorState.availableActions : [];
    const isPublishedRevision = String(interpretation?.publicationState || '').trim().toUpperCase() === 'PUBLISHED';
    const latestEligibleQualification = operatorState?.latestQualification?.eligibilityVerdict === 'ELIGIBLE';
    const latestAuthorized = operatorState?.latestAuthorization?.status === 'AUTHORIZED';

    return rawActions.filter((action) => {
        const normalized = String(action || '').trim().toUpperCase();
        if (normalized === 'QUALIFY_PUBLICATION') {
            return !isPublishedRevision;
        }
        if (normalized === 'AUTHORIZE_PUBLICATION') {
            return !isPublishedRevision && latestEligibleQualification;
        }
        if (normalized === 'EXECUTE_PUBLICATION') {
            return !isPublishedRevision && latestAuthorized;
        }
        if (normalized === 'RECORD_DELTA_REVIEW') {
            return false;
        }
        return true;
    });
}

function renderReviewResponseSummary(interpretation, selectedReviewRequestId = '') {
    const entries = buildReviewHistoryEntries(interpretation, selectedReviewRequestId);
    if (entries.length === 0) {
        return '<div class="ss-hint">No reviews yet.</div>';
    }
    return `
        <div class="ss-interpretive-review-list">
            ${entries.map((entry) => renderHistoryActionCard(entry)).join('')}
        </div>
    `;
}

function renderSubmittedActionsHistory(interpretation, policiesById = new Map(), selectedReviewRequestId = '') {
    const entries = buildDecisionHistoryEntries(interpretation, selectedReviewRequestId);
    if (entries.length === 0) {
        return '<div class="ss-hint">No actions recorded yet.</div>';
    }

    return `
        <div class="ss-interpretive-review-list">
            ${entries.map((entry) => renderHistoryActionCard({
                ...entry,
                bodyHtml: renderHistorySubmissionDetails(entry.provenance, policiesById),
            })).join('')}
        </div>
    `;
}

function renderCurrentActionSurface(interpretation, policiesById, options = {}) {
    const requests = Array.isArray(interpretation.reviewRequests) ? interpretation.reviewRequests : [];
    const selectedRequest = requests.find((entry) => entry.reviewRequestId === options.selectedReviewRequestId) || null;
    const pendingRequest = selectedRequest?.status === 'PENDING'
        ? selectedRequest
        : requests.find((entry) => entry.status === 'PENDING') || null;
    const recordedSubjectDisposition = hasRecordedSubjectDisposition(interpretation.subjectDisposition);
    const subjectReviewRequest = requests.find((entry) =>
        entry?.reviewerRole === 'MEMORY_SUBJECT'
        || entry?.reviewerEntityId === interpretation.memorySubjectId,
    ) || null;

    if (pendingRequest) {
        return {
            title: 'Review details',
            description: '',
            content: renderActionForm({
                formKind: 'review',
                ownerId: pendingRequest.reviewerEntityId,
                ownerRoleLabel: pendingRequest.reviewerEntityId === interpretation.memorySubjectId ? 'Context owner' : 'Relational participant',
                actionKind: 'REVIEW_DISPOSITION',
                interpretation,
                currentActorId: options.currentActorId,
                policies: [...policiesById.values()],
                reviewRequest: pendingRequest,
                actionStatus: options.actionStatus,
            }),
        };
    }

    if (!recordedSubjectDisposition) {
        const selectedIsSubjectRequest = !selectedRequest
            || selectedRequest.reviewerRole === 'MEMORY_SUBJECT'
            || selectedRequest.reviewerEntityId === interpretation.memorySubjectId;
        if (!selectedIsSubjectRequest) {
            const subjectLabel = formatHumanEntityLabel(
                subjectReviewRequest?.reviewerEntityId || interpretation.memorySubjectId || '',
            );
            return {
                title: 'Decision details',
                description: '',
                content: `
                    <div class="ss-hint">
                        The final subject decision belongs to ${escapeHtml(subjectLabel || 'the context owner')}.
                        Select that reviewer entry to record the decision for this revision.
                    </div>
                `,
            };
        }
        return {
            title: 'Decision details',
            description: '',
            content: renderActionForm({
                formKind: 'subject',
                ownerId: interpretation.memorySubjectId,
                ownerRoleLabel: 'Context owner',
                actionKind: 'SUBJECT_DISPOSITION',
                interpretation,
                currentActorId: options.currentActorId,
                policies: [...policiesById.values()],
                actionStatus: options.actionStatus,
            }),
        };
    }

    return null;
}

function renderCandidateDetail(interpretation, policiesById, options = {}) {
    if (!interpretation) {
        return '<div class="ss-interpretive-review-detail-empty ss-hint">Select a request to inspect it.</div>';
    }

    const relatedPolicyIds = collectReferencedPolicyIds(interpretation);
    const relatedPolicies = relatedPolicyIds
        .map((policyId) => policiesById.get(policyId))
        .filter(Boolean);
    const allowedViews = new Set(['review', 'history', 'technical', 'lifecycle']);
    const selectedView = allowedViews.has(String(options.detailView || '').trim())
        ? String(options.detailView || '').trim()
        : 'review';
    const selectedReviewRequest = getSelectedReviewRequest(interpretation, options.selectedReviewRequestId);
    const participantLabels = Array.isArray(interpretation.materialParticipantEntityIds)
        ? interpretation.materialParticipantEntityIds
            .filter((id) => id && id !== interpretation.memorySubjectId)
            .map((id) => formatHumanEntityLabel(id))
        : [];
    const currentActionSurface = renderCurrentActionSurface(
        interpretation,
        policiesById,
        options,
    );
    const whyReviewLabel = buildWhyReviewLabel(interpretation);
    const noActionSummary = buildNoActionSummary(
        interpretation,
        options.publicationOperatorState,
    );
    const lifecycleTrailLabel = buildLifecycleTrailLabel(
        interpretation,
        options.publicationOperatorState,
    );
    const revisionOrigin = getRevisionOrigin(
        interpretation,
        options.publicationOperatorState,
    );
    const reviewHeadingLabel = buildReviewHeadingLabel(
        interpretation,
        options.publicationOperatorState,
    );
    const currentStateBadge = renderBadge(buildPrimaryWorkflowStatus(
        interpretation,
        options.publicationOperatorState,
    ));
    const evidenceSection = renderHumanEvidenceSection(interpretation);
    const hasReviewHistory = Array.isArray(interpretation.reviewDispositions) && interpretation.reviewDispositions.length > 0;
    const hasSubjectHistory = !!interpretation.subjectDisposition;
    const hasLineageHistory = !!interpretation.parentRevisionId
        || !!interpretation.createdFromDispositionId
        || (Array.isArray(interpretation.childRevisionIds) && interpretation.childRevisionIds.length > 0);

    const reviewView = `
        <div class="ss-interpretive-review-review-column">
            ${renderReviewOverviewCard(interpretation, options.publicationOperatorState)}

            <div class="ss-interpretive-review-section ss-review-section ss-review-section--static ss-interpretive-review-static-section ss-interpretive-review-review-main">
                <div class="ss-review-section__header ss-interpretive-review-static-header">
                    <div class="ss-review-section__title ss-interpretive-review-disclosure-title">${escapeHtml(reviewHeadingLabel)}</div>
                </div>
                <div class="ss-interpretive-review-context">${escapeHtml(interpretation.statement || '')}</div>
                <div class="ss-interpretive-review-context-support">
                    <div class="ss-interpretive-review-context-why"><strong>${escapeHtml(whyReviewLabel)}:</strong> ${escapeHtml(buildWhyReviewSummary(interpretation))}</div>
                </div>
            </div>

            <div class="ss-interpretive-review-review-main">
                ${evidenceSection}
                ${renderSelectedReviewerSummary(interpretation, options.selectedReviewRequestId)}
            </div>
        </div>

        ${currentActionSurface?.content ? `
            <div class="ss-interpretive-review-section ss-review-section ss-review-section--static ss-interpretive-review-action-surface">
                <div class="ss-review-section__header">
                    <div class="ss-review-section__title">${escapeHtml(currentActionSurface.title || 'Review details')}</div>
                    ${currentActionSurface.description
                        ? `<div class="ss-review-section__description">${escapeHtml(currentActionSurface.description)}</div>`
                        : ''}
                </div>
                <div class="ss-review-section__body">
                    ${currentActionSurface.content}
                </div>
            </div>
        ` : `
            <div class="ss-interpretive-review-card ss-interpretive-review-status-card">
                <strong>Review status</strong>
                <div class="ss-interpretive-review-summary-note">${escapeHtml(noActionSummary)}</div>
            </div>
        `}
    `;

    const historyView = (!hasReviewHistory && !hasSubjectHistory && !hasLineageHistory) ? `
        <div class="ss-interpretive-review-card ss-interpretive-review-status-card">
            <strong>No actions taken</strong>
            <div class="ss-interpretive-review-summary-note">Pending: Initial review required.</div>
        </div>
    ` : `
        ${hasReviewHistory ? renderCollapsibleSection(
            'Review history',
            'Shows who responded and when.',
            renderReviewResponseSummary(interpretation, options.selectedReviewRequestId),
            { open: true },
        ) : ''}

        ${(hasReviewHistory || hasSubjectHistory) ? renderCollapsibleSection(
            'Decision history',
            'Shows the recorded actions in compact human-readable form.',
            renderSubmittedActionsHistory(interpretation, policiesById, options.selectedReviewRequestId),
            { open: true },
        ) : ''}

        ${(interpretation.revisionCreationProvenance && hasLineageHistory) ? renderCollapsibleSection(
            'How this revision was created',
            'Explains whether this revision was created directly, through delegation, or as a child after correction.',
            `
                ${renderRevisionOriginCard(revisionOrigin)}
                ${renderProvenance(interpretation.revisionCreationProvenance, policiesById)}
            `,
            { open: true },
        ) : ''}

        ${(Array.isArray(interpretation.childRevisionIds) && interpretation.childRevisionIds.length > 0) ? renderCollapsibleSection(
            'Child revisions',
            'Keeps the correction lineage visible so edited descendants do not erase the parent proposal.',
            `<div class="ss-interpretive-review-card">${renderStringList(interpretation.childRevisionIds, 'None')}</div>`,
            { open: true },
        ) : ''}
    `;

    const technicalView = `
        ${renderAuditSection(
            'Record Summary',
            [
                { label: 'Subject', value: escapeHtml(formatHumanEntityLabel(interpretation.memorySubjectId)) },
                { label: 'Revision', value: escapeHtml(formatRevisionLabel(interpretation.interpretationRevisionId)) },
                { label: 'Origin', value: escapeHtml(revisionOrigin.label) },
                { label: 'Memory Scope', value: renderCopyableCode(interpretation.memoryScopeId, { emptyLabel: 'n/a' }) },
                { label: 'Parent Revision', value: renderCopyableCode(interpretation.parentRevisionId, { emptyLabel: 'None' }) },
                { label: 'Created', value: escapeHtml(formatTimestamp(interpretation.createdAt)) },
                { label: 'Updated', value: escapeHtml(formatTimestamp(interpretation.updatedAt)) },
            ],
            { description: 'Exact record identity and timeline for this revision.' },
        )}

        ${renderAuditSection(
            'Identifiers',
            [
                { label: 'Interpretation ID', value: renderCopyableCode(interpretation.interpretationId, { emptyLabel: 'n/a' }) },
                { label: 'Interpretation Revision ID', value: renderCopyableCode(interpretation.interpretationRevisionId, { emptyLabel: 'n/a' }) },
                { label: 'Created From Disposition', value: renderCopyableCode(interpretation.createdFromDispositionId, { emptyLabel: 'None' }) },
                { label: 'Revision Reason Raw', value: renderCopyableCode(interpretation.revisionReason, { emptyLabel: 'n/a' }) },
                { label: 'Candidate State Raw', value: renderCopyableCode(interpretation.candidateState, { emptyLabel: 'n/a' }) },
                { label: 'Authority Effect Raw', value: renderCopyableCode(interpretation.authorityEffect, { emptyLabel: 'n/a' }) },
            ],
            {
                description: 'Expandable raw identifiers and internal-state codes kept out of the main scan path.',
                collapsible: true,
                open: false,
            },
        )}

        ${renderAuditSection(
            'Current State',
            [
                { label: 'Evidence Evaluation', value: renderBadge(formatEvidenceEvaluationLabel(interpretation.groundingState)) },
                { label: 'Reviews', value: renderBadge(formatReviewWorkflowLabel(interpretation)) },
                { label: 'Subject Decision', value: renderBadge(formatSubjectDecisionStatusLabel(interpretation.subjectDispositionState || 'PENDING')) },
                { label: 'Publication', value: renderBadge(formatPublicationStatusLabel(interpretation.publicationState)) },
            ],
            { description: 'Current workflow state for evidence, reviews, subject decision, and publication.' },
        )}

        ${renderAuditSection(
            'Claims and Participants',
            [
                { label: 'Claim Domains', value: renderStringList(interpretation.assertionDomains, 'None') },
                { label: 'Participants', value: Array.isArray(interpretation.materialParticipantEntityIds) && interpretation.materialParticipantEntityIds.length > 0
                    ? interpretation.materialParticipantEntityIds.map((id) => escapeHtml(formatHumanEntityLabel(id))).join(', ')
                    : 'None' },
                { label: 'Shared Relationship', value: interpretation.sharedRelationshipAsserted ? 'Yes' : 'No' },
                { label: 'Personal Meaning', value: interpretation.personalMeaningAsserted ? 'Yes' : 'No' },
            ],
            { description: 'What this memory claims, and who it materially involves.' },
        )}

        ${renderAuditSection(
            'Routing and Policy',
            [
                { label: 'Structural Authority', value: renderBadge(formatStructuralAuthorityLabel(interpretation.authorityEffect)) },
                { label: 'Risk Class', value: renderBadge(formatHumanStateLabel(interpretation.risk?.riskClass || 'n/a')) },
                { label: 'Risk Reasons', value: renderStringList(interpretation.risk?.riskReasons, 'None') },
                { label: 'Validation Policy', value: interpretation.policyBinding
                    ? `${renderCopyableCode(interpretation.policyBinding.validationPolicyId, { emptyLabel: 'n/a' })} v${escapeHtml(String(interpretation.policyBinding.policyVersion || ''))}`
                    : 'n/a' },
                { label: 'Policy Version', value: interpretation.policyBinding ? escapeHtml(String(interpretation.policyBinding.policyVersion)) : 'n/a' },
                { label: 'Matched Rules', value: renderStringList(interpretation.policyBinding?.matchedRuleIds, 'None') },
                { label: 'Referenced Delegation Policies', value: relatedPolicies.length > 0
                    ? relatedPolicies.map((policy) => renderCopyableCode(policy.delegationPolicyId, { emptyLabel: 'n/a' })).join(', ')
                    : 'None' },
            ],
            { description: 'Why this candidate routed here, and which exact policy inputs were used.' },
        )}

        ${renderAuditSection(
            'Evidence Bindings',
            renderEvidenceBindingsTable(interpretation.groundingLinks),
            { description: 'Exact source bindings for this candidate. References stay copyable even when no direct navigation exists.' },
        )}

        ${renderAuditSection(
            'Integrity and Audit',
            [
                { label: 'Proposal Content Hash', value: renderCopyableCode(interpretation.proposalContentHash, { emptyLabel: 'n/a' }) },
                { label: 'Review Envelope Hash', value: renderCopyableCode(interpretation.reviewEnvelopeHash, { emptyLabel: 'n/a' }) },
                { label: 'Grounding Outcome', value: renderBadge(formatHumanStateLabel(interpretation.groundingAggregate?.groundingOutcome || 'n/a')) },
                { label: 'Evaluated At', value: escapeHtml(formatTimestamp(interpretation.groundingAggregate?.evaluatedAt)) },
            ],
            {
                description: 'Low-priority audit detail kept collapsed until needed.',
                collapsible: true,
                open: false,
            },
        )}
    `;

    const lifecycleView = renderPublicationOperatorSection(
        interpretation,
        options.publicationOperatorState,
        policiesById,
        options,
    );

    return `
        <div class="ss-interpretive-review-detail-header">
            <div class="ss-interpretive-review-detail-header-main">
                <div class="ss-interpretive-review-detail-header-top">
                    <div>
                        <div class="ss-hint">${escapeHtml(formatRevisionLabel(interpretation.interpretationRevisionId))}</div>
                        ${selectedReviewRequest ? `<div class="ss-hint">${escapeHtml(formatHumanEntityLabel(selectedReviewRequest.reviewerEntityId || ''))} · ${escapeHtml(formatHumanRoleLabel(selectedReviewRequest.reviewerRole || 'REVIEWER'))}</div>` : ''}
                    </div>
                    <div class="ss-interpretive-review-inline-meta">
                        ${currentStateBadge}
                    </div>
                </div>
                ${renderDetailTabs(selectedView)}
            </div>
        </div>
        <div class="ss-interpretive-review-detail-body">
            <div class="ss-interpretive-review-detail-view${selectedView === 'review' ? ' active' : ''}" data-detail-view-panel="review">
                ${reviewView}
            </div>
            <div class="ss-interpretive-review-detail-view${selectedView === 'history' ? ' active' : ''}" data-detail-view-panel="history">
                ${historyView}
            </div>
            <div class="ss-interpretive-review-detail-view${selectedView === 'technical' ? ' active' : ''}" data-detail-view-panel="technical">
                ${technicalView}
            </div>
            <div class="ss-interpretive-review-detail-view${selectedView === 'lifecycle' ? ' active' : ''}" data-detail-view-panel="lifecycle">
                ${lifecycleView}
            </div>
        </div>
    `;
}

function renderModalHtml(state) {
    const statusOptions = REVIEW_STATUS_OPTIONS.map((option) => `
        <option value="${escapeHtml(option.value)}"${state.filters.status === option.value ? ' selected' : ''}>${escapeHtml(option.label)}</option>
    `).join('');

    return `
        <div class="ss-interpretive-review-modal">
            <div class="ss-interpretive-review-toolbar">
                <div class="ss-interpretive-review-toolbar-intro">
                    <h3>Memory Review</h3>
                    <p class="ss-hint">Review and manage proposed memory updates.</p>
                </div>
                <div class="ss-interpretive-review-toolbar-actions">
                    <div class="ss-interpretive-review-toolbar-buttons">
                        <input id="ss-interpretive-review-expand-toggle" class="menu_button" type="button" value="Expand All" />
                        <input id="ss-interpretive-review-fullscreen-toggle" class="menu_button" type="button" value="Fullscreen" />
                        <input id="ss-interpretive-review-close-toggle" class="menu_button" type="button" value="Close" />
                    </div>
                </div>
            </div>

            <div class="ss-interpretive-review-layout">
                <div class="ss-interpretive-review-column">
                    <div class="ss-interpretive-review-queue">
                        <div class="ss-interpretive-review-queue-header">
                            <strong>Requests</strong>
                            <input id="ss-interpretive-review-refresh" class="menu_button" type="button" value="Refresh" />
                        </div>
                        <div class="ss-interpretive-review-queue-controls">
                            <label for="ss-interpretive-review-status-filter">Filter</label>
                            <select id="ss-interpretive-review-status-filter" class="text_pole">${statusOptions}</select>
                        </div>
                        <div id="ss-interpretive-review-queue-list" class="ss-interpretive-review-queue-list">
                            <div class="ss-interpretive-review-queue-empty ss-hint">Loading requests...</div>
                        </div>
                    </div>
                </div>

                <div class="ss-interpretive-review-column">
                    <div id="ss-interpretive-review-detail" class="ss-interpretive-review-detail">
                        <div class="ss-interpretive-review-detail-empty ss-hint">Select a request to inspect it.</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function openInterpretiveReviewModal() {
    const state = {
        filters: { status: 'PENDING_APPROVAL' },
        reviews: [],
        selectedReviewRequestId: null,
        selectedInterpretationRevisionId: null,
        detailView: 'review',
        pendingDetailSectionKey: null,
        candidateCache: new Map(),
        publicationOperatorCache: new Map(),
        policiesByScopeId: new Map(),
        activeInterpretation: null,
        activePublicationOperatorState: null,
        activePoliciesById: new Map(),
        actionStatus: null,
        currentActorId: getCurrentActorEntityId(),
    };

    const popup = new Popup(
        renderModalHtml(state),
        POPUP_TYPE.TEXT,
        null,
        { okButton: false, cancelButton: false, wide: true, large: true },
    );
    const showPromise = popup.show();

    requestAnimationFrame(() => {
        const modalRoot = document.querySelector('.ss-interpretive-review-modal');
        const popupRoot = popup?.dlg || modalRoot?.closest('.popup') || null;
        const popupContent = popupRoot?.querySelector('.popup-content') || null;
        const statusFilter = document.getElementById('ss-interpretive-review-status-filter');
        const refreshButton = document.getElementById('ss-interpretive-review-refresh');
        const fullscreenButton = document.getElementById('ss-interpretive-review-fullscreen-toggle');
        const expandToggleButton = document.getElementById('ss-interpretive-review-expand-toggle');
        const closeButton = document.getElementById('ss-interpretive-review-close-toggle');
        const queueList = document.getElementById('ss-interpretive-review-queue-list');
        const detailRoot = document.getElementById('ss-interpretive-review-detail');

        const renderDetailError = (message) => {
            if (!detailRoot) return;
            detailRoot.innerHTML = `<div class="ss-interpretive-review-detail-empty ss-hint">${escapeHtml(message)}</div>`;
            updateExpandToggle();
        };

        const renderQueue = () => {
            if (!queueList) return;
            const groups = buildFilteredQueueGroups(state.reviews, state.filters.status);
            if (groups.length === 0) {
                queueList.innerHTML = '<div class="ss-interpretive-review-queue-empty ss-hint">No revisions matched the current filter.</div>';
                return;
            }
            const normalizedSelectedReviewRequestId = String(state.selectedReviewRequestId || '').trim();
            const duplicateReviewRequestSelection = !!normalizedSelectedReviewRequestId
                && groups.filter((group) => {
                    const reviews = Array.isArray(group?.reviews) ? group.reviews : [];
                    return reviews.some((review) => String(review?.reviewRequestId || '').trim() === normalizedSelectedReviewRequestId);
                }).length > 1;
            queueList.innerHTML = groups.map((group) => {
                return renderQueueGroupItem(
                    group,
                    state.selectedReviewRequestId,
                    state.selectedInterpretationRevisionId,
                    duplicateReviewRequestSelection,
                );
            }).join('');
        };

        const loadPoliciesForCandidate = async (interpretation) => {
            const scopeId = String(interpretation?.memoryScopeId || '').trim();
            if (!scopeId) {
                return new Map();
            }
            if (state.policiesByScopeId.has(scopeId)) {
                return state.policiesByScopeId.get(scopeId);
            }
            const response = await listInterpretiveDelegationPolicies({ memoryScopeId: scopeId });
            const policies = Array.isArray(response?.policies) ? response.policies : [];
            const policyMap = new Map(policies.map((policy) => [policy.delegationPolicyId, policy]));
            state.policiesByScopeId.set(scopeId, policyMap);
            return policyMap;
        };

        const enrichReviewsWithCandidateStates = async (reviews) => {
            const reviewList = Array.isArray(reviews) ? reviews : [];
            const revisionIds = [...new Set(
                reviewList
                    .map((review) => String(review?.interpretationRevisionId || '').trim())
                    .filter(Boolean),
            )];
            if (revisionIds.length === 0) {
                return reviewList;
            }

            const candidateEntries = await Promise.all(revisionIds.map(async (revisionId) => {
                let interpretation = state.candidateCache.get(revisionId) || null;
                if (!interpretation) {
                    const response = await getInterpretiveCandidate(revisionId);
                    interpretation = response?.interpretation || null;
                    if (interpretation) {
                        state.candidateCache.set(revisionId, interpretation);
                    }
                }
                return [revisionId, interpretation];
            }));

            const candidateByRevisionId = new Map(candidateEntries);
            const operatorStateEntries = await Promise.all(candidateEntries.map(async ([revisionId, interpretation]) => {
                const continuityTargetId = String(interpretation?.memorySubjectId || '').trim();
                if (!revisionId || !continuityTargetId) {
                    return [revisionId, null];
                }
                const cacheKey = `${revisionId}::${continuityTargetId}`;
                let operatorState = state.publicationOperatorCache.get(cacheKey) || null;
                if (!operatorState) {
                    const response = await getInterpretivePublicationOperatorState(revisionId, { continuityTargetId });
                    operatorState = response?.operatorState || null;
                    if (operatorState) {
                        state.publicationOperatorCache.set(cacheKey, operatorState);
                    }
                }
                return [revisionId, operatorState];
            }));
            const operatorStateByRevisionId = new Map(operatorStateEntries);
            return reviewList.map((review) => {
                const revisionId = String(review?.interpretationRevisionId || '').trim();
                const interpretation = candidateByRevisionId.get(revisionId) || null;
                if (!interpretation) {
                    return review;
                }
                const operatorState = operatorStateByRevisionId.get(revisionId) || null;
                const canonicalRevisionState = {
                    reviewState: interpretation.reviewState,
                    subjectDispositionState: interpretation.subjectDispositionState,
                    publicationState: interpretation.publicationState,
                    operatorState,
                };
                return {
                    ...review,
                    reviewState: canonicalRevisionState.reviewState,
                    subjectDispositionState: canonicalRevisionState.subjectDispositionState,
                    publicationState: canonicalRevisionState.publicationState,
                    operatorState,
                    canonicalRevisionState,
                };
            });
        };

        const scrollToDetailSection = (sectionKey) => {
            const normalizedSectionKey = String(sectionKey || '').trim();
            if (!normalizedSectionKey || !detailRoot) return;
            requestAnimationFrame(() => {
                const selector = `[data-review-section="${CSS.escape(normalizedSectionKey)}"]`;
                detailRoot.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        };

        const renderCurrentDetail = () => {
            if (!detailRoot) return;
            if (!state.activeInterpretation) {
                renderDetailError('Select a request to inspect it.');
                updateExpandToggle();
                return;
            }
            detailRoot.innerHTML = renderCandidateDetail(state.activeInterpretation, state.activePoliciesById, {
                selectedReviewRequestId: state.selectedReviewRequestId,
                currentActorId: state.currentActorId,
                actionStatus: state.actionStatus,
                publicationOperatorState: state.activePublicationOperatorState,
                detailView: state.detailView,
            });
            const pendingSectionKey = String(state.pendingDetailSectionKey || '').trim();
            state.pendingDetailSectionKey = null;
            syncActionForms();
            updateExpandToggle();
            if (pendingSectionKey) {
                scrollToDetailSection(pendingSectionKey);
            }
        };

        const loadPublicationOperatorState = async (interpretation) => {
            const normalizedId = String(interpretation?.interpretationRevisionId || '').trim();
            const continuityTargetId = String(interpretation?.memorySubjectId || '').trim();
            if (!normalizedId) {
                state.activePublicationOperatorState = null;
                return;
            }
            const cacheKey = `${normalizedId}::${continuityTargetId}`;
            let operatorState = state.publicationOperatorCache.get(cacheKey) || null;
            if (!operatorState) {
                const response = await getInterpretivePublicationOperatorState(normalizedId, { continuityTargetId });
                operatorState = response?.operatorState || null;
                if (operatorState) {
                    state.publicationOperatorCache.set(cacheKey, operatorState);
                }
            }
            state.activePublicationOperatorState = operatorState;
        };

        const invalidateInterpretationCaches = (interpretationRevisionId, continuityTargetId = '') => {
            const normalizedId = String(interpretationRevisionId || '').trim();
            const normalizedTargetId = String(continuityTargetId || '').trim();
            if (normalizedId) {
                state.candidateCache.delete(normalizedId);
                if (normalizedTargetId) {
                    state.publicationOperatorCache.delete(`${normalizedId}::${normalizedTargetId}`);
                } else {
                    for (const key of [...state.publicationOperatorCache.keys()]) {
                        if (key.startsWith(`${normalizedId}::`)) {
                            state.publicationOperatorCache.delete(key);
                        }
                    }
                }
            }
        };

        const loadInterpretationByRevision = async (interpretationRevisionId) => {
            const normalizedId = String(interpretationRevisionId || '').trim();
            if (!normalizedId) {
                state.activeInterpretation = null;
                state.activePublicationOperatorState = null;
                state.activePoliciesById = new Map();
                state.selectedInterpretationRevisionId = null;
                renderCurrentDetail();
                return;
            }

            let interpretation = state.candidateCache.get(normalizedId) || null;
            if (!interpretation) {
                const response = await getInterpretiveCandidate(normalizedId);
                interpretation = response?.interpretation || null;
                if (interpretation) {
                    state.candidateCache.set(normalizedId, interpretation);
                }
            }
            if (!interpretation) {
                state.activeInterpretation = null;
                state.activePublicationOperatorState = null;
                state.activePoliciesById = new Map();
                renderDetailError('Candidate detail was not returned by the server.');
                return;
            }
            state.selectedInterpretationRevisionId = normalizedId;
            state.activeInterpretation = interpretation;
            state.activePoliciesById = await loadPoliciesForCandidate(interpretation);
            await loadPublicationOperatorState(interpretation);
            renderCurrentDetail();
        };

        const focusInterpretationRevision = async (interpretationRevisionId, options = {}) => {
            const normalizedId = String(interpretationRevisionId || '').trim();
            const preferredRequestStatuses = Array.isArray(options.preferredRequestStatuses)
                ? options.preferredRequestStatuses.map((value) => String(value || '').trim()).filter(Boolean)
                : ['PENDING', 'DEFERRED'];
            if (!normalizedId) {
                await loadInterpretationByRevision('');
                state.selectedReviewRequestId = null;
                return;
            }

            await loadInterpretationByRevision(normalizedId);
            const reviewRequests = Array.isArray(state.activeInterpretation?.reviewRequests)
                ? state.activeInterpretation.reviewRequests
                : [];
            const preferredRequest = reviewRequests.find((entry) => preferredRequestStatuses.includes(String(entry?.status || '').trim()));
            state.selectedReviewRequestId = preferredRequest?.reviewRequestId || reviewRequests[0]?.reviewRequestId || null;
            if (options.detailView) {
                state.detailView = options.detailView;
            }
            if (options.focusSectionKey) {
                state.pendingDetailSectionKey = String(options.focusSectionKey || '').trim();
            }
            renderQueue();
            renderCurrentDetail();
        };

        const selectReview = async (reviewRequestId) => {
            state.actionStatus = null;
            const review = state.reviews.find((entry) => entry.reviewRequestId === reviewRequestId) || null;
            state.selectedReviewRequestId = reviewRequestId;
            state.selectedInterpretationRevisionId = review?.interpretationRevisionId || null;
            renderQueue();
            if (!review) {
                renderDetailError('Selected review request is no longer available.');
                return;
            }

            if (detailRoot) {
                detailRoot.innerHTML = '<div class="ss-interpretive-review-detail-empty ss-hint">Loading candidate details...</div>';
            }

            try {
                await loadInterpretationByRevision(review.interpretationRevisionId);
            } catch (error) {
                renderDetailError(`Could not load candidate details: ${error?.message || error}`);
            }
        };

        const refreshReviews = async ({ preserveDetail = false } = {}) => {
            if (queueList) {
                queueList.innerHTML = '<div class="ss-interpretive-review-queue-empty ss-hint">Loading requests...</div>';
            }
            try {
                const response = await listInterpretiveReviews({});
                const rawReviews = Array.isArray(response?.reviews) ? response.reviews : [];
                for (const revisionId of new Set(rawReviews.map((review) => String(review?.interpretationRevisionId || '').trim()).filter(Boolean))) {
                    state.candidateCache.delete(revisionId);
                }
                state.reviews = await enrichReviewsWithCandidateStates(rawReviews);
                const filteredGroups = buildFilteredQueueGroups(state.reviews, state.filters.status);
                const visibleReviewIds = new Set(
                    filteredGroups.flatMap((group) => (Array.isArray(group.reviews) ? group.reviews : []).map((review) => review.reviewRequestId)),
                );
                if (!visibleReviewIds.has(state.selectedReviewRequestId)) {
                    state.selectedReviewRequestId = filteredGroups[0]?.reviews?.[0]?.reviewRequestId || null;
                }
                renderQueue();
                if (state.selectedReviewRequestId) {
                    await selectReview(state.selectedReviewRequestId);
                    return;
                }
                if (preserveDetail && state.selectedInterpretationRevisionId) {
                    state.candidateCache.delete(state.selectedInterpretationRevisionId);
                    await loadInterpretationByRevision(state.selectedInterpretationRevisionId);
                    return;
                }
                renderDetailError('No revisions matched the current filter.');
            } catch (error) {
                if (queueList) {
                    queueList.innerHTML = `<div class="ss-interpretive-review-queue-empty ss-hint">Could not load review requests: ${escapeHtml(error?.message || error)}</div>`;
                }
                renderDetailError('Review queue is unavailable.');
            }
        };

        function buildApplicablePolicies(form) {
            const ownerId = String(form.dataset.ownerId || '').trim();
            const actionKind = String(form.dataset.actionKind || '').trim();
            const memoryScopeId = String(form.dataset.memoryScopeId || '').trim();
            const continuityTargetId = String(form.dataset.continuityTargetId || '').trim();
            const actorId = String(form.querySelector('[name="submittedByActorId"]')?.value || '').trim();
            return filterDelegationPoliciesForAction([...state.activePoliciesById.values()], {
                principalEntityId: ownerId,
                delegateEntityId: actorId,
                actionKind,
                memoryScopeId,
                continuityTargetId,
            });
        }

        function syncReasonCodeSelector(form) {
            const field = form.querySelector('[name="reasonCodes"]');
            if (!field) {
                return;
            }
            const selectedCodes = new Set(parseInterpretiveTokenList(field.value || ''));
            form.querySelectorAll('[data-reason-code]').forEach((button) => {
                const code = String(button.getAttribute('data-reason-code') || '').trim();
                const active = selectedCodes.has(code);
                button.classList.toggle('selected', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function toggleReasonCodeSelection(form, code) {
            const field = form?.querySelector('[name="reasonCodes"]');
            if (!field) {
                return;
            }
            const selectedCodes = parseInterpretiveTokenList(field.value || '');
            const normalizedCode = String(code || '').trim();
            if (!normalizedCode) {
                return;
            }
            const nextCodes = selectedCodes.includes(normalizedCode)
                ? selectedCodes.filter((entry) => entry !== normalizedCode)
                : [...selectedCodes, normalizedCode];
            field.value = nextCodes.join(', ');
            syncReasonCodeSelector(form);
        }

        function syncActionForm(form) {
            const mode = String(form.querySelector('[name="submissionMode"]')?.value || '').trim();
            const formKind = String(form.dataset.formKind || '').trim();
            const hasAutoSubjectEvidenceRefs = String(form.dataset.hasAutoSubjectEvidenceRefs || '').trim() === 'true';
            const autoSubjectEvidenceRefs = parseInterpretiveTokenList(String(form.dataset.autoSubjectEvidenceRefs || ''));
            const disposition = String(
                form.querySelector('[name="disposition"]')?.value
                || form.querySelector('[name="state"]')?.value
                || '',
            ).trim();
            const policyField = form.querySelector('[data-field="delegationPolicyId"]');
            const policyUnavailableField = form.querySelector('[data-field="delegationPolicyUnavailable"]');
            const policySelect = form.querySelector('[name="delegationPolicyId"]');
            const evidenceField = form.querySelector('[data-field="subjectEvidenceRefs"]');
            const evidenceInput = form.querySelector('[name="subjectEvidenceRefs"]');
            const evidenceHint = form.querySelector('[data-field-hint="subjectEvidenceRefs"]');
            const reasonCodeGroups = form.querySelector('[data-field="reasonCodeGroups"]');
            const reasonCodeHint = form.querySelector('[data-field-hint="reasonCodeGroups"]');
            const commentaryField = form.querySelector('[name="commentary"]');
            const commentaryLabel = form.querySelector('[data-field-label="commentary"]');
            const commentaryHint = form.querySelector('[data-field-hint="commentary"]');
            const revisedCandidateField = form.querySelector('[data-field="revisedCandidate"]');
            const applicablePolicies = buildApplicablePolicies(form);
            const hasApplicablePolicies = applicablePolicies.length > 0;
            const fieldState = getGovernedFieldState({
                submissionMode: mode,
                hasApplicablePolicies,
                hasAutoSubjectEvidenceRefs,
            });
            const isDispositionScopedForm = formKind === 'review' || formKind === 'subject';
            const dispositionFieldState = getInterpretiveDispositionFieldState({
                formKind,
                disposition,
            });

            if (policySelect) {
                const currentValue = String(policySelect.value || '').trim();
                policySelect.innerHTML = buildDelegationPolicyOptions(applicablePolicies);
                if (currentValue && applicablePolicies.some((policy) => policy.delegationPolicyId === currentValue)) {
                    policySelect.value = currentValue;
                }
                policySelect.required = fieldState.delegationPolicyRequired;
            }

            if (policyField) {
                policyField.hidden = !fieldState.showDelegationPolicyField;
            }
            if (policyUnavailableField) {
                policyUnavailableField.hidden = !fieldState.showDelegationPolicyUnavailable;
            }
            if (evidenceField) {
                evidenceField.hidden = !fieldState.showEvidenceField;
            }
            if (evidenceInput) {
                evidenceInput.required = fieldState.evidenceRequired;
                if (fieldState.showEvidenceField && !String(evidenceInput.value || '').trim() && autoSubjectEvidenceRefs.length > 0) {
                    evidenceInput.value = autoSubjectEvidenceRefs.join('\n');
                } else if (!fieldState.showEvidenceField) {
                    evidenceInput.value = '';
                }
            }
            if (evidenceHint) {
                evidenceHint.textContent = fieldState.evidenceHint;
            }
            if (reasonCodeGroups && isDispositionScopedForm) {
                reasonCodeGroups.hidden = !dispositionFieldState.showReasonSelectors;
                if (reasonCodeGroups.hidden) {
                    const reasonField = form.querySelector('[name="reasonCodes"]');
                    if (reasonField) {
                        reasonField.value = '';
                    }
                }
            }
            if (reasonCodeHint && isDispositionScopedForm) {
                reasonCodeHint.textContent = dispositionFieldState.commentaryHint;
            }
            if (commentaryField && isDispositionScopedForm) {
                commentaryField.required = dispositionFieldState.requireCommentary;
                commentaryField.placeholder = dispositionFieldState.commentaryPlaceholder;
            }
            if (commentaryLabel && isDispositionScopedForm) {
                commentaryLabel.textContent = 'Comment';
            }
            if (commentaryHint && isDispositionScopedForm) {
                commentaryHint.textContent = dispositionFieldState.requireCommentary
                    ? 'Required for this decision.'
                    : '';
            }
            if (revisedCandidateField) {
                revisedCandidateField.hidden = !shouldShowInterpretiveRevisionEditor(formKind, disposition);
            }
            syncReasonCodeSelector(form);
        }

        function appendTokenToField(field, tokenValue) {
            if (!field) {
                return;
            }
            const normalized = parseInterpretiveTokenList(field.value || '');
            const token = String(tokenValue || '').trim();
            if (!token) {
                return;
            }
            if (!normalized.includes(token)) {
                normalized.push(token);
            }
            field.value = normalized.join(', ');
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function validateGovernedSubmissionPayload(form, payload) {
            const governedError = validateGovernedSubmissionState({
                submissionMode: payload.submissionMode,
                delegationPolicyId: payload.delegationPolicyId,
                subjectEvidenceRefs: payload.subjectEvidenceRefs,
                hasApplicablePolicies: buildApplicablePolicies(form).length > 0,
                hasAutoSubjectEvidenceRefs: String(form.dataset.hasAutoSubjectEvidenceRefs || '').trim() === 'true',
            });
            if (governedError) {
                return governedError;
            }
            return validateInterpretiveActionPayload({
                formKind: String(form.dataset.formKind || '').trim(),
                disposition: payload.disposition || payload.state || '',
                reasonCodes: payload.reasonCodes,
                commentary: payload.commentary,
            });
        }

        function syncActionForms() {
            detailRoot?.querySelectorAll('.ss-interpretive-action-form').forEach((form) => syncActionForm(form));
        }

        function updateExpandToggle() {
            if (!expandToggleButton || !detailRoot) {
                return;
            }
            const activePanel = detailRoot.querySelector('.ss-interpretive-review-detail-view.active') || detailRoot;
            const disclosures = [...activePanel.querySelectorAll('.ss-interpretive-review-disclosure')];
            if (disclosures.length === 0) {
                expandToggleButton.disabled = true;
                expandToggleButton.value = 'Expand All';
                return;
            }
            expandToggleButton.disabled = false;
            const allOpen = disclosures.every((entry) => entry.hasAttribute('open'));
            expandToggleButton.value = allOpen ? 'Collapse All' : 'Expand All';
        }

        function setInlineFormStatus(form, tone, message) {
            let status = form.parentElement.querySelector('.ss-interpretive-action-status');
            if (!status) {
                status = document.createElement('div');
                status.className = 'ss-interpretive-action-status';
                form.parentElement.insertBefore(status, form);
            }
            status.className = `ss-interpretive-action-status tone-${tone}`;
            status.textContent = message;
        }

        function setFormBusy(form, busy) {
            for (const element of form.querySelectorAll('input, select, textarea, button')) {
                element.disabled = busy;
            }
        }

        async function handleReviewSubmit(form) {
            const reviewRequestId = String(form.dataset.reviewRequestId || '').trim();
            const reviewEnvelopeHash = String(form.dataset.reviewEnvelopeHash || '').trim();
            const ownerId = String(form.dataset.ownerId || '').trim();
            const payload = {
                disposition: String(form.querySelector('[name="disposition"]')?.value || '').trim(),
                reviewEnvelopeHash,
                dispositionOwnerId: ownerId,
                submittedByActorId: String(form.querySelector('[name="submittedByActorId"]')?.value || '').trim(),
                submissionMode: String(form.querySelector('[name="submissionMode"]')?.value || '').trim(),
                delegationPolicyId: String(form.querySelector('[name="delegationPolicyId"]')?.value || '').trim() || null,
                subjectEvidenceRefs: parseInterpretiveTokenList(form.querySelector('[name="subjectEvidenceRefs"]')?.value || ''),
                reasonCodes: parseInterpretiveTokenList(form.querySelector('[name="reasonCodes"]')?.value || ''),
                commentary: String(form.querySelector('[name="commentary"]')?.value || '').trim(),
            };
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }

            if (shouldShowInterpretiveRevisionEditor('review', payload.disposition)) {
                const revisedPayload = buildInterpretiveRevisedCandidatePayload({
                    parentStatement: String(form.dataset.parentStatement || '').trim(),
                    revisedStatement: form.querySelector('[name="revisedStatement"]')?.value || '',
                });
                if (revisedPayload.error) {
                    setInlineFormStatus(form, 'error', revisedPayload.error);
                    return;
                }
                payload.revisedCandidate = revisedPayload.revisedCandidate;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Submitting governed review disposition...');
            try {
                const response = await submitInterpretiveReviewDisposition(reviewRequestId, payload);
                state.currentActorId = payload.submittedByActorId || state.currentActorId;
                const childInterpretation = response?.childInterpretation || null;
                state.actionStatus = {
                    kind: 'review',
                    tone: 'success',
                    message: childInterpretation?.interpretationRevisionId
                        ? `Recorded ${response?.disposition?.disposition || payload.disposition} for ${ownerId}. Opened child revision ${childInterpretation.interpretationRevisionId}.`
                        : `Recorded ${response?.disposition?.disposition || payload.disposition} for ${ownerId}.`,
                };
                if (state.selectedInterpretationRevisionId) {
                    invalidateInterpretationCaches(state.selectedInterpretationRevisionId, state.activeInterpretation?.memorySubjectId);
                }
                if (childInterpretation?.interpretationRevisionId) {
                    invalidateInterpretationCaches(childInterpretation.interpretationRevisionId, childInterpretation.memorySubjectId);
                }
                await refreshReviews({ preserveDetail: true });
                if (childInterpretation?.interpretationRevisionId) {
                    await focusInterpretationRevision(childInterpretation.interpretationRevisionId, {
                        preferredRequestStatuses: ['PENDING', 'DEFERRED'],
                        detailView: 'review',
                    });
                }
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleSubjectSubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            const reviewEnvelopeHash = String(form.dataset.reviewEnvelopeHash || '').trim();
            const ownerId = String(form.dataset.ownerId || '').trim();
            const payload = {
                state: String(form.querySelector('[name="state"]')?.value || '').trim(),
                reviewEnvelopeHash,
                dispositionOwnerId: ownerId,
                submittedByActorId: String(form.querySelector('[name="submittedByActorId"]')?.value || '').trim(),
                submissionMode: String(form.querySelector('[name="submissionMode"]')?.value || '').trim(),
                delegationPolicyId: String(form.querySelector('[name="delegationPolicyId"]')?.value || '').trim() || null,
                subjectEvidenceRefs: parseInterpretiveTokenList(form.querySelector('[name="subjectEvidenceRefs"]')?.value || ''),
                reasonCodes: parseInterpretiveTokenList(form.querySelector('[name="reasonCodes"]')?.value || ''),
                commentary: String(form.querySelector('[name="commentary"]')?.value || '').trim(),
            };
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Recording governed subject disposition...');
            try {
                const response = await recordInterpretiveSubjectDisposition(interpretationRevisionId, payload);
                state.currentActorId = payload.submittedByActorId || state.currentActorId;
                state.actionStatus = {
                    kind: 'subject',
                    tone: 'success',
                    message: `Recorded ${response?.subjectDisposition?.state || payload.state} for ${ownerId}.`,
                };
                if (state.selectedInterpretationRevisionId) {
                    invalidateInterpretationCaches(state.selectedInterpretationRevisionId, state.activeInterpretation?.memorySubjectId);
                }
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handlePublicationQualificationSubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            const payload = {
                publicationPolicyId: String(form.dataset.publicationPolicyId || form.querySelector('[name="publicationPolicyId"]')?.value || '').trim(),
                continuityTargetId: String(form.querySelector('[name="continuityTargetId"]')?.value || '').trim(),
                proposalContentHash: String(form.dataset.proposalContentHash || '').trim(),
                reviewEnvelopeHash: String(form.dataset.reviewEnvelopeHash || '').trim(),
                subjectDispositionRecordId: String(form.dataset.subjectDispositionRecordId || '').trim(),
            };

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Evaluating publication qualification...');
            try {
                const response = await qualifyInterpretivePublication(interpretationRevisionId, payload);
                invalidateInterpretationCaches(interpretationRevisionId, payload.continuityTargetId);
                state.actionStatus = {
                    kind: 'publication-qualify',
                    tone: response?.qualification?.eligibilityVerdict === 'ELIGIBLE' ? 'success' : 'info',
                    message: `Qualification recorded: ${response?.qualification?.eligibilityVerdict || 'UNKNOWN'}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handlePublicationBootstrapSubmit(form) {
            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Creating the standard governed publication policy...');
            try {
                const response = await bootstrapStandardInterpretivePublicationPolicy({});
                if (state.selectedInterpretationRevisionId) {
                    invalidateInterpretationCaches(state.selectedInterpretationRevisionId, state.activeInterpretation?.memorySubjectId);
                }
                state.actionStatus = {
                    kind: 'publication-bootstrap',
                    tone: 'success',
                    message: response?.reused
                        ? 'Standard publication policy is already active.'
                        : 'Standard publication policy created.',
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handlePublicationAuthorizationSubmit(form) {
            const qualificationId = String(form.dataset.qualificationId || '').trim();
            const expiresAt = parseDateTimeLocalValue(form.querySelector('[name="expiresAt"]')?.value || '');
            const payload = {
                qualificationId,
                authorizedBy: String(form.querySelector('[name="authorizedBy"]')?.value || '').trim(),
                expiresAt,
            };
            if (!qualificationId) {
                setInlineFormStatus(form, 'error', 'No eligible qualification is available to authorize.');
                return;
            }
            if (!expiresAt) {
                setInlineFormStatus(form, 'error', 'A valid authorization expiry is required.');
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Creating one-time publication authorization...');
            try {
                const response = await createInterpretivePublicationAuthorization(payload);
                invalidateInterpretationCaches(response?.authorization?.interpretationRevisionId, response?.authorization?.continuityTargetId);
                state.actionStatus = {
                    kind: 'publication-authorize',
                    tone: 'success',
                    message: `Authorization created: ${response?.authorization?.status || 'AUTHORIZED'}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handlePublicationExecuteSubmit(form) {
            const publicationAuthorizationId = String(form.dataset.publicationAuthorizationId || '').trim();
            if (!publicationAuthorizationId) {
                setInlineFormStatus(form, 'error', 'No active publication authorization is available.');
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Publishing qualified interpretation into DNM...');
            try {
                const response = await executeInterpretivePublicationAuthorization({ publicationAuthorizationId });
                invalidateInterpretationCaches(response?.interpretation?.interpretationRevisionId, response?.publishedRecord?.continuityTargetId);
                state.actionStatus = {
                    kind: 'publication-execute',
                    tone: 'success',
                    message: `Published memory record ${response?.publishedRecord?.dnmRecordId || ''}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handlePublicationPublishSubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            if (!interpretationRevisionId) {
                setInlineFormStatus(form, 'error', 'No interpretation revision is available to publish.');
                return;
            }

            const payload = {
                publicationPolicyId: String(form.dataset.publicationPolicyId || '').trim(),
                continuityTargetId: String(form.dataset.continuityTargetId || '').trim(),
                proposalContentHash: String(form.dataset.proposalContentHash || '').trim(),
                reviewEnvelopeHash: String(form.dataset.reviewEnvelopeHash || '').trim(),
                subjectDispositionRecordId: String(form.dataset.subjectDispositionRecordId || '').trim(),
                actorEntityId: options.currentActorId || getCurrentActorEntityId() || '',
                authorizedBy: options.currentActorId || getCurrentActorEntityId() || 'user:system',
            };

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Publishing memory...');
            try {
                const response = await publishInterpretiveMemory(interpretationRevisionId, payload);
                invalidateInterpretationCaches(
                    response?.interpretation?.interpretationRevisionId || interpretationRevisionId,
                    response?.publishedRecord?.continuityTargetId || payload.continuityTargetId,
                );
                state.actionStatus = {
                    kind: 'publication-publish',
                    tone: 'success',
                    message: `Published memory record ${response?.publishedRecord?.dnmRecordId || ''}.`.trim(),
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleOpenChildRevisionSubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            if (!interpretationRevisionId) {
                setInlineFormStatus(form, 'error', 'No child revision was provided by the server.');
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Opening latest revision...');
            try {
                state.actionStatus = {
                    kind: 'open-child-revision',
                    tone: 'success',
                    message: `Opened child revision ${interpretationRevisionId}.`,
                };
                await focusInterpretationRevision(interpretationRevisionId, {
                    preferredRequestStatuses: ['PENDING', 'DEFERRED'],
                    detailView: 'review',
                });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleOpenCurrentPublishedMemorySubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            if (!interpretationRevisionId) {
                setInlineFormStatus(form, 'error', 'No current published memory was provided by the server.');
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Opening current published memory...');
            try {
                state.actionStatus = {
                    kind: 'open-current-published-memory',
                    tone: 'success',
                    message: `Opened current published memory ${interpretationRevisionId}.`,
                };
                await focusInterpretationRevision(interpretationRevisionId, {
                    preferredRequestStatuses: ['PENDING', 'DEFERRED', 'APPROVED', 'PUBLISHED'],
                    detailView: 'lifecycle',
                    focusSectionKey: 'current-published-memory',
                });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleSubjectRevisionSubmit(form) {
            const interpretationRevisionId = String(form.dataset.interpretationRevisionId || '').trim();
            if (!interpretationRevisionId) {
                setInlineFormStatus(form, 'error', 'No interpretation revision is available to revise.');
                return;
            }

            const payload = buildLifecyclePayload(form);
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }

            const revisedPayload = buildInterpretiveRevisedCandidatePayload({
                parentStatement: String(form.dataset.parentStatement || '').trim(),
                revisedStatement: form.querySelector('[name="revisedStatement"]')?.value || '',
            });
            if (revisedPayload.error) {
                setInlineFormStatus(form, 'error', revisedPayload.error);
                return;
            }

            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Creating governed child revision...');
            try {
                const response = await createInterpretiveRevision(interpretationRevisionId, {
                    ...payload,
                    revisedCandidate: revisedPayload.revisedCandidate,
                });
                const childInterpretation = response?.interpretation || null;
                if (!childInterpretation?.interpretationRevisionId) {
                    throw new Error('Child revision was not returned by the server.');
                }
                state.currentActorId = payload.actorEntityId || state.currentActorId;
                invalidateInterpretationCaches(interpretationRevisionId, state.activeInterpretation?.memorySubjectId);
                invalidateInterpretationCaches(childInterpretation.interpretationRevisionId, childInterpretation.memorySubjectId);
                state.actionStatus = {
                    kind: 'subject-revision',
                    tone: 'success',
                    message: `Created child revision ${childInterpretation.interpretationRevisionId}.`,
                };
                await refreshReviews({ preserveDetail: true });
                await focusInterpretationRevision(childInterpretation.interpretationRevisionId, {
                    preferredRequestStatuses: ['PENDING', 'DEFERRED'],
                    detailView: 'review',
                });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        function buildLifecyclePayload(form) {
            return {
                actorEntityId: String(form.querySelector('[name="submittedByActorId"]')?.value || '').trim(),
                dispositionOwnerId: String(form.dataset.ownerId || '').trim(),
                submissionMode: String(form.querySelector('[name="submissionMode"]')?.value || '').trim(),
                delegationPolicyId: String(form.querySelector('[name="delegationPolicyId"]')?.value || '').trim() || null,
                subjectEvidenceRefs: parseInterpretiveTokenList(form.querySelector('[name="subjectEvidenceRefs"]')?.value || ''),
                reasonCodes: parseInterpretiveTokenList(form.querySelector('[name="reasonCodes"]')?.value || ''),
                commentary: String(form.querySelector('[name="commentary"]')?.value || '').trim(),
            };
        }

        async function handleDnmSupersedeSubmit(form) {
            const payload = {
                ...buildLifecyclePayload(form),
                priorDnmRecordId: String(form.dataset.priorDnmRecordId || '').trim(),
                replacementDnmRecordId: String(form.dataset.replacementDnmRecordId || '').trim(),
            };
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }
            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Replacing the current published memory...');
            try {
                const response = await supersedeDnmPublicationRecord(payload);
                invalidateInterpretationCaches(state.selectedInterpretationRevisionId, response?.replacementRecord?.continuityTargetId);
                state.actionStatus = {
                    kind: 'dnm-supersede',
                    tone: 'success',
                    message: `Superseded ${response?.priorRecord?.dnmRecordId || ''} with ${response?.replacementRecord?.dnmRecordId || ''}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleDnmWithdrawSubmit(form) {
            const payload = {
                ...buildLifecyclePayload(form),
                dnmRecordId: String(form.dataset.dnmRecordId || '').trim(),
            };
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }
            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Withdrawing the current published memory...');
            try {
                const response = await withdrawDnmPublicationRecord(payload);
                invalidateInterpretationCaches(state.selectedInterpretationRevisionId, response?.record?.continuityTargetId);
                state.actionStatus = {
                    kind: 'dnm-withdraw',
                    tone: 'success',
                    message: `Withdrew ${response?.record?.dnmRecordId || ''}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        async function handleDnmDeltaReviewSubmit(form) {
            const payload = {
                ...buildLifecyclePayload(form),
                continuityTargetId: String(form.dataset.continuityTargetId || '').trim(),
                dnmRecordId: String(form.dataset.dnmRecordId || '').trim() || null,
                deltaState: String(form.querySelector('[name="deltaState"]')?.value || '').trim(),
            };
            const validationError = validateGovernedSubmissionPayload(form, payload);
            if (validationError) {
                setInlineFormStatus(form, 'error', validationError);
                return;
            }
            setFormBusy(form, true);
            setInlineFormStatus(form, 'info', 'Recording follow-up review on the published memory...');
            try {
                const response = await recordDnmDeltaReview(payload);
                invalidateInterpretationCaches(state.selectedInterpretationRevisionId, response?.record?.continuityTargetId);
                state.actionStatus = {
                    kind: 'dnm-delta-review',
                    tone: 'success',
                    message: `Recorded delta review ${response?.deltaReview?.deltaState || ''} for ${response?.record?.dnmRecordId || ''}.`,
                };
                await refreshReviews({ preserveDetail: true });
            } catch (error) {
                setInlineFormStatus(form, 'error', error?.message || String(error));
            } finally {
                setFormBusy(form, false);
            }
        }

        statusFilter?.addEventListener('change', async () => {
            state.actionStatus = null;
            state.filters.status = String(statusFilter.value || '').trim();
            await refreshReviews({ preserveDetail: true });
        });

        refreshButton?.addEventListener('click', async () => {
            state.actionStatus = null;
            await refreshReviews({ preserveDetail: true });
        });

        const applyFullscreenState = (expanded) => {
            modalRoot?.classList.toggle('ss-interpretive-review-fullscreen', expanded);
            popupRoot?.classList.toggle('ss-interpretive-review-popup-fullscreen', expanded);
            if (popupRoot) {
                if (expanded) {
                    popupRoot.style.width = 'calc(100vw - 12px)';
                    popupRoot.style.maxWidth = 'calc(100vw - 12px)';
                    popupRoot.style.height = 'calc(100vh - 12px)';
                    popupRoot.style.maxHeight = 'calc(100vh - 12px)';
                } else {
                    popupRoot.style.removeProperty('width');
                    popupRoot.style.removeProperty('max-width');
                    popupRoot.style.removeProperty('height');
                    popupRoot.style.removeProperty('max-height');
                }
            }
            if (popupContent) {
                if (expanded) {
                    popupContent.style.height = '100%';
                    popupContent.style.maxHeight = '100%';
                    popupContent.style.width = '100%';
                } else {
                    popupContent.style.removeProperty('height');
                    popupContent.style.removeProperty('max-height');
                    popupContent.style.removeProperty('width');
                }
            }
            fullscreenButton.value = expanded ? 'Exit fullscreen' : 'Fullscreen';
        };

        fullscreenButton?.addEventListener('click', () => {
            const nextExpanded = !(modalRoot?.classList.contains('ss-interpretive-review-fullscreen'));
            applyFullscreenState(nextExpanded);
        });

        closeButton?.addEventListener('click', () => {
            popup.complete(POPUP_RESULT.AFFIRMATIVE);
        });

        expandToggleButton?.addEventListener('click', () => {
            if (!detailRoot) {
                return;
            }
            const activePanel = detailRoot.querySelector('.ss-interpretive-review-detail-view.active') || detailRoot;
            const disclosures = [...activePanel.querySelectorAll('.ss-interpretive-review-disclosure')];
            if (disclosures.length === 0) {
                updateExpandToggle();
                return;
            }
            const shouldOpen = !disclosures.every((entry) => entry.hasAttribute('open'));
            disclosures.forEach((entry) => {
                if (shouldOpen) {
                    entry.setAttribute('open', '');
                } else {
                    entry.removeAttribute('open');
                }
            });
            updateExpandToggle();
        });

        detailRoot?.addEventListener('toggle', (event) => {
            if (event.target instanceof HTMLDetailsElement && event.target.classList.contains('ss-interpretive-review-disclosure')) {
                updateExpandToggle();
            }
        }, true);

        detailRoot?.addEventListener('click', (event) => {
            const copyButton = event.target.closest('[data-copy-value]');
            if (copyButton) {
                event.preventDefault();
                const copyValue = String(copyButton.getAttribute('data-copy-value') || '').trim();
                if (copyValue && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(copyValue)
                        .then(() => globalThis.toastr?.success?.('Copied to clipboard'))
                        .catch(() => globalThis.toastr?.error?.('Clipboard copy failed'));
                }
                return;
            }
            const reasonButton = event.target.closest('[data-reason-code]');
            if (reasonButton) {
                event.preventDefault();
                const form = reasonButton.closest('.ss-interpretive-action-form');
                const reasonCode = String(reasonButton.getAttribute('data-reason-code') || '').trim();
                toggleReasonCodeSelection(form, reasonCode);
                reasonButton.focus();
                return;
            }
            const tokenButton = event.target.closest('[data-token-target][data-token-value]');
            if (tokenButton) {
                event.preventDefault();
                const form = tokenButton.closest('.ss-interpretive-action-form');
                const targetName = String(tokenButton.getAttribute('data-token-target') || '').trim();
                const tokenValue = String(tokenButton.getAttribute('data-token-value') || '').trim();
                const field = form?.querySelector(`[name="${targetName}"]`);
                appendTokenToField(field, tokenValue);
                field?.focus();
                return;
            }
            const tab = event.target.closest('[data-detail-view]');
            if (!tab) {
                return;
            }
            const nextView = String(tab.getAttribute('data-detail-view') || '').trim();
            if (!nextView || nextView === state.detailView) {
                return;
            }
            state.detailView = nextView;
            renderCurrentDetail();
        });

        queueList?.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-review-request-id]');
            if (!button) return;
            const reviewRequestId = String(button.getAttribute('data-review-request-id') || '').trim();
            if (!reviewRequestId || reviewRequestId === state.selectedReviewRequestId) return;
            await selectReview(reviewRequestId);
        });

        detailRoot?.addEventListener('change', (event) => {
            const form = event.target.closest('.ss-interpretive-action-form');
            if (!form) return;
            if (event.target.name === 'submissionMode') {
                const ownerId = String(form.dataset.ownerId || '').trim();
                const actorInput = form.querySelector('[name="submittedByActorId"]');
                if (actorInput) {
                    actorInput.value = getDefaultActorForMode(
                        String(event.target.value || '').trim(),
                        ownerId,
                        state.currentActorId,
                    );
                }
                syncActionForm(form);
                return;
            }
            if (event.target.name === 'disposition') {
                syncActionForm(form);
                return;
            }
            if (event.target.name === 'submittedByActorId') {
                syncActionForm(form);
            }
        });

        detailRoot?.addEventListener('submit', async (event) => {
            const form = event.target.closest('.ss-interpretive-action-form');
            if (!form) return;
            event.preventDefault();
            if (form.dataset.formKind === 'review') {
                await handleReviewSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'subject') {
                await handleSubjectSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'publication-bootstrap') {
                await handlePublicationBootstrapSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'publication-qualify') {
                await handlePublicationQualificationSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'open-child-revision') {
                await handleOpenChildRevisionSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'open-current-published-memory') {
                await handleOpenCurrentPublishedMemorySubmit(form);
                return;
            }
            if (form.dataset.formKind === 'publication-authorize') {
                await handlePublicationAuthorizationSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'publication-publish') {
                await handlePublicationPublishSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'subject-revision') {
                await handleSubjectRevisionSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'publication-execute') {
                await handlePublicationExecuteSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'dnm-supersede') {
                await handleDnmSupersedeSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'dnm-withdraw') {
                await handleDnmWithdrawSubmit(form);
                return;
            }
            if (form.dataset.formKind === 'dnm-delta-review') {
                await handleDnmDeltaReviewSubmit(form);
            }
        });

        void refreshReviews();
    });

    await showPromise;
}
