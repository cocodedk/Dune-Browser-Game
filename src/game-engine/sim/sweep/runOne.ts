// src/game-engine/sim/sweep/runOne.ts
// Runs exactly one (config, seed) pair through the REAL runner via
// agents/harness.ts's runAgentCampaign (07-balance-playtest-and-release.md
// "Runtime-faithful simulator") and reduces it to one SweepRunSummary row —
// WP04 chunk W4d. Every field here is read from AgentRunResult or sampled
// through RunAgentOptions.onStep; nothing here reimplements a formula (this
// file lives under sim/, scanned by noFormulaCopies.test.ts's own glob).

import { runAgentCampaign } from '../agents/harness'
import { distressedCampaign } from '../agents/distressedCampaign'
import { SECOND_DEADLINE_DAY } from '../reserveLine'
import { CYCLE_DAYS } from '../../quota/quota'
import type { VisibleState } from '../visibleState'
import { dominantCommandShare } from './metrics'
import type { SweepConfigDef, SweepRunSummary } from './types'

/** Day 22 — SECOND_DEADLINE_DAY (20) + 2, matching WP04's own frontier
 * (agents/harness.smoke.test.ts's THROUGH_DAY): opening through two
 * tribute cycles. */
export const OPENING_THROUGH_DAY = SECOND_DEADLINE_DAY + 2

/** Day 36 — the distressed fixture hands off AT day 20 already
 * (distressedCampaign.ts), so "the next two settlements" from there lands
 * on day 28 and day 36, matching recoveryProbe.test.ts's own THROUGH_DAY. */
export const RECOVERY_THROUGH_DAY = SECOND_DEADLINE_DAY + 2 * CYCLE_DAYS

export interface RunOneOptions {
  /** Selects this seed for the save/reload parity spot-audit — see
   * sweep.ts's own 1-in-10 selection. */
  spotCheckParity?: boolean
}

/** Runs the config+seed ONCE (min/max stock sampled inline via onStep, at
 * zero extra runtime cost — see the runtime-budget note in sweep.ts), plus
 * a SECOND run only for the ~1-in-10 seeds selected for the save/reload
 * parity spot-audit: an identical run, reloaded mid-way, compared against
 * this same straight run's final parityHash. Both segments go through the
 * one shared harness loop — see harness.ts's own `reloadAtDay` doc for why
 * an in-loop reload (not a two-call split) is the honest way to do this
 * without risking a phantom mismatch from two runs force-advancing at
 * different points. */
export function runOne(config: SweepConfigDef, seed: number, opts: RunOneOptions = {}): SweepRunSummary {
  let minStock = Infinity
  let maxStock = -Infinity
  const sample = (view: VisibleState) => {
    minStock = Math.min(minStock, view.player.spice)
    maxStock = Math.max(maxStock, view.player.spice)
  }
  const straight = runConfig(config, seed, { onStep: sample })
  const reloaded = opts.spotCheckParity ? runConfig(config, seed, { onStep: () => {}, reload: true }) : null

  const finalHashLog = straight.result.hashLog
  const finalParityHash = finalHashLog.length > 0 ? finalHashLog[finalHashLog.length - 1].parityHash : null
  const { dominant, share } = dominantCommandShare(straight.result.actionCounts)

  return {
    configKey: config.key,
    agentName: config.agent.name,
    difficulty: config.difficulty,
    seed,
    ending: straight.result.ending,
    endingDay: straight.result.ending !== null ? straight.result.finalDay : null,
    finalDay: straight.result.finalDay,
    settlements: straight.result.settlements,
    minStock: minStock === Infinity ? straight.startStock : minStock,
    maxStock: maxStock === -Infinity ? straight.startStock : maxStock,
    pledges: straight.result.finalPledgedCount,
    crews: straight.result.finalCrewCount,
    fieldsAssigned: straight.result.finalFieldsAssigned,
    gifts: straight.result.actionCounts.gift ?? 0,
    idleDecisions: straight.result.actionCounts.idle ?? 0,
    actionCounts: straight.result.actionCounts,
    dominantCommand: dominant,
    dominantShare: share,
    finalParityHash,
    parityReloadMatch: reloaded ? matchParity(finalParityHash, reloaded) : null,
  }
}

function matchParity(
  straightHash: string | null,
  reloaded: { result: { hashLog: { parityHash: string }[] } },
): boolean {
  const rHashLog = reloaded.result.hashLog
  const reloadedHash = rHashLog.length > 0 ? rHashLog[rHashLog.length - 1].parityHash : null
  return straightHash !== null && straightHash === reloadedHash
}

/** Final hash + parityHash only — the determinism spot-audit's own reading
 * (sweep.ts: re-run the same config+seed twice, compare byte-for-byte).
 * Deliberately does not sample onStep or reuse runOne's fuller summary; the
 * audit only needs to know "did this run land on the identical state". */
export function finalHashes(config: SweepConfigDef, seed: number): { hash: string | null; parityHash: string | null } {
  const { result } = runConfig(config, seed, { onStep: () => {} })
  const log = result.hashLog
  const last = log.length > 0 ? log[log.length - 1] : null
  return { hash: last?.hash ?? null, parityHash: last?.parityHash ?? null }
}

function runConfig(
  config: SweepConfigDef,
  seed: number,
  extra: { onStep: (view: VisibleState) => void; reload?: boolean },
) {
  if (config.kind === 'recovery') {
    const { runner, reading } = distressedCampaign(seed, config.difficulty)
    const result = runAgentCampaign(config.agent, seed, config.difficulty, {
      runner,
      throughDay: RECOVERY_THROUGH_DAY,
      onStep: extra.onStep,
      // Mid-window, past the fixture's own hand-off day (20) and before the
      // window's own two settlements resolve (28, 36).
      reloadAtDay: extra.reload ? SECOND_DEADLINE_DAY + CYCLE_DAYS : undefined,
    })
    return { result, startStock: reading.stock }
  }

  const result = runAgentCampaign(config.agent, seed, config.difficulty, {
    throughDay: OPENING_THROUGH_DAY,
    onStep: extra.onStep,
    reloadAtDay: extra.reload ? 6 : undefined, // runner.determinism.test.ts's own day-6 precedent
  })
  return { result, startStock: 0 }
}
