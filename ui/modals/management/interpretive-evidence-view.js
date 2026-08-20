function escapeEvidenceHtml(value) {
    return String(value ?? '')
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&#039;');
}

function humanLabel(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/_/gu, ' ')
        .replace(/^./u, (character) => character.toUpperCase());
}

function renderPreview(preview) {
    const sourceLabel = String(preview?.sourceLabel || '').trim();
    const contextLabel = String(preview?.contextLabel || '').trim();
    const speakerLabel = String(preview?.speakerLabel || '').trim();
    const heading = speakerLabel || sourceLabel || 'Evidence source';
    const context = contextLabel && contextLabel !== sourceLabel
        ? `<div class="shardwright-interpretive-review-evidence-context">${escapeEvidenceHtml(contextLabel)}</div>`
        : '';

    if (preview?.previewKind === 'STRUCTURAL_FIELDS') {
        const fields = Array.isArray(preview?.previewContent?.fields) ? preview.previewContent.fields : [];
        return `
            <div class="shardwright-interpretive-review-evidence-preview">
                <div class="shardwright-interpretive-review-evidence-preview-heading">${escapeEvidenceHtml(heading)}</div>
                ${context}
                <dl class="shardwright-interpretive-review-evidence-fields">
                    ${fields.map((field) => `
                        <div class="shardwright-interpretive-review-evidence-field">
                            <dt>${escapeEvidenceHtml(field?.label)}</dt>
                            <dd>${escapeEvidenceHtml(field?.value)}</dd>
                        </div>
                    `).join('')}
                </dl>
            </div>
        `;
    }

    const text = String(preview?.previewContent?.text || '').trim();
    const sectionLabel = String(preview?.previewContent?.sectionLabel || '').trim();
    const range = preview?.previewContent?.sourceRange;
    const shardContext = preview?.previewKind === 'SHARD_EXCERPT'
        ? `<div class="shardwright-interpretive-review-evidence-context">${escapeEvidenceHtml(
            [sectionLabel, Number.isInteger(range?.startIndex) && Number.isInteger(range?.endIndex)
                ? `Messages ${range.startIndex}-${range.endIndex}`
                : ''].filter(Boolean).join(' · '),
        )}</div>`
        : context;
    return `
        <div class="shardwright-interpretive-review-evidence-preview">
            <div class="shardwright-interpretive-review-evidence-preview-heading">${escapeEvidenceHtml(heading)}</div>
            ${shardContext}
            <blockquote class="shardwright-interpretive-review-evidence-excerpt">${escapeEvidenceHtml(text)}</blockquote>
        </div>
    `;
}

function renderFinding(finding, previewsByBasisRef) {
    const previews = (Array.isArray(finding?.basisRefs) ? finding.basisRefs : [])
        .map((basisRef) => previewsByBasisRef.get(String(basisRef || '').trim()))
        .filter(Boolean);
    return `
        <article class="shardwright-interpretive-review-card shardwright-interpretive-review-status-card shardwright-interpretive-review-evidence-finding">
            <div class="shardwright-interpretive-review-inline-meta">
                <span class="shardwright-interpretive-review-badge">${escapeEvidenceHtml(humanLabel(finding?.role || 'Evidence'))}</span>
                <span class="shardwright-interpretive-review-badge">${escapeEvidenceHtml(humanLabel(finding?.supportLevel || 'Unrated'))}</span>
            </div>
            <div class="shardwright-interpretive-review-summary-note">${escapeEvidenceHtml(
                String(finding?.summary || '').trim() || 'No readable finding summary recorded.',
            )}</div>
            <div class="shardwright-interpretive-review-evidence-source">${escapeEvidenceHtml(
                String(finding?.sourceLabel || '').trim() || 'Evidence source',
            )}</div>
            <div class="shardwright-interpretive-review-evidence-previews">
                ${previews.map((preview) => renderPreview(preview)).join('')}
            </div>
        </article>
    `;
}

export function renderInterpretiveEvidenceSection(interpretation) {
    const findings = Array.isArray(interpretation?.evidenceFindings) ? interpretation.evidenceFindings : [];
    const previews = Array.isArray(interpretation?.evidencePreviews) ? interpretation.evidencePreviews : [];
    const inspectabilityState = String(interpretation?.evidenceInspectabilityState || '').trim().toUpperCase();
    const isInspectable = inspectabilityState === 'VERIFIED' && findings.length > 0 && previews.length > 0;
    const previewsByBasisRef = new Map(previews.map((preview) => [String(preview?.basisRef || '').trim(), preview]));

    return `
        <div class="shardwright-interpretive-review-section shardwright-review-section shardwright-review-section--static">
            <div class="shardwright-review-section__header">
                <div class="shardwright-review-section__title">Evidence</div>
            </div>
            <div class="shardwright-review-section__body shardwright-interpretive-review-evidence-body">
                ${isInspectable
                    ? `<div class="shardwright-interpretive-review-list shardwright-interpretive-review-evidence-findings">
                        ${findings.map((finding) => renderFinding(finding, previewsByBasisRef)).join('')}
                    </div>`
                    : `<div class="shardwright-interpretive-review-card shardwright-interpretive-review-status-card shardwright-interpretive-review-evidence-blocker">
                        <strong>Evidence preview unavailable</strong>
                        <div>This older proposal cannot be reviewed from inspectable evidence.</div>
                        <div class="shardwright-hint">Next step: rebuild the proposal from its verified sources.</div>
                    </div>`}
            </div>
        </div>
    `;
}
