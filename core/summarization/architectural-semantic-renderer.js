import { validateArchitecturalIntermediatePayload } from './architectural-intermediate-validator.js';
import { escapeArchitecturalFieldValue } from './architectural-record-parser.js';
import { buildArchitecturalKeyLines, ARCHITECTURAL_TERMINATOR } from './architectural-sharder-shell.js';

export const ARCHITECTURAL_SEMANTIC_RENDERER_VERSION = 1;
export const ARCHITECTURAL_SEMANTIC_RENDER_ERROR_CODE = 'ARCH_SEMANTIC_RENDER_INPUT_INVALID';

const WEIGHT_MARKERS = Object.freeze({
    1: '⚪',
    2: '🟢',
    3: '🟡',
    4: '🟠',
    5: '🔴',
});

const SECTION_ORDER = Object.freeze([
    ['TIMELINE', 'timeline'],
    ['DECISIONS', 'decisions'],
    ['EVENTS', 'events'],
    ['DEVELOPMENTS', 'developments'],
    ['DIALOGUE', 'dialogue'],
    ['THREADS', 'threads'],
    ['CURRENT', 'current'],
]);

export class ArchitecturalSemanticRenderError extends Error {
    constructor(validation) {
        super('Architectural semantic payload cannot be rendered because it does not satisfy the required schema.');
        this.name = 'ArchitecturalSemanticRenderError';
        this.code = ARCHITECTURAL_SEMANTIC_RENDER_ERROR_CODE;
        this.schemaId = validation.schemaId;
        this.diagnostics = validation.errors.map((diagnostic) => ({ ...diagnostic }));
    }
}

function inlineText(value) {
    return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function fieldValue(value) {
    return escapeArchitecturalFieldValue(inlineText(value));
}

function sourceHead(record) {
    return `[${record.sourceRef}] ${WEIGHT_MARKERS[record.weight]}`;
}

function field(name, value) {
    return `${name}: ${fieldValue(value)}`;
}

function renderTimeline(record) {
    return `${sourceHead(record)} ${inlineText(record.summary)}`;
}

function renderDecision(record) {
    const fields = [
        field('ID', record.id),
        field('TYPE', record.types.join(', ')),
        field('DECISION', record.decision),
    ];

    if (record.problem) fields.push(field('PROBLEM', record.problem));
    fields.push(field('WHY', record.why));
    if (record.ruledOut) fields.push(field('RULED-OUT', record.ruledOut));
    if (record.changed) fields.push(field('CHANGED', record.changed));
    fields.push(field('SCOPE', record.scope));
    fields.push(field('STATUS', record.status));
    if (record.anchor) fields.push(field('ANCHOR', record.anchor));
    if (record.supersedes) fields.push(field('SUPERSEDES', record.supersedes));
    if (record.supersededBy) fields.push(field('SUPERSEDED-BY', record.supersededBy));
    fields.push(field('EVIDENCE', record.evidence.join('; ')));

    return `${sourceHead(record)} ${fields.join(' | ')}`;
}

function renderEvent(record) {
    const parts = [`${sourceHead(record)} ${fieldValue(record.description)}`];
    for (const decisionId of record.decisionIds || []) {
        parts.push(field('DEC', decisionId));
    }
    return parts.join(' | ');
}

function renderDevelopment(record) {
    return `${sourceHead(record)} ${inlineText(record.summary)}`;
}

function renderDialogue(record) {
    const quote = fieldValue(record.quote);
    const speaker = fieldValue(record.speaker);
    const context = record.context ? ` | ${fieldValue(record.context)}` : '';
    return `${sourceHead(record)} "${quote}" --${speaker}${context}`;
}

function renderThread(record) {
    const parts = [
        `${sourceHead(record)} ${fieldValue(record.subject)}`,
        field('STATUS', record.status),
        field('INTRO', record.introRef),
        field('LAST', record.lastRef),
    ];
    if (record.notes) parts.push(fieldValue(record.notes));
    return parts.join(' | ');
}

function renderCurrent(record) {
    return [
        record.scope,
        record.currentState,
        record.activeFocus || '',
        record.pending || '',
        record.blockedBy || '',
        record.nextAction || '',
    ].map(fieldValue).join(' | ');
}

const SECTION_RENDERERS = Object.freeze({
    timeline: renderTimeline,
    decisions: renderDecision,
    events: renderEvent,
    developments: renderDevelopment,
    dialogue: renderDialogue,
    threads: renderThread,
    current: renderCurrent,
});

/**
 * Renders a schema-valid semantic payload into canonical architectural shard text.
 *
 * @param {object} payload
 * @returns {{ output: string, schemaId: string, rendererVersion: number }}
 */
export function renderArchitecturalSemanticPayload(payload) {
    const validation = validateArchitecturalIntermediatePayload(payload);
    if (!validation.ok) {
        throw new ArchitecturalSemanticRenderError(validation);
    }

    const lines = ['[KEY]'];
    lines.push(...buildArchitecturalKeyLines([
        `Sources: Messages ${payload.source.rangeStart}-${payload.source.rangeEnd}`,
    ]));
    lines.push('');

    for (const [header, sectionKey] of SECTION_ORDER) {
        lines.push(`[${header}]`);
        const renderer = SECTION_RENDERERS[sectionKey];
        for (const record of payload.sections[sectionKey]) {
            lines.push(renderer(record));
        }
        lines.push('');
    }

    lines.push(ARCHITECTURAL_TERMINATOR);
    return {
        output: lines.join('\n').trim(),
        schemaId: validation.schemaId,
        rendererVersion: ARCHITECTURAL_SEMANTIC_RENDERER_VERSION,
    };
}
