# Similharity Plugin: Preserved Copy and Provenance

**Purpose:** keep a verified, restorable copy of the Similharity SillyTavern server plugin under project control, because its original repository is no longer available.
**Recorded:** 2026-09-21
**Status:** Preservation record; non-governing. Not legal advice.

## What is preserved

| Item | Value |
|---|---|
| Component | Similharity, a SillyTavern server plugin (REST at `/api/plugins/similharity`) fronting vector backends |
| Original repository | `https://github.com/Coneja-Chibi/VectHare.git`, branch `Similharity-Plugin` |
| Original repository status | Unavailable. `git ls-remote` returned "Repository not found" on 2026-09-21 |
| Pinned commit | `d695fbb00c028566ccd20a2403a4ffefc6088086` |
| Commit | 2026-03-24, "Merge pull request #46 from Promansis/fix/windows-compatibility", committer Coneja |
| Version | `2.0.0` (`package.json`) |
| History | 60 commits, 2025-11-21 to 2026-03-24; first commit `98d886b` "Initial commit - VectHare plugin v1.0.0" |
| Preserved as | `similharity-plugin-d695fbb.bundle` (git bundle, 78,202 bytes, complete history of the branch) |

## Where this copy came from

The bundle was created from the plugin checkout that is actually installed and running:

- `D:\SillyTavern\plugins\similharity`
- `D:\SillyBunny\plugins\similharity`

Both are clones of the original remote at the same commit (`d695fbb`), with a clean working tree (no uncommitted changes).

## Verification performed (2026-09-21)

1. `git bundle verify` reports the bundle records a complete history.
2. A clone restored from the bundle has HEAD `d695fbb00c028566ccd20a2403a4ffefc6088086` and 60 commits.
3. The restored tracked source is byte-identical to the installed copy. The only difference is `package-lock.json`, present in the install but untracked in the repository (an install-time file, not part of the preserved history).
4. Commit `d695fbb` is present in the `Similharity-Plugin` branch of both surviving forks (Dogoo9/VectHare and KritBlade/VectFox), which independently corroborates the history.

## License and authorship (observed, not legal advice)

- `package.json` declares `"license": "MIT"`; the README has a `## License` section that says "MIT".
- **No LICENSE file exists** in the repository, and no copyright notice file.
- Commit authors in the preserved history: Darran Hall (24), Coneja-Chibi (14), Mykhailo (8), LeviTheWeasel (6), Coneja (3), Levi (3), Chi M (1), Damo (1). The `Damo` author name also appears on the first commit of upstream summary-sharder, and the merge that produced this HEAD came from a Promansis pull request, which is consistent with, but does not prove, that they are the same person.
- The project this bundle sits in is private and not distributed. The MIT declaration is recorded here so the copy is not separated from it.

## Runtime dependencies (from `package.json` at the pinned commit)

- `@lancedb/lancedb` `^0.5.0`
- `@zilliz/milvus2-sdk-node` `^2.6.5`
- Node `>=18.0.0`

Other backends in the plugin (`qdrant-backend.js`, Vectra) were not audited here for further dependencies. A full dependency audit remains open.

## Restore

```bash
git clone -b Similharity-Plugin vendor/similharity/similharity-plugin-d695fbb.bundle similharity
cd similharity
npm install
```

Do not modify the bundle. To pin a different version, add a new bundle file and a new entry in this document; do not overwrite this one.

## Compatibility check (static, not behavioral)

`check-endpoints.mjs` compares the routes a plugin checkout defines against the plugin paths Shardwright's RAG client code (`core/rag/`) references. Run: `node vendor/similharity/check-endpoints.mjs <path-to-checkout>`.

| Plugin version | Result |
|---|---|
| `d695fbb` (2.0.0, this pin) | Pass: every referenced route is defined (13 referenced, 18 defined) |
| Dogoo9/VectHare `Similharity-Plugin` (3.2.1, `8b370f1`) | Pass |
| KritBlade/VectFox `Similharity-Plugin` (3.3.4, `0d7e701`) | **Fail: `POST /rerank` is not defined.** That plugin has `/chunks/hybrid-query-rerank` instead, so Shardwright's reranker client in `similharity` mode would not find the route it calls |

This proves route names only. It does not prove request or response shapes, backend behavior, or reranking quality.

## Limits

- Behavior was not tested; no plugin was started for this record.
- The dependency audit is partial (see above).
- License status rests on declarations; the repository ships no LICENSE file.
- The update procedure for a newer plugin version is not yet defined beyond "add a new pinned bundle, re-run the endpoint check, then test behavior."
