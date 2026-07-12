import { parseArchitecturalExtractionResponse } from './architectural-sharder-format.js';
import {
    inspectCanonicalArchitecturalOutput,
    validateArchitecturalShellSections,
} from './architectural-sharder-shell.js';
import { renderArchitecturalSemanticPayload } from './architectural-semantic-renderer.js';
import { validateArchitecturalStructuredSections } from './architectural-structured-validator.js';
import { ARCHITECTURAL_PROFILE, getSharderSectionRegistry } from './sharder-section-registry.js';

export const ARCHITECTURAL_SEMANTIC_PRE_SAVE_ERROR_CODE = 'ARCH_SEMANTIC_PRE_SAVE_INVALID';

const SOURCE_REF_PATTERN = /^S(\d+):(\d+)$/u;

export class ArchitecturalSemanticPreSaveError extends Error {
    constructor(phase, diagnostics) {
        super(phase === 'reference'
            ? 'Architectural semantic payload contains unproven source references.'
            : 'Rendered architectural shard failed canonical validation.');
        this.name = 'ArchitecturalSemanticPreSaveError';
        this.code = ARCHITECTURAL_SEMANTIC_PRE_SAVE_ERROR_CODE;
        this.phase = phase;
        this.diagnostics = diagnostics.map((diagnostic) => ({ ...diagnostic }));
    }
}

function sourceRefDiagnostic(sectionKey, itemIndex, field, invalidValue, rangeStart, rangeEnd) {
    return {
        level: 'error',
        code: 'ARCH_SEMANTIC_SOURCE_REF_OUT_OF_RANGE',
        message: `Source reference ${invalidValue} falls outside Messages ${rangeStart}-${rangeEnd}.`,
        sectionKey,
        itemIndex,
        field,
        invalidValue,
        allowedRange: { start: rangeStart, end: rangeEnd },
    };
}

function validateSourceRef(value, location, rangeStart, rangeEnd, diagnostics) {
    const match = String(value || '').match(SOURCE_REF_PATTERN);
    if (!match) {
        return;
    }
    const messageIndex = Number(match[1]);
    if (messageIndex < rangeStart || messageIndex > rangeEnd) {
        diagnostics.push(sourceRefDiagnostic(
            location.sectionKey,
            location.itemIndex,
            location.field,
            value,
            rangeStart,
            rangeEnd,
        ));
    }
}

export function validateArchitecturalSemanticReferences(payload) {
    const diagnostics = [];
    const rangeStart = Number(payload?.source?.rangeStart);
    const rangeEnd = Number(payload?.source?.rangeEnd);

    if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd) || rangeEnd < rangeStart) {
        diagnostics.push({
            level: 'error',
            code: 'ARCH_SEMANTIC_SOURCE_RANGE_INVALID',
            message: 'Architectural source range must have an integer end at or after its start.',
            sectionKey: 'source',
            field: 'rangeEnd',
            rangeStart: payload?.source?.rangeStart ?? null,
            rangeEnd: payload?.source?.rangeEnd ?? null,
        });
        return diagnostics;
    }

    for (const [sectionKey, records] of Object.entries(payload?.sections || {})) {
        if (!Array.isArray(records)) continue;
        records.forEach((record, itemIndex) => {
            validateSourceRef(record?.sourceRef, { sectionKey, itemIndex, field: 'sourceRef' }, rangeStart, rangeEnd, diagnostics);

            if (sectionKey === 'threads') {
                validateSourceRef(record?.introRef, { sectionKey, itemIndex, field: 'introRef' }, rangeStart, rangeEnd, diagnostics);
                validateSourceRef(record?.lastRef, { sectionKey, itemIndex, field: 'lastRef' }, rangeStart, rangeEnd, diagnostics);
            }

            if (sectionKey === 'decisions') {
                (record?.evidence || []).forEach((evidence, evidenceIndex) => {
                    if (SOURCE_REF_PATTERN.test(String(evidence || ''))) {
                        validateSourceRef(
                            evidence,
                            { sectionKey, itemIndex, field: `evidence[${evidenceIndex}]` },
                            rangeStart,
                            rangeEnd,
                            diagnostics,
                        );
                    }
                });
            }
        });
    }

    return diagnostics;
}

function inspectOutputDiagnostics(output, registry) {
    const inspection = inspectCanonicalArchitecturalOutput(output, registry);
    const diagnostics = [];

    if (!inspection.beginsWithKey) {
        diagnostics.push({ level: 'error', code: 'ARCH_CANONICAL_KEY_MISSING', message: 'Canonical output must begin with [KEY].' });
    }
    if (inspection.unsupportedHeaders.length > 0) {
        diagnostics.push({
            level: 'error',
            code: 'ARCH_CANONICAL_SECTION_UNSUPPORTED',
            message: `Canonical output contains unsupported sections: ${inspection.unsupportedHeaders.join(', ')}.`,
            invalidValue: [...inspection.unsupportedHeaders],
        });
    }
    if (inspection.currentHeaderCount !== 1) {
        diagnostics.push({ level: 'error', code: 'ARCH_CANONICAL_CURRENT_HEADER_INVALID', message: 'Canonical output must contain exactly one [CURRENT] header.' });
    }
    if (inspection.terminatorCount !== 1 || !inspection.endsWithTerminator || inspection.hasTrailingContent) {
        diagnostics.push({ level: 'error', code: 'ARCH_CANONICAL_TERMINATOR_INVALID', message: 'Canonical output must end with exactly one standalone ===END=== terminator.' });
    }

    return diagnostics;
}

export function validateRenderedArchitecturalShard(output, options = {}) {
    const registry = getSharderSectionRegistry(ARCHITECTURAL_PROFILE);
    const sections = parseArchitecturalExtractionResponse(output, registry);
    const diagnostics = [
        ...inspectOutputDiagnostics(output, registry),
        ...validateArchitecturalShellSections(sections),
        ...validateArchitecturalStructuredSections(sections, {
            baselineDecisions: options.baselineDecisions || {},
        }),
    ].filter((diagnostic) => !(
        options.allowEmptyCurrent === true
        && diagnostic.code === 'ARCH_CURRENT_EMPTY'
    ));

    return {
        ok: diagnostics.every((diagnostic) => diagnostic.level !== 'error'),
        diagnostics,
        sections,
    };
}

/**
 * Proves semantic references and final canonical legality before persistence.
 *
 * @param {object} payload
 * @param {{ baselineDecisions?: object }} options
 * @returns {{ output: string, schemaId: string, rendererVersion: number, diagnostics: object[] }}
 */
export function prepareArchitecturalSemanticShardForSave(payload, options = {}) {
    const referenceDiagnostics = validateArchitecturalSemanticReferences(payload);
    if (referenceDiagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new ArchitecturalSemanticPreSaveError('reference', referenceDiagnostics);
    }

    const rendered = renderArchitecturalSemanticPayload(payload);
    const finalValidation = validateRenderedArchitecturalShard(rendered.output, {
        baselineDecisions: options.baselineDecisions,
        allowEmptyCurrent: payload.sections.current.length === 0,
    });
    if (!finalValidation.ok) {
        throw new ArchitecturalSemanticPreSaveError('canonical', finalValidation.diagnostics);
    }

    return {
        ...rendered,
        diagnostics: finalValidation.diagnostics,
    };
}
