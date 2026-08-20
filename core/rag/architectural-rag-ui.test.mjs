import assert from 'node:assert/strict';
import test from 'node:test';

import { getArchitecturalRagUiPosture } from './architectural-rag-ui.js';

test('Architectural profile receives truthful discovery-only UI posture', () => {
    const posture = getArchitecturalRagUiPosture({ sharderMode: true, sharderProfile: 'architectural' });
    assert.equal(posture.label, 'Architectural Discovery');
    assert.match(posture.description, /persisted, provenance-complete/u);
    assert.match(posture.description, /non-authoritative source evidence/u);
    assert.match(posture.warmArchive, /remains unavailable/u);
});

test('Narrative and Standard modes do not receive Architectural posture', () => {
    assert.equal(getArchitecturalRagUiPosture({ sharderMode: true, sharderProfile: 'narrative' }), null);
    assert.equal(getArchitecturalRagUiPosture({ sharderMode: false, sharderProfile: 'architectural' }), null);
});
