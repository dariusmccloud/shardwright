import crypto from 'node:crypto';

const NON_EMPTY = (value, field) => {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be a non-empty string`);
    return value;
};

function sha256(value) {
    return `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function normalizeHeading(value) {
    return value.replace(/\s+/gu, ' ').trim();
}

function headingLabel(value) {
    return normalizeHeading(value).replace(/^\d+(?:\.\d+)*[.)]?\s+/u, '');
}

function unitId(documentLogicalId, headingPath) {
    return `compiled_context_unit_${crypto.createHash('sha256').update(`${documentLogicalId}\u0000${headingPath.join('\u0000')}`, 'utf8').digest('hex').slice(0, 32)}`;
}

function sourceLines(text) {
    return text.split(/\r?\n/u);
}

function headingAt(line) {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/u);
    return match ? Object.freeze({ level: match[1].length, text: normalizeHeading(match[2]) }) : null;
}

function buildUnits({ documentLogicalId, canonicalName, text, revisionHash }) {
    const lines = sourceLines(text);
    const headings = [];
    for (let index = 0; index < lines.length; index += 1) {
        const heading = headingAt(lines[index]);
        if (heading) headings.push({ ...heading, line: index });
    }
    const units = [];
    const stack = [];
    for (let index = 0; index < headings.length; index += 1) {
        const heading = headings[index];
        while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
        const headingPath = [...stack.map((item) => item.text), heading.text];
        const nextBoundary = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
        const endLineExclusive = nextBoundary ? nextBoundary.line : lines.length;
        units.push(Object.freeze({
            sourceUnitId: unitId(documentLogicalId, headingPath),
            documentLogicalId,
            canonicalName,
            headingPath: Object.freeze(headingPath),
            headingText: heading.text,
            parentSourceUnitId: stack.length ? unitId(documentLogicalId, stack.map((item) => item.text)) : null,
            startLine: heading.line + 1,
            endLine: endLineExclusive,
            sourceRevisionHash: revisionHash,
            exactText: lines.slice(heading.line, endLineExclusive).join('\n'),
        }));
        stack.push(heading);
    }
    return Object.freeze(units);
}

function extractReferences(document, registryNames) {
    const lines = sourceLines(document.text);
    const references = [];
    const knownNames = [...registryNames].sort((left, right) => right.length - left.length);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const unit = document.units.find((candidate) => candidate.startLine <= index + 1 && candidate.endLine >= index + 1) || null;
        const backticks = [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1].trim());
        for (const name of backticks) {
            if (knownNames.includes(name) || name === 'Rulebook' || /^EICF\s+-\s+/u.test(name)) {
                references.push(Object.freeze({ referenceText: name, sourceUnitId: unit?.sourceUnitId || null, line: index + 1 }));
            }
        }
        if (!backticks.includes('Rulebook') && /\bRulebook\b/u.test(line) && !/Documentation Rulebook/u.test(line)) {
            references.push(Object.freeze({ referenceText: 'Rulebook', sourceUnitId: unit?.sourceUnitId || null, line: index + 1 }));
        }
    }
    return Object.freeze(references);
}

export function parseCompiledContextDocument({ documentLogicalId, canonicalName, text }) {
    NON_EMPTY(documentLogicalId, 'documentLogicalId');
    NON_EMPTY(canonicalName, 'canonicalName');
    NON_EMPTY(text, 'text');
    const revisionHash = sha256(text);
    const document = { documentLogicalId, canonicalName, text, revisionHash, units: [] };
    document.units = buildUnits(document);
    return Object.freeze({
        documentLogicalId,
        canonicalName,
        revisionHash,
        units: document.units,
        references: Object.freeze([]),
        text,
    });
}

export function compileDocumentRegistry(documents) {
    if (!Array.isArray(documents) || documents.length === 0) throw new TypeError('At least one source document is required');
    const byName = new Map();
    const parsed = documents.map((input) => {
        const document = parseCompiledContextDocument(input);
        if (byName.has(document.canonicalName)) throw new Error(`Duplicate canonical document name: ${document.canonicalName}`);
        byName.set(document.canonicalName, document);
        return document;
    });
    const names = [...byName.keys()];
    const compiled = parsed.map((document) => Object.freeze({ ...document, references: extractReferences(document, names) }));
    return Object.freeze({ documents: Object.freeze(compiled), byName: new Map(compiled.map((document) => [document.canonicalName, document])) });
}

export function resolveDocumentReferences(registry, documentLogicalId) {
    const document = registry?.documents?.find((candidate) => candidate.documentLogicalId === documentLogicalId);
    if (!document) throw new Error(`Unknown document: ${documentLogicalId}`);
    return Object.freeze(document.references.map((reference) => {
        const target = registry.byName.get(reference.referenceText) || null;
        return Object.freeze({ ...reference, state: target ? 'RESOLVED' : 'UNRESOLVED', targetDocumentLogicalId: target?.documentLogicalId || null, targetCanonicalName: target?.canonicalName || null });
    }));
}

function findOrientationUnits(document) {
    const wanted = ['Governance Surfaces', 'Document Structure', 'Example Provenance'];
    return Object.freeze(document.units.filter((unit) => wanted.includes(headingLabel(unit.headingText))).map((unit) => unit.sourceUnitId));
}

export function buildCompiledContextPlan(registry, { taskText } = {}) {
    NON_EMPTY(taskText, 'taskText');
    if (!/\b(?:author|ideate|write|draft|create|generate|produce|review|edit|modify|document)\b/iu.test(taskText)) {
        return Object.freeze({ state: 'NOT_APPLICABLE', reason: 'DOCUMENT_AUTHORING_NOT_DETECTED' });
    }
    const guide = registry.documents.find((document) => /Documentation Style Guide$/u.test(document.canonicalName));
    if (!guide) return Object.freeze({ state: 'UNRESOLVED', reason: 'DOCUMENT_STYLE_GUIDE_UNAVAILABLE' });
    const references = resolveDocumentReferences(registry, guide.documentLogicalId);
    const resolved = references.filter((reference) => reference.state === 'RESOLVED');
    const unresolved = references.filter((reference) => reference.state === 'UNRESOLVED');
    const dependencyDocumentIds = Object.freeze(resolved.map((reference) => reference.targetDocumentLogicalId));
    return Object.freeze({
        state: 'PLAN',
        task: 'DOCUMENT_AUTHORING',
        orientationDocumentLogicalId: guide.documentLogicalId,
        orientationUnitIds: findOrientationUnits(guide),
        dependencies: Object.freeze(resolved),
        unresolvedReferences: Object.freeze(unresolved),
        dependencyDocumentIds,
        sourceRevisionHashes: Object.freeze([guide, ...dependencyDocumentIds.map((id) => registry.documents.find((document) => document.documentLogicalId === id))].filter(Boolean).map((document) => Object.freeze({ documentLogicalId: document.documentLogicalId, sourceRevisionHash: document.revisionHash }))),
    });
}
