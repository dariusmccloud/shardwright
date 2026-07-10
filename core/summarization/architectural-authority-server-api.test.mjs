import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createInterpretiveProposalFromArchitecturalShard,
    getInterpretiveCandidate,
    healthcheckArchitecturalAuthorityServer,
    listInterpretiveDelegationPolicies,
    listInterpretiveReviews,
    recordInterpretiveSubjectDisposition,
    resetArchitecturalAuthorityServerApiState,
    submitInterpretiveReviewDisposition,
} from './architectural-authority-server-api.js';

test.afterEach(() => {
    resetArchitecturalAuthorityServerApiState();
    delete global.fetch;
});

test('listInterpretiveReviews builds filtered query string', async () => {
    const calls = [];
    global.fetch = async (url) => {
        calls.push(url);
        return {
            ok: true,
            async json() {
                return { reviews: [] };
            },
        };
    };

    const response = await listInterpretiveReviews({ status: 'PENDING', reviewerEntityId: 'entity_reviewer_01' });

    assert.deepEqual(response, { reviews: [] });
    assert.equal(
        calls[0],
        '/api/plugins/summary-sharder-memory/interpretive/reviews?status=PENDING&reviewerEntityId=entity_reviewer_01',
    );
});

test('listInterpretiveDelegationPolicies omits blank filters', async () => {
    const calls = [];
    global.fetch = async (url) => {
        calls.push(url);
        return {
            ok: true,
            async json() {
                return { policies: [] };
            },
        };
    };

    await listInterpretiveDelegationPolicies({ memoryScopeId: 'scope_demo', delegateEntityId: '   ' });

    assert.equal(
        calls[0],
        '/api/plugins/summary-sharder-memory/interpretive/delegation-policies?memoryScopeId=scope_demo',
    );
});

test('getInterpretiveCandidate requires an interpretation revision id', async () => {
    await assert.rejects(
        () => getInterpretiveCandidate(''),
        /interpretationRevisionId is required/u,
    );
});

test('createInterpretiveProposalFromArchitecturalShard posts to synthesis route', async () => {
    const calls = [];
    global.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') {
            return {
                ok: true,
                async json() {
                    return { token: 'disabled' };
                },
            };
        }
        return {
            ok: true,
            async json() {
                return {
                    ok: true,
                    interpretation: {
                        interpretationRevisionId: 'interprev_arch_saved_v1',
                    },
                };
            },
        };
    };

    const response = await createInterpretiveProposalFromArchitecturalShard({
        avatarUrl: 'jeep.png',
        chatLocator: 'Jeep - Test',
        shardMessageId: 'msg_alpha0000000000000000000000000',
        memoryScopeId: 'scope_arch_demo',
        memorySubjectId: 'character:jeep.png',
        createdByEntityId: 'user:Chris',
    });

    assert.equal(
        calls[1].url,
        '/api/plugins/summary-sharder-memory/interpretive/synthesis/from-architectural-shard',
    );
    assert.equal(calls[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].options.body), {
        avatarUrl: 'jeep.png',
        chatLocator: 'Jeep - Test',
        shardMessageId: 'msg_alpha0000000000000000000000000',
        memoryScopeId: 'scope_arch_demo',
        memorySubjectId: 'character:jeep.png',
        createdByEntityId: 'user:Chris',
    });
    assert.equal(response.interpretation.interpretationRevisionId, 'interprev_arch_saved_v1');
});

test('getInterpretiveCandidate fetches encoded revision path', async () => {
    const calls = [];
    global.fetch = async (url) => {
        calls.push(url);
        return {
            ok: true,
            async json() {
                return {
                    interpretation: {
                        interpretationRevisionId: 'interprev:test/value',
                        evidenceFindingState: 'AVAILABLE',
                        evidenceFindings: [
                            {
                                findingId: 'evfind_demo_01',
                                role: 'PRIMARY',
                                summary: 'Demo finding.',
                                basisRefs: ['msg_alpha0000000000000000000000000'],
                                sourceLabel: 'Demo source label',
                                domains: ['ROLE'],
                                supportLevel: 'SUPPORTED',
                            },
                        ],
                    },
                };
            },
        };
    };

    const response = await getInterpretiveCandidate('interprev:test/value');

    assert.equal(
        calls[0],
        '/api/plugins/summary-sharder-memory/interpretive/candidates/interprev%3Atest%2Fvalue',
    );
    assert.equal(response.interpretation.interpretationRevisionId, 'interprev:test/value');
    assert.equal(response.interpretation.evidenceFindingState, 'AVAILABLE');
    assert.equal(response.interpretation.evidenceFindings.length, 1);
});

test('submitInterpretiveReviewDisposition requires a review request id', async () => {
    await assert.rejects(
        () => submitInterpretiveReviewDisposition('', {}),
        /reviewRequestId is required/u,
    );
});

test('submitInterpretiveReviewDisposition posts encoded path with csrf header', async () => {
    const calls = [];
    global.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') {
            return {
                ok: true,
                async json() {
                    return { token: 'csrf-demo-token' };
                },
            };
        }
        return {
            ok: true,
            async json() {
                return { ok: true };
            },
        };
    };

    await submitInterpretiveReviewDisposition('review:req/01', {
        disposition: 'APPROVE',
    });

    assert.equal(calls[1].url, '/api/plugins/summary-sharder-memory/interpretive/reviews/review%3Areq%2F01/dispositions');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.headers['x-csrf-token'], 'csrf-demo-token');
    assert.deepEqual(JSON.parse(calls[1].options.body), { disposition: 'APPROVE' });
});

test('recordInterpretiveSubjectDisposition requires an interpretation revision id', async () => {
    await assert.rejects(
        () => recordInterpretiveSubjectDisposition('', {}),
        /interpretationRevisionId is required/u,
    );
});

test('recordInterpretiveSubjectDisposition posts encoded path', async () => {
    const calls = [];
    global.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') {
            return {
                ok: true,
                async json() {
                    return { token: 'disabled' };
                },
            };
        }
        return {
            ok: true,
            async json() {
                return { ok: true };
            },
        };
    };

    await recordInterpretiveSubjectDisposition('interprev:test/value', {
        state: 'GRANTED',
    });

    assert.equal(calls[1].url, '/api/plugins/summary-sharder-memory/interpretive/candidates/interprev%3Atest%2Fvalue/subject-disposition');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal('x-csrf-token' in calls[1].options.headers, false);
    assert.deepEqual(JSON.parse(calls[1].options.body), { state: 'GRANTED' });
});

test('csrf token fetch failures do not poison later requests', async () => {
    const calls = [];
    let csrfAttempts = 0;
    global.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        if (url === '/csrf-token') {
            csrfAttempts += 1;
            if (csrfAttempts === 1) {
                throw new Error('temporary csrf failure');
            }
            return {
                ok: true,
                async json() {
                    return { token: 'csrf-recovered-token' };
                },
            };
        }
        return {
            ok: true,
            async json() {
                return { ok: true };
            },
        };
    };

    await submitInterpretiveReviewDisposition('review:req/01', {
        disposition: 'APPROVE',
    });
    await submitInterpretiveReviewDisposition('review:req/02', {
        disposition: 'APPROVE',
    });

    assert.equal(calls[1].options.headers['x-csrf-token'], undefined);
    assert.equal(calls[3].options.headers['x-csrf-token'], 'csrf-recovered-token');
});

test('healthcheckArchitecturalAuthorityServer attaches an abortable signal', async () => {
    const calls = [];
    global.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            async json() {
                return { ok: true };
            },
        };
    };

    const response = await healthcheckArchitecturalAuthorityServer();

    assert.deepEqual(response, { ok: true });
    assert.equal(calls[0].url, '/api/plugins/summary-sharder-memory/health');
    assert.equal(typeof calls[0].options.signal?.aborted, 'boolean');
});
