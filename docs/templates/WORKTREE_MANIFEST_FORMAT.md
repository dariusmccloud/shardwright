# Worktree Manifest Format

Deterministic fingerprint spec so two independent computations (implementer's declared baseline, reviewer's recomputation, runner's dispatch-time recheck) produce identical results for the same tree. Required by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §3a/§3b, tightened per Codex's correction 2. Inactive today — no runner implements this yet.

## Per-file entry

For each file path in scope:

- **path:** repository-root-relative, POSIX forward slashes, no leading `./`.
- **size:** exact byte count on disk.
- **content hash:** SHA-256, lowercase hex, over the file's exact bytes as stored — no line-ending normalization, no text decoding.
- **state:** `PRESENT` or `MISSING`. A declared in-scope path that does not exist is recorded as `MISSING`, never silently omitted — its absence is itself part of the fingerprint.

## Scope

- Only **declared in-scope paths** (from the slice declaration) are walked and hashed. Out-of-scope paths are not part of the manifest at all — this is what lets unrelated dirty/uncommitted work coexist without affecting the fingerprint (amendment §3a).
- An in-scope path that is a directory is expanded to every file under it, recursively, including untracked and git-ignored files, unless the slice declaration explicitly excludes a sub-path.
- `.git/` is never included even if nested under an in-scope path.

## Ordering and the manifest hash

1. Sort entries by `path`, ascending, as a plain byte-wise (UTF-8) string sort.
2. Build one line per entry: `path\tsize\tstate\tcontent_hash` (`content_hash` empty string when `state` is `MISSING`).
3. Join lines with `\n`, no trailing newline.
4. **Manifest hash** = SHA-256, lowercase hex, of that joined string.

The manifest hash is the single value compared for revalidation (amendment §3b: `reviewed fingerprint == dispatch fingerprint`). The full per-file list is retained alongside it so a mismatch can be diffed to find exactly which file changed.

## Who computes what (Codex's correction 3 and 9)

| Fingerprint | Computed by | Purpose |
|---|---|---|
| Declared baseline | Implementer, before starting | What the slice started from |
| Post-slice fingerprint | Implementer, after finishing | What the slice produced |
| **Reviewed fingerprint** | **Reviewer, independently recomputed** — never copied from the slice record | What review verifies |
| **Dispatch fingerprint** | **Runner, independently recomputed** immediately before starting the next slice | What revalidation checks against the reviewed fingerprint |

The reviewer and the runner each run the same deterministic algorithm above against the live tree; they do not trust a value written by someone else.

## Open issue: line endings (must be decided before the runner is built)

**Observed 2026-09-25:** this repository has `core.autocrlf=true` and no `.gitattributes`. Git stores LF but rewrites text files to CRLF in the working tree on checkout. "Hash exact bytes on disk" therefore gives different results for the same content depending on whether a file was freshly written (LF) or checked out (CRLF), and on which machine or git configuration computed it. At the time of observation, `docs/verdicts/LEDGER.md` hashed identically in the working tree and the index only because git had not yet rewritten it.

That breaks the determinism this spec exists to guarantee. Options:

1. **Hash git blob content** (`git hash-object` or the index copy) for tracked files: stable across machines, but untracked files have no blob and need a separate rule.
2. **Normalize line endings before hashing** (CRLF to LF for text files): stable, but requires a reliable text-versus-binary decision.
3. **Add a `.gitattributes`** that pins line endings (`* text=auto eol=lf`) so the working tree matches the repository: fixes the cause, but is a repository-wide change that touches every contributor's checkout, including Codex's in-progress work.

**Decided 2026-09-25: option 3**, recommended by Codex and applied as a policy file only. `.gitattributes` (policy v1: `* text=auto eol=lf`, `*.bundle binary`) was added without rewriting any file.

- **Repository content:** already consistent. All 821 tracked text files are stored as LF in the index, so the repository itself needed no renormalization.
- **Working tree: not yet normalized, on purpose.** At the time of adoption, 371 files on disk had CRLF and 26 had mixed endings, left over from earlier `autocrlf` checkouts. Five of them were files with uncommitted work in progress by another agent. Git converts each one to LF the next time it writes that file. A bulk re-checkout would rewrite about 400 files at once, so it is a separate, deliberate step that must not run while anyone has uncommitted work.
- **Until that step runs, byte-exact hashing is not reliable for CRLF files.** The runner must not be treated as trustworthy for fingerprinting until the working tree has been normalized. This is an activation prerequisite.
- **Normalization completed 2026-09-25**, after Codex committed all in-progress work and the worktree was clean. The 397 differing files were deleted and restored from the index, each only after checking that its difference was line endings alone (0 refused). `git checkout-index --force` was tried first and rewrote nothing, because git's stat cache treated the files as up to date. Proof: disk bytes and index blobs are identical for all 863 tracked files (397 differed before); `git ls-files --eol` shows no `w/crlf` or `w/mixed`; `git status` was clean before and after. No commit was needed for the files themselves, because the repository content did not change.
- **Remaining caveat:** `core.autocrlf=true` is still set in the system-wide Git config (`C:/Program Files/Git/etc/gitconfig`). The `.gitattributes` rule overrides it for tracked text on checkout, but an editor or agent can still write a new file with CRLF. That file then differs from its blob until its next checkout. Manifests stay consistent within one machine because the reviewer and the runner both hash the same disk bytes. Cross-machine comparison should recheck line endings first.

**Policy binding (Codex's safeguard):** the SHA-256 of `.gitattributes` is part of the fingerprint rules. Record it with every manifest. Changing the line-ending policy can change fingerprints even when no source content changed, so a manifest computed under one policy hash is not comparable to one computed under another. The runner must treat a policy-hash mismatch as `STALE_REVIEW`, not as a content change.
