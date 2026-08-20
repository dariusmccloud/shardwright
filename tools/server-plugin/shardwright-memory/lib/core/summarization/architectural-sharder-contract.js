export const ARCHITECTURAL_DECISION_TYPES = Object.freeze([
    'GOVERNANCE',
    'JURISDICTION',
    'HIERARCHY',
    'CORRECTION',
    'REPLACEMENT',
    'RENAME',
    'SCOPE',
    'DIAGNOSTIC',
    'IMPLEMENTATION',
    'STRATEGY',
    'COMMITMENT',
    'PROCEDURE',
]);

export const ARCHITECTURAL_DECISION_STATUSES = Object.freeze([
    'PROPOSED',
    'ACCEPTED',
    'SEALED',
    'SUPERSEDED',
]);

export const ARCHITECTURAL_THREAD_STATUSES = Object.freeze([
    'UNRESOLVED',
    'DEVELOPING',
    'ACTIVE',
    'RESOLVED',
]);

export const ARCHITECTURAL_SECTION_CAPS = Object.freeze({
    timeline: 15,
    decisions: 12,
    events: 12,
    developments: 10,
    dialogue: 8,
    threads: 8,
    current: 1,
});
