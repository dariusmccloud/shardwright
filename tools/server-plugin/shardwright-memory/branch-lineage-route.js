import { getAuthenticatedUserRoot, getStoragePaths, handleError } from './core.js';
import { appendBranchLineageDecision, readBranchLineageLedger } from './branch-lineage-ledger.js';
import { projectTranscriptBranchSourceSequences } from './transcript-branch-source-sequences.js';
import { suggestHistoricalFork, suggestHistoricalForkSet } from './transcript-branch-lineage-suggestion.js';

export function registerBranchLineageRoute(router) {
    router.post('/transcript-recall/branches/suggest', async (request, response) => {
        try {
            const sourceLogicalIds = request.body?.sourceLogicalIds;
            if (!Array.isArray(sourceLogicalIds) || sourceLogicalIds.length < 2) {
                return response.send({ ok: true, state: 'REFUSED', reason: 'FORK_SUGGESTION_REQUIRES_TWO_SOURCES' });
            }
            const projected = projectTranscriptBranchSourceSequences(getStoragePaths(getAuthenticatedUserRoot(request)), sourceLogicalIds);
            if (projected.sources.length !== new Set(sourceLogicalIds).size) {
                return response.send({ ok: true, state: 'REFUSED', reason: 'FORK_SUGGESTION_SOURCE_SET_INCOMPLETE' });
            }
            const suggestion = sourceLogicalIds.length === 2
                ? suggestHistoricalFork({ sources: projected.sources })
                : suggestHistoricalForkSet({ sources: projected.sources });
            return response.send({ ok: true, ...suggestion });
        } catch (error) { return handleError(response, error); }
    });

    router.post('/transcript-recall/branches/lineage/list', async (request, response) => {
        try {
            const entries = readBranchLineageLedger(getStoragePaths(getAuthenticatedUserRoot(request)));
            return response.send({ ok: true, entries });
        } catch (error) { return handleError(response, error); }
    });

    router.post('/transcript-recall/branches/lineage/append', async (request, response) => {
        try {
            const result = appendBranchLineageDecision(
                getStoragePaths(getAuthenticatedUserRoot(request)),
                request.body?.decisionRecord ?? request.body,
            );
            return response.send({ ok: true, ...result });
        } catch (error) { return handleError(response, error); }
    });
}
