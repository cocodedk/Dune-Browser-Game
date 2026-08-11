# WP01 Critic Verdict — Runtime authority and seeded time

Independent evidence auditor, fresh context. Judged against the WP01 exit proof in
`08-execution-plan.md` and the contract clauses in `02-runtime-consolidation.md`.

- **Commits audited:** `9afb07a`, `a583561`, `59d8667` (diff base `d0d4b39`);
  **delta re-audit: `bfee65a`**
- **Branch:** `feat/game-completion`
- **First-pass score: 6.5 / 10** — `verified` NOT warranted
- **After delta re-audit of `bfee65a`: 9 / 10 — `verified` IS warranted.**
  See §9 "Delta re-audit" for the revised verdict; §1-§8 are preserved unedited as the
  first-pass record.

**First-pass finding (superseded by §9):** the exit proof names five fixtures that must
"pass through production engine entry points". Four of them did, and held up under
independent probing. The fifth — **save/reload** — failed on all three production
session-boundary paths, two of those failures being regressions this package introduced.
`bfee65a` fixed all three; §9 re-probes them.

---

## 1. Re-runs (raw tails) — first pass, at `59d8667`

### `npx tsc --noEmit`

```
EXIT=0
```

No output, exit 0.

### `npx vitest run` (full suite)

```
 RUN  v4.1.4 /home/cocodedk/0-projects/Dune-Browser-Game


 Test Files  237 passed (237)
      Tests  2037 passed (2037)
   Start at  01:47:05
   Duration  15.40s (transform 5.65s, setup 0ms, import 14.12s, tests 29.27s, environment 13ms)
```

Matches round 5's claim (237 files / 2037 tests) exactly. Both re-runs reproduce.

### Surviving WP00 characterization pins (the WP02 seam check)

```
 ✓ baseline/combatPledgePath.characterization.test.ts  (4 tests)
 ✓ baseline/spiceTripleCredit.characterization.test.ts (2 tests)
 ✓ baseline/sietchPayoutLoop.characterization.test.ts  (4 tests)
 Test Files  3 passed (3)
      Tests  10 passed (10)
```

**No over-removal.** The two WP02 legacy seams still fire in production. `dayRunner.ts:35`
still calls `updateVillages()` and `dayRunner.ts:81-93` still runs the sietch payout loop,
both under explicit `LEGACY PRODUCTION SEAM — WP02 removes` comments. The triple-credit
pin still measures 16.148.

---

## 2. Completeness hunt — residue

### (a) Campaign-reachable faction / `AISystem.updateAI` calls

**Day-loop path: clean.** Traced `GameLoop.ts` → `dayRunner.ts` → `EconomySystem`,
`VillageSystem`, `sietch/updateSietches`, `TimeSystem`, `rng/rng`. No faction module on
that trace. `updateAI` has **zero production importers** — the only non-test occurrences
are its own definition (`AISystem.ts:29`) and a comment (`GameLoop.ts:24`). `AISystem.ts`
itself still imports `faction/goals`, but nothing imports `AISystem`, so the whole subtree
is dead on the campaign path. `GoalExecutor`, `conflict`, `diplomacy`, `diplomacyEngine`,
`strategy-profiles` have no non-test importer outside `faction/` itself.

**One campaign-reachable faction mutation survives, off the day loop:**

| Site | What it does |
|---|---|
| `src/game-engine/DialogueSystem.ts:97-101` | `applyPlayerAction(effect.reputationAction, toReputationWorld(world))` → writes `world.factionProfiles` |

This is reputation from an **explicit player dialogue choice**, not the emergent
goals/diplomacy/territory sim that 02's retire-table names. It is not reachable from
`GameLoop`/`dayRunner`. **Owner: WP02** (command consolidation). Not a WP01 exit-proof
failure, but it is the one place a campaign import still writes faction state.

### (b) Surviving `goalType` / PoC evaluation on the campaign path

**PoC evaluators are dead.** `grep -rn "playerControlsAll|hasPlayerSurvived" src/` excluding
tests returns **zero hits**. The old block (`d0d4b39:src/game-engine/GameLoop.ts:142-152`),
which wrote `world.ending = 'win_military'` off `goalType` every frame, is gone.
`createInitialState` no longer seeds `goalType` (`GameState.ts:58-62`).

**But `goalAchieved` — the "derived shadow" — is still load-bearing in three places:**

| Site | Problem |
|---|---|
| `src/game-engine/economy/actRun.ts:46` | `if (world.goalAchieved) return` — the act machine's own freeze guard reads the **shadow**, not `world.ending`, the declared authority |
| `src/ui/GoalOverlay.tsx:14` | `if (!world.goalAchieved) return null` — the end-of-run overlay is gated on the shadow |
| `src/ui/StatusBar.tsx:19,67,81` | speed and difficulty controls gated on the shadow |

02 "Campaign status" permits `goalAchieved` "temporarily as a derived compatibility value".
It does **not** permit it as the freeze authority, and round 5's claim that "freeze checks
[were] aligned by lead to `world.ending`" is true of `GameLoop.ts:15` and
`dayRunner.ts:124` but **false of `actRun.ts:46`**. See §6.

Downgraded from a reachable defect to a **latent hazard**: I checked every legacy writer of
`goalAchieved` at the base commit (`EconomySystem.ts:72`, `GameLoop.ts:144,148`,
`actRun.ts:51`, `debugSources.ts:67`) and all five set `world.ending` in the same block, so
no shipped save can carry `goalAchieved=true, ending=null` and zombie-freeze the act
machine. The hazard is that nothing enforces that invariant.

### (c) `Math.random` / `Date.now` in `src/game-engine/`

Actual call sites (comments excluded), non-test:

| Site | Declared? |
|---|---|
| `CombatSystem.ts:46` | yes — deferred |
| `CombatSystem.ts:77` | yes — deferred |
| `economy/endgameOps.ts:75` | yes — deferred |
| `faction/GoalExecutor.ts:28` | yes — deferred |
| `faction/GoalExecutor.ts:39` | yes — deferred |
| `faction/GoalExecutor.ts:68` | yes — deferred |
| `faction/conflict.ts:99` | yes — deferred |
| `faction/strategy-profiles.ts:77` | yes — deferred |

**8 sites, exactly the declared deferral list (CombatSystem ×2, faction ×5,
endgameOps.ts:75). Zero undeclared `Math.random` sites.** This claim reproduces precisely.

`Date.now` — **one undeclared site**:

| Site | Assessment |
|---|---|
| `src/game-engine/persistence.ts:32` | `savedAt: Date.now()` — save-envelope metadata, outside `WorldState`, never read by simulation and not part of the canonical form. Non-blocking, but it is a wall-clock read in `src/game-engine/` that the round-5 note does not mention. |

### (d) Serialized save fields

`state/canonical.ts:37` does strip `goalType`/`goalAchieved`, `state/schema.ts:39` enforces
it at the type level, and `rng` is included (`canonical.test.ts:35-39` pins
`{seed: 42, step: 0}`). **The module is correct.**

**It is not wired to the save path.** `serializeCanonical` has exactly one production-side
caller — `state/hash.ts:29` — and `hashState` has **zero** production callers (only
`dayRunner.determinism.test.ts` and `state/hash.test.ts`). `CanonicalSaveEnvelope`
(`schema.ts:25-29`) is referenced nowhere at all.

What production actually writes:

```
src/game-engine/persistence.ts:31-34
    tx.objectStore(STORE_NAME).put(
      { version: CURRENT_SAVE_VERSION, savedAt: Date.now(), state: world },
      KEY,
    );
```

The raw `world` object, structured-cloned into IndexedDB — **`goalAchieved` included**. And
`persistence.test.ts:56-63` actively *pins* the `goalAchieved` save round-trip. So 02
"Campaign status" — `goalAchieved` "must not be serialized" — **fails on the production
path**, and WP01's scope line "implement canonical state serialization" is satisfied as a
module but not as the shipped save format.

`goalType` itself **is** clean: absent from new saves, and `migrateV2ToV3`
(`saveMigration.ts:125-128`) drops it from old ones.

**Spec-vs-scope note:** 02 "Save migration" point 4 requires dropping "`goalType`, aggregate
troops, faction-AI timers, and legacy sietch task progress". Migration drops only
`goalType`; `player.troops`, `aiTimers`, and sietch task progress survive. Consistent with
the round-4 scope call (they die in WP02) — recorded, not scored against WP01.

### Residue summary — 7 items

| # | Item | Owner | Blocks WP01? |
|---|---|---|---|
| 1 | `store.ts:85-92` in-session Load replays intervening days; `store.ts:94-105` New leaves the fresh run inert (same root cause — module-level `lastDay`) | **WP01** | **yes** |
| 2 | Reload re-processes the saved day (`TimeSystem.crossedDays`) — third manifestation of the same root cause | WP01 (pre-existing) | **yes** |
| 3 | Canonical serializer unwired; `goalAchieved` persisted (`persistence.ts:32`) | WP01 | yes |
| 4 | `actRun.ts:46` freeze guard reads the shadow, not `world.ending` | WP01 | no |
| 5 | `DialogueSystem.ts:97-101` faction reputation write | WP02 | no |
| 6 | `FactionPanel` (`App.tsx:51`), `SietchCommandSection` (`VillagePanel.tsx:91`), troops/influence readouts (`StatusBar.tsx:65-66`) | WP02/WP03 | no |
| 7 | `Date.now` at `persistence.ts:32` | WP01 | no |

Item 6 is doc-02 acceptance-criterion-2 residue, explicitly outside WP01's scope. Worth
flagging for the lead: `FactionPanel` is still mounted while the sim behind it no longer
runs, so it now renders permanently frozen data.

---

## 3. Fixture authenticity

| Fixture | Production entry points? | Verdict |
|---|---|---|
| `GameState.test.ts` — new-campaign-normal | `createInitialState` | **Authentic.** Asserts every 02 table value (Arrakeen, day 0, 60 spice, no pledge, no crew, Q1 90/day 12). Honestly scopes out the "no faction-AI event" clause in its header rather than faking it. |
| `dayRunner.determinism.test.ts` — multi-day-catch-up | `setWorld`/`initLoop`/`update` | **Authentic and non-trivial.** Branch A jumps day 2→5 in one `update(1)`; branch B makes three one-day calls; both land intermediate days on the same exact `day * DAY_SECONDS`, so `hashState` equality is a real equivalence proof, not an alignment artifact. |
| `dayRunner.determinism.test.ts` — seeded-prospect | same | **Authentic but incomplete.** Proves same-seed reproducibility and `step > 0`. It does **not** prove the draws affect state — if every roll were drawn and discarded, both assertions still pass. Closed by my PROBE C. |
| `dayRunner.determinism.test.ts` — save-load reset | `createInitialState`/`setWorld`/`initLoop`/`update` | **Weakest of the five.** Its fixture (day 40 with `quota.nextDueDay` still 12) is a state production cannot reach, and it asserts only `cycleIndex === 1` — no-backfill. It is written so it cannot observe the single-day re-process (PROBE A) or the in-session Load replay (PROBE B). No `serializeWorld`/`deserializeWorld` round trip at all, despite "save/reload" being the exit-proof clause it stands for. |
| `dayRunner.quarantine.test.ts` — no-faction | `setWorld`/`initLoop`/`update` | **Authentic, with one inert assertion.** The `factionProfiles`/`regions`/`aiTimers` deep-equality checks are the real content, and its header correctly explains why an event-type filter would be a false signal. `expect(updateAI).not.toHaveBeenCalled()` cannot fail today because the code under test no longer imports the module — that is a **regression tripwire**, not a tautology: it fires the day the import returns. |
| `dayRunner.ending.test.ts` — campaign-goal-authority | `setWorld`/`initLoop`/`update` | **Weak but valid.** Makes every village player-owned in act 2 and asserts the run stays active. Since `goalType` is no longer seeded *and* the PoC check is gone, this cannot fail by two independent removals — a pin, not a discriminating proof. |
| `dayRunner.ending.test.ts` — patience-0 | same | **Authentic.** Hand-sets quota preconditions (legitimate — that is the fixture setup), then drives the real loop and asserts exactly one `poc_goal_achieved` event with the exact message. Genuinely proves the single-ending-writer collapse. |
| `saveMigration.v3.test.ts` | `migrateV2ToV3`/`migrateSave` | **Authentic.** Idempotency by deep-equal, seed stability, seed divergence on differing identity, `goalType` dropped, v1→v3 chain. No mocking of the system under test. |

**No fixture mocks the system it claims to prove.** The two weaknesses are
under-assertion (seeded-prospect, save-load reset), not fakery.

---

## 4. Behavioral spot-probes (my own construction)

Two throwaway files, run with `npx vitest run --reporter=verbose`, **deleted afterwards**
(tree cleanliness shown in §7).

### PROBE A — reload re-processes the day the save was taken on — **FAILS**

```ts
// Uninterrupted control: days 0..5, then one ordinary extra frame.
setWorld(withHarvestCrew(31))
initLoop()
for (const d of [0, 1, 2, 3, 4, 5]) advanceToDay(d)
update(1 / 60)
const controlSpice = world.player.spice
const controlHash  = hashState(world)
const blob = serializeWorld(world)

// Production reload: main.tsx loadFromSave() -> setWorld, then ThreeContainer
// mount -> GameDriver.initLoop() -> resetTime(), then the first frame.
// No player command in between.
setWorld(deserializeWorld(blob))
initLoop()
update(1 / 60)

expect(hashState(world)).toBe(controlHash)
```

```
PROBE A  control  spice=76.1072 step=6 events=12 hash=8a2098027e89806d
PROBE A  reloaded spice=78.7208 step=7 events=13 hash=38e373a2630a565a
PROBE A  deltas: spice=2.6136 rngStep=1 events=1
PROBE A  canonical keys that drifted: events, player, rng, spiceFields, time, villages
 × state after save->reload->one frame differs from an uninterrupted run
   → expected '38e373a2630a565a' to be '8a2098027e89806d'
```

Reloading grants **+2.61 free spice, one extra RNG draw, one extra event**, and drifts six
canonical top-level keys — with no player command. Directly violates 02's rejection
criterion *"A seeded campaign outcome changes after save/load with no additional player
command."*

Mechanism: `main.tsx:6` loads the save, `ThreeContainer.tsx:92` calls
`GameDriver.initLoop()` → `resetTime()` → `lastDay = null`
(`TimeSystem.ts:29,43-45`). The first frame then has `crossedDays()` return `[currentDay]`
(`TimeSystem.ts:31-34`) and `runDay()` executes for a day whose boundary already ran in the
saving session.

**Fairness:** this is **pre-existing, not introduced by WP01.** At `d0d4b39`,
`resetTime()` set `lastDay = -1` and `isDayBoundary()` returned true on the first call for
the same reason (round 1 recorded this as "the first `update()` after `initLoop()` always
fires a day boundary"). WP01 did not create it — but it also did not close it, and the
shipped save/reload fixture is written so it cannot see it.

### PROBE B — in-session Load replays every intervening day — **FAILS (new regression)**

```ts
// A REAL save: played day by day through the production loop to day 20, with
// the tribute clock pushed out so the run is still ACTIVE (an ended run
// freezes update() and would mask the replay entirely).
const start = withHarvestCrew(31); start.quota.nextDueDay = 9999
setWorld(start); initLoop()
for (let d = 0; d <= 20; d++) advanceToDay(d)
const genuine = serializeWorld(world)
const savedStep = world.rng.step

// A live session sitting on day 3.
const fresh = withHarvestCrew(31); fresh.quota.nextDueDay = 9999
setWorld(fresh); initLoop()
for (const d of [0, 1, 2, 3]) advanceToDay(d)

// src/ui/store.ts:85 loadGame(): setWorld(loaded) only — no initLoop(), so
// TimeSystem's module-level lastDay is still 3 from the old session.
setWorld(deserializeWorld(genuine))
update(1 / 60)  // ONE frame, no player command

expect(world.rng.step).toBe(savedStep)
```

```
PROBE B  saved day-20 state: spice=113.29 quota.cycleIndex=0 rng.step=21 ending=null
PROBE B  after ONE frame post-Load: spice=150.60 quota.cycleIndex=0 rng.step=38 ending=null
PROBE B  days replayed in that single frame ~= 17 (rng.step delta 17)
 × loading a genuinely-played day-20 save mid-session replays every intervening day
   → expected 38 to be 21
```

**Clicking "Load" replays 17 days in one frame and hands the player 37.31 free spice.**

An earlier variant of this probe against a day-40 save was worse — it settled four quota
cycles and **ended the run outright**:

```
PROBE B  rng.step 0 -> 33 (one frame), spice 60.00 -> 0.00
PROBE B  quota.cycleIndex=4 patience=0 ending=loss_patience
```

**This one IS a WP01 regression.** At `d0d4b39`, `isDayBoundary()`
(`git show d0d4b39:src/game-engine/TimeSystem.ts:15-22`) returned true once per crossing and
processed exactly **one** day no matter how many were skipped. WP01 replaced it with
`crossedDays()`'s catch-up loop (`TimeSystem.ts:30-41`, `dayRunner.ts:113-126`). The null
sentinel guards the fresh-mount path; nothing guards the in-session Load path, because
`store.ts:85-92` calls `setWorld(loaded)` and **never** calls `initLoop()`.

### PROBE F — "New" mid-session leaves the fresh campaign inert — **FAILS (new regression)**

```ts
// A live session that has reached day 20 (TimeSystem lastDay = 20).
const start = withHarvestCrew(31); start.quota.nextDueDay = 9999
setWorld(start); initLoop()
for (let d = 0; d <= 20; d++) advanceToDay(d)

// src/ui/store.ts:94-105 newGame(): deleteSave() + resetWorld(), then the
// React store is handed a fresh state. No initLoop() anywhere.
resetWorld()
setWorld(withHarvestCrew(31))

for (const d of [0, 1, 2]) advanceToDay(d)  // three days of the NEW campaign
expect(after.step).toBeGreaterThan(before.step)
```

```
PROBE F  new campaign before days 0-2: {"spice":60,"step":0,"events":0,"day0Fields":360}
PROBE F  new campaign after  days 0-2: {"spice":60,"step":0,"events":0,"day0Fields":360}
 × processes zero days across days 0..2 of the new run
   → expected 0 to be greater than 0
```

**A campaign started with the "New" button mid-session processes zero day boundaries.**
Spice frozen at 60, no RNG draws, no events, spice field untouched — the simulation is
completely dead until game time passes the *old* session's day 20.

This is the **inverse** of PROBE B and the same root cause. `crossedDays()` only moves
forward — `TimeSystem.ts:36`, `if (day <= lastDay) return []` — and **never resyncs
downward**. The base commit's `isDayBoundary()` used `day !== lastDay`
(`d0d4b39:src/game-engine/TimeSystem.ts:17`), which *did* resync downward, so this too is
**WP01-introduced**. `store.ts:94-105` `newGame()` calls `resetWorld()` but, like
`loadGame()`, never `initLoop()`.

"Play Again" on the ending overlay is safe — `GoalOverlay.tsx:29` does
`window.location.reload()`, which remounts `ThreeContainer` and so does call `initLoop()`.
The live path is StatusBar's **New** button (`StatusBar.tsx:60` → `handleNew` → `newGame`).

### PROBE C — seed divergence — **PASSES** (closes the seeded-prospect gap)

```ts
const a1 = runSeed(23, 8); const a2 = runSeed(23, 8)
const b  = runSeed(24, 8); const c  = runSeed(9999, 8)
expect(a1.hash).toBe(a2.hash)
expect(b.hash).not.toBe(a1.hash)
expect(c.hash).not.toBe(a1.hash)
```

```
PROBE C  seed 23   hash=643b5fcc38b95855 step=30 fieldsFound=2
PROBE C  seed 23   hash=643b5fcc38b95855 step=30 fieldsFound=2 (repeat)
PROBE C  seed 24   hash=5252dcd079eaee42 step=27 fieldsFound=3
PROBE C  seed 9999 hash=6d953ae7363f484d step=30 fieldsFound=3
 ✓ two different seeds produce different state, same seed reproduces exactly
```

The RNG genuinely **drives outcomes** — seed 24 discovers 3 spice fields where seed 23
discovers 2, and draw counts differ (27 vs 30). Not a drawn-and-discarded cursor. This is
the strongest single result in the package.

### PROBE D — organic patience loss — **PASSES**

```ts
setWorld(createInitialState(1)); initLoop()
for (let d = 0; d <= 80 && endingDay === null; d++) { advanceToDay(d); if (world.ending !== null) endingDay = d }
expect(world.ending).toBe('loss_patience')
expect(world.events.filter(e => e.type === 'poc_goal_achieved')).toHaveLength(1)
```

```
PROBE D  organic ending: loss_patience on day 36 (patience=0, cycleIndex=4)
PROBE D  poc_goal_achieved events: 1 -> ["The Emperor recalls you. Arrakis is taken from your house."]
PROBE D  goalAchieved=true (derived shadow of world.ending)
 ✓ ends on one day, with exactly one ending event, written by runActCheck
```

**Exactly one ending event** — the writer collapse holds on an organic run, not just the
hand-set fixture.

**Day 36 vs the WP00 baseline's day 28.** This is not drift: the opening deliberately
changed in round 4 (0 → 60 spice, `GameState.ts:48`; starting crew removed,
`GameState.ts:78`), both cited to `00-index.md` "Opening state". The extra 60 spice buys a
`partial` band on an early cycle instead of a `short` one, preserving one patience point —
an 8-day shift, one full quota cadence. **Consistent with the intended change; the baseline
row should be re-captured rather than treated as a regression.**

### PROBE D2 — the run stays frozen after an ending — **PASSES**

```
PROBE D2 before={"spice":0,"step":0,"events":12} after 11 more day advances={"spice":0,"step":0,"events":12}
 ✓ no further day processes once world.ending is set
```

`world.ending` as freeze authority works end to end (`GameLoop.ts:15`, `dayRunner.ts:124`).

### PROBE E — RNG advances and resumes across save/load — **PASSES**

```
PROBE E  step: init=0 afterDay0=1 afterDay2=3
PROBE E  control day3 step=4 spice=70.8199 | reloaded day3 step=4 spice=70.8199
 ✓ step increases across a day and a reloaded run continues the same sequence
```

A day with rolls advances `rng.step`; a save/load resumes the **same** sequence rather than
restarting it — identical step **and** identical spice to four decimals. `world.rng` is
genuinely advanced and genuinely persisted.

---

## 5. The correctness question

**Does anything on the campaign path still depend on retired authority?**
No `goalType` and no PoC evaluator — those are genuinely gone. But `goalAchieved` is still
a **persisted** duplicate of `world.ending` (`persistence.ts:32`) and is still the freeze
guard at `actRun.ts:46` and the gate for two UI surfaces. 02 forbids serializing it.

**Over-removal — do the WP02 seams still fire?**
Yes. 10/10 surviving characterization tests pass; both seams are present and commented in
`dayRunner.ts:35` and `:81-93`. No over-removal. The two deleted characterization files
(`pocGoal`, `factionDayUpdate`) pinned exactly the behavior this package removes, and their
own headers pre-authorized deletion *"as part of those packages… must be cited in their
diffs"* — round 5 cites them. Legitimate.

**Is `world.rng` actually advanced and persisted?**
Yes — PROBE E and PROBE C together settle it. Advanced per day, written back once
(`dayRunner.ts:95`), serialized (`canonical.test.ts:35-39`, and IndexedDB stores the field
on the raw object), resumed exactly on reload.

**Forward risk (not a WP01 failure).** `dayRunner.ts:120` pins intermediate days of a
batched jump to exactly `day * DAY_SECONDS`, while N sequential frames land on real
fractional times. `harvestRun.ts:54` writes `atTime: world.time` into `wormSightings`, which
**is** canonical. So batched and sequential paths will produce different hashes under
realistic frame timing even though both process every day correctly. That is not a 02
violation (02 requires each day to process, not byte-identical timestamps) — but it will bite
acceptance criterion 5's runtime/simulator hash parity. The determinism fixture sidesteps it
by choosing a `prospect` crew, and its header says so honestly.

---

## 6. Does the round 4-5 narrative overstate the code?

Mostly no. It is unusually disciplined — the deferral list is exact, the scope calls are
pre-declared, and the deletions are cited. Three corrections:

| Claim | Reality |
|---|---|
| R5: "freeze checks aligned by lead to `world.ending` as the authority" | True at `GameLoop.ts:15` and `dayRunner.ts:124`; **false at `actRun.ts:46`**, which still returns on `world.goalAchieved`. |
| R5: "The three surviving baseline tests pass unmodified (`git diff` on them empty)" | True **of commit `59d8667` only**. Across the package (`d0d4b39..59d8667`), `spiceTripleCredit.characterization.test.ts` is modified (+18/-18) — legitimately, cited in round 4. A reader of round 5 alone would conclude all three were untouched by WP01. |
| R4: "deterministic `serializeCanonical` omitting `goalType`/`goalAchieved`" | Accurate about the module, but nothing in the narrative discloses that **no production code calls it** and the real save writer stores the raw world with `goalAchieved` intact. |
| R5: "WP01 fixture coverage complete: … save-load (BD determinism tests)" | **Overstated.** The save-load fixture never round-trips a save (`serializeWorld`/`deserializeWorld` do not appear in it) and covers only no-backfill on a state production cannot reach. |

The `Math.random` deferral list reproduced **exactly** — 8 sites, all declared, zero
undeclared. That claim is fully honest.

---

## 7. Tree state

Probe files deleted after running:

```
$ git status --short
 M docs/PRD/game-completion/progress.md
?? docs/PRD/game-completion/baseline/wp01-critic-verdict.md
```

`progress.md` was already modified **before** this audit began (pre-existing dirty state,
untouched by me). This verdict file is the only thing I added. No commits.

---

## 8. Score and verdict

### Score: 6.5 / 10

**What earns it:** the seeded RNG is real and provably drives outcomes (PROBE C), persists
and resumes exactly (PROBE E); the faction/PoC quarantine is genuine at the import level,
not CSS-hidden; the ending-writer collapse holds on an organic run with exactly one event
(PROBE D); the freeze authority works (PROBE D2); multi-day catch-up equivalence is a real
proof, not an alignment artifact; v3 migration is correct and idempotent; every WP02 seam
still fires; and the `Math.random` deferral list is exact with zero undeclared sites.

**What costs it:** the exit proof names **save/reload** as one of five fixtures that must
pass through production entry points. All three production session-boundary paths fail —
reload, in-session Load, and New — two of them with regressions this package introduced.
The shipped fixture is constructed so it cannot detect any of them. Separately, the
canonical serializer that WP01's scope promised is not connected to
the save path, so 02's explicit "must not be serialized" clause for `goalAchieved` is unmet.

### Single biggest gap

**Day-boundary bookkeeping lives in unserialized module-level state that the production load
paths do not reset — and WP01's new catch-up loop turned that from a one-day error into an
unbounded replay.**

`lastDay` (`TimeSystem.ts:29`) is module-global, is not part of `WorldState`, is not saved,
is reset only by `initLoop()`, and `crossedDays()` never resyncs it downward
(`TimeSystem.ts:36`). That single root cause produces **three** production failures:

- **`store.ts:85-92` (in-session Load) never calls `initLoop()`** → `crossedDays()` returns
  every day from the stale session's `lastDay+1` to the loaded save's day and replays them
  in one frame. Measured: **17 days, +37.31 spice**; on a day-40 save, **four quota cycles
  and an immediate `loss_patience`**. *New in this package* — `d0d4b39`'s `isDayBoundary()`
  processed exactly one day per crossing.
- **`store.ts:94-105` (New button) never calls `initLoop()` either**, and `crossedDays()`
  never resyncs downward → a fresh campaign started mid-session processes **zero** day
  boundaries until game time passes the old session's day. Measured: **0 days, 0 draws, 0
  events across days 0-2.** *New in this package* — `d0d4b39`'s `day !== lastDay` resynced
  downward.
- **`main.tsx:6` + `ThreeContainer.tsx:92` (page reload) does call `initLoop()`**, so
  `lastDay = null` → the first frame re-runs the day the save was taken on. Measured:
  **+2.61 spice, +1 RNG draw, +1 event, six canonical keys drifted.** *Pre-existing*, but
  inside WP01's exit-proof clause and invisible to the shipped fixture.

Actionable fix: make the last-processed day part of `WorldState` (so it survives
serialization and both load paths inherit it correctly), and replace the save-load fixture
with one that round-trips a real `serializeWorld`/`deserializeWorld` blob through **both**
production load sequences and asserts `hashState` is unchanged by the load itself.

### Verdict line

**`verified` is NOT warranted for WP01.** The package is substantially real work and four of
its five exit-proof fixtures survive independent probing, but the save/reload clause fails on
all three production session-boundary paths, two of those failures are regressions introduced
here, and the fixture standing for that clause is written so it cannot observe any of them.
WP01 remains
`in_progress` pending the day-boundary ownership fix, a save-load fixture that actually
round-trips through production, and either wiring the canonical serializer into the save path
or dropping `goalAchieved` from what is persisted.

Same bar as the WP00 precedent: first-pass audit names the gaps, the lead fixes them, a delta
re-audit warrants the status.

---

# 9. Delta re-audit (`bfee65a`)

Second pass, same auditor. Scope: **only the deltas** — the three blocking findings from
§8, the migration decision, and the canonical save wiring. Non-blocking residue re-checked
by inspection, not re-probed.

**Fix under review:** `WorldState.lastProcessedDay` replaces TimeSystem's module-global;
production persistence writes a canonical **v4** envelope via `toEnvelope`/`fromEnvelope`;
`migrateV3ToV4` backfills a missing `lastProcessedDay` to the save's own current day.

## 9.1 Re-runs at HEAD (raw tails)

### `npx tsc --noEmit`

```
TSC_EXIT=0
```

### `npx vitest run` (full suite)

```
 RUN  v4.1.4 /home/cocodedk/0-projects/Dune-Browser-Game


 Test Files  238 passed (238)
      Tests  2045 passed (2045)
   Start at  02:46:38
   Duration  15.29s (transform 5.50s, setup 0ms, import 14.23s, tests 28.82s, environment 13ms)
```

238 files / 2045 tests (up from 237 / 2037: `dayRunner.sessionBoundary.test.ts` plus
migration and persistence additions). `resetTime()` is fully removed — `grep -rn "resetTime" src/`
returns nothing, so no dangling reference survives its deletion.

## 9.2 The three blocking findings, re-probed

I re-ran my own PROBE A / B / F code against HEAD, with the assertions restated the way a
**correct** engine should satisfy them (first pass they were written to expose the defect).

```
DELTA A  control  spice=76.1072 step=6 hash=d8c38f27d3524b52
DELTA A  reloaded spice=76.1072 step=6 hash=d8c38f27d3524b52 lastProcessedDay=5
DELTA A  deltas: spice=0.0000 rngStep=0

DELTA B  saved day-20: spice=113.29 step=21 cycleIndex=0 lastProcessedDay=20
DELTA B  after ONE frame post-Load: spice=113.29 step=21 cycleIndex=0
DELTA B  days replayed = 0

DELTA F  before days 0-2: {"spice":60,"step":0,"events":0}
DELTA F  after  days 0-2: {"spice":68.14577723136,"step":3,"events":8} (lastProcessedDay=2)

DELTA F2 one frame on a null-bookkeeping day-4 world: step 0 -> 1, lastProcessedDay=4

 ✓ DELTA PROBE A: page reload must not re-process the saved day
 ✓ DELTA PROBE B: in-session Load must not replay intervening days
 ✓ DELTA PROBE F: "New" mid-session must give a live campaign
 ✓ DELTA PROBE F2: New must not backfill from day 0 on a mid-day fresh start
      Tests  4 passed (4)
```

| First-pass finding | Measured then | Measured at HEAD | Status |
|---|---|---|---|
| **PROBE A** reload re-runs the saved day | +2.61 spice, +1 draw, +1 event, 6 keys drifted | **spice delta 0.0000, rng delta 0, hash byte-identical** (`d8c38f27d3524b52` both branches) | fixed |
| **PROBE B** in-session Load replays intervening days | 17 days, +37.31 spice; day-40 variant ended the run | **0 days replayed**, spice/step/cycleIndex all unchanged | fixed |
| **PROBE F** New leaves the campaign inert | 0 draws, 0 events, spice frozen | **step 0→3, events 0→8, spice 60→68.15** | fixed |

**PROBE F2 is new this round** — I added it to check the fix did not overcorrect into the
backfill it was guarding against. A fresh (`lastProcessedDay === null`) world whose clock
already reads day 4 processes **one** day and sets bookkeeping to 4; it does not replay days
0-3. The `null` branch in `TimeSystem.ts:45-48` is correct in both directions.

**Honesty note on my own probe.** My first delta run of PROBE A reported a hash mismatch
(`61383249bcbda14c` vs `d8c38f27d3524b52`) while spice and RNG matched exactly. I isolated
it with a key-level diff rather than reporting it:

```
DIAG  key "time" DRIFTED
DIAG    before: 300.01666666666665
DIAG    after : 300.0333333333333
DIAG  before-only keys: (none)
DIAG  after-only keys: (none)
```

`world.time` and nothing else — because my probe ticked the control once *before* taking the
blob and the reload branch ticked again *after* restoring it, so the reload branch had two
`1/60` frames to the control's one. **A defect in my probe, not the engine.** Corrected to
take the save before either branch's frame; the hash then matches byte for byte. Recorded
here because a delta re-audit that quietly drops a failed assertion is worth nothing.

## 9.3 The migration decision (audit item 2)

```
DELTA 2  migrated v3 day-40 save: lastProcessedDay=40 (expect 40, not null)
DELTA 2  first frame after load: rng.step 0 -> 0, quota.cycleIndex=0
DELTA 2  createInitialState lastProcessedDay=null
DELTA 2  explicit null preserved=null | missing@day7 backfilled=7
DELTA 2  idempotent: true
 ✓ a real v3 save at day 40 is marked already-processed, so a reload runs no day
 ✓ null is reserved for fresh campaigns and never assigned by the migration
```

**The decision is right, and it is right for exactly the reason my reload finding implies.**
Backfilling a missing `lastProcessedDay` to `null` would mean "process the current day once"
— which *is* PROBE A's defect, reintroduced for every real pre-v4 IndexedDB save on a
player's disk. Backfilling to `Math.floor(state.time / 60)` (`saveMigration.ts:154`) marks
that day already processed, so the first frame after load advances cleanly.

`null` is correctly reserved for fresh campaigns only: it is assigned in exactly one place
(`GameState.ts:93`, `createInitialState`) and `migrateV3ToV4` never produces it. The guard is
`state.lastProcessedDay !== undefined` (`saveMigration.ts:149`), so an explicit `null` from a
v4 save taken before its first boundary is preserved rather than overwritten — idempotent,
and correct, since that day genuinely has not been processed.

The **v4 schema bump is load-bearing, not cosmetic**: pre-fix saves already self-report
`version: 3`, so without the bump they would bypass migration and never gain the field
(`schema.ts:21-27` states this reasoning explicitly).

## 9.4 The canonical save path (audit item 3)

```
DELTA 3  envelope keys: version, savedAt, state
DELTA 3  version=4
DELTA 3  blob contains "goalType"=false "goalAchieved"=false
DELTA 3  state.rng={"seed":12,"step":3} state.lastProcessedDay=2
DELTA 3  hostile save on disk: ending=null goalAchieved=true
DELTA 3  after load: ending=null goalAchieved=false
 ✓ the on-disk blob omits goalType/goalAchieved and carries rng + lastProcessedDay
 ✓ goalAchieved is re-derived from world.ending on load, not trusted from disk
```

The production save path now round-trips through the canonical serializer.
`persistence.ts:44` builds the envelope from `toCanonicalState(world)`, and
`persistence.ts:113-115`'s `serializeWorld` is the same function minus the IndexedDB
transport — so the test-facing and production paths cannot drift apart.

**02's "must not be serialized" clause for `goalAchieved` is now met**, and better than
required: `fromEnvelope` (`persistence.ts:57`) re-derives it as `migrated.ending !== null` on
every load. I probed this adversarially with a hostile save carrying `ending: null` **and**
`goalAchieved: true` — precisely the combination that would freeze `actRun.ts:46` forever if
trusted — and it loads as `false`. **The latent hazard named in §2(b) is closed**, not merely
avoided by luck.

**One coordinator claim does not hold.** The handoff states "hashState/CanonicalSaveEnvelope
now have production callers". `CanonicalSaveEnvelope` does (`persistence.ts:43`), and
`toCanonicalState` does (`persistence.ts:44`) — but **`hashState` still has zero production
callers**:

```
$ grep -rn "hashState" src/ --include=*.ts --include=*.tsx | grep -v "\.test\."
src/game-engine/state/hash.ts:28:export function hashState(world: WorldState): string {
```

Only its own definition. `serializeCanonical` is likewise production-reachable only through
`hash.ts`, which is itself test-only — production reaches the canonical shape via
`toCanonicalState` instead. This is **not blocking**: state hashing serves 02 acceptance
criterion 5 (runtime/simulator parity), which belongs to a later package. Recorded because
the claim as written overstates the wiring.

## 9.4a Determinism re-check — the first pass's passing results still hold

The fix touched `crossedDays()`, the save format, and migration, so PROBE C (seed
divergence) and PROBE E (RNG resume) were re-run at HEAD to confirm nothing regressed —
now across the **real canonical-envelope** save path rather than the old raw-world one:

```
DELTA C  seed23=e5927b7bf7ed87ab seed23=e5927b7bf7ed87ab seed24=8023d8c357cf1436
DELTA E  control day3 step=4 spice=70.8199 | reloaded day3 step=4 spice=70.8199

 ✓ same seed reproduces, different seeds diverge
 ✓ rng resumes the same sequence across a real save/load round trip
```

Same seed reproduces byte-identically, a different seed diverges, and the RNG resumes its
sequence across a genuine save/load with identical step **and** identical spice to four
decimals. (Hashes differ from the first pass's values because the canonical state now
carries `lastProcessedDay` — expected, and precisely why they were re-measured.)

## 9.5 Are the shipped regression tests discriminating?

`dayRunner.sessionBoundary.test.ts` (154 lines, 3 tests) — **yes, and its Load test is
stronger than mine.** Rather than only asserting "nothing replays", it saves at day 5, keeps
playing the *same* session to day 8, then Loads the day-5 snapshot and drives days 6-8 again,
asserting the result matches an uninterrupted day-8 control. That distinguishes the two
opposite failure modes at once — replaying days that already happened, and *skipping* days
the loaded timeline has not yet lived. Its fixture deliberately pairs a prospecting crew
(moves `rng.step`) with a player-owned village (moves spice without RNG), because a prospect
crew alone earns nothing and so could not tell "boundaries fire" from "boundaries are inert"
(lines 27-34). The reload test asserts full `hashState` equality. Its Load test documents
why it compares fields instead of the hash — event-id numbering from a discarded pre-Load
detour — which is an honest harness limitation, not a dodge.

I did not need to take the builder's word that these fail on the old code: **my own probes
independently failed at `59d8667` and pass at `bfee65a`**, which establishes the behavior
change without trusting either the tests or the report.

## 9.6 Residue — WP02 handoff list still stands

Re-checked at HEAD by inspection. **Blocking rows 1-3 are closed.** The four non-blocking
rows are unchanged, verbatim:

| # | Item | Owner | State at HEAD |
|---|---|---|---|
| 4 | `actRun.ts:46` — `if (world.goalAchieved) return` still gates on the derived shadow, not `world.ending` | WP02 | **still present** (verified at line 46). Materially safer now: the shadow can no longer be desynced by a save, since load re-derives it. |
| 5 | `DialogueSystem.ts:97-101` writes `world.factionProfiles` via `applyPlayerAction` | WP02 | **still present** |
| 6 | `FactionPanel` (`App.tsx:51`), `SietchCommandSection` (`VillagePanel.tsx:91`), troops/influence readouts (`StatusBar.tsx:65-66`) | WP02/WP03 | **still present** |
| 7 | `Date.now()` at `persistence.ts:44` (`savedAt`) | WP01 | **still present, now correctly scoped** — it is envelope metadata, excluded from `toCanonicalState`, and `persistence.ts:33-36` documents it as display-only. Acceptable as-is. |

`Math.random()` call sites in `src/game-engine/`: **still exactly 8, still exactly the
declared deferral list** (CombatSystem ×2, endgameOps:75, faction ×5). No new site.

The **forward risk from §5 is unchanged and still un-owned**: `dayRunner.ts:120` pins
intermediate days of a batched jump to exact day starts while sequential frames land on
fractional times, and `harvestRun.ts:54` writes `atTime: world.time` into the canonical
`wormSightings`. Batched and sequential paths will therefore hash differently under realistic
frame timing. Not a WP01 exit-proof failure; it will bite 02 acceptance criterion 5.

## 9.7 Revised score and verdict

### Score: 9 / 10 (from 6.5)

All three blocking findings are closed, and closed at the root rather than patched at the
symptom: moving day bookkeeping onto `WorldState` makes Load, New, and reload correct **by
construction** — `setWorld` and serialization carry the right value with no per-call-site
wiring, which is why the fix needed no change to `store.ts` at all. The canonical serializer
is genuinely wired into production, and `goalAchieved` is not merely unserialized but
re-derived from the declared authority on every load, which closes the latent hazard I could
only downgrade last round. The migration decision reasons correctly about real saves on real
disks rather than test fixtures.

The missing point: `hashState` still has no production caller (and the handoff note says
otherwise); `actRun.ts:46` still reads the derived shadow rather than `world.ending`; and the
`wormSightings` timestamp risk to hash parity remains unowned. None of the three sits inside
WP01's exit proof.

### Verdict line

**`verified` IS warranted for WP01.** The five fixtures in `02` — `new-campaign-normal`,
deterministic RNG, `multi-day-catch-up`, save/reload, and no-faction — now pass through
production engine entry points, confirmed by my own independently-constructed probes rather
than the shipped fixtures alone: reload is byte-identical (`d8c38f27d3524b52`), in-session
Load replays zero days, a New campaign is live, seeds diverge, and the RNG resumes its
sequence across a real save/load round trip. No campaign import or saved field depends on the
retired goal authority: `goalType` is absent from new saves and dropped in migration, the PoC
evaluators are gone, and `goalAchieved` is excluded from the canonical save and re-derived
from `world.ending` on load. Full gate re-run clean at HEAD (238 files / 2045 tests, `tsc`
exit 0). Residue items 4-7 carry to WP02/WP03 as recorded handoffs, not as WP01 debt.
