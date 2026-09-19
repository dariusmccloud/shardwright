import { CHARACTER_ASSOCIATION_DECISIONS, createCharacterAssociationDecision, createCharacterIdentityMarker, validateCharacterIdentityMarker } from './character-identity-marker.js';

function validCharacterId(value) { return Number.isInteger(value) && value >= 0; }

/** Apply one explicit operator decision through host-owned persistence primitives. */
export async function applyCharacterIdentityAssociation({ characterId, decision, currentMarker = null, targetCharacterInstanceId = null, operatorActionId, basis, recordedAt, writeExtensionField, clearExtensionField, createMarker = createCharacterIdentityMarker, auditDecision } = {}) {
    if (!validCharacterId(characterId) || typeof writeExtensionField !== 'function' || typeof auditDecision !== 'function') {
        return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_HOST_PRIMITIVES_UNAVAILABLE' });
    }
    if (decision === CHARACTER_ASSOCIATION_DECISIONS.RESET_MARKER && typeof clearExtensionField !== 'function') {
        return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_CLEAR_PRIMITIVE_UNAVAILABLE' });
    }
    let marker = null;
    if (decision === CHARACTER_ASSOCIATION_DECISIONS.ADOPT_EXISTING) {
        if (typeof targetCharacterInstanceId !== 'string' || !targetCharacterInstanceId.trim()) return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_TARGET_REQUIRED' });
        marker = createMarker();
        marker = Object.freeze({ ...marker, characterInstanceId: targetCharacterInstanceId.trim() });
    } else if (decision === CHARACTER_ASSOCIATION_DECISIONS.CREATE_NEW) {
        marker = createMarker();
        if (typeof targetCharacterInstanceId === 'string' && targetCharacterInstanceId.trim()) marker = Object.freeze({ ...marker, characterInstanceId: targetCharacterInstanceId.trim() });
    } else if (decision === CHARACTER_ASSOCIATION_DECISIONS.LEAVE_UNRESOLVED) {
        const decisionRecord = createCharacterAssociationDecision({ decision, cardMarker: currentMarker, targetCharacterInstanceId, operatorActionId, basis, recordedAt });
        if (decisionRecord.state !== 'RECORDED') return decisionRecord;
        let auditResult;
        try { auditResult = await auditDecision(decisionRecord); } catch (error) { auditResult = Object.freeze({ state: 'REFUSED', reason: error?.message || 'ASSOCIATION_AUDIT_FAILED' }); }
        return Object.freeze({ state: 'UNRESOLVED', reason: 'OPERATOR_LEFT_UNRESOLVED', decisionRecord, audit: auditResult });
    } else if (decision !== CHARACTER_ASSOCIATION_DECISIONS.RESET_MARKER) {
        return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_DECISION_INVALID' });
    }
    const decisionRecord = createCharacterAssociationDecision({ decision, cardMarker: currentMarker, targetCharacterInstanceId, operatorActionId, basis, recordedAt });
    if (decisionRecord.state !== 'RECORDED') return decisionRecord;
    if (marker && validateCharacterIdentityMarker(marker).state !== 'VALID') return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_MARKER_INVALID' });
    try {
        if (marker) await writeExtensionField(characterId, 'shardwright', marker);
        else await clearExtensionField(characterId, 'shardwright');
    } catch (error) {
        if (error?.message === 'HOST_EXTENSION_FIELD_CLEAR_UNAVAILABLE') return Object.freeze({ state: 'REFUSED', reason: 'ASSOCIATION_CLEAR_PRIMITIVE_UNAVAILABLE' });
        return Object.freeze({ state: 'REFUSED_NOT_APPLIED', reason: 'ASSOCIATION_MARKER_PERSISTENCE_FAILED', decision, marker, decisionRecord, error: error?.message || null });
    }
    let auditResult;
    try { auditResult = await auditDecision(decisionRecord); } catch (error) { auditResult = Object.freeze({ state: 'REFUSED', reason: error?.message || 'ASSOCIATION_AUDIT_FAILED' }); }
    if (!auditResult || auditResult.state !== 'RECORDED') return Object.freeze({ state: 'MARKER_APPLIED_AUDIT_PENDING', decision, marker, decisionRecord, audit: auditResult || null });
    return Object.freeze({ state: 'APPLIED_AND_AUDITED', decision, marker, decisionRecord, audit: auditResult });
}
