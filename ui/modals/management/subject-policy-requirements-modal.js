import { Popup, POPUP_TYPE } from '../../../../../../popup.js';

import { performSubjectScopedSynthesisAction } from '../../../core/summarization/architectural-authority-server-api.js';
import { escapeHtml } from '../../common/ui-utils.js';

export function renderSubjectPolicyRequirements(status = {}) {
    const requirements = Array.isArray(status.missingRequirements) ? status.missingRequirements : [];
    const actions = Array.isArray(status.permittedActions) ? status.permittedActions : [];
    return `
        <div class="shardwright-subject-policy-requirements">
            <h3>${escapeHtml(status.status || 'Proposal requirements')}</h3>
            ${requirements.length ? `
                <ul>${requirements.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>
            ` : ''}
            ${actions.length ? `
                <div class="shardwright-subject-policy-actions">
                    ${actions.map((entry) => `
                        <button type="button" class="menu_button" data-subject-policy-action="${escapeHtml(entry.action)}">
                            ${escapeHtml(entry.label)}
                        </button>
                        <div>${escapeHtml(entry.description || '')}</div>
                    `).join('')}
                </div>
            ` : `<p>${escapeHtml(status.nextAction || 'No action is available to this account.')}</p>`}
            <div data-subject-policy-result aria-live="polite"></div>
        </div>
    `;
}

export async function openSubjectPolicyRequirementsModal(synthesisRunId, status) {
    const popup = new Popup(renderSubjectPolicyRequirements(status), POPUP_TYPE.TEXT, null, {
        title: 'Proposal requirements',
        okButton: 'Close',
        wide: true,
    });
    const root = popup.dlg;
    root?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-subject-policy-action]');
        if (!button) return;
        const result = root.querySelector('[data-subject-policy-result]');
        button.disabled = true;
        if (result) result.textContent = 'Recording…';
        try {
            await performSubjectScopedSynthesisAction(
                synthesisRunId,
                button.getAttribute('data-subject-policy-action'),
            );
            if (result) result.textContent = 'Recorded. Run the sharder again to continue proposal creation.';
            root.querySelectorAll('[data-subject-policy-action]').forEach((entry) => {
                entry.disabled = true;
            });
        } catch (error) {
            button.disabled = false;
            if (result) result.textContent = error?.message || String(error);
        }
    });
    return await popup.show();
}
