// src/game-engine/sim/sweep/reportSections.ts
// Markdown table/list renderers for one cohort's distributions and
// outliers — split out of report.ts (WP04 chunk W4d) to keep each file
// under the 200-line rule.

import type { CohortAggregate } from './aggregate'
import type { InvariantVerdict } from './invariants'

export function renderCohortSection(c: CohortAggregate): string {
  const lines: string[] = []
  lines.push(`### ${c.configKey} (${c.seedCount} seeds)`)
  lines.push('')
  lines.push('| cycle | full | partial | short | none |')
  lines.push('|---|---|---|---|---|')
  lines.push(`| 1 | ${c.cycle1Bands.full} | ${c.cycle1Bands.partial} | ${c.cycle1Bands.short} | ${c.cycle1Bands.none} |`)
  lines.push(`| 2 | ${c.cycle2Bands.full} | ${c.cycle2Bands.partial} | ${c.cycle2Bands.short} | ${c.cycle2Bands.none} |`)
  lines.push('')
  lines.push(`Patience after cycle 1: [${c.patienceAfterCycle1.join(', ')}]`)
  lines.push('')
  lines.push(`Patience after cycle 2: [${c.patienceAfterCycle2.join(', ')}]`)
  lines.push('')
  lines.push(
    `Stock (decision-point sampled): min p10=${c.minStockP10.toFixed(1)} p50=${c.minStockP50.toFixed(1)} ` +
    `p90=${c.minStockP90.toFixed(1)}; max p50=${c.maxStockP50.toFixed(1)}.`,
  )
  lines.push('')
  lines.push(
    `Mean per run: gifts=${c.meanGifts.toFixed(2)}, pledges=${c.meanPledges.toFixed(2)}, ` +
    `crews=${c.meanCrews.toFixed(2)}, fields-assigned=${c.meanFieldsAssigned.toFixed(2)}, ` +
    `idle-decisions=${c.meanIdleDecisions.toFixed(2)}.`,
  )
  lines.push('')
  lines.push(`Endings: ${Object.entries(c.endingCounts).map(([k, v]) => `${k}=${v}`).join(', ')}.`)
  lines.push('')
  lines.push(`Both-cycles-full share: ${(c.bothFullShare * 100).toFixed(0)}%.`)
  lines.push('')
  if (c.outlierSeeds.length === 0) {
    lines.push('Outliers: none (every seed matches the cohort mode outcome).')
  } else {
    lines.push(`Outliers (${c.outlierSeeds.length} of ${c.seedCount}):`)
    lines.push('')
    lines.push('| seed | cycle-1 band | cycle-2 band | ending | reason |')
    lines.push('|---|---|---|---|---|')
    for (const o of c.outlierSeeds) {
      lines.push(`| ${o.seed} | ${o.cycle1Band} | ${o.cycle2Band} | ${o.ending} | ${o.reason} |`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

export function renderInvariantSection(v: InvariantVerdict): string {
  return `### Invariant ${v.id}: ${v.title}\n\n**Status:** ${v.status}\n\n${v.numbers}\n`
}
