import { Popup, POPUP_TYPE } from '../../../../../../popup.js';
import { registerCharacterBinding, requestCharacterBindingCandidates } from '../../../core/transcript/character-binding-candidates-transport.js';
import { recordCharacterAssociationAudit, requestCharacterAssociationAuditEntries } from '../../../core/transcript/character-association-audit-transport.js';
import { escapeHtml } from '../../common/ui-utils.js';
import { clearCharacterIdentityAlias, getCharacterIdentityAlias, setCharacterIdentityAlias } from '../../../core/transcript/character-identity-aliases.js';

export function renderCharacterAssociationModal(candidates = [], currentCharacterInstanceId = null, auditEntries = [], settings = null) {
    const usedIds = new Set(auditEntries.map((e) => e.targetCharacterInstanceId).filter(Boolean));
    const rows = candidates.map((c) => { const id = c.characterInstanceId; const alias = getCharacterIdentityAlias(settings, id); const label = alias && alias !== id ? `${alias} — ${id}` : id; return `<option value="${escapeHtml(id)}"${id === currentCharacterInstanceId ? ' selected' : ''}>${escapeHtml(label)}${id === currentCharacterInstanceId ? ' (current card)' : usedIds.has(id) ? ' (recorded)' : ' (unused)'}</option>`; }).join('');
    const history = auditEntries.length ? `<details><summary>Audit history (${auditEntries.length})</summary><ul>${auditEntries.slice().reverse().map((e) => `<li>${escapeHtml(e.decision)} — ${escapeHtml(e.recordedAt)} — ${escapeHtml(e.basis)}</li>`).join('')}</ul></details>` : '<p>No audit decisions recorded.</p>';
    const selectedAlias = getCharacterIdentityAlias(settings, currentCharacterInstanceId);
    return `<div class="shardwright-character-association"><h3>Character identity association</h3><p>Choose an explicit action. Shardwright will not infer identity.</p><label>Existing identity<select data-association-target><option value="">Select…</option>${rows}</select></label><label>Display alias (optional)<input data-association-alias maxlength="100" value="${escapeHtml(selectedAlias && selectedAlias !== currentCharacterInstanceId ? selectedAlias : '')}" placeholder="Optional operator label"></label><div><button class="menu_button" data-alias-action="save">Save alias</button><button class="menu_button" data-alias-action="clear">Clear alias</button></div><label>Basis<textarea data-association-basis placeholder="Why is this association appropriate?"></textarea></label><div><button class="menu_button" data-association-decision="ADOPT_EXISTING">Associate existing</button><button class="menu_button" data-association-decision="CREATE_NEW">Create new</button><button class="menu_button" data-association-decision="LEAVE_UNRESOLVED">Leave unresolved</button><button class="menu_button" data-association-decision="RESET_MARKER"${typeof globalThis.SillyTavern?.getContext?.()?.clearExtensionField === 'function' ? '' : ' disabled title="Host deletion API unavailable"'}>Reset marker</button></div><div data-association-result aria-live="polite"></div><hr><h4>Audit history</h4>${history}</div>`;
}

export async function openCharacterAssociationModal(settings = null, saveSettingsFn = null, options = {}) {
    const candidates = await requestCharacterBindingCandidates(); const audit = await requestCharacterAssociationAuditEntries();
    const context = globalThis.SillyTavern?.getContext?.() || {};
    const characterId = Number.isInteger(Number(options.characterId)) ? Number(options.characterId) : Number(context.characterId);
    const character = Number.isInteger(characterId) ? context.characters?.[characterId] : null;
    const currentMarker = character?.data?.extensions?.shardwright ?? character?.json_data?.extensions?.shardwright ?? character?.extensions?.shardwright;
    const popup = new Popup(renderCharacterAssociationModal(candidates.candidates, currentMarker?.characterInstanceId || null, audit.entries, settings), POPUP_TYPE.TEXT, null, { title: 'Character identity association', okButton: 'Close', wide: true });
    const root = popup.dlg;
    let pendingAudit = null;
    root?.addEventListener('click', async (event) => {
        const aliasAction = event.target.closest('[data-alias-action]');
        if (aliasAction) {
            const result = root.querySelector('[data-association-result]');
            if (!settings || typeof saveSettingsFn !== 'function') { if (result) result.textContent = 'Alias settings are unavailable in this group context.'; return; }
            const target = root.querySelector('[data-association-target]')?.value || currentMarker?.characterInstanceId || null;
            if (!target) { if (result) result.textContent = 'Select an identity before editing its alias.'; return; }
            const operation = aliasAction.dataset.aliasAction;
            const changed = operation === 'clear'
                ? clearCharacterIdentityAlias(settings, target)
                : setCharacterIdentityAlias(settings, target, root.querySelector('[data-association-alias]')?.value || '');
            if (changed.state !== 'RECORDED') { if (result) result.textContent = `Alias not changed: ${changed.reason}`; return; }
            Object.assign(settings, changed.settings);
            if (typeof saveSettingsFn === 'function') saveSettingsFn(settings);
            const aliasInput = root.querySelector('[data-association-alias]'); if (aliasInput) aliasInput.value = operation === 'clear' ? '' : changed.alias;
            if (result) result.textContent = operation === 'clear' ? 'Alias cleared.' : 'Alias saved.';
            return;
        }
        const retry = event.target.closest('[data-association-retry]');
        if (retry && pendingAudit) { retry.disabled = true; const result = root.querySelector('[data-association-result]'); const retried = await recordCharacterAssociationAudit(pendingAudit); if (retried.state === 'RECORDED') { pendingAudit = null; if (result) result.textContent = 'Audit recorded.'; } else { retry.disabled = false; if (result) result.textContent = `Audit still pending: ${retried.reason}`; } return; }
        const button = event.target.closest('[data-association-decision]'); if (!button) return;
        const decision = button.dataset.associationDecision; const target = root.querySelector('[data-association-target]')?.value || null; const basis = root.querySelector('[data-association-basis]')?.value?.trim(); const result = root.querySelector('[data-association-result]');
        if (decision === 'ADOPT_EXISTING' && !target) { if (result) result.textContent = 'Select an existing identity first.'; return; }
        if (!basis) { if (result) result.textContent = 'Basis is required.'; return; }
        button.disabled = true; if (result) result.textContent = 'Recording…';
        try { const operatorActionId = globalThis.crypto?.randomUUID?.() || `operator-${Date.now()}-${Math.random().toString(16).slice(2)}`; let targetCharacterInstanceId = target; if (decision === 'CREATE_NEW') { const registered = await registerCharacterBinding({ operatorActionId }); if (registered.state !== 'REGISTERED') { if (result) result.textContent = `${registered.state}: ${registered.reason}`; button.disabled = false; return; } targetCharacterInstanceId = registered.characterInstanceId; } const association = globalThis.Shardwright?.transcript; const associate = association?.associateCharacterIdentity || association?.associateCurrentCharacterIdentity; const applied = await associate?.({ decision, characterId, targetCharacterInstanceId, operatorActionId, basis, recordedAt: new Date().toISOString() }); if (applied?.state === 'MARKER_APPLIED_AUDIT_PENDING') { const liveContext = globalThis.SillyTavern?.getContext?.() || {}; const marker = liveContext.characters?.[characterId]?.data?.extensions?.shardwright; pendingAudit = { decision, hostCharacterId: marker?.copyUuid ? `shardwright-card:${marker.copyUuid}` : '', idempotencyKey: operatorActionId, basis, recordedAt: applied.decisionRecord.recordedAt, cardMarkerBefore: applied.decisionRecord.cardMarker, targetCharacterInstanceId }; if (result) result.innerHTML = 'Marker applied; audit is pending. <button class="menu_button" data-association-retry>Retry audit</button>'; } else if (result) result.textContent = applied?.state === 'APPLIED_AND_AUDITED' ? 'Association applied and audit submitted.' : `${applied?.state || 'REFUSED'}: ${applied?.reason || 'unknown refusal'}`; } catch (error) { button.disabled = false; if (result) result.textContent = error?.message || String(error); }
    });
    return await popup.show();
}
