function displayField(value) {
    const text = String(value || '').trim();
    return text || 'unavailable';
}

export function formatEvidenceWithProvenance(entries) {
    return (entries || []).map((entry) => {
        if (!entry?.provenanceRecorded) {
            return `[Memory · source details unavailable]\n${entry.content}`;
        }
        return `[Memory · chat: ${displayField(entry.sourceChat)} · source date: ${displayField(entry.sourceDate)}]\n${entry.content}`;
    }).join('\n\n');
}
