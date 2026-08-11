// src/game-engine/acts/openingObjectives.ts
// The act 1 opening's objective-record seam (docs/PRD/game-completion/
// 03-opening-experience.md "Objective presentation";
// 02-runtime-consolidation.md "Campaign status": "The current act exposes
// two or three objective records with stable IDs, progress values, and
// completion state. UI wording is authored outside the engine query.")
//
// Chunk W3a built ONLY the opening's seven-step chain; WP05 extends this
// module for the rest of Act 1 (progress.md Round 11: "W3a builds the
// minimal act1 objective-record seam and WP05 extends it — no
// parallel-build"). Every completion check here is a PURE read of `world` —
// no mutation lives in this file. `receive_briefing`/`read_ledger` are
// flag-driven, written by chunk W3c's two dedicated dialogue trees
// (data/dialogue/opening-briefing.ts, opening-ledger.ts) via the existing
// `setFlags` dialogue effect — no engine write outside DialogueSystem.ts's
// applyEffect. The other four steps already have a live production trigger
// today — each writes its own sticky flag at the exact command that
// completes it; see each constant's doc below for why a flag, not a live
// re-derivation of existing state.
//
// targetHint discriminates two kinds a UI Show action can act on today:
// `location` is a village/sietch id the existing pick/selection store can
// select (EventBus 'village:selected', already how a canvas click routes —
// see ui/store.ts); `panel` is a command-column panel key with no
// navigation seam yet, so the UI renders it as plain text (W3f wires real
// panel-scrolling/highlighting later).

import type { WorldState } from '../../types'
import { totalDue } from '../quota/quota'

export type ObjectiveId =
  | 'act1.receive_briefing'
  | 'act1.read_ledger'
  | 'act1.travel_red_wall'
  | 'act1.earn_trust'
  | 'act1.order_first_harvest'
  | 'act1.prepare_q1'
  | 'opening.complete'

/** Set by data/dialogue/opening-briefing.ts's closing choices (Duke Leto). */
export const BRIEFING_COMPLETE_FLAG = 'briefing.complete'
/** Set by data/dialogue/opening-ledger.ts's closing choice (Thufir Hawat). */
export const LEDGER_READ_FLAG = 'ledger.read'
/** Written once, at arrival — see TravelSystem.ts's checkTravelArrival. */
export const TRAVEL_RED_WALL_FLAG = 'travel.red_wall_sietch'
/**
 * Written once, at the pledge command (commands/pledgeCommand.ts).
 * Deliberately NOT derived from `world.flags['pledged.count']`
 * (SietchSystem.ts): that counter is recomputed live from `world.sietches`
 * every day (economy/sietchLoyaltyRun.ts) and falls back toward 0 if every
 * pledge is later lost to neglect. A historical opening beat must stay
 * complete even if a sietch is won back and lost again much later in the
 * campaign — this seam outlives the 12-day opening window.
 */
export const EARNED_TRUST_FLAG = 'trust.earned'
/**
 * Beat 4's tree (data/dialogue/opening-redwall-trust.ts) sets these three.
 * ACKNOWLEDGED is the shared completion gate (DialogueSystem.ts's
 * canCloseDialogue and TravelSystem.ts's re-open guard both read only this
 * one); SOLIDARITY/TRANSACTION are mutually exclusive per-branch flags
 * recorded for WP05 content to acknowledge later — this chunk sets them and
 * stops. See that tree's own header for the full reasoning.
 */
export const REDWALL_TRUST_ACKNOWLEDGED_FLAG = 'redwall.trust.acknowledged'
export const REDWALL_TRUST_SOLIDARITY_FLAG = 'redwall.trust.solidarity'
export const REDWALL_TRUST_TRANSACTION_FLAG = 'redwall.trust.transaction'
/** Written once, at the assign-crew command (commands/assignCrewCommand.ts). */
export const FIRST_HARVEST_FLAG = 'crew.harvest_assigned'
/**
 * Written once, at the settle command (commands/settleCommand.ts), when the
 * settled decision was cycle 0 (Q1) — any payment band, not only full: 03
 * "Beat 7" closes the opening on Q1's settlement, not on its result.
 */
export const OPENING_COMPLETE_FLAG = 'opening.complete'

/** A location id (village/sietch) the selection store can pick. */
export type LocationTargetHint = { kind: 'location'; id: string }
/** A command-column panel key with no navigation seam yet — render as text. */
export type PanelTargetHint = { kind: 'panel'; key: string }
export type ObjectiveTargetHint = LocationTargetHint | PanelTargetHint

export interface ObjectiveProgress {
  current: number
  target: number
}

export interface ObjectiveRecord {
  id: ObjectiveId
  complete: boolean
  /** null when numeric progress is not meaningful for this step (03). */
  progress: ObjectiveProgress | null
  targetHint: ObjectiveTargetHint
}

const CHAIN: readonly ObjectiveId[] = [
  'act1.receive_briefing',
  'act1.read_ledger',
  'act1.travel_red_wall',
  'act1.earn_trust',
  'act1.order_first_harvest',
  'act1.prepare_q1',
  'opening.complete',
]

function flagIsTrue(world: WorldState, key: string): boolean {
  return world.flags[key] === true
}

/** quota.cycle (economy/settlementRun.ts) advances unconditionally on every
 * settlement, any band — so `>= 1` means "Q1 has been settled" regardless
 * of full/partial/short, matching OPENING_COMPLETE_FLAG's own condition. */
function quotaCycle(world: WorldState): number {
  return typeof world.flags['quota.cycle'] === 'number' ? (world.flags['quota.cycle'] as number) : 0
}

function isComplete(id: ObjectiveId, world: WorldState): boolean {
  switch (id) {
    case 'act1.receive_briefing': return flagIsTrue(world, BRIEFING_COMPLETE_FLAG)
    case 'act1.read_ledger': return flagIsTrue(world, LEDGER_READ_FLAG)
    case 'act1.travel_red_wall': return flagIsTrue(world, TRAVEL_RED_WALL_FLAG)
    case 'act1.earn_trust': return flagIsTrue(world, EARNED_TRUST_FLAG)
    case 'act1.order_first_harvest': return flagIsTrue(world, FIRST_HARVEST_FLAG)
    case 'act1.prepare_q1': return quotaCycle(world) >= 1
    case 'opening.complete': return flagIsTrue(world, OPENING_COMPLETE_FLAG)
  }
}

function targetHint(id: ObjectiveId): ObjectiveTargetHint {
  switch (id) {
    case 'act1.receive_briefing': return { kind: 'location', id: 'arrakeen' }
    case 'act1.read_ledger': return { kind: 'panel', key: 'quota-ledger' }
    case 'act1.travel_red_wall': return { kind: 'location', id: 'red_wall_sietch' }
    case 'act1.earn_trust': return { kind: 'location', id: 'red_wall_sietch' }
    case 'act1.order_first_harvest': return { kind: 'panel', key: 'crew-panel' }
    case 'act1.prepare_q1': return { kind: 'panel', key: 'quota-ledger' }
    case 'opening.complete': return { kind: 'panel', key: 'quota-ledger' }
  }
}

/** Only prepare_q1 has a numerically meaningful progress today (03: "where
 * numeric progress is meaningful") — spice in hand against the full amount
 * due, the same figures the tribute ledger already shows. */
function progressFor(id: ObjectiveId, world: WorldState): ObjectiveProgress | null {
  if (id !== 'act1.prepare_q1') return null
  return { current: world.player.spice, target: totalDue(world.quota) }
}

/** The full seven-step opening chain, in order, each with its live completion state. */
export function openingObjectiveChain(world: WorldState): ObjectiveRecord[] {
  return CHAIN.map(id => ({
    id, complete: isComplete(id, world), progress: progressFor(id, world), targetHint: targetHint(id),
  }))
}

/**
 * The one active objective — the chain's first incomplete step, or null once
 * every step (including `opening.complete`) is done. A fresh campaign has no
 * flags set at all, so this derives to `act1.receive_briefing` with no seed
 * write required (03 "Starting contract": "Current objective |
 * act1.receive_briefing").
 */
export function activeOpeningObjective(world: WorldState): ObjectiveRecord | null {
  return openingObjectiveChain(world).find(r => !r.complete) ?? null
}

/** Completed steps, in chain order — the UI's compact history. */
export function completedOpeningObjectives(world: WorldState): ObjectiveRecord[] {
  return openingObjectiveChain(world).filter(r => r.complete)
}

/**
 * Whether the tribute ledger (QuotaLedger.tsx) should be mounted (03
 * "Progressive disclosure": "Tribute ledger — Thufir explains the first
 * demand" — read as the ledger conversation COMPLETING).
 *
 * `ledger.read === true` covers every post-W3c campaign. The
 * `lastProcessedDay !== null` branch is the escape hatch for every save
 * that predates this chunk: such a save has already crossed a day boundary
 * (the opening's briefing/ledger pause did not exist yet to have gated it),
 * so it necessarily never sets `ledger.read` — without this branch the
 * ledger, "the single most important element on screen" per QuotaLedger's
 * own header, would vanish forever from an existing campaign, including at
 * its very next tribute deadline. This is exactly pause.ts's own
 * `briefingPending` sentinel, reused for the same "predates this feature"
 * reason, and needs no save-migration version bump for the same reason
 * that one didn't. A post-W3c campaign can never satisfy the OR branch
 * without first satisfying the flag: crossing a day boundary requires
 * clearing pause.ts's chain (briefingPending, then inDialogue through the
 * auto-chained Beat 2), which cannot happen before `ledger.read` is set.
 */
export function ledgerDisclosed(world: WorldState): boolean {
  return world.flags[LEDGER_READ_FLAG] === true || world.lastProcessedDay !== null
}

/** Same gate as ledgerDisclosed, keyed to BRIEFING_COMPLETE_FLAG instead —
 * see that function's doc for the pre-W3c-save reasoning (03 "Progressive
 * disclosure": "Destination list/map controls — Duke briefing completes"). */
export function destinationsDisclosed(world: WorldState): boolean {
  return world.flags[BRIEFING_COMPLETE_FLAG] === true || world.lastProcessedDay !== null
}
