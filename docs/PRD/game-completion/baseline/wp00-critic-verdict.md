# WP00 — evidence-auditor critic verdict

Critic mode: evidence auditor (`09-gauntlet-prompt.md` §Roles). Fresh context, artifacts
only — no builder reasoning or report was read as evidence. Repo
`/home/cocodedk/0-projects/Dune-Browser-Game`, branch `feat/game-completion`, HEAD
`91cade0`, working tree clean at audit time (`git status --porcelain` empty).

Judged against WP00's Scope and Exit proof in `08-execution-plan.md:64-81`, the
cross-pack completion rule in `00-index.md`, and the critic protocol in
`09-gauntlet-prompt.md:112-120`.

**Score: 7.5 / 10.** **Verdict: `verified` is not warranted. The package stays
`in_progress`.**

One named Scope bullet is not met, and one legacy write path has no owner. Both are
small, concrete, and closable inside one round — see §7.

---

## 1. What I re-ran, with raw output tails

### `npx vitest run src/game-engine/baseline/`

```
 RUN  v4.1.4 /home/cocodedk/0-projects/Dune-Browser-Game

 Test Files  5 passed (5)
      Tests  16 passed (16)
   Start at  00:13:06
   Duration  888ms (transform 1.56s, setup 0ms, import 2.07s, tests 44ms, environment 1ms)
```

### `npx tsc --noEmit`

```
EXIT:0
```

No diagnostics printed. Both reproduce the round-1 claim exactly (16/16, clean
typecheck).

### Commit identity — the three recorded commits are the same engine

The artifacts name three different commits: inventory `35cb647`
(`legacy-authority-inventory.md:4`), manifest `e693ed5` (`content-manifest.md:3`),
captures `fad8653` (`captures/captures.md:9`). The exit proof says artifacts must
"reproduce on the recorded commit", so I checked whether the recorded commits and HEAD
are the same engine:

```
$ git diff --stat fad8653 91cade0 -- src/
(empty)

$ git diff --stat e693ed5 91cade0 -- src/
 .../combatPledgePath.characterization.test.ts      | 82 ++++++++++++++++++
 .../factionDayUpdate.characterization.test.ts      | 83 +++++++++++++++++++
 .../baseline/pocGoal.characterization.test.ts      | 96 ++++++++++++++++++++++
 .../sietchPayoutLoop.characterization.test.ts      | 91 ++++++++++++++++++++
 .../spiceTripleCredit.characterization.test.ts     | 92 +++++++++++++++++++++
 5 files changed, 444 insertions(+)
```

`src/` at the captures' commit is **byte-identical to HEAD**, and the manifest's commit
differs from HEAD only by the five added characterization tests. The commit spread is
cosmetic; every artifact reproduces on HEAD. I also re-checked the manifest's
`saveMigration.ts` line cites at HEAD, since that file changed between the inventory's
commit and the manifest's — `:13` is `CURRENT_SAVE_VERSION = 2`, `:26-28` is
`CURRENT_KIND_BY_ID`, `:51-55` is `inferKind`'s fallback, `:65` is `migrateV1ToV2`. All
four cites still land. **No finding.**

---

## 2. Completeness hunt — my own sweep against the inventory

I re-derived each category from `src/` with my own patterns rather than re-running the
inventory's. Findings are split into genuine misses and correctly-scoped absences,
because the inventory is a *legacy*-authority inventory: a retained-authoritative write
that is absent from it is only a defect if WP00's Scope bullets own it.

### 2a. Missed — a fourth `world.player.spice` writer with no owner

```
$ grep -rn "player\.spice\s*[-+]\?=" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."
src/game-engine/CombatSystem.ts:44:  world.player.spice -= SCOUT_COST
src/game-engine/DialogueSystem.ts:85:    world.player.spice = Math.max(0, world.player.spice + effect.spiceDelta);
src/game-engine/EconomySystem.ts:46:  world.player.spice -= outcome.paid
src/game-engine/GameLoop.ts:126:        world.player.spice += payout.amount;
src/game-engine/VillageSystem.ts:50:    world.player.spice += actual;
src/game-engine/economy/harvestRun.ts:94:    world.player.spice += scaled
src/game-engine/economy/marketOps.ts:26:  world.player.spice -= check.item.price
```

**`src/game-engine/DialogueSystem.ts:85` appears nowhere in
`legacy-authority-inventory.md`.** It is a credit path, not only a debit — five authored
effects hand the player free spice from conversation (`spiceDelta:` `+20`, `+15`, `+10`,
`+10`, `+5` across `src/data/dialogue/` and `src/data/dialogues-*.ts`; verified with
`grep -rho "spiceDelta: [0-9]\+" src/data --include="*.ts" | sort | uniq -c`).

This is a genuine miss rather than a scoping choice, because the inventory audits this
exact function twice for its other two effects — `influenceDelta` at
`legacy-authority-inventory.md:117` (citing `DialogueSystem.ts:81-83`) and
`reputationAction` at `:38` (citing `DialogueSystem.ts:9-10,97-101`) — and steps over the
spice write sitting between them. Category 6's headline claim ("credited three
independent ways **every day boundary**", `:172`) survives on its qualifier, since
dialogue is not a day-boundary path; but WP02's Scope owns it ("Route every mutation
through structured engine commands and outcomes", `08-execution-plan.md:105`) and no row
assigns it to anyone.

### 2b. Missed — a second uncatalogued dialogue → engine seam

`src/game-engine/DialogueSystem.ts:106-107` — `if (effect.ritual) { attemptRitual() }`,
calling `economy/endgameOps.attemptRitual()`, which writes `world.flags['ritual.count']`
and advances prescience. One authored use
(`src/data/dialogue/act1-desert-b.ts:26`). Absent from the inventory. Lower weight than
2a — this is retained-authoritative endgame code, not legacy authority — but it is a
third mutation route out of the same audited function, and it is the seam a reader would
most want flagged when checking whether the `ritual` path is a hidden pledge or ending
authority. (It is not; see 2d.)

### 2c. Cosmetic — two scope misstatements, no material impact

- `src/game-render/audio/ambient.ts:30` — `Math.random() * 2 - 1` (audio noise bed) is
  not in the inventory. The inventory's scope line (`:9`) claims `src/game-render/`, but
  category 5's rule is `02`'s "`Math.random()` in campaign mutations", which audio dither
  is not. Correctly excluded by the rule; the "no other sites" phrasing overreaches.
- `src/ui/store.ts:83,90` and `src/ui/StatusBar.tsx:51` — `Date.now()` / `new Date()` for
  the save-timestamp display. The inventory's sentence is scoped ("No other `Date.now()`
  … exist under `src/game-engine/`", `:160`) and is literally true. Not simulation input.

### 2d. Negatives I re-tested with my own patterns — all held

Negative claims are where inventories lie, so I re-derived each:

| Inventory claim | My command | Result |
|---|---|---|
| PoC block writes `world.ending`; act machine + quota check are the only other writers | `grep -rn "\.ending\s*=" src \| grep -v test` | Exactly 5: `EconomySystem.ts:75`, `GameLoop.ts:145`, `:149`, `actRun.ts:52`, `debugSources.ts:68`. All inventoried. **No missed writer.** |
| Same for `goalAchieved` (three independent writers) | `grep -rn "goalAchieved\s*=" src \| grep -v test` | Exactly 5, same files. Matches. |
| `attackVillage` is the *second* pledge path | `grep -rn "pledgedToPlayer\s*=" src \| grep -v test` | Exactly 2 real paths: `CombatSystem.ts:97` and `SietchSystem.pledgePlayerSietch` via `sietch/assignTask.ts`. Corroborated by the codebase's own annotation at `src/game-engine/dialogue/engineFlags.ts:14`: `'pledged.count': 'SietchSystem.pledgePlayerSietch(), CombatSystem.attackVillage()'`. **No third path — the `ritual` effect does not pledge.** Claim is complete. |
| 11 `Math.random()` sites in `src/game-engine/` | `grep -rn "Math\.random" src \| grep -v test` | 11 code sites in `game-engine` (CombatSystem ×2, endgameOps, harvestRun, prospectRun ×3, raidRun, GoalExecutor ×3 — note `:52` carries two calls on one line, conflict.ts, strategy-profiles). Matches. |
| "No seeded-RNG service exists anywhere in the engine" | `grep -rln "seed\|rng\|RNG\|mulberry\|xorshift\|PRNG" src/game-engine \| grep -v test` | 3 files: `desert/sites.ts` (the acknowledged `DESERT_SEED`), plus comment-only hits at `GameState.ts:50` and `dialogue/engineFlags.ts:13`. **Claim holds.** |
| "Nothing reads `player.influence` to gate anything" | `grep -rn "influence" src \| grep -v test \| grep -v influenceDelta:` | Only the write (`DialogueSystem.ts:82`), the seed (`GameState.ts:31`), the readout (`StatusBar.tsx:71`), and unrelated `faction/types.ts:17` / render-comment hits. **Claim holds.** |
| GameLoop's faction imports | `sed -n '1,20p' src/game-engine/GameLoop.ts` | Lines 6, 7, 8, 9, 10, 12, 14 match the inventory's rows verbatim. |

### 2e. Citation drift (minor)

`legacy-authority-inventory.md:85` cites `actRun.ts:46,51` and `EconomySystem.ts:72` for
writes to *both* `goalAchieved` and `ending`. At HEAD the pairs are `actRun.ts:51`/`:52`
and `EconomySystem.ts:72`/`:75` — the `ending` write is one line below the cited line in
both cases. Substance correct, cites off by one.

---

## 3. Manifest recount — two numbers, independent method

I deliberately did **not** re-run the manifest's `grep -c` commands, since that only
proves the command is stable. I imported the real modules and counted the live data
structures, plus walked the dialogue graph.

**Command** (script in scratchpad, not the repo):

```
npx tsx <scratchpad>/recount.mjs
# dynamic-imports src/data/dialogue/index.ts, dialogues.ts, villages.ts,
# sietches.ts, dialogueStates.ts, characters.ts and counts array lengths;
# BFS from every DialogueStateDef.rootNodeId over DialogueNode.choices[].nextId
```

**Raw output:**

```json
{ "storyNodes": 96, "storyNodeIdsUnique": 96, "legacyNodes": 35,
  "perTree": ["village_leader=5","harkonnen_stronghold=4","fremen_sietch=5",
              "atreides_embassy=5","smuggler_outpost=6","emperor_delegation=5",
              "neutral_settlement=5"],
  "TOTAL_NODES": 131,
  "villages": 19, "sietches": 19, "idSetsIdentical": true,
  "discoveredTrue": 6, "discoveredFalse": 13,
  "kinds": {"sietch":11,"palace":1,"station":4,"smuggler_den":1,"fort":1,"field_camp":1},
  "dialogueStates": 37, "characters": 20,
  "roots": 37, "reachableFromRoots": 96, "ORPHAN_COUNT": 0, "orphans": [] }
```

| Manifest claim | Cite | My recount | Delta |
|---|---|---|---|
| 131 dialogue nodes (96 story + 35 legacy) | `content-manifest.md:172-193` | 131 (96 + 35), per-tree split identical | **0** |
| 19 locations, id sets identical, 6 discovered / 13 hidden, kind split 11/4/1/1/1/1 | `content-manifest.md:27,46-50` | Identical on every figure | **0** |
| 37 dialogue states, 20 characters | `:154`, `:90` | 37, 20 | **0** |

**Both recounts are delta 0.** The manifest's numbers are sound and its counting rules
reproduce under a different method.

**Bonus — one of the manifest's own open items closes clean.**
`content-manifest.md:415-421` lists full node-graph reachability as *not verified*, notes
the existing test only walks roots→forward, and recommends a later package run the
reverse check. I ran it: 37 declared roots reach all 96 `STORY_NODES`, **orphan count 0**.
No authored-but-orphaned nodes exist today. That is a positive result the baseline can
now record rather than defer.

---

## 4. Captures audit

### 4a. All eight parse and carry a plausible state for their named day

Every `.raw.json` parses under `jq -e .` and embeds a complete `save.state` WorldState.
Per-file, day recomputed as `floor(save.state.time / 60)`:

| File | day | spice | goalAchieved / ending | flags + quota |
|---|---|---|---|---|
| `01-opening` | 0 | 0 | false / null | `{act:1}`, quota `{due 12, amt 90, patience 3}` |
| `02-pledge-sietch-tabr` | 1 | 0 | false / null | `pledged.count: 1` |
| `03-legacy-payout-day4` | 4 | **12** | false / null | unchanged quota |
| `04-tribute-quota-day12` | 12 | 0 | false / null | `patience 2`, `arrears 78`, next due 20 @ 150 |
| `05-quota-day20-full-assignment` | 20 | 24 | false / null | `pledged.count 8`, `patience 1`, `arrears 192` |
| `06-organic-loss-patience-day28` | 28 | 36 | **true / `loss_patience`** | `patience 0`, `arrears 332` |
| `07a-ending-…-debug` | 0 | 0 | **true / `win_military`** | `{act:1}` |
| `07b-ending-survive-20min-blocked` | 20 (t=1229) | 0 | **false / null**, `goalType` still `control_all_villages` | `patience 2` |

Every headline number quoted in `captures.md` reproduces from its own artifact — spice
0→12 at day 4, patience 3→2 with arrears 78 at day 12, `pledged.count: 8` at day 20, the
organic `loss_patience` at day 28. **No fabricated number found.**

### 4b. Debug-helper labeling is honest

Every state carries an explicit **Status** and **Path** line, and every helper call is
named at its use site: `pick()` (state 2), `setTime()` (states 3, 4, 5, 7b),
`teleport()` (state 5), `endRun()` (state 7a), and raw `indexedDB` deletion (states 1,
7a, 7b). State 7a is labeled `Path: debug` in its first line and states plainly that the
real `playerControlsAll()` condition "was never evaluated or satisfied"
(`captures.md:~200`). State 2 correctly separates the debug `pick()` from the production
Pledge click. **No unlabeled helper use found.**

### 4c. Both blocked states carry proof, not assertion — independently confirmed

- **Raid (state 5).** I verified the code gate myself:
  `src/game-engine/combat/resolve.ts:137-139` — `raidInterval(act)` → `if (act === 'act1')
  return null`; and `src/game-engine/economy/raidRun.ts:22-24` — `runRaidCheck()` returns
  immediately when the interval is null. Raids cannot fire in Act 1. The empirical half
  (8 sietches pledged, Act 2 never reached) is backed by `05`'s and `06`'s raw JSON.
  **Proof, not assertion.**
- **`survive_20_min` (state 7b).** The artifact itself is the proof: `time 1229.28`
  (> the 1200 threshold `hasPlayerSurvived()` checks) with `goalAchieved: false`,
  `ending: null`, `goalType: "control_all_villages"`. That is the `&&`-short-circuit
  demonstrated, not argued. **Proof.**

### 4d. PNGs are real frames

`06-organic-loss-patience-day28.png` opened and read: the GoalOverlay shows **"Your house
falls — The Emperor recalls you. Arrakis is taken from your house."** over the planet
view at Cave of Birds, matching its raw.json (`ending: loss_patience`, and Finding 2's
`location: cave_of_birds`). Not decorative.

### 4e. Defect — the index names a frame its own artifact does not contain

`captures.md` (state 1) says the JSON is at "frame 191 / day 0 (~worldTime 3.3s)".
`01-opening.raw.json` records `debugHandle.frame: 814`, `debugHandle.worldTime: 13.65`,
`save.state.time: 13.35`. The file's mtime is `00:04`, the PNG's is `23:47`, and
`captures.md`'s is `00:08` — the JSON was re-captured and the index's frame line was not
updated with it. `08-execution-plan.md:391` requires captures "taken from the same trace
and frame"; this state names a frame that exists in no artifact. Numbers are otherwise
unaffected (both readings are day 0 with spice 0).

Related, minor: `captures.md` quotes `debugHandle.worldTime` for states 3 and 4 (264.1,
756.4) while `save.state.time` is ~7s earlier (256.7, 749.2). Both readings fall inside
the same day, so nothing is wrong — but the index never says which of its two clocks it
is quoting, and a later package diffing timestamps would trip on it.

---

## 5. Live reproduction — the opening state, production UI

Machine rule respected: one tab, strictly serial, `browser_close` called the moment the
read finished, no second game instance.

Dev server confirmed up (`curl -o /dev/null -w "HTTP %{http_code}" http://localhost:5174/`
→ `HTTP 200`), navigated once, read the running production UI via accessibility snapshot
(no debug helper needed for the state numbers) plus `window.__DUNE__.player()`.

| Key | Live run (production UI) | `01-opening.raw.json` | Match |
|---|---|---|---|
| spice | `0.0` | `player.spice: 0` | yes |
| troops | `0` | `player.troops: 0` | yes |
| influence | `5` | `player.influence: 5` (`GameState.ts:31`) | yes |
| goalType | `Villages: 0/19` readout — `StatusBar` renders it only for `control_all_villages` | `goalType: "control_all_villages"` | yes |
| quota | `Imperial Tribute · 90 spice due · 11 days · ●●●` | `{nextDueDay: 12, amount: 90, patience: 3}` | yes (day 1 → 11 days left) |
| location | `Sietch Tabr` | `debugHandle.player.location: "sietch_tabr"` | yes |
| localStorage | `[]` | `localStorageKeys: []` | yes (Finding 1 corroborated) |
| day | `1` | `0` | expected — my page ran ~93s of real time before the read; `day = floor(time/60)` |

**The opening capture reproduces live on every key number.**

The same snapshot also corroborates the inventory's largest claims through the running
game, with no debug helper involved:

- **`FactionPanel` is mounted and live** (inventory `:42`): "House Harkonnen **-79 · 112
  spice**", "Fremen +0 · 162 spice", "House Atreides +0 · 107 spice", Smugglers, Padishah
  Emperor — faction spice is accumulating on a fresh campaign.
- **The emergent faction simulation runs unconditionally** (inventory category 1): within
  ~93 seconds of a fresh load the Event Log held "House Harkonnen occupies Tsimpo",
  "Padishah Emperor seeks to expand (target: 4 regions)", "Smugglers eyes spice at
  red_chasm", "House Atreides seeks alliance with fremen", "House Harkonnen plans to
  destroy fremen", plus five region-rebellion warnings.
- **captures.md Finding 4 reproduces**: that narration is about `world.regions`, an array
  the economy never reads, while the same-named villages sit untouched.
- **The PoC goal counter, aggregate troops, and influence readouts are all top-of-screen**
  (inventory categories 3 and 4).

---

## 6. The correctness question — is this a usable comparison baseline?

Mostly yes, and the parts that work are the parts that are hardest to fake.

- **Machine-readable, not screenshots.** Each `.raw.json` embeds the entire `WorldState`,
  so a later package can diff fields, not eyeball frames. The PNGs are corroboration, not
  the evidence.
- **The characterization tests drive production entry points, not reimplementations.**
  All five import `update`/`initLoop` from `../GameLoop` or `attackVillage` from
  `../CombatSystem` and build fixtures from the real `createInitialState()`. They mock
  only `EventBus` (the declared renderer↔React boundary) and, in
  `factionDayUpdate.characterization.test.ts`, `AISystem`/`GoalExecutor` — and that file
  is explicit that it therefore observes `updateFactionSystems` *for real* through region
  unrest (10 → 12) rather than through a mock. That is the right call and it is written
  down at `factionDayUpdate.characterization.test.ts:8-14`.
- **Values are pinned exactly**, with the arithmetic shown:
  `spiceTripleCredit.characterization.test.ts:14-20` derives 0.5 + 3.648 + 12 = 16.148
  from the production formulas and asserts `toBeCloseTo(16.148, 3)`, then adds a second
  test ruling out any single path explaining the total. `sietchPayoutLoop` pins 12 spice
  and 6 troops. `combatPledgePath` pins the `pledged.count` resync at 1 and at 2.
- **No test-only mutation bypass found.** The only `Math` stub is
  `vi.spyOn(Math, 'random').mockReturnValue(0.5)` in `combatPledgePath` `beforeEach` —
  used to make the defense roll deterministic, with the resulting `effectiveDefense=30`
  written in the comment and both the win (40) and loss (20) branches asserted. It is not
  restored explicitly, but `vitest.config.ts` sets `pool: 'forks'`, so file-level
  isolation prevents any cross-file leak.
- **Fixture neutralization is disclosed.** Where a fixture sets
  `goalType = 'survive_20_min'` or empties `factionProfiles`/`aiTimers`, the comment says
  why (isolating the system under test from others that fire on frame one). In
  `spiceTripleCredit` that choice is load-bearing — its single player-owned village would
  otherwise satisfy `playerControlsAll()` and end the run — and it is commented, not
  hidden.
- **Negative and blocked results are stated rather than papered over**, and the "Not
  reproduced / discrepancies" section at the end of `captures.md` is exactly the artifact
  that stops round five repeating round two.

What is **not** usable as a comparison baseline: three of the five ending routes. See §7.

---

## 7. The single biggest remaining gap

**Three of the five `EndingId` routes have no baseline row — neither captured nor
declared blocked — and the reason one of them is unreachable is itself unrecorded.**

WP00's Scope (`08-execution-plan.md:68-70`) requires captures for "each currently
reachable ending path". `captures.md` covers `loss_patience` (organic, state 6),
`win_military` (debug-forced, labeled, state 7a), and `survive_20_min` (a *goalType*, not
an `EndingId`, blocked with proof, state 7b).

```
$ grep -n "win_ecology\|loss_palace\|loss_abandoned" docs/PRD/game-completion/baseline/captures/captures.md
(no output)
```

`win_ecology`, `loss_palace`, and `loss_abandoned` are absent from the captures index
entirely. `content-manifest.md:353-356` lists all five ids but only as save-relevant
values, with no reachability column, so no artifact in the package covers them.

This matters more than "a capture is missing", because the underlying facts are worse
than untested and the baseline is where they should have been pinned:

- **`loss_palace` is decorative today.** `src/game-engine/economy/actRun.ts:25` hard-codes
  **`palaceHeld: true`** in `actView()`, and `src/game-engine/acts/transitions.ts:54`
  reads `if (!view.palaceHeld) return 'loss_palace'`. With the input pinned true the
  branch can never fire. The same function pins `countdownExpired: false`
  (`actRun.ts:28`). This is a live instance of the risk register's "One ending is
  decorative" row (`08-execution-plan.md:378`) and of a stubbed act-machine input, and it
  appears in no inventory category, no manifest row, and no capture.
- **`loss_abandoned` needs `pledgedCount === 0 && quotasPaid > 0`**
  (`transitions.ts:56`). The package's own state-5 evidence shows
  `quota.paidInFull` never reached 1, so it is unreachable today — for a reason the
  baseline already measured but never connected to this ending.
- **`win_ecology` and the act-machine `win_military`** are both gated on
  `view.act === 'act4'` (`transitions.ts:58-61`), and state 5 proves Act 2 was never
  reached.

The evidence to close this is three greps away — I derived all of it above in a few
minutes. The defect is that the artifact does not contain the argument, and per this
pack's own standard an auditor cannot credit an argument that is not written down. A
later package comparing ending behavior against this baseline would find no row for three
of five routes and no record that `palaceHeld` was ever stubbed.

**Concrete action to close it:** add an "Endings coverage" section to
`captures.md` with one row per `EndingId`, each carrying either a capture or a
code-cited blocked proof in the style state 5 already uses — and add
`actRun.ts:25` (`palaceHeld: true` hard-coded) as a finding to
`legacy-authority-inventory.md` category 3 with a WP01 owner, since a stubbed input to
the authority `02` reserves is precisely what that category exists to record.

---

## 8. Findings that did NOT reproduce

- **`captures.md` state 1's frame reference.** The index says frame 191 / worldTime 3.3s;
  `01-opening.raw.json` says frame 814 / worldTime 13.65 / save time 13.35 (§4e). The
  state's *numbers* reproduce; its *frame identity* does not.
- Nothing else failed to reproduce. Both re-runs, both manifest recounts, every capture's
  headline numbers, both blocked-state proofs, the live opening state, and every
  load-bearing negative claim in the inventory all reproduced under my own commands.

---

## 9. Score against the exit proof, clause by clause

WP00 exit proof (`08-execution-plan.md:79-81`) has three clauses:

| Clause | Assessment |
|---|---|
| **(a) "The baseline artifacts reproduce on the recorded commit"** | **Strong.** `src/` is byte-identical across all three recorded commits and HEAD; 16/16 tests and a clean typecheck reproduce; both manifest recounts are delta 0 under an independent method; the live opening matches its capture on every key number. One stale frame reference (§4e) is the only blemish. |
| **(b) "the legacy-authority inventory has an owner for every removal"** | **Good, not complete.** Every load-bearing negative I re-tested held, and the two sharpest claims (`world.ending` writers, the second pledge path) are exhaustive. But `DialogueSystem.ts:85` is an uncatalogued player-spice credit path with no owner (§2a), the `ritual` seam is uncatalogued (§2b), and `actRun.ts:25`'s stubbed `palaceHeld` is missing from category 3 (§7). |
| **(c) "later packages can compare behavior without relying on memory or screenshots from unrelated frames"** | **Partly.** Full `WorldState` blobs, exactly pinned test values, honest helper labeling, and a stated non-reproduction list make this true for the opening, pledge, payout, tribute, and one ending. It is **false for three of five ending routes**, which have no baseline row at all. |

**7.5 / 10.**

**Verdict: `verified` is not warranted. WP00 remains `in_progress`.**

The package is well above the usual bar for this repo — the artifacts are self-aware,
the blocked states carry code-level proof rather than assertion, the negatives are stated
rather than skipped, and I could not find a single fabricated number or a test-only
mutation bypass. It falls short on one named Scope bullet (ending-path coverage) and one
missing inventory owner. Both are closable in a single round; neither requires rework of
what already exists.

---
---

# Round 3 delta re-audit (2026-08-11)

Scope of this pass: **the three deltas only**, as dispatched. Sections 1–9 above stand
unchanged — I did not re-run the full audit, and nothing in the deltas invalidates it.
Working tree at re-audit: `captures.md`, `legacy-authority-inventory.md`, and
`progress.md` modified and uncommitted; HEAD still `91cade0`. No browser was needed.

## R3.1 — Frame-line correction (my §4e / §8 non-reproduction) — **fixed, correct**

`captures.md:50` now reads "frame 814 / day 0 (worldTime 13.65, `save.state.time` 13.35)",
with the re-capture explained and the correction labeled as a round-3 change.

```
$ jq -r '"frame=\(.debugHandle.frame) worldTime=\(.debugHandle.worldTime) saveTime=\(.save.state.time)"' 01-opening.raw.json
frame=814 worldTime=13.649699999999946 saveTime=13.349699999999952
```

Exact match on all three values. **The only finding that did not reproduce in rounds 0–2
now reproduces.**

## R3.2 — Inventory rows — **fixed, both say what the code says**

| New row | Verified against source | Owner |
|---|---|---|
| Category 3 — `actRun.ts:25` hard-codes `palaceHeld: true`, so `transitions.ts:54` can never fire; `loss_palace` is decorative | `sed -n '25p' src/game-engine/economy/actRun.ts` → `    palaceHeld: true,`; `sed -n '54p' src/game-engine/acts/transitions.ts` → `  if (!view.palaceHeld) return 'loss_palace'` | WP01 — correct (construction/authority layer) |
| Category 6 — `DialogueSystem.ts:84-86` is a fourth independent `world.player.spice` writer, five authored positive `spiceDelta` effects | `sed -n '84,86p'` returns exactly the `if (effect.spiceDelta) { world.player.spice = Math.max(0, …) }` block; `grep -rho "spiceDelta: [0-9]\+" src/data \| sort \| uniq -c` → 2×10, 1×15, 1×20, 1×5 = **five** | WP02 — correct (`08:105`, "route every mutation through structured engine commands") |

Summary counts re-derived, not taken on trust: category 3's table now holds 8 `src`-cited
rows, of which `debugSources.ts` remains explicitly excluded → "8 (7 counted + 1
debug-only note excluded)" is arithmetically right. Category 6 goes 3 → "4 confirmed
duplicates", matching the one row added. **Both counts consistent.**

## R3.3 — "Endings coverage" table — **gap closed; two cite-precision defects remain**

All five `EndingId` values (`transitions.ts:10-12`, verified) now have a row. Every cited
line was checked at source with `sed -n '53p;54p;56p;58p;59p;60p' transitions.ts`:

| Cite | Actual source line | OK |
|---|---|---|
| `:53` | `if (view.patience <= 0) return 'loss_patience'` | yes |
| `:54` | `if (!view.palaceHeld) return 'loss_palace'` | yes |
| `:56` | `if (view.pledgedCount === 0 && view.quotasPaid > 0) return 'loss_abandoned'` | yes |
| `:58` | `if (view.act === 'act4') {` | yes |
| `:59` | `… greenRegions >= 3 && averagePledgedLoyalty >= 80` → `win_ecology` | yes |
| `:60` | `if (view.capitalFortDestroyed) return 'win_military'` | yes |

Every blocked row's **conclusion** is correct, and the `loss_abandoned` argument is
genuinely sound: the two prongs are mutually exclusive in practice, because reaching
`quotasPaid > 0` requires production that requires pledges, and nothing can un-pledge.
The `win_military` row is also *more* honest than before — it now records that neither
real evaluator ever fired and that state 7a is debug-forced.

Two defects, both cite-precision inside otherwise-correct rows:

**(a) The `loss_patience` row attributes the captured artifact to the wrong writer.**
It cites `transitions.ts:53` as the mechanism. State 6 was in fact written by
`src/game-engine/EconomySystem.ts:75`. Control flow, verified:

- `GameLoop.ts` day boundary runs `runQuotaCheck()` (line 112) **before** `runActCheck()`
  (line 116).
- `runQuotaCheck` sets `world.goalAchieved = true` / `world.ending = 'loss_patience'` at
  `EconomySystem.ts:71-75` when `outcome.gameOver`.
- `runActCheck` then hits `actRun.ts:47` — `if (world.goalAchieved) return` — so
  `evaluateEnding` and `transitions.ts:53` never evaluate on that tick.
- The capture's own event list corroborates it: `06-…raw.json` carries
  `tribute_refused: "The Emperor is not paid. Patience 0 of 3 remains."` in the same
  tick, which is `runQuotaCheck`'s own emitter (`EconomySystem.ts:65-68`) firing
  immediately before its `gameOver` block.

This is compounded by something the baseline should record: **both writers emit the
identical string** — `EconomySystem.ts:76` and `actRun.ts:75`'s
`endingMessage('loss_patience')` are byte-identical ("The Emperor recalls you. Arrakis is
taken from your house."), so the event log cannot tell them apart. That is precisely why
the cite has to be right. Behavioral risk is low (both encode `patience <= 0`, so
retiring either leaves the rule intact), but WP01/WP02 are the packages that will retire
one of these two writers, and this row would mis-attribute the artifact in their diff.

**Fix:** cite `EconomySystem.ts:71-76` as the writer that produced state 6, and note
`transitions.ts:53` as the act machine's parallel, never-reached encoding of the same
rule — which is itself a second-authority finding worth a category-3 line.

**(b) The `loss_abandoned` row's parenthetical is inaccurate.** It says "repo-wide grep:
only test fixtures construct it false". `src/data/sietches.ts:4-22` is **production seed
data** and constructs all 19 sietches `pledgedToPlayer: false`. A reader who runs the
grep hits that file first and has cause to doubt the row.

The load-bearing claim survives and is in fact *stronger* than written — no code path
anywhere transitions `pledgedToPlayer` from true to false, and
`src/game-engine/economy/raidRun.ts:95` deliberately self-assigns
`{ ...sietch, pledgedToPlayer: sietch.pledgedToPlayer }`, preserving the pledge through a
raid. **Fix:** reword to "no code path transitions it true → false; the only `false`
values are the initial seed (`src/data/sietches.ts:4-22`) and test fixtures — even
`raidRun.ts:95` preserves it explicitly."

## R3.4 — `progress.md` Round 3 entry — **does not overstate**

Checked claim by claim against what I actually found: "7.5/10, `verified` NOT warranted",
"16/16 tests, tsc clean", "both manifest recounts delta 0 (131 dialogue nodes, 19
locations, plus a reverse-BFS closing the orphan-node open item at 0)", "live opening
reproduction matched every key number", and the did-not-reproduce line (frame 191/~3.3s
vs 814/13.65s). **Every one is accurate and none is inflated.** Status vocabulary is used
correctly, and the entry does not pre-claim `verified` — it closes with "Next: critic
delta re-audit of the three fixes → WP00 `verified` decision", which is the honest state.

## R3.5 — Still open, deliberately not blocking

Carried forward from §2b/§2c/§2e, unchanged and never named as blocking: the
`DialogueSystem.ts:106-107` `ritual` → `attemptRitual()` seam is still uncatalogued; the
category-3 row still cites `actRun.ts:46,51` and `EconomySystem.ts:72` where the `ending`
writes are at `:52` and `:75`; and `game-render/audio/ambient.ts:30` /
`ui/store.ts:83,90` remain outside the inventory's stated scope sentence. All are prose
precision, none changes a conclusion or an owner.

## R3.6 — Revised score and verdict

| Exit-proof clause | Round 2 | Round 3 |
|---|---|---|
| (a) artifacts reproduce on the recorded commit | strong, one stale frame identity | **clean** — the sole non-reproduction is fixed and verified |
| (b) an owner for every removal | two genuine misses with no owner | **met** — both now have rows with correct owners and correct code |
| (c) later packages can compare without memory/screenshots | false for 3 of 5 ending routes | **met** — all five routes have rows; two rows carry imprecise cites |

**Revised score: 9 / 10.**

**Verdict: `verified` is warranted for WP00.**

All three named gaps are closed, and I verified each against source rather than against
the fix description. What keeps it off 10 is R3.3(a) and R3.3(b) — cite-precision defects
of the same class and severity as the §2e drift I recorded in round 2 without blocking.
Holding `verified` on them now would apply a stricter bar in round 3 than in round 2 to
identical-class findings, which is the critic drift `09-gauntlet-prompt.md:146` warns
against. They are follow-ups, not blockers.

**One condition on the handoff, addressed to WP01:** apply R3.3(a) before WP01 consumes
this baseline. WP01 is the package that retires one of the two `loss_patience` writers,
and it is the one reader this row would actively mislead.

