export class SourceCustodyError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

/**
 * Reads the attachment currently named by SillyTavern's Data Bank state without
 * allowing a browser cache entry to substitute an older, deleted attachment.
 * The logical source identity remains stable across saves; its current bytes must
 * nevertheless be accountable to the active attachment URL on every sync.
 */
export async function readCurrentAttachment(fetchImpl, url, headers = {}) {
    const sourceUrl = String(url || '').trim();
    if (!sourceUrl.startsWith('/user/files/')) {
        throw new SourceCustodyError('CONTINUITY_SOURCE_URL_INVALID', 'The selected memory attachment has no valid Data Bank file URL.');
    }

    let response;
    try {
        response = await fetchImpl(sourceUrl, {
            method: 'GET',
            cache: 'no-store',
            headers,
        });
    } catch {
        throw new SourceCustodyError('CONTINUITY_SOURCE_UNAVAILABLE', 'The selected memory attachment could not be verified from Data Bank storage.');
    }

    if (!response?.ok) {
        throw new SourceCustodyError('CONTINUITY_SOURCE_UNAVAILABLE', 'The selected memory attachment is no longer available from Data Bank storage.');
    }

    const content = await response.text();
    if (!String(content || '').trim()) {
        throw new SourceCustodyError('CONTINUITY_SOURCE_CONTENT_EMPTY', 'The selected memory attachment is empty and cannot supply continuity.');
    }
    return content;
}
