// src/game-engine/state/parityView.ts
// The browser/headless parity hash (docs/PRD/game-completion/
// 07-balance-playtest-and-release.md "Determinism and parity"; progress.md
// Round 16, WP04 chunk W4b). A SEPARATE view from state/canonical.ts's own
// save-format hash — canonical serialization (and therefore every existing
// save/reload fixture) is UNCHANGED by this module. `parityView` starts from
// the same `toCanonicalState`/`canonicalize` pair canonical.ts already uses
// for save fidelity, then excludes two more fields that a save legitimately
// keeps but a cross-runtime hash cannot use, because they are provably not
// equal-if-and-only-if the campaigns are equal — they can differ under
// identical commands and identical days processed, purely from how the two
// runtimes schedule real frame time.
//
// `time`, `rng`, `speed`, `lastProcessedDay`, `flags`, and everything else in
// `WorldState` stay IN this view — 07's own protocol pins both sides to the
// exact same day/arrival quanta (sim/advance.ts's advanceToDay/
// advanceUntilArrival headless; debugSources.ts's advanceTo browser-side), so
// `time` matches BY CONSTRUCTION at every comparison point the harness takes
// one. Excluding it would hide a genuine divergence instead of dropping a
// presentation artifact — the opposite of what 07's hash clause asks for.
//
// EXCLUDED, with citation:
//
// - `events`: presentation only. Its only production readers are
//   ui/EventLog.tsx (renders the log) and ui/GoalOverlay.tsx (finds the
//   ending event for display text) — no rule reads world.events back (grep
//   confirms). `id` is `evt-N` from EventSystem.ts's `eventCounter`, a
//   MODULE-GLOBAL that is not itself part of WorldState/canonical state
//   (resynced from `world.events` on load, but its live value depends on
//   which frame nextEventId() happened to run on, not on campaign content).
//   `timestamp: world.time` is written at the exact instant a day-boundary
//   system calls pushEvent() — the same batched-vs-sequential day-processing
//   gap that makes wormSightings risky below. 07's own hash clause: "excludes
//   transient render state" — the event log is exactly that, a player-facing
//   notification feed, not rule-relevant campaign content.
//
// - `wormSightings`: written write-mostly by economy/harvestRun.ts
//   (`{ fieldId, atTime: world.time }` on a worm attack, then pruned by
//   world.time/DAY_SECONDS every day). Its only READERS on the whole tree are
//   game-render/planet/WormSign.ts (a pure fading-ring visual — planet-view
//   render state) and game-render/core/debugSources.ts's read-only `worms`
//   debug query. worms/wormsign.ts's own `fieldIsDangerous` is a pure
//   function that COULD gate a rule on sighting history, but has ZERO
//   production callers (grep confirms — only its own test file imports it):
//   nothing in game-engine/ reads wormSightings back to change an outcome,
//   so excluding it from the hash cannot mask a genuine rule divergence.
//   baseline/wp01-critic-verdict.md's own "Forward risk" (§5) and residue
//   row (§9.6) name the exact mechanism: dayRunner.ts pins every
//   intermediate day of a batched jump to precisely `day * DAY_SECONDS`,
//   while the browser's per-frame GameDriver loop lands the SAME day's
//   processing on `world.time` plus whatever small real-frame delta had
//   already accrued that frame. A worm roll that lands on that day bakes
//   the drifted value into `atTime` even though the day's own RULES (yield,
//   casualties, which field, the roll itself) processed identically on both
//   sides. Confirmed once more directly for W4b: debugSources.ts's
//   `advanceTo` (the browser's day-quantum driver) still runs through the
//   same `runtimeTick` → `GameLoop.update` → `dayRunner.runDay` path a real
//   frame would, so the LAST day of a batch still lands on `target -
//   world.time` exactly IF and only if nothing nudged `world.time` between
//   the debug call and the day's own processing — see debugSources.ts's own
//   `pauseForParity` doc for how that race is closed for every OTHER
//   canonical field; `atTime` is the one value even that fix cannot make
//   exact, because `sightingStrength` (worms/wormsign.ts) is deliberately a
//   continuous fade keyed to the literal moment of impact, not a
//   day-quantized flag.

import type { WorldState } from '../../types'
import { toCanonicalState, canonicalize } from './canonical'
import { fnv1a64 } from './hash'

/** `toCanonicalState(world)` minus the two fields named in this module's own
 * header — see there for why each is excluded. Sorted-key JSON via the same
 * `canonicalize` state/canonical.ts uses for the save format, so this stays
 * insertion-order-independent the same way. */
export function parityView(world: WorldState): unknown {
  const canonical = toCanonicalState(world)
  const { events: _events, wormSightings: _wormSightings, ...rest } = canonical
  void _events
  void _wormSightings
  return canonicalize(rest)
}

/** FNV-1a over `parityView(world)`'s JSON — same format as state/hash.ts's
 * `hashState`, over the narrower view. Two states differing ONLY in `events`
 * or `wormSightings` hash equal here even though `hashState` (the full save
 * hash) tells them apart — that is the whole point of a separate view. */
export function parityHash(world: WorldState): string {
  return fnv1a64(JSON.stringify(parityView(world))).toString(16).padStart(16, '0')
}
