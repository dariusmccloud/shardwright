# Shardwright

**Conversational continuity that survives the context window.**

![SillyTavern Extension](https://img.shields.io/badge/SillyTavern-Extension-8865e0)
![Version](https://img.shields.io/badge/version-0.10.0-blue)

## Table of Contents
- [What Is It?](#what-is-it)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Overview](#configuration-overview)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

---

## What Is It?

Shardwright is a SillyTavern extension that keeps a model able to read what was actually said after it has fallen out of context. It captures complete transcripts without summarizing them, and retrieves the original source messages on demand, with the custody details (which source, which revision, which position) needed to verify them.

The failure it prevents is the gap between *knowing* you once told me something and being able to *read* what you said. Recovered context must be checkable against its source, not reconstructed from inference.

**Source and derived material.** The literal transcript is the authority. Summaries, shards, embeddings, and rankings are derived aids. They may accompany source material because they can supply useful associated context, but they never replace, rewrite, or vouch for it.

> Status: active development. The recall path is implemented and proven in stages; some parts described in the design documents are not built yet. See [Documentation](#documentation) for exactly what is and is not proven.

---

## Key Features

**Transcript Recall** (Shardwright-owned)
- Register a character or group chat as a transcript source
- Ingest complete messages, preserving hidden, archived, and deleted state
- Lexical search (SQLite FTS5) with explicit candidate limits
- Resolve matches to custody anchors and assemble bounded context windows
- Build a complete recall bundle, or refuse with a stated reason; it never truncates silently
- Ask SillyTavern to measure the prompt before anything is inserted

**Summaries and Shards** (inherited from Summary-Sharder)
- Prose summaries and structured 16-section Memory Shards with scene codes
- Review, edit, weight, and prune before saving; output to system messages or lorebook entries
- Visibility controls, chat manager, batch processing, per-feature APIs, themes, FAB

**Optional semantic shard retrieval** (external dependency)
- Vectorize shards through the Similharity plugin and a vector backend (Vectra, LanceDB, Qdrant, Milvus)

**Not built yet:** the Markdown dossier, and automatic recall injection beyond the proven staging path.

---

## Installation

### Via SillyTavern Extension Installer

1. Open SillyTavern
2. Go to **Extensions** (stacked boxes icon) → **Install Extension**
3. Paste: `https://github.com/dariusmccloud/shardwright`
4. Click **Install** and restart SillyTavern

### Manual

Clone into `data/<user-data>/extensions/third-party/shardwright` and restart SillyTavern.

### Server plugin

Transcript Recall needs the Shardwright server plugin in `tools/server-plugin/shardwright-memory/`. Its installation steps are not yet documented here.

---

## Quick Start

1. Open the **Extensions** panel and enable **Shardwright**
2. The FAB (floating action button) appears; drag it where you like
3. Summaries and shards: select a message range and run **Summarize** or **Run Sharder**, review, and save
4. Transcript Recall: see the [capability map](docs/MISSION_AND_CAPABILITY_MAP.md) for what is available today and how it is governed

Optional semantic shard retrieval needs the Similharity plugin. Its original repository is no longer available; the plan for hosting a preserved copy is in the [design review](docs/reviews/DESIGN_REVIEW_PILOT_MISSION_AND_CAPABILITY_INVENTORY.md). [BananaBread](https://github.com/prolix-oc/BananaBread) is a local embedding and reranking option.

---

## Configuration Overview

| Category | Key Settings |
|----------|-------------|
| **Transcript Recall** | Retrieval ceiling, optional safety headroom, candidate-family limit (default 50, maximum 256) |
| **Summaries and shards** | Auto/manual mode, interval, output target, review and weighting |
| **RAG (optional)** | Backend, scoring method, insert count, score threshold |
| **APIs** | Independent endpoint, temperature, and tokens per feature |
| **Cleanup and visibility** | HTML, code, URLs, reasoning blocks; per-range hide/collapse |

> The full reference for the inherited summary features is in [docs/FEATURES.md](docs/FEATURES.md), which predates the recall work.

---

## Documentation

- [Mission and capability map](docs/MISSION_AND_CAPABILITY_MAP.md): what the system does, who owns each part, and open decisions
- [Phase X Delivery Register](docs/PHASE_X_DELIVERY_REGISTER.md): what is defined, implemented, and proven
- [Contracts](docs/contracts/): the governing rules
- [Design reviews](docs/reviews/): advisory reviews of the retrieval stack and dependencies

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not appearing | Verify path is `data/<user-data>/extensions/third-party/shardwright/` and restart |
| Recall refuses with a stated reason | The refusal is deliberate: the system reports *why* (for example, no match, insufficient evidence, or capacity) rather than guessing |
| Semantic retrieval not injecting | Confirm the Similharity plugin, a backend, and an embedding server are configured per their own documentation |
| API errors | Each feature may use a different endpoint; check per-feature API config |

---

## Credits

- **Upstream lineage:** Shardwright is derived from [Promansis/summary-sharder](https://github.com/Promansis/summary-sharder), originally authored by Promansis. Shardwright is an independently named and maintained fork; this credit does not identify Promansis as its current author.
- The Memory Sharding concept is based on the Memory Shard prompt by [TheLonelyDevil](https://github.com/TheLonelyDevil9/), who also helps keep scope drift in check.
- [Coneja-Chibi](https://github.com/Coneja-Chibi): creator of VectHare and the Similharity plugin behind the optional semantic retrieval path.
- [Prolix](https://github.com/prolix-oc): BananaBread, a local embedding and reranking server.

## Author

- [Darius McCloud](https://github.com/dariusmccloud)

## License

[MIT](LICENSE)
