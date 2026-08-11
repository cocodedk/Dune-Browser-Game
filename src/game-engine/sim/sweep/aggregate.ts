// src/game-engine/sim/sweep/aggregate.ts
// Groups SweepRunSummary rows by cohort (one config = one agent+difficulty,
// or the single recovery-normal config) and computes the distributions and
// outliers 07's "Seed sweep" asks a summary to report ("distributions and
// outliers, not only averages") — WP04 chunk W4d.

import { mean, mode, percentile } from './metrics'
import type { SweepRunSummary } from './types'

export interface BandCounts {
  full: number
  partial: number
  short: number
  /** No settlement reached this cycle within the run's own window (an
   * early ending, or the window ended first) — distinct from a real 'short'
   * settlement. */
  none: number
}

export interface CohortAggregate {
  configKey: string
  agentName: string
  difficulty: string
  seedCount: number
  cycle1Bands: BandCounts
  cycle2Bands: BandCounts
  /** patienceAfter values actually recorded for cycle 2 (or the last
   * recorded settlement, if fewer than 2) — raw list, small enough (<=100)
   * that a reader can eyeball the trajectory directly rather than trust a
   * single summary statistic. */
  patienceAfterCycle1: number[]
  patienceAfterCycle2: number[]
  minStockP10: number
  minStockP50: number
  minStockP90: number
  maxStockP50: number
  meanGifts: number
  meanPledges: number
  meanCrews: number
  meanFieldsAssigned: number
  meanIdleDecisions: number
  endingCounts: Record<string, number>
  /** Fraction of seeds where BOTH cycle 1 and cycle 2 settled at 'full' —
   * this sweep's own opening-scope proxy for "won" (invariant 7's own
   * report, per this chunk's task: "with only opening-scope data, report
   * share-of-wins descriptively"). */
  bothFullShare: number
  outlierSeeds: OutlierRow[]
}

export interface OutlierRow {
  seed: number
  cycle1Band: string
  cycle2Band: string
  ending: string
  reason: string
}

function bandOf(run: SweepRunSummary, cycleIndex: 0 | 1): string {
  return run.settlements[cycleIndex]?.band ?? 'none'
}

function countBands(runs: SweepRunSummary[], cycleIndex: 0 | 1): BandCounts {
  const counts: BandCounts = { full: 0, partial: 0, short: 0, none: 0 }
  for (const run of runs) {
    const band = bandOf(run, cycleIndex) as keyof BandCounts
    counts[band]++
  }
  return counts
}

function endingLabel(ending: string | null): string {
  return ending ?? 'none (still in progress at window end)'
}

/** A run's outcome tuple, as one string key — the unit `mode()` and outlier
 * detection both compare against. */
function outcomeKey(run: SweepRunSummary): string {
  return `${bandOf(run, 0)}|${bandOf(run, 1)}|${endingLabel(run.ending)}`
}

export function aggregateCohort(configKey: string, runs: SweepRunSummary[]): CohortAggregate {
  const modalKey = mode(runs.map(outcomeKey))
  const outliers: OutlierRow[] = runs
    .filter(r => outcomeKey(r) !== modalKey)
    .map(r => ({
      seed: r.seed,
      cycle1Band: bandOf(r, 0),
      cycle2Band: bandOf(r, 1),
      ending: endingLabel(r.ending),
      reason: `differs from cohort mode (${modalKey})`,
    }))

  const endingCounts: Record<string, number> = {}
  for (const r of runs) {
    const label = endingLabel(r.ending)
    endingCounts[label] = (endingCounts[label] ?? 0) + 1
  }

  const bothFull = runs.filter(r => bandOf(r, 0) === 'full' && bandOf(r, 1) === 'full').length

  return {
    configKey,
    agentName: runs[0]?.agentName ?? configKey,
    difficulty: runs[0]?.difficulty ?? 'normal',
    seedCount: runs.length,
    cycle1Bands: countBands(runs, 0),
    cycle2Bands: countBands(runs, 1),
    patienceAfterCycle1: runs.map(r => r.settlements[0]?.patienceAfter).filter((n): n is number => n !== undefined),
    patienceAfterCycle2: runs.map(r => r.settlements[1]?.patienceAfter).filter((n): n is number => n !== undefined),
    minStockP10: percentile(runs.map(r => r.minStock), 10),
    minStockP50: percentile(runs.map(r => r.minStock), 50),
    minStockP90: percentile(runs.map(r => r.minStock), 90),
    maxStockP50: percentile(runs.map(r => r.maxStock), 50),
    meanGifts: mean(runs.map(r => r.gifts)),
    meanPledges: mean(runs.map(r => r.pledges)),
    meanCrews: mean(runs.map(r => r.crews)),
    meanFieldsAssigned: mean(runs.map(r => r.fieldsAssigned)),
    meanIdleDecisions: mean(runs.map(r => r.idleDecisions)),
    endingCounts,
    bothFullShare: runs.length > 0 ? bothFull / runs.length : 0,
    outlierSeeds: outliers,
  }
}

export function aggregateSweep(runs: SweepRunSummary[]): CohortAggregate[] {
  const byConfig = new Map<string, SweepRunSummary[]>()
  for (const run of runs) {
    const list = byConfig.get(run.configKey) ?? []
    list.push(run)
    byConfig.set(run.configKey, list)
  }
  return [...byConfig.entries()].map(([configKey, configRuns]) => aggregateCohort(configKey, configRuns))
}
