import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getLifecycleNavigationActions,
    getPublishedRevisionActionProjection,
    getRevisionOrigin,
} from './interpretive-review-revision-state.js';

test('root proposals project as root proposal origin', () => {
    const origin = getRevisionOrigin({
        interpretationRevisionId: 'interp_root_v1',
        revisionReason: 'INITIAL_PROPOSAL',
    });

    assert.equal(origin.code, 'ROOT_PROPOSAL');
    assert.equal(origin.label, 'Root proposal');
});

test('review-requested child revisions project as corrective child revisions', () => {
    const origin = getRevisionOrigin({
        interpretationRevisionId: 'interp_child_v2',
        parentRevisionId: 'interp_root_v1',
        revisionReason: 'REVIEW_REQUESTED_REVISION',
        createdFromDispositionId: 'reviewdisp_123',
    });

    assert.equal(origin.code, 'CORRECTIVE_CHILD_REVISION');
    assert.equal(origin.label, 'Corrective child revision');
});

test('children of published revisions project as post-publication successors', () => {
    const origin = getRevisionOrigin({
        interpretationRevisionId: 'interp_child_v2',
        parentRevisionId: 'interp_root_v1',
        revisionReason: 'SUBJECT_EDIT',
    }, {
        recordsForTarget: [
            {
                sourceInterpretationRevisionId: 'interp_root_v1',
                publicationState: 'PUBLISHED',
            },
        ],
    });

    assert.equal(origin.code, 'POST_PUBLICATION_SUCCESSOR');
    assert.equal(origin.label, 'Post-publication successor');
});

test('published revision action copy uses successor wording', () => {
    const projection = getPublishedRevisionActionProjection();

    assert.equal(projection.title, 'Create Successor Revision');
    assert.equal(projection.submitLabel, 'Create Successor Revision');
    assert.match(projection.description, /current published memory stays active/i);
});

test('lifecycle navigation offers current published memory when viewing older revision', () => {
    const actions = getLifecycleNavigationActions({
        interpretationRevisionId: 'interp_revision_v1',
        currentActiveRecord: {
            sourceInterpretationRevisionId: 'interp_revision_v3',
        },
    });

    assert.deepEqual(
        actions.map((action) => action.code),
        ['OPEN_CURRENT_PUBLISHED_MEMORY'],
    );
    assert.equal(actions[0].interpretationRevisionId, 'interp_revision_v3');
});

test('lifecycle navigation omits current published memory when already on active revision', () => {
    const actions = getLifecycleNavigationActions({
        interpretationRevisionId: 'interp_revision_v3',
        currentActiveRecord: {
            sourceInterpretationRevisionId: 'interp_revision_v3',
        },
    });

    assert.deepEqual(actions, []);
});

test('lifecycle navigation omits actions when there is no current published memory to open', () => {
    const actions = getLifecycleNavigationActions({
        interpretationRevisionId: 'interp_revision_v1',
    });

    assert.deepEqual(actions, []);
});
