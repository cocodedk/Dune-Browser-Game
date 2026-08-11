// src/game-engine/sim/sweep/report.ts
// Renders the committed markdown report (docs/PRD/game-completion/baseline/
// wp04-sweep/sweep-report.md) from a finished SweepResult — WP04 chunk W4d.
// 07's own "Every release claim records" clause is the header this starts
// from (commit, seed count, regenerate command) before any numbers.

import { aggregateSweep } from './aggregate'
import { computeInvariants } from './invariants'
import { renderCohortSection, renderInvariantSection } from './reportSections'
import { SEEDS_FILE_PATH } from './seeds'
import type { DeterminismAuditRow, SweepResult, SweepRunSummary } from './types'

function renderDeterminismSection(rows: DeterminismAuditRow[]): string {
  const failed = rows.filter(r => !r.matchHash || !r.matchParityHash)
  const lines = [
    '## Determinism spot-audit',
    '',
    `Re-ran ${rows.length} of the published seeds twice, independently, and compared final ` +
    'hashState() and parityHash byte-for-byte.',
    '',
    '| config | seed | hash match | parityHash match |',
    '|---|---|---|---|',
    ...rows.map(r => `| ${r.configKey} | ${r.seed} | ${r.matchHash} | ${r.matchParityHash} |`),
    '',
    failed.length === 0
      ? `Result: all ${rows.length} audited runs were byte-identical on re-run.`
      : `Result: ${failed.length} of ${rows.length} audited runs DIVERGED on re-run — environment ` +
        'nondeterminism at sweep scale, investigate before trusting any other number in this report.',
    '',
  ]
  return lines.join('\n')
}

function renderParitySection(runs: SweepRunSummary[]): string {
  const checked = runs.filter(r => r.parityReloadMatch !== null)
  const failed = checked.filter(r => r.parityReloadMatch === false)
  const lines = [
    '## Save/reload parity spot-check',
    '',
    `${checked.length} of ${runs.length} runs (~1 in 10) saved mid-run, reloaded, and continued — final ` +
    'parityHash compared against a straight run of the identical config+seed with no reload.',
    '',
    failed.length === 0
      ? `Result: all ${checked.length} spot-checked runs matched.`
      : `Result: ${failed.length} of ${checked.length} spot-checked runs MISMATCHED: ` +
        `${failed.map(r => `${r.configKey}#${r.seed}`).join(', ')}.`,
    '',
  ]
  return lines.join('\n')
}

export function renderReport(result: SweepResult): string {
  const cohorts = aggregateSweep(result.runs)
  const invariants = computeInvariants(cohorts, result.runs)

  const header = [
    '# WP04 chunk W4d — published seed sweep report',
    '',
    '## Evidence authority',
    '',
    `- Commit: ${result.generatedAtCommit}`,
    `- Seeds file: \`${SEEDS_FILE_PATH.replace(/^.*(?=docs\/)/, '')}\` (${result.seedCount} published seeds)`,
    `- Configs: ${result.configCount} (4 agents x 3 difficulties opening-scope, + recovery-normal)`,
    '- Scope: opening through two tribute cycles (day <=22); recovery config through its own day <=36 window.',
    '- Regenerate: `node scripts/run-seed-sweep.mjs`',
    `- Wall clock: ${(result.wallClockMs / 1000).toFixed(1)}s`,
    '- Sampling caveat: min/max stock is sampled once per agent decision-point (every loop iteration of ' +
      'agents/harness.ts\'s runAgentCampaign), NOT once per calendar day — a multi-day forceAdvance can cross ' +
      'a lower or higher value than either sampled endpoint. Every other number here is exact, read from ' +
      'production state, not estimated.',
    '- Raw traces are regenerable (not committed); this report and seeds.txt are the committed evidence.',
    '',
    '## Balance invariant checklist',
    '',
    ...invariants.map(renderInvariantSection),
    '',
    '## Distributions and outliers, by cohort',
    '',
  ]

  const body = cohorts.map(renderCohortSection)

  return [
    ...header,
    ...body,
    renderDeterminismSection(result.determinismAudit),
    renderParitySection(result.runs),
  ].join('\n')
}
