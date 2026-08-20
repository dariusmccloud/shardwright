import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInterpretiveEvidenceSection } from './interpretive-evidence-view.js';

function inspectableInterpretation() {
    return {
        evidenceInspectabilityState: 'VERIFIED',
        evidenceFindings: [
            {
                role: 'PRIMARY',
                supportLevel: 'SUPPORTED',
                summary: 'Jeep holds architectural authority within the shared continuity design.',
                sourceLabel: 'Architectural shard decision',
                basisRefs: ['decision:authority', 'msg_alpha', 'decision:fields'],
            },
        ],
        evidencePreviews: [
            {
                basisRef: 'msg_alpha',
                sourceArtifactClass: 'MESSAGE',
                sourceLabel: 'Chris, source chat',
                speakerLabel: 'Chris',
                contextLabel: 'Architecture discussion',
                previewKind: 'MESSAGE_EXCERPT',
                previewContent: { text: 'Jeep should govern continuity architecture.' },
                previewContentHash: 'sha256:hidden-message-hash',
            },
            {
                basisRef: 'decision:fields',
                sourceArtifactClass: 'STRUCTURAL_RECORD',
                sourceLabel: 'Authority decision record',
                previewKind: 'STRUCTURAL_FIELDS',
                previewContent: {
                    fields: [
                        { label: 'Decision', value: 'Jeep governs continuity architecture.' },
                        { label: 'Status', value: 'Accepted' },
                    ],
                },
                sourceRevisionIdentity: { recordHash: 'sha256:hidden-record-hash' },
            },
            {
                basisRef: 'decision:authority',
                sourceArtifactClass: 'SAVED_SHARD',
                sourceLabel: 'Architectural shard at message 291',
                previewKind: 'SHARD_EXCERPT',
                previewContent: {
                    text: 'DECISION: Jeep holds architectural authority.',
                    sectionLabel: 'DECISIONS',
                    sourceRange: { startIndex: 270, endIndex: 290 },
                },
                sourceRevisionIdentity: { shardArtifactId: 'shard_hidden', shardRevisionHash: 'sha256:hidden-shard-hash' },
            },
        ],
    };
}

test('ordinary Review renders human evidence for message, structural, and saved-shard previews', () => {
    const html = renderInterpretiveEvidenceSection(inspectableInterpretation());

    assert.match(html, /Jeep holds architectural authority within the shared continuity design\./u);
    assert.match(html, /Jeep should govern continuity architecture\./u);
    assert.match(html, /Decision/u);
    assert.match(html, /Jeep governs continuity architecture\./u);
    assert.match(html, /DECISIONS/u);
    assert.match(html, /Messages 270-290/u);
    assert.match(html, /DECISION: Jeep holds architectural authority\./u);
    assert.doesNotMatch(html, /decision:authority|decision:fields|msg_alpha/u);
    assert.doesNotMatch(html, /sha256:|shard_hidden|Basis refs|Technical Details/u);
});

test('ordinary Review truthfully blocks legacy evidence without exposing machine bindings', () => {
    const html = renderInterpretiveEvidenceSection({
        evidenceInspectabilityState: 'LEGACY_UNAVAILABLE',
        evidenceFindings: [{ summary: 'Legacy finding', basisRefs: ['msg_hidden'] }],
        evidencePreviews: [],
    });

    assert.match(html, /Evidence preview unavailable/u);
    assert.match(html, /cannot be reviewed from inspectable evidence/u);
    assert.match(html, /Next step: rebuild the proposal from its verified sources\./u);
    assert.doesNotMatch(html, /msg_hidden|Technical Details/u);
});

test('ordinary Review escapes persisted evidence content', () => {
    const interpretation = inspectableInterpretation();
    interpretation.evidencePreviews[0].previewContent.text = '<script>alert("evidence")</script>';
    const html = renderInterpretiveEvidenceSection(interpretation);

    assert.doesNotMatch(html, /<script>/u);
    assert.match(html, /&lt;script&gt;alert\(&quot;evidence&quot;\)&lt;\/script&gt;/u);
});
