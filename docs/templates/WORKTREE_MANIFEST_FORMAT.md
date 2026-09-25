# Worktree Manifest Format

Deterministic fingerprint spec so two independent computations (implementer's declared baseline, reviewer's recomputation, runner's dispatch-time recheck) produce identical results for the same tree. Required by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §3a/§3b, tightened per Codex's reviews. Inactive today: no runner implements this yet.

## Current line-ending state (2026-09-25)

The repository enforces LF through `.gitattributes` (policy v1: `* text=auto eol=lf`, `*.bundle binary`), and the working tree has been normalized: all 863 tracked files are byte-identical on disk and in the index. Byte-exact hashing below is therefore reliable for tracked files. How this state was reached is recorded under [History](#history-line-ending-policy-2026-09-25).

## The fingerprint

A **fingerprint** is the pair:

```text
(policy hash, manifest hash)
```

- **Policy hash:** SHA-256, lowercase hex, of the exact bytes of the repository-root `.gitattributes`, or the literal `NONE` if the file does not exist.
- **Manifest hash:** defined below.

Two fingerprints are equal only if **both** values are equal. Comparison outcomes:

| Policy hash | Manifest hash | Result |
|---|---|---|
| equal | equal | Match |
| equal | different | Content changed: revalidation fails and the slice returns to review (amendment §3b) |
| different | any | `STALE_REVIEW`: the rules changed, so the manifests are not comparable (amendment §6a) |

The policy hash is part of the comparison, not metadata reported alongside it (Codex's third review).

## Path rules

In-scope paths come from the slice declaration and are validated before anything is read:

- Each path is converted to POSIX form (backslashes become `/`) and resolved against the repository root.
- **Refused, and the whole manifest computation fails:** an absolute path, a drive-letter path (`C:...`), a UNC path (`\\server\...`), or any path whose resolved location lies outside the repository root (for example through `..`). A refused path is an error, never a silently skipped entry.
- Stored paths are repository-root-relative, POSIX forward slashes, no leading `./`, no trailing `/`.
- `.git/` is never included, even when nested under an in-scope path.

### Links

Symbolic links and Windows junctions are **never followed**, whether they point inside or outside the repository.

- A link is recorded as its own entry with state `LINK`. Its size is the byte length of its target string (UTF-8, exactly as returned by reading the link), and its content hash is the SHA-256 of that target string.
- A link to a directory is recorded as a `LINK` entry and its contents are not walked.

## Per-entry fields

- **path:** as above.
- **state:** `PRESENT`, `MISSING`, or `LINK`.
- **size:**
  - `PRESENT`: exact byte count on disk, in decimal with no leading zeros (`0` for an empty file).
  - `LINK`: byte length of the target string, in decimal.
  - `MISSING`: the literal `-`.
- **content hash:**
  - `PRESENT`: SHA-256, lowercase hex, of the file's exact bytes as stored. No line-ending normalization, no text decoding.
  - `LINK`: SHA-256 of the target string.
  - `MISSING`: the empty string.

A declared in-scope path that does not exist is recorded as `MISSING`, never omitted. Its absence is part of the fingerprint.

## Scope

- Only **declared in-scope paths** are walked and hashed. Out-of-scope paths are not part of the manifest at all, which lets unrelated uncommitted work coexist without affecting the fingerprint (amendment §3a).
- An in-scope directory expands to every file under it, recursively, including untracked and git-ignored files, unless the slice declaration explicitly excludes a sub-path. Links inside it follow the link rules above.

## Serialization and the manifest hash

1. Sort entries by `path`, ascending, as a plain byte-wise (UTF-8) comparison.
2. Build one line per entry: `path\tsize\tstate\tcontent_hash`.
3. Join lines with `\n`, no trailing newline.
4. **Manifest hash** = SHA-256, lowercase hex, of that joined string encoded as UTF-8.

Exact serialized examples (tab shown as `→`):

```text
docs/a.md→12→PRESENT→<64 hex chars>
docs/gone.md→-→MISSING→
docs/link→14→LINK→<64 hex chars>
```

The `MISSING` line ends with a tab followed by nothing. The full per-entry list is retained with the fingerprint so a mismatch can be diffed to find exactly which entry changed.

## Who computes what

| Fingerprint | Computed by | Purpose |
|---|---|---|
| Declared baseline | Implementer, before starting | What the slice started from |
| Post-slice fingerprint | Implementer, after finishing | What the slice produced |
| **Reviewed fingerprint** | **Reviewer, independently recomputed**, never copied from the slice record | What review verifies |
| **Dispatch fingerprint** | **Runner, independently recomputed** immediately before starting the next slice | What revalidation checks against the reviewed fingerprint |

The reviewer and the runner each run the same algorithm against the live tree. Neither trusts a value written by someone else.

## Remaining caveat

`core.autocrlf=true` is still set in the system-wide Git config (`C:/Program Files/Git/etc/gitconfig`). `.gitattributes` overrides it for tracked text on checkout, but an editor or agent can still write a new file with CRLF, and that file differs from its blob until its next checkout. Fingerprints stay consistent on one machine, because the reviewer and the runner hash the same disk bytes. Comparing fingerprints across machines should check line endings first.

## History: line-ending policy (2026-09-25)

*Historical record. The current state is at the top of this file.*

- **Problem found:** the repository had `core.autocrlf=true` and no `.gitattributes`. Git stored LF but wrote CRLF to the working tree on checkout, so hashing exact disk bytes could give different results for the same content.
- **Options considered:** hash git blobs instead of disk bytes; normalize line endings before hashing; or add a `.gitattributes` that pins LF.
- **Decision:** the `.gitattributes` option, recommended by Codex and accepted by Chris, was added as a policy file only. All 821 tracked text files were already LF in the index, so no committed content changed.
- **Deferred step:** 371 CRLF files and 26 mixed files remained on disk, five of them with another agent's uncommitted work. Normalization waited until the worktree was clean.
- **Normalization:** after Codex committed its work, the 397 differing files were deleted and restored from the index, each only after checking that its difference was line endings alone (0 refused). `git checkout-index --force` was tried first and rewrote nothing, because git's stat cache treated the files as up to date.
- **Proof:** disk bytes matched index blobs for 863/863 tracked files (397 differed before); `git ls-files --eol` showed no `w/crlf` or `w/mixed`; `git status` was clean before and after.
