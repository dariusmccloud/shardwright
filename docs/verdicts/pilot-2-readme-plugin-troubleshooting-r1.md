---
slice_id: pilot-2-readme-plugin-troubleshooting
round: 1
verdict: PASS
subtype: null
reviewer: codex
reviewed_fingerprint: 76af948588b61701c862acf1ea0a11240d60dd60336eeb3a5a4305312376d0c5
policy_hash: e480bb4557ea2ff84c14c82c72f0b2f9f320e1a7b9516c795d216675c1f9f220
---

README.md has exactly one added Troubleshooting table row. It instructs readers to set `enableServerPlugins: true` in the host’s `config.yaml`, restart the server, and read the server console for the load error. No other README content changed.

Scope verified against the diff and prior pilot-1 round-2 verdict: the other three modified implementation/documentation files match the previously reviewed pilot-1 changes. Runner-owned ledger, verdict, prompt, and proof artifacts are excluded from scope findings.

The captured proof command, `node tools/pilot/proofs/pilot-2-readme-troubleshooting.mjs`, completed with exit code 0 and empty stderr. Its output matches the added row. The archived receipt’s SHA-256 matches the supplied output hash.

All three governing-contract hashes match the approved queue entry. AGENTS.md and the pilot declaration remain current for this slice; the proof script is intentionally unchanged.

No findings. Review complete; stopped.