import { Popup, POPUP_TYPE } from '../../../../../../popup.js';
import { appendBranchLineageDecision, discoverBranchLineage } from '../../../core/transcript/branch-lineage-transport.js';
import { observeTranscriptSource, previewTranscriptSource, registerTranscriptSource } from '../../../core/transcript/transcript-source-registration-transport.js';
import { intakeTranscriptSource } from '../../../core/transcript/transcript-source-intake-transport.js';
import { prepareLineageDecision } from '../../../core/transcript/branch-lineage-decision.js';
import { escapeHtml } from '../../common/ui-utils.js';

export function renderBranchDiscoveryModal(result) {
    if (!result || result.state === 'REFUSED') return '<div class="shardwright-branch-discovery"><h3>Branch discovery</h3><p>Discovery could not run.</p><p class="shardwright-discovery-status">Discovery is read-only; no lineage was changed.</p></div>';
    const unregistered = (result.unregisteredSources || []).map((source, index) => `<li>${escapeHtml(source.sourceClass === 'GROUP' ? `GROUP ${source.groupId}` : source.chatLocator)} <span class="shardwright-discovery-status">NOT_SCANNED</span>${source.historicalParticipantBasis ? ' <span class="shardwright-discovery-status">participant evidence recorded</span>' : ''} <button class="menu_button" data-source-preview="${index}">Preview source</button></li>`).join('');
    if (result.state === 'NO_DISCOVERY') return `<div class="shardwright-branch-discovery"><h3>Branch discovery</h3><p>Only ${escapeHtml(String(result.sourceCount))} registered source was available for this character.</p>${result.coverage?.unregisteredCount ? `<p>${escapeHtml(String(result.coverage.unregisteredCount))} possible source file(s) are not registered and were not scanned.</p><ul>${unregistered}</ul>` : ''}<p class="shardwright-discovery-status">No relationship was inferred.</p></div>`;
    const suggestions = (result.suggestions || []).map((suggestion, index) => `<li><strong>Review candidate ${index + 1}</strong><br>Shared prefix: ${escapeHtml(String(suggestion.matchedPrefixLength))} messages<br>Proposed parent: ${escapeHtml(suggestion.proposedParentSourceLogicalId || 'unresolved')}<br>Proposed child: ${escapeHtml(suggestion.proposedChildSourceLogicalId || 'unresolved')}<br>Ordering basis: ${escapeHtml(suggestion.orderingBasis || 'unavailable')}<br><button class="menu_button" data-branch-review="${index}">Review decision</button><br><span class="shardwright-discovery-status">Operator review required; no action has been taken.</span></li>`).join('');
    return `<div class="shardwright-branch-discovery"><h3>Branch discovery</h3><p>Found ${escapeHtml(String(result.sourceCount))} registered sources and ${escapeHtml(String((result.suggestions || []).length))} review candidate(s).</p>${result.coverage?.unregisteredCount ? `<p>${escapeHtml(String(result.coverage.unregisteredCount))} possible source file(s) are not registered and were not scanned.</p><ul>${unregistered}</ul>` : ''}<p class="shardwright-discovery-status">Evidence only. Discovery does not select a parent, change retrieval, or mutate custody.</p>${suggestions ? `<ol>${suggestions}</ol>` : '<p>No reviewable fork candidates found.</p>'}</div>`;
}

async function openSourcePreviewModal(source) {
    const sourceResolutionLocator = source.sourceClass === 'GROUP'
        ? { kind: 'GROUP', groupId: source.groupId, chatLocator: source.chatLocator }
        : { kind: 'DIRECT', avatarUrl: source.avatarUrl, chatLocator: source.chatLocator };
    const result = await previewTranscriptSource({ sourceClass: source.sourceClass, sourceResolutionLocator });
    const details = result.state === 'READABLE'
        ? `<p>Readable JSONL source.</p><p>${escapeHtml(String(result.messageCount))} messages in ${escapeHtml(String(result.recordCount))} records.</p><p>Bytes: ${escapeHtml(String(result.byteLength))}<br>Revision: ${escapeHtml(result.sourceRevisionHash)}<br>Creation tier: ${escapeHtml(result.sourceCreationTimestampTier)}</p><button class="menu_button" data-source-register>Register source</button><p data-source-register-result class="shardwright-discovery-status">Registration is separate and requires this explicit action.</p>`
        : `<p>Preview refused: ${escapeHtml(result.state || result.reason || 'UNKNOWN')}</p><p class="shardwright-discovery-status">No registration or ingestion occurred.</p>`;
    const popup = new Popup(`<div class="shardwright-source-preview"><h3>Source preview</h3><p>${escapeHtml(source.chatLocator)}</p>${details}</div>`, POPUP_TYPE.TEXT, null, { title: 'Source preview', okButton: 'Close', wide: true });
    popup.dlg?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-source-register]'); if (!button) return;
        const status = popup.dlg.querySelector('[data-source-register-result]'); button.disabled = true;
        const registrationInput = source.sourceClass === 'GROUP'
            ? { characterInstanceId: source.characterInstanceId, sourceClass: 'GROUP', groupId: source.groupId, chatLocator: source.chatLocator, historicalParticipantBasis: source.historicalParticipantBasis, operatorActionId: globalThis.crypto?.randomUUID?.() || `operator-${Date.now()}` }
            : { characterInstanceId: source.characterInstanceId, sourceClass: 'DIRECT', avatarUrl: source.avatarUrl, chatLocator: source.chatLocator, operatorActionId: globalThis.crypto?.randomUUID?.() || `operator-${Date.now()}` };
        const result = await registerTranscriptSource(registrationInput);
        if (result.state === 'REGISTERED') {
            const sourceLogicalId = result.entry?.payload?.sourceLogicalId;
            status.innerHTML = `Source registered. <button class="menu_button" data-source-observe="${escapeHtml(sourceLogicalId || '')}">Observe source</button><br>Intake remains separate.`;
        } else status.textContent = `Registration refused: ${result.reason}`;
        button.disabled = false;
    });
    popup.dlg?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-source-observe]'); if (!button) return;
        button.disabled = true;
        const result = await observeTranscriptSource(button.dataset.sourceObserve);
        if (result.state === 'OBSERVED') button.parentElement.innerHTML = `Observed ${escapeHtml(String(result.byteLength))} bytes. <button class="menu_button" data-source-intake="${escapeHtml(button.dataset.sourceObserve)}">Intake source</button><br>Ingestion remains an explicit action.`;
        else button.parentElement.textContent = `Observation refused: ${result.reason || result.refusalCode || result.state}`;
    });
    popup.dlg?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-source-intake]'); if (!button) return;
        button.disabled = true;
        const result = await intakeTranscriptSource(button.dataset.sourceIntake);
        button.parentElement.textContent = result.state === 'CURRENT' ? `Source intake complete: ${result.messages?.rowCount || 0} message rows projected.` : `Intake refused: ${result.reason || result.state}`;
    });
    return popup.show();
}

async function openBranchDecisionModal(suggestion) {
    const sourceIds = suggestion.sourceLogicalIds || [suggestion.proposedParentSourceLogicalId, suggestion.proposedChildSourceLogicalId];
    const html = `<div class="shardwright-branch-decision"><h3>Review branch relationship</h3><p>Choose an explicit outcome. No source file will be rewritten.</p><label>Decision<select data-branch-decision><option value="ACCEPT_PROPOSED">Accept proposed parent</option><option value="CHOOSE_PARENT">Choose parent and anchor</option><option value="LEAVE_INDEPENDENT">Leave sources independent</option><option value="REJECT">Reject suggestion</option></select></label><label>Parent source<select data-branch-parent>${sourceIds.map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('')}</select></label><label>Fork anchor message index<input type="number" min="0" data-branch-anchor value="${escapeHtml(String(suggestion.forkAnchor.messageIndex))}" readonly></label><button class="menu_button" data-branch-submit>Record decision</button><div data-branch-result aria-live="polite"></div></div>`;
    const popup = new Popup(html, POPUP_TYPE.TEXT, null, { title: 'Branch decision', okButton: 'Close', wide: true });
    const root = popup.dlg;
    root?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-branch-submit]'); if (!button) return;
        const result = root.querySelector('[data-branch-result]'); const decision = root.querySelector('[data-branch-decision]')?.value;
        button.disabled = true;
        const prepared = prepareLineageDecision({ suggestion, decision, operatorActionId: globalThis.crypto?.randomUUID?.() || `operator-${Date.now()}`, recordedAt: new Date().toISOString(), parentSourceLogicalId: root.querySelector('[data-branch-parent]')?.value, forkAnchor: { messageIndex: Number(root.querySelector('[data-branch-anchor]')?.value), contentHash: suggestion.forkAnchor.contentHash } });
        const appended = prepared.state === 'DECISION_READY' ? await appendBranchLineageDecision(prepared) : prepared;
        result.textContent = appended.state === 'APPENDED' || appended.state === 'IDEMPOTENT' ? 'Decision recorded.' : `Decision refused: ${appended.reason}`;
        button.disabled = false;
    });
    return popup.show();
}

export async function openBranchDiscoveryModal() {
    const context = globalThis.SillyTavern?.getContext?.() || {};
    const character = Number.isInteger(Number(context.characterId)) ? context.characters?.[Number(context.characterId)] : null;
    const marker = character?.data?.extensions?.shardwright ?? character?.json_data?.extensions?.shardwright ?? character?.extensions?.shardwright;
    const result = marker?.characterInstanceId
        ? await discoverBranchLineage(marker.characterInstanceId, globalThis.fetch, { avatarUrl: character?.avatar })
        : { state: 'REFUSED', reason: 'CHARACTER_INSTANCE_UNAVAILABLE' };
    const popup = new Popup(renderBranchDiscoveryModal(result), POPUP_TYPE.TEXT, null, { title: 'Branch discovery', okButton: 'Close', wide: true });
    popup.dlg?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-branch-review]');
        const suggestion = button ? result?.suggestions?.[Number(button.dataset.branchReview)] : null;
        if (suggestion) return openBranchDecisionModal(suggestion);
        const previewButton = event.target.closest('[data-source-preview]');
        const source = previewButton ? result?.unregisteredSources?.[Number(previewButton.dataset.sourcePreview)] : null;
        if (source) await openSourcePreviewModal(source);
    });
    return popup.show();
}
