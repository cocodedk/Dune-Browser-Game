// src/game-engine/sim/trace.ts
// The runner's command-trace shape (docs/PRD/game-completion/
// 07-balance-playtest-and-release.md "Runtime-faithful simulator": "Serialize
// a command trace, state snapshot, and summary metrics").
//
// Deliberately the exact same names and payload shapes runtime/
// CommandWiring.ts registers on the EventBus — a trace built from these
// tuples is "replayable on either side": EventBus.emit(name, payload)
// reaches the identical commandHandlers.ts function in the browser (via
// wireCommands()) that runner.ts just called directly. Only the subset of
// BusEvents a player actually commands is included — 'world:updated',
// 'dialogue:started', and the other outbound/render-only entries are engine
// output, not something this runner (or a human) issues.

import type { BusEvents } from '../../types'

export type RunnerCommandName =
  | 'player:talk' | 'player:speak_to' | 'player:travel' | 'player:choose'
  | 'game:speed' | 'game:pause'
  | 'player:pledge_sietch' | 'player:gift_sietch' | 'player:assign_crew'
  | 'player:buy_equipment' | 'player:issue_equipment' | 'player:assault_fort'
  | 'player:settle_tribute' | 'player:set_auto_ship'

/** One issued command, as `[eventName, payload]` — see module header. */
export type TraceEntry = { [K in RunnerCommandName]: [K, BusEvents[K]] }[RunnerCommandName]

/** The full ordered command trace for one run. */
export type CommandTrace = TraceEntry[]

/** One hashState() snapshot, taken after a dispatched command, a processed
 * day, a completed travel arrival, or an explicit tick — see runner.ts's
 * `steps` for how these line up with the trace and the day log.
 *
 * WP04 chunk W4b adds `parityHash` alongside the existing full-state `hash`:
 * the SAME log now carries both the save-format hash (unchanged) and the
 * cross-runtime parity hash (state/parityView.ts) at every point a caller
 * already snapshots one, so e2e/parity.spec.ts has one source of truth for
 * both which points to compare AND what the browser is expected to match —
 * see that spec's own header. */
export interface HashStep {
  /** 'command' after a dispatched command; 'day' after a processed day;
   * 'arrival' after a completed travel (advanceUntilArrival); 'tick' after
   * an explicit CampaignRunner.tick() call (e.g. walkQ1Debrief's one-frame
   * nudge for the debrief auto-open hook). */
  kind: 'command' | 'day' | 'arrival' | 'tick'
  /**
   * 'command': the trace index. 'day': the day number just processed —
   * multiply by TimeSystem.DAY_SECONDS for the absolute target seconds a
   * browser driver replays via debugSources.ts's `advanceTo`. 'arrival' and
   * 'tick': already the absolute `world.time` seconds reached — no
   * multiplication needed. Never more than one meaning at once, so a caller
   * need not guess which applies; see each producer's own doc (advance.ts,
   * runner.ts) for exactly which is which.
   */
  ref: number
  hash: string
  /** state/parityView.ts's parityHash(world) at the same instant `hash` was
   * taken — see this interface's own header. */
  parityHash: string
}
