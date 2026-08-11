// src/game-engine/sim/sweep.ts
// The published seed sweep facade (docs/PRD/game-completion/
// 07-balance-playtest-and-release.md "Seed sweep"; WP04 chunk W4d).
// `runSweep(config)` is the ONE entry point: sweep.run.test.ts calls it
// under vitest (the only way this repo can import the TS engine outside a
// browser — see that file's own doc), and scripts/run-seed-sweep.mjs is a
// thin process wrapper around that same vitest invocation, not a second
// implementation.
//
// SEQUENTIAL BY CONSTRUCTION: the world singleton (game-engine/GameState.ts)
// is what every production command already operates on (runner.ts's own
// doc) — two concurrent runs would both mutate the SAME `world` binding, and
// a "finished" run read after another run's createCampaignRunner() call
// reads the WRONG campaign without ever throwing. This file therefore never
// calls Promise.all (or anything else that would interleave two runs) over
// the seed x config matrix — one process, one run at a time, top to bottom.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { reserveAgent } from './agents/reserve'
import { capacityAgent } from './agents/capacity'
import { reactiveAgent } from './agents/reactive'
import { noviceAgent } from './agents/novice'
import { recoveryAgent } from './agents/recovery'
import { readPublishedSeeds } from './sweep/seeds'
import { runOne, finalHashes } from './sweep/runOne'
import { renderReport } from './sweep/report'
import type { Difficulty } from '../../types'
import type { DeterminismAuditRow, SweepConfigDef, SweepResult, SweepRunSummary } from './sweep/types'

export type { SweepConfigDef, SweepResult, SweepRunSummary, DeterminismAuditRow }

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const OPENING_AGENTS = [reserveAgent, capacityAgent, reactiveAgent, noviceAgent]

// sim/ -> game-engine/ -> src/ -> repo root (3 levels), same reckoning as
// parityFixtures.generate.test.ts's own e2e/fixtures/ path from this
// directory.
const OUT_BASE = '../../../docs/PRD/game-completion/baseline/wp04-sweep/'
export const RAW_OUTPUT_DIR = fileURLToPath(new URL(`${OUT_BASE}raw/`, import.meta.url))
export const REPORT_PATH = fileURLToPath(new URL(`${OUT_BASE}sweep-report.md`, import.meta.url))

/** The 13 configs: 4 opening-scope agents x 3 difficulties (12), plus one
 * recovery-normal config (the distressed fixture is only built for Normal —
 * distressedCampaign.ts's own doc). */
export function buildConfigs(): SweepConfigDef[] {
  const configs: SweepConfigDef[] = []
  for (const agent of OPENING_AGENTS) {
    for (const difficulty of DIFFICULTIES) {
      configs.push({ key: `${agent.name}-${difficulty}`, agent, difficulty, kind: 'opening' })
    }
  }
  configs.push({ key: 'recovery-normal', agent: recoveryAgent, difficulty: 'normal', kind: 'recovery' })
  return configs
}

export interface RunSweepOptions {
  /** Override for profiling a small slice — defaults to the published
   * baseline/wp04-sweep/seeds.txt contract. */
  seeds?: number[]
  configs?: SweepConfigDef[]
  commit?: string
  writeFiles?: boolean
}

export function runSweep(opts: RunSweepOptions = {}): SweepResult {
  const seeds = opts.seeds ?? readPublishedSeeds()
  const configs = opts.configs ?? buildConfigs()
  const writeFiles = opts.writeFiles ?? true
  const start = Date.now()

  const runs: SweepRunSummary[] = []
  for (const config of configs) {
    seeds.forEach((seed, i) => {
      runs.push(runOne(config, seed, { spotCheckParity: i % 10 === 0 })) // ~1-in-10 seeds
    })
  }

  // Determinism spot-audit (task item 5): 5 (config, seed) pairs spread
  // across the config list, each re-run twice, hashes compared.
  const determinismAudit: DeterminismAuditRow[] = []
  for (let k = 0; k < Math.min(5, seeds.length); k++) {
    const config = configs[k % configs.length]
    const seed = seeds[(k * 17) % seeds.length]
    const a = finalHashes(config, seed)
    const b = finalHashes(config, seed)
    determinismAudit.push({
      configKey: config.key,
      seed,
      matchHash: a.hash !== null && a.hash === b.hash,
      matchParityHash: a.parityHash !== null && a.parityHash === b.parityHash,
    })
  }

  const result: SweepResult = {
    generatedAtCommit: opts.commit ?? 'unknown',
    seedCount: seeds.length,
    configCount: configs.length,
    runs,
    determinismAudit,
    wallClockMs: Date.now() - start,
  }

  if (writeFiles) {
    mkdirSync(RAW_OUTPUT_DIR, { recursive: true })
    writeFileSync(`${RAW_OUTPUT_DIR}sweep-results.json`, JSON.stringify(result, null, 2))
    writeFileSync(REPORT_PATH, renderReport(result))
  }

  return result
}
