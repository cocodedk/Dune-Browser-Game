# WP04 chunk W4d — published seed sweep report

## Evidence authority

- Commit: 1f83a47 + uncommitted worktree
- Seeds file: `docs/PRD/game-completion/baseline/wp04-sweep/seeds.txt` (100 published seeds)
- Configs: 13 (4 agents x 3 difficulties opening-scope, + recovery-normal)
- Scope: opening through two tribute cycles (day <=22); recovery config through its own day <=36 window.
- Regenerate: `node scripts/run-seed-sweep.mjs`
- Wall clock: 71.4s
- Sampling caveat: min/max stock is sampled once per agent decision-point (every loop iteration of agents/harness.ts's runAgentCampaign), NOT once per calendar day — a multi-day forceAdvance can cross a lower or higher value than either sampled endpoint. Every other number here is exact, read from production state, not estimated.
- Raw traces are regenerable (not committed); this report and seeds.txt are the committed evidence.

## Balance invariant checklist

### Invariant 1: Q1 reserve and investment both viable on Normal

**Status:** HOLDS

reserve cycle-1 full 100%, partial 0%, short 0% (of 100); capacity cycle-1 full 100%, partial 0%, short 0% (of 100). Viable == both agents reach 'full' on every seed: true (progress.md Round 14's own reading: reserve lands PARTIAL, capacity's un-bridged invest line lands SHORT).

### Invariant 2: Recovery from patience 1 survives two settlements

**Status:** HOLDS

100/100 seeds reached the window end (day 36) with no ending; cycle-1(day 28) band split full 0, partial 100, short 0, none 0; cycle-2(day 36) full 0, partial 100, short 0, none 0.

### Invariant 6: Difficulty changes margins, not rules (full-band rate monotonic Easy>=Normal>=Hard, cycles 1 and 2)

**Status:** HOLDS

reserve: full-rate-cycle-1 Easy 100% / Normal 100% / Hard 100%, full-rate-cycle-2 Easy 100% / Normal 100% / Hard 0% (monotonic); capacity: full-rate-cycle-1 Easy 100% / Normal 100% / Hard 100%, full-rate-cycle-2 Easy 100% / Normal 100% / Hard 0% (monotonic); reactive: full-rate-cycle-1 Easy 100% / Normal 100% / Hard 100%, full-rate-cycle-2 Easy 100% / Normal 100% / Hard 0% (monotonic); novice: full-rate-cycle-1 Easy 100% / Normal 100% / Hard 100%, full-rate-cycle-2 Easy 100% / Normal 100% / Hard 0% (monotonic)

### Invariant 7: Dominance (opening-scope proxy: share of seeds with both cycles full, Normal)

**Status:** DESCRIPTIVE

No campaign reaches an ending within this sweep's own day<=22 window, so 07's 80%/20% win-rate test does not apply here — reported descriptively instead: reserve: 100% (100/100); capacity: 100% (100/100); reactive: 100% (100/100); novice: 100% (100/100).

### Invariant 9: RNG decides nothing before a readable warning (opening-scope)

**Status:** HOLDS

Act 1 raidInterval is null (combat/resolve.ts) — no raid rng in this window. The sole rng consumer through day 22 is one resolveWorm() draw per active-harvest day (runner.determinism.test.ts's own proven claim: fixed draw count per day regardless of the roll's value); its only write, wormSightings, has zero production readers that gate a rule (state/parityView.ts's own citation). No rng outcome in this window can decide a run, so the "readable warning" question does not arise here.

### Invariant 10: Refusing an optional gift stays completable (reserve/novice vs capacity/reactive)

**Status:** HOLDS

reserve+novice total gifts across 200 Normal runs: 0 (must be 0 — 07's own agent table). Reached both cycle settlements: reserve+novice 200/200; capacity 100/100; reactive 100/100.


## Distributions and outliers, by cohort

### reserve-easy (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=20.0 p50=20.0 p90=20.0; max p50=301.0.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### reserve-normal (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=18.2 p50=18.2 p90=18.2; max p50=149.7.

Mean per run: gifts=0.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### reserve-hard (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 0 | 0 | 100 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]

Stock (decision-point sampled): min p10=0.0 p50=0.0 p90=0.0; max p50=127.3.

Mean per run: gifts=0.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 0%.

Outliers: none (every seed matches the cohort mode outcome).

### capacity-easy (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=20.0 p50=20.0 p90=20.0; max p50=396.7.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### capacity-normal (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=20.0 p50=20.0 p90=20.0; max p50=226.5.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### capacity-hard (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 0 | 100 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=0.0 p50=0.0 p90=0.0; max p50=154.6.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 0%.

Outliers: none (every seed matches the cohort mode outcome).

### reactive-easy (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=20.0 p50=20.0 p90=20.0; max p50=396.7.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### reactive-normal (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=20.0 p50=20.0 p90=20.0; max p50=226.5.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### reactive-hard (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 0 | 100 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=0.0 p50=0.0 p90=0.0; max p50=154.6.

Mean per run: gifts=2.00, pledges=2.00, crews=2.00, fields-assigned=2.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 0%.

Outliers: none (every seed matches the cohort mode outcome).

### novice-easy (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=60.0 p50=60.0 p90=60.0; max p50=214.4.

Mean per run: gifts=0.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### novice-normal (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 100 | 0 | 0 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Stock (decision-point sampled): min p10=18.2 p50=18.2 p90=18.2; max p50=149.7.

Mean per run: gifts=0.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 100%.

Outliers: none (every seed matches the cohort mode outcome).

### novice-hard (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 |
| 2 | 0 | 0 | 100 | 0 |

Patience after cycle 1: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

Patience after cycle 2: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]

Stock (decision-point sampled): min p10=0.0 p50=0.0 p90=0.0; max p50=127.3.

Mean per run: gifts=0.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=23.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 0%.

Outliers: none (every seed matches the cohort mode outcome).

### recovery-normal (100 seeds)

| cycle | full | partial | short | none |
|---|---|---|---|---|
| 1 | 0 | 100 | 0 | 0 |
| 2 | 0 | 100 | 0 | 0 |

Patience after cycle 1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

Patience after cycle 2: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

Stock (decision-point sampled): min p10=28.9 p50=28.9 p90=28.9; max p50=92.6.

Mean per run: gifts=3.00, pledges=1.00, crews=1.00, fields-assigned=1.00, idle-decisions=17.00.

Endings: none (still in progress at window end)=100.

Both-cycles-full share: 0%.

Outliers: none (every seed matches the cohort mode outcome).

## Determinism spot-audit

Re-ran 5 of the published seeds twice, independently, and compared final hashState() and parityHash byte-for-byte.

| config | seed | hash match | parityHash match |
|---|---|---|---|
| reserve-easy | 1 | true | true |
| reserve-normal | 18 | true | true |
| reserve-hard | 35 | true | true |
| capacity-easy | 52 | true | true |
| capacity-normal | 69 | true | true |

Result: all 5 audited runs were byte-identical on re-run.

## Save/reload parity spot-check

130 of 1300 runs (~1 in 10) saved mid-run, reloaded, and continued — final parityHash compared against a straight run of the identical config+seed with no reload.

Result: all 130 spot-checked runs matched.
