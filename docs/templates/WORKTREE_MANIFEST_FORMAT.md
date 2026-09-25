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
