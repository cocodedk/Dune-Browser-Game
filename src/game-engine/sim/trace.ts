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

/** One hashState() snapshot, taken after a dispatched command or a
 * processed day — see runner.ts's `steps` for how these line up with the
 * trace and the day log. */
export interface HashStep {
  /** 'command' after a dispatched command; 'day' after a processed day. */
  kind: 'command' | 'day'
  /** The command's trace index (kind 'command') or the day number just
   * processed (kind 'day') — never both, so a caller need not guess which
   * applies. */
  ref: number
  hash: string
}
