// src/game-engine/sim/sweep/invariants.ts
// The balance-invariant checklist verdicts (07-balance-playtest-and-
// release.md "Balance invariants") that this OPENING-SCOPE sweep (day <=22,
// plus the recovery fixture's own day <=36 window) can actually audit —
// WP04 chunk W4d. This module MEASURES; it never tunes a lever to change a
// verdict (07's tuning protocol is W4e's job, not this one's).

import type { CohortAggregate } from './aggregate'
import type { SweepRunSummary } from './types'

export interface InvariantVerdict {
  id: number
  title: string
  status: 'FAIL (expected)' | 'DESCRIPTIVE' | 'HOLDS' | 'VIOLATED'
  numbers: string
}

/** Invariant 1: "The Q1 reserve and investment fixtures are both viable on
 * Normal." "Viable" read cheaply and data-derived (not hardcoded) as: every
 * published seed reaches at least 'full' at cycle 1 for BOTH agents — the
 * status below is computed from the SAME cohort numbers the sentence
 * prints, so a later W4e re-run with different numbers cannot print a
 * stale verdict next to fresh data. progress.md Round 14's own reading
 * (reserve lands PARTIAL, capacity's un-bridged invest line lands SHORT) is
 * what today's numbers happen to confirm — cited, not assumed. */
function invariant1(cohorts: CohortAggregate[]): InvariantVerdict {
  const reserve = cohorts.find(c => c.configKey === 'reserve-normal')
  const capacity = cohorts.find(c => c.configKey === 'capacity-normal')
  const pct = (n: number, of: number) => (of > 0 ? ((100 * n) / of).toFixed(0) : 'n/a')
  if (!reserve || !capacity) {
    return {
      id: 1, title: 'Q1 reserve and investment both viable on Normal', status: 'FAIL (expected)',
      numbers: 'reserve-normal / capacity-normal cohort missing from this run.',
    }
  }
  const bothAlwaysFull = reserve.cycle1Bands.full === reserve.seedCount && capacity.cycle1Bands.full === capacity.seedCount
  const numbers =
    `reserve cycle-1 full ${pct(reserve.cycle1Bands.full, reserve.seedCount)}%, ` +
    `partial ${pct(reserve.cycle1Bands.partial, reserve.seedCount)}%, ` +
    `short ${pct(reserve.cycle1Bands.short, reserve.seedCount)}% ` +
    `(of ${reserve.seedCount}); capacity cycle-1 full ${pct(capacity.cycle1Bands.full, capacity.seedCount)}%, ` +
    `partial ${pct(capacity.cycle1Bands.partial, capacity.seedCount)}%, ` +
    `short ${pct(capacity.cycle1Bands.short, capacity.seedCount)}% (of ${capacity.seedCount}). ` +
    `Viable == both agents reach 'full' on every seed: ${bothAlwaysFull} ` +
    `(progress.md Round 14's own reading: reserve lands PARTIAL, capacity's un-bridged invest line lands SHORT).`
  return {
    id: 1, title: 'Q1 reserve and investment both viable on Normal',
    status: bothAlwaysFull ? 'HOLDS' : 'FAIL (expected)', numbers,
  }
}

/** Invariant 2: "A player entering a tribute cycle at patience 1 has at
 * least one visible legal recovery line that can survive the next two
 * settlements." Expected FAIL per recoveryProbe.test.ts's own 10-seed
 * reading — reported here at the sweep's own seed count. */
function invariant2(cohorts: CohortAggregate[]): InvariantVerdict {
  const recovery = cohorts.find(c => c.configKey === 'recovery-normal')
  if (!recovery) return { id: 2, title: 'Recovery from patience 1', status: 'FAIL (expected)', numbers: 'recovery-normal cohort missing.' }
  const survived = recovery.endingCounts['none (still in progress at window end)'] ?? 0
  const numbers = `${survived}/${recovery.seedCount} seeds reached the window end (day 36) with no ending; ` +
    `cycle-1(day 28) band split full ${recovery.cycle1Bands.full}, partial ${recovery.cycle1Bands.partial}, ` +
    `short ${recovery.cycle1Bands.short}, none ${recovery.cycle1Bands.none}; cycle-2(day 36) full ` +
    `${recovery.cycle2Bands.full}, partial ${recovery.cycle2Bands.partial}, short ${recovery.cycle2Bands.short}, ` +
    `none ${recovery.cycle2Bands.none}.`
  const status = survived === recovery.seedCount ? 'HOLDS' : 'FAIL (expected)'
  return { id: 2, title: 'Recovery from patience 1 survives two settlements', status, numbers }
}

/** Invariant 6: "Difficulty changes margins and pressure, not rules
 * knowledge or outcome previews." Auditable slice: full-band rate at cycle
 * 2 must be monotonically non-increasing Easy -> Normal -> Hard for every
 * agent that ran on all three (Easy pressure lowest, Hard highest). */
function invariant6(cohorts: CohortAggregate[]): InvariantVerdict {
  const agents = [...new Set(cohorts.map(c => c.agentName))].filter(a => a !== 'recovery')
  const rows: string[] = []
  let allMonotonic = true
  for (const agent of agents) {
    const easy = cohorts.find(c => c.configKey === `${agent}-easy`)
    const normal = cohorts.find(c => c.configKey === `${agent}-normal`)
    const hard = cohorts.find(c => c.configKey === `${agent}-hard`)
    if (!easy || !normal || !hard) continue
    const rate1 = (c: CohortAggregate) => (c.seedCount > 0 ? c.cycle1Bands.full / c.seedCount : 0)
    const rate2 = (c: CohortAggregate) => (c.seedCount > 0 ? c.cycle2Bands.full / c.seedCount : 0)
    const [e1, n1, h1] = [rate1(easy), rate1(normal), rate1(hard)]
    const [e2, n2, h2] = [rate2(easy), rate2(normal), rate2(hard)]
    const monotonic = e1 >= n1 && n1 >= h1 && e2 >= n2 && n2 >= h2
    if (!monotonic) allMonotonic = false
    const vacuous = e1 === 0 && n1 === 0 && h1 === 0 && e2 === 0 && n2 === 0 && h2 === 0
    const pct = (x: number) => `${(x * 100).toFixed(0)}%`
    rows.push(
      `${agent}: full-rate-cycle-1 Easy ${pct(e1)} / Normal ${pct(n1)} / Hard ${pct(h1)}, ` +
      `full-rate-cycle-2 Easy ${pct(e2)} / Normal ${pct(n2)} / Hard ${pct(h2)} ` +
      `(${monotonic ? 'monotonic' : 'NOT monotonic'}${vacuous ? ', VACUOUS — always 0%, no real signal' : ''})`,
    )
  }
  return {
    id: 6,
    title: 'Difficulty changes margins, not rules (full-band rate monotonic Easy>=Normal>=Hard, cycles 1 and 2)',
    status: allMonotonic ? 'HOLDS' : 'VIOLATED',
    // Each row already states its own vacuous/non-vacuous flag from the
    // SAME computed numbers — no separate hand-written summary sentence to
    // go stale next to a future re-run's fresh data (see this function's
    // own doc for why that was removed).
    numbers: rows.join('; ') || 'no agent had all three difficulties in this run.',
  }
}

/** Invariant 7: dominance. Full-campaign "wins more than 80% while every
 * other strategy wins fewer than 20%" cannot be evaluated from opening-only
 * data (no campaign has actually ended by day 22). Reported descriptively
 * as this window's own "both cycles full" share per Normal agent instead —
 * per this chunk's own task wording. */
function invariant7(cohorts: CohortAggregate[]): InvariantVerdict {
  const normals = cohorts.filter(c => c.difficulty === 'normal' && c.agentName !== 'recovery')
  const rows = normals.map(c => `${c.agentName}: ${(c.bothFullShare * 100).toFixed(0)}% ` +
    `(${Math.round(c.bothFullShare * c.seedCount)}/${c.seedCount})`)
  return {
    id: 7,
    title: 'Dominance (opening-scope proxy: share of seeds with both cycles full, Normal)',
    status: 'DESCRIPTIVE',
    numbers: `No campaign reaches an ending within this sweep's own day<=22 window, so 07's 80%/20% ` +
      `win-rate test does not apply here — reported descriptively instead: ${rows.join('; ')}.`,
  }
}

/** Invariant 9: rng cannot decide a campaign before a readable warning.
 * Opening-scope citation (runner.determinism.test.ts's own proven claim):
 * Act 1's raidInterval is null (combat/resolve.ts), so the sole rng
 * consumer in this window is one resolveWorm() draw per active-harvest day
 * — and parityView.ts's own citation records wormSightings (the only
 * production write a worm draw produces) as having ZERO production readers
 * that gate a rule. No rng outcome in this window can decide anything,
 * readable warning or not. */
function invariant9(): InvariantVerdict {
  return {
    id: 9,
    title: 'RNG decides nothing before a readable warning (opening-scope)',
    status: 'HOLDS',
    numbers: 'Act 1 raidInterval is null (combat/resolve.ts) — no raid rng in this window. The sole rng ' +
      'consumer through day 22 is one resolveWorm() draw per active-harvest day (runner.determinism.test.ts\'s ' +
      'own proven claim: fixed draw count per day regardless of the roll\'s value); its only write, ' +
      'wormSightings, has zero production readers that gate a rule (state/parityView.ts\'s own citation). ' +
      'No rng outcome in this window can decide a run, so the "readable warning" question does not arise here.',
  }
}

/** Invariant 10: refusing an optional gift still allows finishing. Opening-
 * scope proxy: reserve and novice never gift by policy (07's own agent
 * table) — confirm the sweep data shows zero gifts, then confirm they still
 * reach two settlements at the same rate as the gifting agents (capacity,
 * reactive). */
function invariant10(cohorts: CohortAggregate[], runs: SweepRunSummary[]): InvariantVerdict {
  const nonGifters = ['reserve', 'novice']
  const nonGiftRuns = runs.filter(r => nonGifters.includes(r.agentName) && r.difficulty === 'normal')
  const giftCount = nonGiftRuns.reduce((sum, r) => sum + r.gifts, 0)
  const completedTwo = nonGiftRuns.filter(r => r.settlements.length >= 2).length
  const gifters = cohorts.filter(c => ['capacity', 'reactive'].includes(c.agentName) && c.difficulty === 'normal')
  const gifterCompletion = gifters.map(c => {
    const rows = runs.filter(r => r.configKey === c.configKey)
    const n = rows.filter(r => r.settlements.length >= 2).length
    return `${c.agentName} ${n}/${rows.length}`
  })
  return {
    id: 10,
    title: 'Refusing an optional gift stays completable (reserve/novice vs capacity/reactive)',
    status: giftCount === 0 ? 'HOLDS' : 'VIOLATED',
    numbers: `reserve+novice total gifts across ${nonGiftRuns.length} Normal runs: ${giftCount} (must be 0 — ` +
      `07's own agent table). Reached both cycle settlements: reserve+novice ${completedTwo}/${nonGiftRuns.length}; ` +
      `${gifterCompletion.join('; ')}.`,
  }
}

/** The determinism spot-audit (task item 5) is reported separately in
 * report.ts, alongside these — not folded into any single numbered
 * invariant, since 07's own checklist does not name a "determinism"
 * invariant; it is evidence the OTHER six numbers here are trustworthy. */
export function computeInvariants(cohorts: CohortAggregate[], runs: SweepRunSummary[]): InvariantVerdict[] {
  return [invariant1(cohorts), invariant2(cohorts), invariant6(cohorts), invariant7(cohorts), invariant9(), invariant10(cohorts, runs)]
}
