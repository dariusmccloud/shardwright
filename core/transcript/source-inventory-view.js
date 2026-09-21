const STATUS_LABELS = Object.freeze({
    NOT_SCANNED: 'Not scanned',
    SCANNED_NO_RELEVANT_SOURCE: 'Scanned; no relevant source',
    SCANNED_WITH_SOURCE: 'Scanned with source',
    SUSPENDED_INTENTIONALLY: 'Suspended intentionally',
    SCAN_FAILED: 'Scan failed',
});

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function sourceStatus(source) {
    return STATUS_LABELS[source?.coverageState] || source?.coverageState || 'Unknown';
}

export function renderSourceInventoryView(result, characterInstanceId) {
    if (!result || result.state === 'REFUSED') {
        return '<div class="shardwright-source-inventory"><h3>Source inventory</h3><p>Source inventory could not be loaded.</p><p class="shardwright-discovery-status">No source state was changed.</p></div>';
    }
    const entries = (result.entries || []).filter((entry) => entry?.characterInstanceId === characterInstanceId);
    if (!entries.length) {
        return '<div class="shardwright-source-inventory"><h3>Source inventory</h3><p>No registered sources are associated with the active character.</p><p class="shardwright-discovery-status">This view is read-only; unregistered files were not scanned.</p></div>';
    }
    const rows = entries.map((entry) => `<li><strong>${escapeHtml(entry.sourceClass || 'UNKNOWN')}</strong> — ${escapeHtml(entry.hostLocator || entry.sourceLogicalId || 'Unnamed source')}<br><span class="shardwright-discovery-status">${escapeHtml(sourceStatus(entry))}</span>${entry.historicalParticipantBasis ? '<br><span class="shardwright-discovery-status">Participant basis recorded</span>' : ''}</li>`).join('');
    return `<div class="shardwright-source-inventory"><h3>Source inventory</h3><p>Found ${entries.length} registered source${entries.length === 1 ? '' : 's'} for this character.</p><ol>${rows}</ol><p class="shardwright-discovery-status">Read-only inventory. No source was registered, observed, ingested, or changed.</p></div>`;
}
