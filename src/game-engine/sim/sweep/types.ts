// src/game-engine/sim/sweep/types.ts
// Shared shapes for the WP04 chunk W4d published seed sweep
// (docs/PRD/game-completion/07-balance-playtest-and-release.md "Seed
// sweep"). One SweepRunSummary per (config, seed) — the sweep's own
// metrics list, read from AgentRunResult (agents/types.ts) plus a small
// amount of per-run sampling (min/max stock — see runOne.ts's own doc for
// the sampling-granularity caveat this type's fields inherit).

import type { Difficulty } from '../../../types'
import type { Agent, SettlementRecord } from '../agents/types'

/** One of the 13 configs the sweep runs (progress.md Round 16 / this
 * chunk's own task: 4 agents x 3 difficulties = 12 "opening" configs, plus
 * one "recovery" config that starts from the distressed fixture on Normal
 * only — 07's own recovery row has no Easy/Hard reading, only invariant 2's
 * "a player entering a tribute cycle at patience 1", which is difficulty-
 * agnostic wording but the fixture itself (distressedCampaign.ts) is only
 * built for Normal). */
export interface SweepConfigDef {
  key: string
  agent: Agent
  difficulty: Difficulty
  kind: 'opening' | 'recovery'
}

/** The full per-(config, seed) reading — one row of the raw results array
 * runOne.ts produces and aggregate.ts/report.ts consume. */
export interface SweepRunSummary {
  configKey: string
  agentName: string
  difficulty: Difficulty
  seed: number
  ending: string | null
  endingDay: number | null
  finalDay: number
  settlements: SettlementRecord[]
  /** Decision-point-sampled, not per-calendar-day — see runOne.ts's doc. */
  minStock: number
  maxStock: number
  pledges: number
  crews: number
  fieldsAssigned: number
  gifts: number
  idleDecisions: number
  actionCounts: Record<string, number>
  dominantCommand: string | null
  /** Share of NON-idle actions the dominant command holds — idle is an
   * absence of a command, not a command family, so it is excluded from the
   * denominator (07's own "unused command families" framing is about
   * commands, not pauses). Null (not 0) when the run issued no command at
   * all, so a report can tell "no dominant command" from "a genuine 0%". */
  dominantShare: number | null
  /** hashLog's final parityHash — null only if a run produced no hashLog
   * entries at all (would itself be a defect worth flagging, not expected
   * in practice — see runOne.ts). */
  finalParityHash: string | null
  /** Only set for the ~1-in-10 seeds selected for the save/reload parity
   * spot-audit (07's "Seed sweep": "Save/reload parity") — the SAME run,
   * reloaded mid-way, compared against a straight run of the identical
   * config+seed with no reload. Null for every other run. */
  parityReloadMatch: boolean | null
}

/** One row of the determinism spot-audit (task item 5): re-run the same
 * config+seed twice, independently, and compare final hashes byte-for-byte. */
export interface DeterminismAuditRow {
  configKey: string
  seed: number
  matchHash: boolean
  matchParityHash: boolean
}

export interface SweepResult {
  generatedAtCommit: string
  seedCount: number
  configCount: number
  runs: SweepRunSummary[]
  determinismAudit: DeterminismAuditRow[]
  wallClockMs: number
}
