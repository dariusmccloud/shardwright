# Shardwright UI Delivery Log

**Status:** Active progress log; non-governing; independent of Phase X.
**Purpose:** Track bounded slices of Shardwright's shipped extension UI (FAB, panels,
styling) that fall outside Phase X and generally don't meet the AGENTS.md Authority Gate
bar (no persistence, lifecycle, replay, or schema authority at stake) — so a full
governing contract isn't warranted, but slice-to-slice continuity still needs to survive
context resets and multiple Archivists.

## How To Read This Log

Same non-authority relationship as the Phase X Delivery Register: this log records what
shipped and what's next; it does not itself grant authority. A slice that turns out to
have real authority, persistence, or lifecycle stakes gets a proper governing contract
instead of a row here.

| State | Meaning |
| --- | --- |
| `PLANNED` | Scope is declared; no implementation exists yet. |
| `IN PROGRESS` | Implementation has started; proof not yet recorded. |
| `PROVEN` | The declared proof for this slice has passed and is recorded. |
| `DEFERRED` | Named and agreed as a future direction; not yet authorized as a bounded slice. |

## FAB Trigger Replacement

**Target shape (agreed 2026-08-28):** Replace the radial-wheel/crystal-shard FAB trigger
with a single docked, draggable "Shardwright" tab — pattern adapted from SillyBunny's
Companion handle (dock/drag/snap/persist mechanism, `.ica--tpanel-handle`-style CSS)
using Shardwright's own theme tokens. Shardwright's handle carries same-edge
collision-avoidance against other docked handles (e.g. SillyBunny's own Companion tab),
since Shardwright is the guest here — SillyBunny's native tool stays untouched. Clicking
the tab opens Shardwright's existing panel content in one sliding panel, replacing the
wheel-reveal step, and the panel stays vertically in-line with wherever the handle is
docked. Left/right are the only lawful docking edges; top and bottom are protected
(top overlaps SillyTavern/SillyBunny's `#top-bar`, bottom risks the chat input), and
left/right docking is clamped so it can never rest above the real, live-measured
`#top-bar` height. The four-tab tray content restructuring is a separate, later slice.

| Slice | State | Scope | Evidence / next movement |
| --- | --- | --- | --- |
| Reference-pattern extraction | `PROVEN` | Read SillyBunny's `companion-panel.js` (dock/drag/snap/persist mechanism) and its `.ica--tpanel-handle` CSS in full. | Grep-confirmed zero matches for collision/occupied/overlap logic in `companion-panel.js` — the pattern has no built-in cross-handle awareness. Pattern confirmed reusable; informed the slice below. |
| Trigger replacement (dock/drag/collision + panel wiring) | `IN PROGRESS` | New docked/draggable "Shardwright" trigger (`ui/fab/fab.js`, `ui/fab/fab-panels.js`, `ui/styles/fab.css.js`, `ui/styles/fab-panels.css.js`); left/right-only docking with a live-measured top-bar exclusion band; same-edge collision offset (Shardwright-side only, against `.ica--tpanel-handle[data-edge]`); panel repositions to stay in-line with the handle and pops out from the handle's inner edge (offset by the handle's own width) instead of sitting underneath it; click wired to existing panel content via tabs; removed dead wheel/crystal-shard code (`ui/fab/fab-animation.js` deleted, wheel-anchor/popover-collision logic removed from `fab-panels.js`); `settings.fab.position` changed from `{x,y}` to `{edge,fraction}`. Panel tab *content* untouched. | Live CDP proof against a running SillyBunny instance on 2026-08-28: (1) trigger renders docked right, clears `#top-bar` (40px) on load; (2) with a fake `.ica--tpanel-handle[data-edge="right"]` injected at the default center fraction, Shardwright's handle real-slides to a non-overlapping fraction on the same edge (verified via rect-overlap math, no visual overlap); (3) open/close toggle confirmed correct via instrumented event log and a 900ms continuous state sample (pointerdown→pointerup→click, `aria-expanded`/`is-open` flip correctly and hold stable — an earlier single-read flake looked like a lag but wasn't reproducible under sampling); (4) panel vertical position tracks the handle's position (centerDelta ≈ 0.008px after `applyDock`); (5) panel/handle no-overlap confirmed on both edges — right-edge panel's `right` inset equals the handle's left edge exactly, left-edge panel's `left` inset sampled stable at the handle's width (30px) with `right` cleared, sustained over 900ms. **Unresolved:** the drag *gesture* itself could not be exercised live — CDP's synthetic mouse and touch input both generate correctly-targeted `pointerdown` but the subsequent `pointermove`/`pointerup` do not honor `fabElement.setPointerCapture()` redirection (confirmed via window-capture-phase event logging: events fire with correct coordinates but target whatever element is literally under the cursor, not the captured element) — a CDP/automation limitation, not a code change, since the identical `setPointerCapture` pattern was already in the prior shipped implementation. The left-edge dock/position/overlap checks above were exercised by directly moving the real handle element to reach the same code path (`openPanels` → `setEdge`/`syncPanelPosition`) a real drag-drop would reach, bypassing only the broken gesture-simulation step itself. Manual test needed from a real pointer/touch device: see the Manual Drag Test Checklist below. Bottom message-input bar (`#form_sheld`) is now excluded from the usable dock/panel band the same way the top bar is (live-measured height, not a guess) — live CDP proof: with the handle forced low, the opened panel's bottom (769.97px) stays above the bar's top (790.5px) in a 914px viewport; before this fix the panel could overlap the input area, as reported from a live screenshot. Panel now pops out from the handle's inner edge (offset by the handle's own width) instead of sitting under it — live CDP proof on both edges (right: panel's `right` inset exactly equals the handle's width; left: panel's `left` inset stable at the handle's width over a 900ms sample, `right` cleared). **Real bug found and fixed (2026-08-28):** the asymmetric ~10px-class offset reported from a live screenshot traced to `setFabPosition()` setting `left`/`top`/`right`/`bottom` individually, which Chromium serializes into a shorthand `inset: ...` in the style attribute — that shorthand doesn't contain the literal substrings `"left"`/`"top"`, so the pre-JS fallback CSS rule (keyed off `:not([style*="left"]):not([style*="top"])`, including a `transform: translateY(-50%)`) kept matching and silently shifted the rendered position up by exactly half the handle's own height (confirmed via computed style: `matrix(1,0,0,1,0,-59.35)` where 59.35 = 118.7/2). Fixed by switching to an explicit `.shardwright-fab-positioned` class instead of attribute-substring matching. Also replaced the collision-avoidance margin (previously a fraction-of-band heuristic, which didn't correctly account for differing handle heights) with real pixel-space rect-gap resolution (`COLLISION_GAP_PX = 8`, computed against actual rects, not abstract fractions) — verified against a **real, now-active SillyBunny Companion handle** (`#ica--tracker-panel-handle`, genuinely sized ~101px, not the earlier zero-size/inactive state) with `handlePanelOverlap: false` and correct top/bottom-bar clearance on both left and right edges. Added a 🛡️ emoji to the trigger label per request. **CodeRabbit finding fixed (2026-08-28):** `initFab`'s conflict-free `resolveDockConflict` result was applied visually but never written back to `settings.fab.position`, and `handleViewportChange` (on window `resize`) read the stale stored fraction and reapplied it directly without re-running collision resolution — so a resize could silently reintroduce an overlap `initFab` had already avoided. Fixed: `initFab` now persists the resolved dock via `persistDockIfChanged()` (write-if-changed, avoids needless saves), and `handleViewportChange` now calls `resolveDockConflict()` again before `applyDock()`, persisting the re-resolved result through a 250ms-debounced `schedulePersistDock()`. Live CDP proof: with a fake handle placed exactly where Shardwright was docked, firing a `resize` event moved Shardwright's handle to a non-overlapping fraction (668.8px → 542.1px) instead of staying put, and the debounced write correctly updated `extensionSettings.shardwright.fab.position` to the re-resolved value. |
| Four-tab tray restructuring (Job Setup, Retrieval, Settings, Overview) | `DEFERRED` | Rename/reorganize panel tabs; audit FAB Settings/Management contents against SillyTavern's native Extensions menu to identify keepers vs. inherited cruft vs. candidates for a separate micro-extension. | Not authorized yet; follows trigger replacement. |

### Manual Drag Test Checklist (unresolved live-gesture proof)

CDP's synthetic pointer input can't exercise `fabElement.setPointerCapture()`-based
dragging (see the CDP limitation note above), so the following needs a real
pointer/touch device. All resting-position math (edge choice, fraction, collision,
top/bottom-bar clamp) is already machine-proven — this checklist is specifically about
the live drag *gesture* itself, in `ui/fab/fab.js`'s `setupDrag()`:

1. **Drag left/right, release mid-drag** — the "🛡️ Shardwright" tab should visually
   follow the cursor/finger the whole time.
2. **Release near the top of the screen** — it should snap to whichever side (left/right)
   is closer, landing just below `#top-bar`, never overlapping it, even releasing right
   at the very top edge.
3. **Try to drag it toward the very bottom** — it should never dock along the bottom, and
   should stay clear of the message-input area (`#form_sheld`).
4. **Release near the middle of either side** — it should land at roughly that height and
   stay there.
5. **Reload the page** — it should come back exactly where you left it (persisted
   `{edge, fraction}`).
6. **Click vs. drag** — a plain click/tap (no real movement) should just toggle the panel
   open, not start a drag.
7. **If a Companion-enabled agent is active in SillyBunny** (so its handle is visible) —
   dock Shardwright's tab near it on the same side and confirm they settle apart rather
   than stacking.
8. **Resize the browser window while docked near an edge where something else is docked
   too** — confirm Shardwright's handle re-settles without overlapping (this is the
   re-resolve-on-resize path fixed 2026-08-28; live-proven via a synthetic
   `resize` event + injected conflicting handle, not yet from an actual window resize).

If any of these misbehave, the likely fault line is the `pointermove` handler inside
`setupDrag()` — everything downstream of "here's the drop point" is already
machine-proven correct, so a bug here points at the live drag-follow itself.

## Other Named UI Directions (not yet scoped into a slice)

- **Colors/fonts/cascade cleanup:** agreed approach is per-rendered-surface (flatten each
  surface's CSS to its final visual, one surface at a time), not file-by-file or
  all-files-at-once. `ui/styles/variables.css.js` contains a ~96-declaration
  `!important` "third-party theme defense" block for the Moonlit Echoes Theme extension
  whose necessity is unconfirmed. Not yet bounded into a declared slice.
- **Language/vocabulary cleanup:** identified as a real problem ("everything reads like
  a mechanism built by another mechanism"), no scope declared yet.

## Update Protocol

Same as the Phase X Delivery Register: after each bounded slice, update only the row
that slice governed, record the proof or blocker, and don't promote a row without its
own proof.
