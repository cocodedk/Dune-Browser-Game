# WP04 critic verdict — "Runtime-faithful runner and opening balance"

**Package:** commits `395624c`..`3266ed4` (diff base `1664998`), branch `feat/game-completion`.
**Auditor:** independent evidence-auditor, fresh context. Judged artifacts and code only —
the builder's narrative was treated as a claim to test, never as evidence.
**Date of audit run:** 2026-08-12. Tree was clean at `3266ed4` when every gate below started.
**Contracts applied:** `08-execution-plan.md` §WP04 exit proof;
`07-balance-playtest-and-release.md` (simulator may/may-not lists, parity protocol, agent
table, seed sweep, balance invariants, tuning protocol, rejection criteria).

---

## Verdict at a glance

| | |
|---|---|
| **Score against the exit proof** | **8 / 10** |
| **Verdict** | `verified` **is warranted for WP04.** All four exit-proof clauses hold on evidence this audit reproduced independently. Five carry-forwards are recorded below; none falsifies a clause. |
| **Single biggest remaining gap** | The published 100-seed sweep has **zero discriminating power** in its own window. Proven, not inferred: seed 1 and seed 2 produce byte-identical campaign state (14,476 bytes) apart from the `rng` block, and the four opening agents collapse to **two** distinct campaigns on Normal. 1300 runs are **8 deterministic traces**. The report prints "Outliers: none" thirteen times, which reads as a finding rather than as the structural vacuity it is. |

---

## 1. Gates — all six re-run from a clean tree at HEAD

Run sequentially, one at a time, wall clock recorded by the runner script.

```
vitest     rc=0 wall=18.4s
tsc        rc=0 wall=2.8s
lint       rc=0 wall=6.5s
build      rc=0 wall=5.0s
sweep      rc=0 wall=72.5s
playwright rc=0 wall=131.0s
ALL DONE
```

Raw tails:

```
$ npx vitest run
 Test Files  294 passed | 1 skipped (295)
      Tests  2364 passed | 1 skipped (2365)
   Duration  17.75s

$ npx tsc --noEmit
(no output)

$ npm run lint
(no output beyond the npm banner)

$ npm run build
tsc -b && vite build && node scripts/check-bundle-size.mjs  — rc=0

$ npm run sweep
sweep wall clock: 70.9s for 1300 runs
 ✓ src/game-engine/sim/sweep.run.test.ts (1 test) 70900ms
run-seed-sweep.mjs: vitest exited 0 after 72.2s wall clock.

$ npx playwright test --workers=1
  ✓  25 [chromium] › e2e/parity.spec.ts:36:1 › opening-reserve-line: browser/headless parity through cycle-2, with a reload checkpoint (4.7s)
  ✓  26 [chromium] › e2e/parity.spec.ts:40:1 › opening-invest-line: browser/headless parity through cycle-2, with a reload checkpoint (4.9s)
  ✓  27 [chromium] › e2e/title.spec.ts:15:1 › title screen appears before the renderer mounts, and New Campaign enters the game (3.0s)
  ✓  28 [chromium] › e2e/title.spec.ts:35:1 › difficulty is written once at New Campaign and has no in-game control (3.1s)

  28 passed (2.2m)
```

Round 17's counts ("294 files / 2364 tests; 28/28 E2E") match exactly. No retries, no flakes
in this run.

### 1.1 Sweep report reproduces at HEAD

The committed `sweep-report.md` was regenerated from a clean tree at `3266ed4` and diffed
against the committed file. **The entire diff is two metadata lines:**

```diff
--- committed/sweep-report.md
+++ docs/PRD/game-completion/baseline/wp04-sweep/sweep-report.md
@@ -2,12 +2,12 @@
-- Commit: 1f83a47 + uncommitted worktree
+- Commit: 3266ed4
-- Wall clock: 71.4s
+- Wall clock: 70.9s
```

Every number, band split, patience array, percentile and invariant verdict is byte-identical.
The regenerated file was discarded and the committed one restored (`git checkout`).

**Finding (minor, evidence-labelling):** the committed artifact's own "Evidence authority"
block names `1f83a47 + uncommitted worktree` — two commits behind the package under audit.
07 requires every release claim to record its commit identifier. A reader of the artifact
cannot tell it holds at `3266ed4`. **This audit establishes that it does**, but the label is
wrong and should be regenerated on a clean HEAD before this evidence is cited again.

### 1.2 `seeds.txt` append-only header

Present and explicit (`baseline/wp04-sweep/seeds.txt`, lines 1–20): the file states the
append-only rule, the "no seed is ever removed because its result is inconvenient" clause,
and the one narrow exception (a seed proven invalid, by explicit cited decision). Contents
are 1..100. `src/game-engine/sim/sweep/seeds.ts` parses this file directly, so the contract
governs what actually runs, not only what is documented. **Holds.**

---

## 2. Exit proof, clause by clause

> "Opening parity is exact, Normal reserve/investment paths remain viable, the patience-1
> recovery fixture survives two settlements, and no simulator mutation bypasses a production
> command. M1 is verified."

### (a) Opening parity is exact — **HOLDS**

**What the fixture actually compares** (read, not assumed, from `e2e/parity.spec.ts`,
`e2e/parityDriver.ts`, `src/game-engine/sim/parityScript.ts`,
`src/game-engine/sim/parityFixtures.generate.test.ts`):

- Two lines: `opening-reserve-line` and `opening-invest-line`, seed 31, Normal.
- A campaign-entry hash before any command.
- Phase A: every command, arrival and processed day from creation to the cycle-1 pending
  settlement — 27 steps on the reserve line, each with its own `parityHash` compared.
- A real browser reload + production `Continue` (IndexedDB durability polled, not
  timeout-guessed), with the pre-reload hash asserted on both sides of the reload.
- Phase B: 13 further steps through settle-cycle-1, the Q1 debrief, and settle-cycle-2.
- First divergence throws with the preceding step, the diverging step, both hashes and a live
  browser state summary — 07's required failure report shape.
- Fixtures are regenerated by `npx vitest run` in the same commit; they are git-tracked and
  reproduced byte-identical in this audit's run (`git status e2e/fixtures/` clean afterwards).

**Are the `parityView` exclusions defensible?** I ran my own greps rather than trusting the
module header.

| Excluded field | Every production reader found | Rule reads it? |
|---|---|---|
| `events` | `ui/EventLog.tsx` (renders), `ui/GoalOverlay.tsx` (finds the ending event for display text), `EventSystem.ts` itself (writes/prunes) | **No** |
| `wormSightings` | `game-render/planet/WormSign.ts` (fading-ring visual), `debugSources.ts` (read-only `worms` query), `economy/harvestRun.ts` (writer + prune) | **No** |
| `worms/wormsign.ts` `fieldIsDangerous` | only its own test file imports it | **Zero production callers** |

The exclusions are defensible under 07's hash clause ("excludes transient render state").
`time`, `rng`, `speed`, `lastProcessedDay` and `flags` all stay **in** the view — the right
call.

**Two residual weaknesses, both improvement notes rather than clause failures:**

1. The `events` exclusion is **broader than necessary**. The module's stated reason has two
   halves; only one is strong. The timestamp half is strong (`timestamp: world.time` is
   frame-sensitive). The id half is weak — `evt-N` comes from a counter that `initLoop()`
   resets and that then advances purely with how many events fired, i.e. with campaign
   content, not frame luck. A normalised **event-type sequence** (ids and timestamps
   stripped, order kept) would have been hashable and would close the one masking class the
   current design leaves open: a divergence whose only trace is "a rule fired on one side and
   not the other, with no other state effect".
2. `parityDriver.establishParitySync` raw-sets browser `world.time` to the headless value at
   campaign entry and after the reload, and `advanceTo(target)` drives to absolute targets in
   between. So `time` equality at every comparison point is **true by construction, not
   proven**. This is 07-sanctioned ("pins both sides to the exact same day/arrival quanta")
   and is disclosed in `parityView.ts`'s header, but it should not be read as "the two
   runtimes independently agree on the clock".

**Independent reproduction — probe P3 (below) replays the fixture's first 10 steps through
the production `EventBus` seam instead of the runner's direct handler calls, and reproduces
both the `parityHash` and the full `hashState` exactly at every step.** That is the strongest
available evidence that the runner is not a parallel path.

**Scope note (carry-forward, not a failure):** 07's `parity-40-day` fixture — 40 processed
days, two reloads, spanning a raid, an act transition and an ending check — is *release*
scope. WP04's exit proof asks only for exact opening parity, which is what exists: 22 days,
one reload, two tribute cycles, no raid or act transition. Recorded as owed to a later
package.

### (b) Normal reserve/investment paths remain viable — **HOLDS**

**Debug-bridge strip verified.** `grep -rn giveHarvester e2e/` returns **zero live call
sites** — only two explanatory comments (`opening3.spec.ts:73`, `opening9.spec.ts:6`). The
W4f diff (`d615aa4..3266ed4`) touches exactly three files and removes both
`page.evaluate(() => window.__DUNE__?.giveHarvester?.())` calls with no replacement mutation.
A sweep of every remaining `__DUNE__` call in `e2e/` finds only `setTime` (clock scrub),
`pauseForParity`, `advanceTo`, `replay`, `player()`, `worldTime`, `hashState` and `pick` —
**no resource, crew, pledge or equipment grant anywhere in the browser suite.**

**Measured through the real route** (`src/game-engine/sim/cycleTwo.test.ts`, re-run by this
audit):

```
reserve-line cycle-1 measured: { stock: 149.72190766724492, amountDue: 90, minPartialPayment: 54 }
reserve-line cycle-2 measured: { stock: 118.24705759667685, amountDue: 100, minPartialPayment: 60 }
invest-line  cycle-1 measured: { stock: 199.44381533448984, amountDue: 90, minPartialPayment: 54 }
invest-line  cycle-2 measured: { stock: 226.4941151933537,  amountDue: 100, minPartialPayment: 60 }
```

Engine-level shortcut fixtures (`commands/openingLineFixtures.test.ts`) measure 157.33 and
214.67 against the same 90 due. Sweep: `reserve-normal` and `capacity-normal` both 100/100
FULL at cycles 1 and 2. Both lines are viable, and the unoptimised `novice` agent also
reaches FULL/FULL — so 07's "only optimized runs are used to claim viability" rejection
criterion is **not** triggered; the opposite is demonstrated.

**Two findings, both carry-forwards:**

1. **Viability is now overshoot, not margin.** 149.7 against a 90 due on the *reserve* line —
   the line that is supposed to be tight. `quota.ts`'s own header still says the 12-day grace
   "opens exactly one window in which investing is a real gamble against the first demand".
   At 149.7 stock it is no longer much of a gamble. Round 17 records this decision explicitly
   and routes it to the M1 play verdict rather than a round-3 retune; that is a legitimate
   owner, and it is the right call given the recovery constraint was binding. Recorded.
2. **The capex decision is exercised by no evidence at HEAD.** `player:buy_equipment` /
   `buyEquipment` has **zero** call sites in `e2e/` and **zero** in any agent policy. Across
   all 1300 sweep runs the `buy` action count is **0** (verified in the raw JSON). The
   "investment line" this clause proves is *pledge + gift + second crew*, not the 100-spice
   harvester that `market/market.ts` calls "the spine of the Act 1 slice". This is a distinct
   evidence hole from the balance question above and deserves its own owner.

### (c) The patience-1 recovery fixture survives two settlements — **HOLDS**

Re-ran `src/game-engine/sim/agents/recoveryProbe.test.ts`:

```
invariant-2 probe reading: survivors 10 of 10
distinct (settlements + actionCounts) signatures across 10 seeds: 1
signature: [{"cycleIndex": 2, "dueDay": 28, "paid": 52, "band": "partial", "patienceAfter": 1},
            {"cycleIndex": 3, "dueDay": 36, "paid": 53, "band": "partial", "patienceAfter": 1}]
           {"assign": 1, "gift": 3, "idle": 17, "settle": 2}
```

Sweep agrees at 100 seeds: `recovery-normal` 100/100 reach day 36 with no ending, patience
held at 1 through both settlements.

**Is the recorded reading honest?** I audited `distressedCampaign.ts`'s hand-set fields
against 07's defined recovery state, rather than accepting the module's own account.

| 07's required element | What the fixture does | Honest? |
|---|---|---|
| patience 1 | **Played.** Two forced-short settlements at day 12 and day 20 via `settleShort()`, which pays `minPartialPayment - 1` — a legal command, never above `legalRange.max`. Pinned by `distressedCampaign.test.ts` (`expect(reading.patience).toBe(1)`). | Yes |
| arrears | **Played.** Real shortfall carried with the production 0.25 surcharge. `expect(reading.arrears).toBeGreaterThan(0)`. Probe shows amountDue ≈ 87 at cycle 2 against a base of 30, i.e. ~57 of genuine arrears. | Yes |
| a damaged field | **Hand-set** to `remaining = 0`. Cited in-file with a measured reason (~80.5% of 760 still remained at day 20 in play, so exhaustion is unreachable inside the probe window). | Disclosed; **harder**, not easier |
| a threatened pledge | **Hand-set** to `UNPLEDGE_THRESHOLD + 3` = 33. Cited with the arithmetic (played value ~49 at day 20; ~19 more decay-days needed, past day 39, outside the window). | Disclosed; **harder**, not easier |

Both hand-set writes move the fixture *against* the agent, are cited at the write site with
the measured play value they replace, and are pinned by an assertion. The `handSet` array is
carried into the returned reading so a consumer cannot read the fixture without seeing them.
**The recorded reading is honest.**

**Two caveats worth recording:**

1. "Survive" here means *does not die*: the line pays PARTIAL twice, patience never recovers
   above 1, and arrears keep compounding. 07's invariant 2 asks exactly for survival of two
   settlements, so the clause is met — but the fixture demonstrates a stabilised decline, not
   a recovery.
2. Survival is **purchased by `BASE_AMOUNTS[2]` 260 → 30** (see §3). At round 1's value of
   173 the same line died. That single constant is the binding element of this clause.

### (d) No simulator mutation bypasses a production command — **HOLDS, with one disclosed fixture-construction exception**

**My own sweep of `sim/` for direct world writes**, not the guard's:

```
$ grep -rn "world\.[A-Za-z_.\[\]']*\s*\(=[^=]\|\.push(\|\.pop(\|\.splice(\|\.shift(\|\.unshift(\|++\|--\|+=\|-=\)" \
    src/game-engine/sim/ --include=*.ts | grep -v "\.test\.ts"
src/game-engine/sim/advance.ts:8:// `setTime: seconds => { world.time = seconds }` is the production   <- a comment
```

That is the *only* hit — and it is prose. `advance.ts` (read in full) writes nothing; every
function routes through `runtimeTick`, the same sequence `GameDriver.tick()` runs.
`runner.ts` dispatches through the real `commandHandlers` (`onTalk`, `onTravel`, `onPledge`,
`onSettle`, …) and `endDialogue`; `visibleState.ts` only reads.

**But my grep was wrong in the same way the guard is.** `distressedCampaign.ts` mutates world
state through aliases and neither the regex nor `noFormulaCopies.test.ts` sees it:

```ts
const sietch = world.sietches.find(s => s.villageId === RED_WALL)!
sietch.loyalty = NEAR_DECAY_LOYALTY
const field = world.spiceFields.find(f => f.id === RED_WALL_FIELD)!
field.remaining = 0
```

**Adjudication:** this is *fixture construction of 07's own defined starting state*, not a
mid-run bypass. 07's agent table itself defines `recovery` as one that "**Begin[s] from**
patience 1, arrears, a damaged field, and a threatened pledge", and the `recovery-patience-one`
fixture row says "from the defined distressed state". A state 07 defines as a starting
condition, and that play provably cannot reach inside the window the same invariant scopes,
has to be constructed. Both writes are disclosed, cited, harder-not-easier, and pinned. The
clause holds.

**Two structural weaknesses proven by probe, both worth closing:**

- `noFormulaCopies.test.ts` is a five-token grep. It is **blind to state mutation entirely**
  and blind to formula copies written as inline arithmetic. Demonstrated empirically in probe
  P5.
- `visibleState()` hands the agent a **live reference to `world.pendingSettlement`**. Every
  other collection (`crews`, `sietches`) is a mapped copy, and a write to those does not
  reach `world` — verified. `pendingSettlement` is the exception. Demonstrated in probe P2b.
  No shipped agent exploits it, but the boundary is a convention, not a structure.

---

## 3. The tuning audit (07's protocol + rejection criteria)

### FORBIDDEN levers — all intact

| Lever | Status at HEAD | Evidence |
|---|---|---|
| `BASE_AMOUNTS[0]` | **90, unchanged** | `git diff 1664998..3266ed4 -- quota.ts` shows `[90, 150, 260]` → `[90, 100, 30]`; index 0 untouched |
| `FIRST_DEADLINE_DAY` | **12, unchanged** | same diff |
| `STARTING_PATIENCE` / `MAX_PATIENCE` | **3, unchanged** | same diff |
| `PARTIAL_PAYMENT_FRACTION` (0.6) / `ARREARS_SURCHARGE` (0.25) | **unchanged** | same diff |
| `sietch/loyalty.ts` | **file unchanged over the whole package** | `git diff 1664998..3266ed4 -- src/game-engine/sietch/loyalty.ts` → empty |
| `game-engine/difficulty.ts` | **file unchanged** | `git diff 1664998..3266ed4 -- src/game-engine/difficulty.ts` → empty |
| WP03's 68/90/117 contract | **verified live in the release browser** — see probe P4 | |

### Levers that were changed, all disclosed in-code with citations

| File | Change | Round |
|---|---|---|
| `data/troopGroups.ts` | `MIN_PLEDGE_CREW_SIZE` 15 → 30 → **40** (sizeFactor 0.5 → 1.0 → 1.333) | 1 then 2 |
| `data/spiceFields.ts` | both opening densities → `MAX_AUTHORED_DENSITY` (95); was 45 / 55 | 1 then 2 |
| `game-engine/troops/types.ts` | `EXTRACTION_RATE.hand` 6 → **7** | 2 |
| `game-engine/quota/quota.ts` | `BASE_AMOUNTS[1]` 150 → **100**; `BASE_AMOUNTS[2]` 260 → 173 → **30** | 1 then 2 |
| `game-engine/market/market.ts` | player-facing copy corrected 3x → 2.9x to track the `hand` change | 2 |

Every one carries an in-file citation naming the problem, the measured evidence and the
round. The market copy change is exactly right: a rule change that would have made a
player-facing preview lie was tracked instead of ignored.

### Protocol compliance — 07's seven steps

| Step | Verdict |
|---|---|
| 1. Record problem + evidence | **Met.** Each citation names its measured failure (reserve 77.35 vs 90; invest 51.54 vs 54; recovery 0/10; cycle-2 stock 12.18 vs 166 due). |
| 2. **Smallest** authoritative lever | **Not met.** Five levers across four files, compounding to roughly a 5x opening-income increase against a 0.67x / 0.12x demand cut. Defensible as an *authored* retune, but it is not the smallest lever set, and 07 asks for the smallest. |
| 3. Predict affected strategies/acts/metrics | **Partly met.** One prediction pair exists, for round 1 only: "hand-math predicted 120/69, measured 118.85/68.76" (progress.md line 561). **Round 2 has no recorded prediction at all** — its citations state the problem and the change, never a forecast. |
| 4. Change one related lever set | **Met.** Two clean rounds, each a coherent set. |
| 5. Focused regression seeds, then the full sweep | **Met.** Sweep regenerated in `d615aa4`; the recovery probe and both line fixtures are the focused regressions. |
| 6. Human check where comprehension / pacing / fairness is affected | **Deferred with a named owner** — Round 17 routes the Normal overshoot to the M1 play verdict. Acceptable: M1's stop condition *is* handing the build to the user. |
| 7. Record result, retain before/after evidence | **Mostly met** — see the two integrity findings below. |

### `BASE_AMOUNTS[2] = 30` — recorded, but the record understates it

Round 17 records it: *"cycle-3's base-30 dip is a recorded temporary artifact owned by WP05's
act escalation."* An owner exists. **The word "dip" understates the change.** The curve is now
90 → 100 → **30**, i.e. non-monotonic, and `baseAmountForCycle()` compounds
`LATER_CYCLE_GROWTH = 1.5` **from index 2**, so *every* cycle from 3 onward is re-based:
cycle 3 is 45 where the old curve gave 390, cycle 4 is 67.5 where the old gave 585. The
entire post-opening demand curve is scaled down by roughly 8.7x. That is a campaign-wide rule
change made to satisfy one recovery fixture, not a local cycle-3 artifact, and WP05 should
inherit it described that way.

### Two evidence-integrity findings in the tuning record

1. **`quota.ts` cites numbers that its cited source does not contain.** The round-1 citation
   reads: *"measured before the cut (baseline/wp04-sweep/sweep-report.md): cycle-2 stock
   12.18 vs a 166 amountDue, 0/100 seeds even partial."* Neither `12.18` nor `166` appears in
   `sweep-report.md` at HEAD, **nor in its `1f83a47` revision** (both greps run). That
   intermediate measurement — post-yield-lever, pre-`BASE_AMOUNTS` cut — was taken on an
   uncommitted worktree and overwritten. It now exists only as the implementer's prose. 07's
   step 7 asks to retain before/after evidence, and the rejection criteria name "required
   evidence is replaced by an implementer's summary".
2. **The round-1 prediction/measurement pair has no artifact.** `118.85` and `68.76` appear
   in exactly one place in the whole repository: progress.md line 561. There is no retained
   run, log or report backing them. Note also that the *test-file* citations give different
   round-1 numbers for the same fixtures (123.97 reserve, 136.49 invest), so a reader cannot
   reconcile the two records. **This audit could not verify the "118.85 vs predicted 120"
   claim** — it is neither confirmed nor contradicted, only unbacked.

**What *is* properly retained:** the pre-retune sweep report survives in git at `1f83a47`
and gives clean before-evidence — Invariant 1 **FAIL** (reserve 100% partial, capacity 100%
short), Invariant 2 **FAIL** (0/100 survived). Against that, the after-state (100% FULL both
agents; 100/100 recovery survival) is a genuine, reproducible before/after pair.

### Rejection criteria, run verbatim

| Criterion | Verdict |
|---|---|
| A balance report **copies formulas** | **Not triggered.** `sim/` calls `projectIncome`/`totalDue`/`recommendedField` — production wrappers. My own read of `runOne.ts`, `metrics.ts`, `aggregate.ts`, `harness.ts` found no rule arithmetic; `recordSettlement` derives the band from `PendingSettlement`'s own snapshotted player-visible fields, the same comparison the settlement modal makes. |
| **mutates state** | **Triggered once, defensibly** — `distressedCampaign.ts`'s two fixture-construction writes. See clause (d). |
| **grants automatic capacity** | **Not triggered.** No crew, pledge, field, discovery or spice is granted anywhere in `sim/`. Every pledge and crew in the sweep comes from `onPledge`/`onAssignCrew`. |
| **Measurements compare values from different seeds, frames, or saves** | **Not triggered.** `runOne` pairs every metric inside one run; the reload spot-check compares the same config+seed; the determinism audit re-runs the identical pair. No cross-seed pairing found. |
| **Only optimized runs used to claim viability** | **Not triggered** — `novice` (explicitly the non-optimising policy) also reaches FULL/FULL on Normal. |
| **Testers coached through the choice under evaluation** | N/A — no human sessions in this package. |
| **A green build presented as proof of entertainment** | **Not triggered.** Round 17 routes the play verdict to the user and stops. |
| **Required evidence replaced by an implementer's summary** | **Partly triggered** — the two integrity findings above. |

---

## 4. The sweep as evidence

### 4.1 Spot re-runs vs the report

Rather than three seeds × two agents in isolation, I re-ran the **entire** sweep at HEAD and
diffed (§1.1) — a strictly stronger check, since it covers all 100 seeds × 13 configs. The
report reproduces byte-for-byte apart from the commit/wall-clock lines. Additionally, probe
P1 re-ran `reserve` on seeds 1, 2 and 7 and all four opening agents on seed 7 through the
harness independently of the sweep; every band matched the report's cohort figures.

### 4.2 The zero-variance finding — confirmed, and the guard is weaker than it looks

Aggregated from the raw sweep JSON at HEAD:

```
config           n     actions                                                                    distinctParityHash  distinctMinStock  distinctMaxStock
reserve-easy     100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
reserve-normal   100   travel 200, pledge 100, assign 100,            idle 2300, settle 200         100                 1                 1
reserve-hard     100   travel 200, pledge 100, assign 100,            idle 2300, settle 200         100                 1                 1
capacity-easy    100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
capacity-normal  100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
capacity-hard    100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
reactive-easy    100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
reactive-normal  100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
reactive-hard    100   travel 300, pledge 200, assign 200, gift 200, idle 2300, settle 200         100                 1                 1
novice-easy      100   travel 200, pledge 100, assign 100,            idle 2300, settle 200         100                 1                 1
novice-normal    100   travel 200, pledge 100, assign 100,            idle 2300, settle 200         100                 1                 1
novice-hard      100   travel 200, pledge 100, assign 100,            idle 2300, settle 200         100                 1                 1
recovery-normal  100                assign 100, gift 300,            idle 1700, settle 200         100                 1                 1
```

`distinctMinStock = distinctMaxStock = 1` in every cohort: **the sampled stock is identical to
four decimal places across all 100 seeds.** `buy` is **0 in all 1300 runs.**

**The mechanism, traced to source:** `troops/harvest.ts` — `wormRisk(hasHarvester=false)`
returns **0**. No agent ever buys a harvester, so `resolveWorm()` can never return
`attacked`, so the single RNG consumer in the window has no reachable effect. The seed is
inert.

**On the `finalParityHash`-differs-per-seed claim:** it is true (100 distinct hashes per
cohort) and it **is** a valid guard against a stale singleton — a stale read would repeat a
hash. But it is **not** variance evidence: `rng: { seed, step }` is inside the hashed view, so
the hashes would differ even if literally nothing else did. Probe P1 closes that loop
directly.

**Report-quality finding.** The report's Invariant-9 section says the sole RNG consumer's
*"only write, wormSightings, has zero production readers that gate a rule."* Read as a general
statement about `resolveWorm` this is **materially misleading**: `harvestRun.ts` shows the
attack branch applies casualties, may dissolve or merge the crew, and force-idles the
survivor — all rule effects. It happens not to fire here *only because `wormRisk` is 0
without a harvester*, which the report never says. Combined with thirteen repetitions of
"Outliers: none (every seed matches the cohort mode outcome)", the artifact reads as though
100 seeds were probed and agreed, when no seed *could* disagree.

To be fair to the builder: **progress.md Round 17 discloses this honestly** — *"zero seed
variance in the window (invariant 9's teeth)"*. The gap is between the round log and the
committed artifact, not a concealment.

### 4.3 The four opening agents are two behaviours on Normal and Hard, three on Easy

Probe P1b — **Normal, seed 7**, final state compared minus `rng`:

```
reserve vs capacity: state-identical = false
reserve vs reactive: state-identical = false
reserve vs novice:   state-identical = TRUE
capacity vs reactive: state-identical = TRUE
capacity vs novice:  state-identical = false
reactive vs novice:  state-identical = false
hashes = ["e3bb0ed13073ba39","790be6a4ee23c0b6","790be6a4ee23c0b6","e3bb0ed13073ba39"]
```

**Proven by byte-comparison (Normal, seed 7):** `reserve ≡ novice` and `capacity ≡ reactive`.
Round 17 discloses the second pair; **it does not disclose the first.**

**Established from the cohort metrics** in §4.2 — sound because zero variance means the cohort
figures *are* the single campaign — the grouping differs by difficulty:

| Difficulty | Distinct behaviours | Evidence |
|---|---|---|
| Easy | **3** — `reserve` / `capacity ≡ reactive` / `novice` | `reserve-easy` (gifts 2, pledges 2, min 20.0, max 301.0) ≠ `novice-easy` (gifts 0, pledges 1, min 60.0, max 214.4). Reserve's invest-the-surplus policy has surplus to invest on Easy. |
| Normal | **2** — `reserve ≡ novice` / `capacity ≡ reactive` | byte-proven above; action profiles and percentiles identical |
| Hard | **2** — `reserve ≡ novice` / `capacity ≡ reactive` | identical action profiles and identical stock percentiles (min 0.0, max 127.3) |

So the 12 opening configs hold 3 + 2 + 2 = **7 distinct campaigns**, plus `recovery-normal` =
**8 distinct campaigns behind 1300 rows.** Invariant 1 is still honestly served — `reserve`
and `capacity` *are* different policies on Normal (1 pledge / no gifts vs 2 pledges / 2
gifts) — but 07's invariant 7 dominance test cannot mean much across a set where two of the
five agents are aliases of two others on the difficulty it is scoped to.

### 4.4 07's "Collect at minimum" list vs what the report publishes

| 07 requires | In the report? |
|---|---|
| Ending and ending day | Yes |
| Tribute band + remaining patience per settlement | Yes (full per-seed patience arrays) |
| Min/max spice stock | Yes, with an honest sampling caveat |
| Pledge, crew, field progression | Yes |
| Equipment progression | **No** |
| Relationship progression | **No** (loyalty never reported) |
| Raids warned / defended / lost / recovered | N/A in Act 1, disclosed under Invariant 9 |
| Days with no useful legal command | Yes — `idle-decisions=23.00` per cohort |
| Objective completion and act duration | **No** |
| **Dominant command share** | **Collected, never published.** `dominantCommand`/`dominantShare` are computed in `runOne.ts` and present in the raw JSON (`travel 0.273`, `travel 0.333`, `gift 0.500`) but `aggregate.ts` drops them and no report section renders them. |
| **Unused command families** | **Never computed at all.** `grep -n unused sweep-report.md` → no match. `buy`, `issue` and `assault` are 100% unused across 1300 runs — precisely the finding this clause exists to surface. |
| Save/reload parity and invariant violations | Yes — 130/1300 spot-checked, all matched |

### 4.5 A stale sentence inside a live report

`invariants.ts:invariant1` appends a **hardcoded** parenthetical to a data-derived sentence.
At HEAD the report therefore reads:

> Viable == both agents reach 'full' on every seed: **true** *(progress.md Round 14's own
> reading: reserve lands **PARTIAL**, capacity's un-bridged invest line lands **SHORT**)*.

The status and the percentages are computed live and are correct; the parenthetical is frozen
prose from the pre-retune world and now contradicts the sentence it decorates. The same
staleness sits in `invariant2`'s doc comment ("Expected FAIL per recoveryProbe's own 10-seed
reading" — it is now 10/10 surviving). Report-quality defect; the numbers themselves are
sound.

---

## 5. Behavioral spot-probes

All probes were throwaway files, run, captured, and **deleted**. Final `git status` is in §7.

### P1 — cross-seed variance (`src/game-engine/sim/criticProbe.test.ts`, deleted)

```ts
it('reserve-normal: seeds 1 and 2 produce identical state apart from rng', () => {
  runAgentCampaign(reserveAgent, 1, 'normal', { throughDay: 22 })
  const a = parityView(world) as Record<string, unknown>
  const aHash = parityHash(world); const aStock = world.player.spice

  runAgentCampaign(reserveAgent, 2, 'normal', { throughDay: 22 })
  const b = parityView(world) as Record<string, unknown>
  const bHash = parityHash(world); const bStock = world.player.spice

  const strip = (v: Record<string, unknown>) => { const { rng: _rng, ...rest } = v; void _rng; return JSON.stringify(rest) }
  expect(strip(a)).toBe(strip(b))
  expect(aHash).not.toBe(bHash) // differs ONLY because rng.seed is inside the hashed view
})
```

Raw output:

```
P1 seed1 rng = {"seed":1,"step":23}  seed2 rng = {"seed":2,"step":23}
P1 seed1 parityHash = c0ab8c2c3086ee57  seed2 parityHash = 5eb2a15f0196e068  differ = true
P1 seed1 stock = 38.85168281416139  seed2 stock = 38.85168281416139  equal = true
P1 state-minus-rng identical = true
P1 stripped byte length = 14476
```

**Result: 14,476 bytes of campaign state identical between two seeds. The seed changes only
the seed.** P1b (four agents, seed 7) produced the alias table in §4.3.

### P2 — the `VisibleState` boundary, probed hostilely

```ts
it('a hostile policy cannot read rng/ending/hidden future from the view', () => {
  createCampaignRunner(99, 'normal')
  const json = JSON.stringify(visibleState())
  const forbidden = ['"rng"','"seed"','"step"','"ending"','"wormSightings"','"events"','"desertSites"']
  expect(forbidden.filter(k => json.includes(k))).toEqual([])
})

it('HOSTILE: can a policy WRITE production state through the view it is handed?', () => {
  const rc = createCampaignRunner(99, 'normal')
  walkOpeningBriefing(rc); walkToFirstCrew(rc); rc.advanceToDay(12)
  const before = visibleState().pendingSettlement
  console.log('LIVE REFERENCE =', before === world.pendingSettlement)
  before!.amountDue = 1
  expect(world.pendingSettlement?.amountDue).toBe(1)   // documents the hole
  const v2 = visibleState(); const size = world.troopGroups[0]?.size
  if (v2.crews[0]) v2.crews[0].size = 99999
  expect(world.troopGroups[0]?.size).toBe(size)        // copies do NOT reach world
})
```

Raw output:

```
P2 visibleState top-level keys = ["day","player","activeObjective","pendingSettlement","projection",
                                  "quota","crews","sietches","dialogue","travelCheck",
                                  "discoveredVillageIds","recommendedFieldId"]
P2 forbidden keys present in serialized view = []

P2b pendingSettlement present = true
P2b view.pendingSettlement === world.pendingSettlement (LIVE REFERENCE) = true
P2b after writing view.pendingSettlement.amountDue = 1, world reads 1
P2b crews[] copy write reached world = false
```

**Result:** the *read* boundary is clean — no rng, seed, step, ending, wormSightings, events
or undiscovered sites reachable. (Corroborated structurally: **no policy file** references
`world` at all — not `reserve`, `capacity`, `reactive`, `novice`, `recovery`, `policyHelpers`
or `dialoguePolicy`. The only `sim/` importers of `world` are `runner`, `advance`,
`visibleState`, `parityScript` and the `distressedCampaign` fixture builder.) The *write*
boundary is not structural:
`view.pendingSettlement` is a live reference and a policy can rewrite the amount due.

### P3 — manual EventBus replay of the parity fixture

```ts
const fixture = JSON.parse(readFileSync('e2e/fixtures/parity-reserve-line.json','utf-8'))
createCampaignRunner(fixture.seed, 'normal')
expect(parityHash(world)).toBe(fixture.entryParityHash)
const unwire = wireCommands()               // the PRODUCTION bus registration
for (let i = 0; i < 10; i++) {
  const step = fixture.phaseA[i]
  if (step.kind === 'command') { const [name, payload] = fixture.trace[step.ref]
                                 EventBus.emit(name, payload) }
  else if (step.kind === 'day') advanceSeconds(step.ref * DAY_SECONDS - world.time)
  else advanceSeconds(step.ref - world.time)
  expect(parityHash(world)).toBe(step.parityHash)
  expect(hashState(world)).toBe(step.hash)
}
unwire()
```

Raw output:

```
P3 entry: fixture = fac8002d0cdab61b  replay = fac8002d0cdab61b  match = true
0 command#0 expected=a70668544245ec48 got=a70668544245ec48 full=OK
1 command#1 expected=d575df6231daa47a got=d575df6231daa47a full=OK
2 command#2 expected=da02d56a0cf35168 got=da02d56a0cf35168 full=OK
3 command#3 expected=0e67c26d60920341 got=0e67c26d60920341 full=OK
4 command#4 expected=fe6a65d937d56a57 got=fe6a65d937d56a57 full=OK
5 command#5 expected=5d4d4e1f41c23b7f got=5d4d4e1f41c23b7f full=OK
6 command#6 expected=13c3bb41c4ee8222 got=13c3bb41c4ee8222 full=OK
7 command#7 expected=a66b21d352b1ccca got=a66b21d352b1ccca full=OK
8 arrival#6 expected=e7fdd4a4e172e4b9 got=e7fdd4a4e172e4b9 full=OK
9 command#8 expected=f69b434c32fa0da8 got=f69b434c32fa0da8 full=OK
```

**Result: every step matched on BOTH the narrow `parityHash` and the full `hashState`.** The
runner's direct-handler dispatch and the production `EventBus` seam are the same path. This
is independent of the committed parity spec — a different entry point, a different assertion,
same numbers.

### P4 — WP03's contract numbers through the real browser title flow (`e2e/criticProbe.spec.ts`, deleted)

```ts
for (const [label, expected] of [['Easy',68],['Normal',90],['Hard',117]]) {
  test(`P4: ${label} New Campaign -> Q1 due is ${expected}`, async ({ page }) => {
    await page.goto('/?debug=1')
    await enterGameFromTitle(page, label)          // real title -> difficulty card -> Start Campaign
    const q = JSON.parse(await page.evaluate(() => window.__DUNE__.parityViewJSON())).quota
    expect(q.amount).toBe(expected); expect(q.nextDueDay).toBe(12); expect(q.cycleIndex).toBe(0)
  })
}
```

Raw output:

```
P4 Easy:   engine quota = {"amount":68,"arrears":0,"cycleIndex":0,"nextDueDay":12,"patience":3,"restoredThisAct":false}
P4 Normal: engine quota = {"amount":90,"arrears":0,"cycleIndex":0,"nextDueDay":12,"patience":3,"restoredThisAct":false}
P4 Hard:   engine quota = {"amount":117,"arrears":0,"cycleIndex":0,"nextDueDay":12,"patience":3,"restoredThisAct":false}
  3 passed (11.1s)
```

**Result: 68 / 90 / 117 at day 12 with patience 3 — WP03's contract survives the retune, in
the release browser, through the production title flow.** (`difficulty.ts` and
`ui/title/` are both unchanged over the whole package, so this is consistent with the diff.)

### P5 — the `noFormulaCopies` blind spot (`src/game-engine/sim/criticBlindSpot.ts`, deleted)

A file placed inside the guard's own glob:

```ts
import { world } from '../GameState'
export function grantFreeSpiceAndCrew(): void {
  const p = world.player;      p.spice += 10_000            // free resources
  const s = world.sietches[0]; if (s) s.pledgedToPlayer = true   // free pledge
  const f = world.spiceFields[0]; if (f) f.remaining = 99_999    // refilled field
}
export function copiedYield(size: number, skill: number, density: number, rate: number): number {
  const sizeFactor = Math.min(2, Math.max(0.3, size / 30))
  return rate * sizeFactor * (0.5 + skill / 100) * (density / 100)   // a copied formula
}
```

Raw output:

```
$ npx vitest run src/game-engine/sim/noFormulaCopies.test.ts
 ✓ src/game-engine/sim/noFormulaCopies.test.ts (38 tests) 12ms
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

**Result: the guard passes a file that grants 10,000 free spice, a free pledge, a refilled
field, and re-implements the yield formula.** It only forbids five literal call tokens. It is
useful against the exact regression it was built for (`balance/simulate.ts`'s deleted parallel
economy) and nothing else. It should not be cited as structural enforcement of 07's may-not
list — only of one clause of it, one spelling deep.

---

## 6. What did NOT reproduce

| Claim / expectation | Outcome |
|---|---|
| Committed `sweep-report.md` header names the audited commit | **Did not reproduce.** It names `1f83a47 + uncommitted worktree`; HEAD is `3266ed4`. The *content* reproduces byte-identical, so this is a labelling defect, not a data defect. |
| `quota.ts`'s round-1 citation — "cycle-2 stock 12.18 vs a 166 amountDue" — is in `sweep-report.md` | **Did not reproduce.** Neither number is in that file at HEAD or at `1f83a47`. The artifact was overwritten. |
| The round-1 prediction pair "predicted 120/69, measured 118.85/68.76" | **Could not be verified.** Those figures appear in exactly one place in the repository (progress.md line 561) with no backing artifact, and the test-file citations give different round-1 numbers (123.97 / 136.49) for the same fixtures. Not contradicted — unbacked. |
| "The difficulty cards still say 68/90/117" | **Did not reproduce as stated.** The cards never displayed those numbers: `ui/title/difficultyCopy.ts` renders one sentence plus the raw multiplier table (0.75 / 1.0 / 1.3); 68/90/117 live only in that file's header comment. The *engine* values are 68/90/117 — verified through the real title flow in P4. Re-scoped, not a defect. |
| Ledger DOM shows the tribute amount immediately after New Campaign | **Did not reproduce** — my first P4 attempt timed out on `text=Imperial Tribute`. Cause is WP03 design (the ledger is revealed after the briefing beats, per `e2e/opening.spec.ts`), not a WP04 defect. Probe re-scoped to engine state. |
| `noFormulaCopies` enforces 07's may-not list | **Did not reproduce** — see probe P5. It enforces one clause, by literal token. |

Everything else this audit attempted **did** reproduce: all six gates, the full 1300-run
sweep, both parity specs, the recovery probe, both line fixtures, and the WP03 contract
numbers in the browser.

---

## 7. Rounds 16–17 — do they overstate?

| Round-17 claim | Verdict |
|---|---|
| "parity EXACT through two tribute cycles on both lines" | **Accurate**, and independently reproduced (P3). |
| "1300 runs in 68.5s" | **Accurate** (this audit measured 70.9s / 72.5s wall). |
| "zero seed variance in the window (invariant 9's teeth)" | **Accurate and honest** — the disclosure is in the round log. The committed *artifact* does not carry it; that is the gap. |
| "capacity ≡ reactive byte-identical" | **Accurate**, but **incomplete** — `reserve ≡ novice` is equally byte-identical and is not disclosed. |
| "recovery 0/100 → 100/100 with patience held" | **Accurate**, verified at 10 seeds and 100 seeds. |
| "294 files / 2364 tests; 28/28 E2E" | **Exact.** |
| "ALL FIVE TARGETS MET" | **Unverifiable.** T1–T5 are named nowhere but this compact line; no artifact enumerates them with their predictions. Not an overstatement, but not checkable either. |
| "simulate.ts DELETED (closes WP02's C5 carve-out + the 15-vs-28 divergence)" | **Accurate** — `balance/simulate.ts` and its test are gone from the diff; `troopGroups.ts`'s citation records the closure. |

**Carry-forwards — all three named in the task are recorded, with owners:**

- Normal overshoot → **M1 play verdict** (Round 17: *"the Normal overshoot goes to the M1 play
  verdict rather than a round-3 trade against the binding recovery constraint"*). Recorded.
- Cycle-3 base-30 dip → **WP05's act escalation** (Round 17: *"cycle-3's base-30 dip is a
  recorded temporary artifact owned by WP05's act escalation"*). Recorded, but the record
  understates the scope — see §3.
- Idle days → **design signal** (Round 17: *"~23/23 idle days recorded"*; the report publishes
  `idle-decisions=23.00` per cohort). Recorded.

**Three further carry-forwards this audit adds:**

- The harvester capex (`player:buy_equipment`) is exercised by **no** evidence at HEAD — zero
  e2e coverage, zero agent usage, zero in 1300 sweep runs — while `market.ts` calls it "the
  spine of the Act 1 slice".
- The sweep report is missing 07's **dominant command share** (collected, dropped in
  aggregation) and **unused command families** (never computed), plus equipment/relationship
  progression and objective/act duration.
- `visibleState()`'s live `pendingSettlement` reference and `noFormulaCopies`'s narrowness
  should both be closed before the simulator is trusted at campaign scale (WP06+).

---

## 8. Score and verdict

**Score: 8 / 10 against the exit proof.**

What earns the 8: all four clauses hold on evidence reproduced from scratch by an independent
run. Parity is genuinely strong — per-step hashes on both lines with a real reload, and a
second, independent seam (P3) landing on the identical bytes. The recovery reading is honest,
including its two hand-set fields, which are disclosed, cited, pinned, and push the fixture
*harder*. The bridge strip is real and complete. The retune preserved every FORBIDDEN lever,
and WP03's 68/90/117 contract was verified alive in the release browser after it. Every gate
is green and the sweep reproduces byte-identical at HEAD.

What costs the 2: the evidence is narrower than the artifacts imply. A "published 100-seed
sweep" with proven zero discriminating power, thirteen "Outliers: none" lines that cannot be
otherwise, two of five agents that are aliases of two others, an Invariant-9 sentence that
generalises past what the code does, an invariant-1 sentence that contradicts its own live
numbers, two 07-mandated sweep metrics missing from the report, a commit label two commits
stale, one citation pointing at numbers its named source has never contained, and a
five-token guard cited as structural enforcement that a 20-line probe walks straight through.
None of these falsifies a clause. Together they mean M1's balance proof rests on **eight
deterministic traces**, exact and reproducible, rather than on a distribution.

**Verdict line:**

> **WP04 — `verified`.** The exit proof holds in all four clauses on independently reproduced
> evidence: opening parity is exact per step on both lines across a reload; both Normal lines
> are viable through cycle 2 via production commands with the debug bridges gone; the
> patience-1 fixture survives both settlements 100/100 with patience held; and no simulator
> mutation bypasses a production command except the two disclosed, cited,
> harder-not-easier writes that construct 07's own defined recovery starting state. M1 may
> flip. The remediation notes in §3, §4 and §7 are carry-forwards, not blockers.

---

*This audit changed exactly one file: `docs/PRD/game-completion/baseline/wp04-critic-verdict.md`.
The regenerated sweep report and raw JSON were written to a scratch directory and the
committed report restored with `git checkout`. All probe files were deleted. No commits were
made.*
