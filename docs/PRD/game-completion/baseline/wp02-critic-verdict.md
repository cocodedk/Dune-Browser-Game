# WP02 Critic Verdict — evidence audit

**Package:** WP02 "Command, pledge, crew, and tribute consolidation"
**Commits:** `14b633d`..`5d3fa6d` (diff base `82827dc`)
**Branch:** `feat/game-completion`, HEAD `5d3fa6d`
**Contracts:** `08-execution-plan.md` §WP02 (scope + exit proof); the whole of
`02-runtime-consolidation.md`
**Auditor:** independent evidence auditor, fresh context. No browser opened.
Judged artifacts and code only, never builder reasoning.

---

## Verdict at a glance

| | |
|---|---|
| **Score against the exit proof** | **7 / 10** |
| **Status warranted** | **`in_progress` — `verified` is NOT warranted** |
| **Biggest remaining gap** | Unbounded repeatable dialogue spice income — an unlimited second income authority that falsifies the single-income claim this package exists to establish |
| **Acceptance criteria** | 6 of 8 pass; C3 fails; C5 deferred to WP04 under a defensible recorded scope reading |

The consolidation itself is real, careful, and well-evidenced. Fixtures are
non-tautological, migration is clean and idempotent, determinism is proven at
engine level, and double-dispatch is safe on every command I could reach. Two
things stop `verified`: one named criterion genuinely fails, and one competing
spice authority survives the "legacy economy removed" sweep.

---

## 1. Gate re-run — raw tails

### `npx vitest run`

```
 RUN  v4.1.4 /home/cocodedk/0-projects/Dune-Browser-Game

 Test Files  257 passed (257)
      Tests  2107 passed (2107)
   Start at  06:22:48
   Duration  15.64s (transform 5.94s, setup 0ms, import 15.04s, tests 27.89s, environment 14ms)
```

Reproduces Round 9's claim of "257 files / 2107 tests" exactly.

### `npx tsc --noEmit`

```
TSC_EXIT=0
```

No output, clean exit.

### `npm run lint`

```
> dune-browser-game@1.0.0 lint
> eslint .

=== Socket Firewall ===
Warning: Socket Firewall did not detect any package fetch attempts
```

No findings.

### `bash scripts/check-file-length.sh`

```
FILELEN_EXIT=0
```

**This pass is vacuous and must not be cited as evidence.** Reading the script:
it operates on `git diff --cached --name-only` and exits 0 immediately when
nothing is staged. On a clean tree it checks zero files. The real check is the
manual sweep below.

**Manual file-length sweep (the check that actually means something):**

```
$ find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | awk '$1>200 && $2!="total"'
    236 src/game-engine/faction/diplomacyEngine.test.ts

$ git diff --stat 82827dc..5d3fa6d -- src/game-engine/faction/diplomacyEngine.test.ts
(empty — untouched by WP02)
```

One source file in the repository exceeds 200 lines. It is a pre-existing
quarantined-faction test that WP02 never touched, so the hook could not have
caught it. Every file WP02 did touch is at or under 200. Not a WP02 defect;
recorded so it is not mistaken for one later.

---

## 2. Acceptance criteria, one by one

### C1 — `GameLoop` calls no legacy payout, faction-AI, PoC goal, or aggregate-troop mutation — **PASS**

`src/game-engine/GameLoop.ts` is 45 lines. Its whole campaign body is
`shouldPause` → `tick` → `processDayBoundary()` → `checkTravelArrival()`.

`src/game-engine/dayRunner.ts`'s `runDay()` calls exactly: `runHarvestDay`,
`runProspectDay`, `runEcologyDay`, `runTrainingDay`, `runRaidCheck`,
`runSietchLoyaltyDay`, `runActCheck`, `runTributeCheck`. Both legacy seams are
gone, with the deletion sites documented in place rather than silently removed.

Reachability of the retired faction sim, checked independently of the narrative:

```
$ grep -rn "faction/" src/ --include=*.ts --include=*.tsx | grep import | grep -v "\.test\."
src/types.ts:4:import type { FactionProfile } from './game-engine/faction/types'
src/data/factionProfiles.ts:17:import type { FactionProfile } from '../game-engine/faction/types'
src/game-engine/AISystem.ts:5:import { generateGoals } from './faction/goals';
src/game-engine/AISystem.ts:6:import { toGoalWorldView } from './faction/adapter';
```

Only two type-only imports plus `AISystem`, and nothing on the campaign path
calls `AISystem`. `faction/conflict.ts` and `faction/GoalExecutor.ts` — which
hold live `Math.random()` — are imported by each other and nothing else. They
are orphaned from production, which is exactly the "non-shipping sandbox seam"
02 permits.

`dayRunner.quarantine.test.ts` corroborates with mocked spies:
`updateAI`, `updateFactionAI`, `executeGoals` all `not.toHaveBeenCalled()`
after six days, and `factionProfiles`/`regions`/`aiTimers` are deep-equal
before and after.

`player.troops` and `player.influence` are gone from the type, not merely
unused — `state/schema.ts:27` documents the v5 drop, and probe 3 confirms
empirically that both fields are `undefined` after migrating a save that
carried them.

### C2 — campaign UI renders no `FactionPanel`, `SietchCommandSection`, PoC counter, or aggregate troops — **PASS**

`src/App.tsx` mounts: `StatusBar`, `QuotaLedger`, `CrewPanel`, `MarketPanel`,
`FortPanel`, `VillagePanel`, `EventLog`, `ViewHint`, `EventToasts`,
`DialoguePanel`, `SettlementModal`, `GoalOverlay`, `PositionStrip`,
`ThreeContainer`. I read every one of these plus their children
(`PledgePanel`, `PeopleHere`, `TravelAction` inside `VillagePanel`).

```
$ grep -rn "goalType\|control_all_villages\|survive_20_min\|player.troops\|player.influence\|FactionPanel\|SietchCommandSection\|AttackSection" src/ui/ src/App.tsx src/game-render/ | grep -v "\.test\."
src/ui/FactionPanel.tsx:45:export default function FactionPanel() {
src/ui/PledgePanel.tsx:2:// Split from SietchCommandSection.tsx (WP02e — ...
```

`FactionPanel.tsx` survives as a file with **zero importers** — it is dead
code, not a hidden-but-alive panel. `SietchCommandSection.tsx` and
`AttackSection.tsx` are deleted outright (−200 and −156 lines in the diff).
`StatusBar` shows day/time/spice/speed/difficulty; no troop figure.

`goalAchieved` survives only as the derived shadow 02 permits: `canonical.ts`
strips it from the serialized shape (`Omit<WorldState, 'goalAchieved' |
'factionProfiles'>`), and `persistence.ts` re-derives it on every load as
`migrated.ending !== null`. It is never trusted from disk.

### C3 — every retained system has a production EventBus command path AND a visible refusal path — **FAIL**

This is the criterion that fails, and it fails on **gift**, which the criterion
names explicitly.

**Finding 3a — `player:gift_sietch` has no production emitter at all.**

```
$ grep -rn "gift_sietch" src/
src/types.bus.ts:31:  'player:gift_sietch': { villageId: VillageId };
src/runtime/CommandWiring.ts:86:  const onGift = ({ villageId }: BusEvents['player:gift_sietch']): void => {
src/runtime/CommandWiring.ts:136:  EventBus.on('player:gift_sietch', onGift)
src/runtime/CommandWiring.ts:153:    EventBus.off('player:gift_sietch', onGift)
src/runtime/CommandWiring.test.ts:65:  it('routes player:gift_sietch to giftPlayerSietch', () => {
src/runtime/CommandWiring.test.ts:66:    EventBus.emit('player:gift_sietch', { villageId: 'sietch_tabr' })
```

The only thing that ever emits this command is a test. No panel, no renderer
surface, no debug handle. A bus handler with a test-only caller is not a
production command path.

This has gameplay weight. `sietch/loyalty.ts`'s own header states the design:
"Pledging is something the player earns through visits, gifts and dialogue."
`giveGift` implements a per-visit cap whose stated purpose is "the player
cannot simply buy a sietch outright… they have to come back, which is what
makes travel time a real cost." That entire lever is unreachable. In probe 4 I
had to write `loyalty` directly because no production command could raise it.

**Finding 3b — `giftPlayerSietch` returns a `CommandOutcome` that CommandWiring
discards, so its refusals are silent.**

```ts
// src/runtime/CommandWiring.ts:86-88
const onGift = ({ villageId }: BusEvents['player:gift_sietch']): void => {
  giftPlayerSietch(villageId)
}
```

`giftPlayerSietch` correctly returns `fail('not-present' | 'no-sietch' |
'gift-cap-reached' | 'insufficient-spice')` and pushes no event on those paths.
The wiring drops the result. That is a direct breach of the command-outcome
contract's first requirement, "No silent rejection." Confirmed empirically by
probe 5.

**Finding 3c — `player:set_auto_ship` refusals are also silent (minor).**

`runSetAutoShipCommand` returns `fail('auto-ship-locked')`; `onAutoShip`
discards it. Mitigating: `QuotaLedger.tsx:115` only renders the checkbox when
`AUTO_SHIP_UNLOCKED_FLAG === 1`, so the refusal is unreachable through
production UI. Defence-in-depth deviation only, not a player-visible defect.

**Everything else in the criterion's list passes**, verified by dispatching
through the real bus handlers (probe 5): pledge, assign, issue, settle and
assault each produce a visible refusal message.

### C4 — the pledge fixtures prove threshold, charisma cap, idempotency, and crew creation — **PASS**

All four proven through `runPledgeCommand`, not through the pure rule:

| Requirement | Where | Assertion quality |
|---|---|---|
| threshold | `pledgeCommand.fixtures.test.ts` — loyalty 59 refuses `not-loyal-enough`, loyalty 60 succeeds | Boundary pair, both sides. Refusal case also asserts charisma unchanged, zero crews, `pledged.count` undefined, and no `sietch_pledged` event — i.e. it proves "mutates nothing", not just "returned false" |
| charisma cap | `pledgeCommand.test.ts:106-119` — refuses `charisma-cap` at capacity | Through the command |
| idempotency | `pledge-replayed` — second dispatch returns `already-pledged`, charisma/crew/flag all pinned to their post-first values | Not a tautology |
| crew creation | `pledge-at-threshold` (one crew) plus a save/load round-trip proving the id is `group_sietch_tabr` and stays attached to `crewIds` | Strong |

Two extra fixtures beyond the contract row are genuinely load-bearing: the
win-back case (decay → unpledge → re-pledge never manufactures a second crew)
and the Water-of-Life gate driven through the real dialogue selector.

I reproduced the win-back independently through the bus in probe 4.

### C5 — runtime and simulator produce identical state hashes — **DEFERRED to WP04; the scope reading is defensible**

Round 7 records this as "cannot pass until WP04's runner exists — recorded now
as a scope reading, not a miss." I checked that claim rather than accepting it.

`src/game-engine/balance/simulate.ts` is a **parallel** economy model. Its own
header says so: "PURE headless economy simulation… models the Act 1 economy day
by day over the pure rules." It returns a `SimResult` (`totalEarned`,
`patienceTrace`, …). It never constructs a `WorldState`, never calls
`processDayBoundary`, and never issues a command. There is nothing to hash.
It also carries its own constants — `HARVESTER_PRICE`, `PLEDGE_INTERVAL_DAYS`,
`MAX_CREWS = 6` — and expands with flat size-28 crews:

```
src/game-engine/balance/simulate.ts:106:  crews.push({ size: 28, spiceSkill: 30, morale: 55, tier: 'hand' })
```

against the engine's `Math.max(15, Math.round(population / 6))`, which yields a
flat 15 for the entire shipped sietch roster (`data/troopGroups.ts`, and probe
8 measures 15 live).

**The reading holds.** 02's Goal paragraph — "The headless simulator must drive
that same runtime rather than approximate it with a parallel economy" — is
precisely WP04's named scope ("Runtime-faithful runner and opening balance").
WP02's own scope bullets in 08 never mention the simulator. Meeting C5 inside
WP02 would mean building WP04.

**But it must be stated plainly:** the exit proof as literally written — "Every
runtime fixture and acceptance criterion in `02` passes" — is **not** met, and
the 15-vs-28 crew-size divergence is a live, unreconciled cost carried into
WP04, not a paper one.

### C6 — all save fixtures migrate, load, advance one day, save again, and reload without drift — **PASS**

Covered by `saveMigration.v5.test.ts` (10 tests), `saveMigration.v3.test.ts`,
`saveMigration.v5.chain.test.ts`, `legacySaveMigration.test.ts` (4 tests) — all
passing when run individually.

`legacySaveMigration.fixture.ts` is a genuine frozen prior-schema artifact: a
`version: 2` save carrying `goalType: 'control_all_villages'`, `player.troops:
18`, `player.influence: 22`, and a pledged sietch with `currentTask:
'harvest_spice'` / `outputProgress: 3` but **no** `troopGroups` entry — exactly
the "both task systems" the contract row demands.

`migrateV4ToV5` is clean: it never reads or writes `player.spice` (step 3
back-pay impossible by construction), backfills at most one
`group_<villageId>` crew, and is idempotent by construction.

I closed the one seam the existing suite left open — no single test did
migrate → load → advance → save → reload → hash-equal on the *legacy* fixture
end to end. Probe 3 now does (output below): hash equal across the reload, and
equal again after one more day on both sides.

### C7 — browser scenario: briefing → travel → dialogue → pledge → assignment → three day boundaries, one causal chain — **PASS with one documentation error**

I did not open a browser. I audited `baseline/wp02-trace/trace.md` for internal
consistency against the code, and recomputed every number it reports.

**Reproduced exactly:**

| Trace claim | My independent computation |
|---|---|
| crew "15 hands · skill 30" | probe 8: `size 15 skill 30` |
| spice `64.80043569593501` after harvest | probe 8: that is the **day-3** balance, to the last digit |
| modal "Full (65)" | `legalRange.max = min(90, 64.80043569593501)`; `SettlementModal.tsx:72` renders `.toFixed(0)` → `"65"` while `setAmount` passes the exact value. Label rounds, command does not |
| modal "Minimum (54)" | `round(90 × PARTIAL_PAYMENT_FRACTION 0.6) = 54` |
| "Tribute short by 25" | `90 − 64.80043569593501 = 25.1995…`, `.toFixed(0)` → `"25"` |
| "arrears 31" | `round(25.1995… × 1.25) = 31` |
| "next cycle 181 due in 8 days" | base 150 (probe 2 measures cycle 2 due = 150) + 31 arrears = 181; `nextDueDay = 12 + 8 = 20` |
| "Prospecting needs an ornithopter." | real refusal string on the assign-crew path |
| "You do not have that much spice to send." | `amount-exceeds-available`, reproduced in probe 5 |
| day-5 save carrying a day-3 spice balance | consistent: step 5 reassigned the crew to `train`, so days 4-5 earn nothing. Not a contradiction |

**Did NOT reproduce — trace step 3 says "six *Crews deliver 1.6 spice* events".**
`economy/harvestRun.ts:125-129` pushes **exactly one** delivery event per day,
in the same `if (dayTotal > 0)` block that credits the spice. Three harvest days
produce three events, and six events would require ~9.6 spice, not 4.8. Probe 8
shows the cadence directly: day 1 → 1 event, day 2 → 2, day 3 → 3, at spice
`64.80043569593501`.

This is a **miscount in the write-up, not a fabricated result**: the trace's own
spice figure is exactly right and disproves its own event count. The load-bearing
claims — crew harvest was the only thing crediting spice, and no payout was
duplicated — both hold. The line should read "three".

**The reload-continuity framing is honest.** The trace concedes a live
post-reload `hashState` necessarily differs because `world.time` keeps ticking
inside the hashed state, and cites engine-level equivalence instead. I checked
that the cited evidence is real:

```ts
// src/game-engine/dayRunner.sessionBoundary.test.ts:143-166
// production reload: save -> deserialize -> initLoop -> update(1)
expect(world.rng.step).toBe(controlStep)
expect(hashState(world)).toBe(controlHash)
```

That is a genuine byte-equal `hashState` assertion across the real production
reload sequence against an uninterrupted control. The substitution is legitimate
and the trace labels it correctly. Say plainly, though: **the browser trace
itself never captured equal hashes** — engine-level evidence stands in, by the
trace's own admission.

Labeled helpers (`pick()` for canvas raycast clicks, `setTime` for day
advancement) are legitimate substitutes: neither writes campaign state, and
`setTime` exercises the multi-day catch-up path the day runner is built for.

### C8 — the full repository gate passes — **PASS**

See §1. Suite, typecheck and lint all clean at HEAD. The file-length gate as
invoked is vacuous; the manual sweep it should have done also passes for every
WP02-touched file.

---

## 3. Rejection-criteria sweep

| Rejection criterion | Result | Evidence |
|---|---|---|
| A legacy panel hidden with CSS while its system keeps changing state | **Clear** | `FactionPanel.tsx` has zero importers (dead file, not hidden). `SietchCommandSection`/`AttackSection` deleted outright. No `display:none`/`visibility` tricks found |
| Simulation copies formulas or invents crews instead of issuing commands | **Partial concern, WP04-owned** | `balance/simulate.ts` *is* a parallel economy with its own constants and flat-28 crews. It is test/balance tooling with no production caller, and reconciling it is WP04's named scope — but the divergence is live today |
| A pledge can succeed without meeting loyalty and charisma gates | **Clear** | `checkPledgeChain` runs presence → sietch → fremen → not-already-pledged → `checkPledge(loyalty, charisma, count)` in order, and `pledgePlayerSietch` re-runs the whole chain itself (`SietchSystem.ts:78`) before mutating. `sietch/assignTask.ts`'s exported `pledgeSietch` **can** set `pledgedToPlayer` without gates but has **zero production callers** (only its own test) — latent dead code, not a live bypass |
| One sietch generating spice through both crew harvest and legacy progress | **Clear** | Probe 3: a migrated save whose sietch carries `currentTask: 'harvest_spice'` earns exactly 0 over two idle days. The threshold loop and `updateSietches.ts` are deleted |
| A seeded outcome changes after save/load with no additional command | **Clear** | `dayRunner.determinism.test.ts` (`seeded-prospect`, `multi-day-catch-up`) and `sessionBoundary.test.ts`'s hash equality. Probe 3 reproduces hash equality across a reload on the legacy fixture |
| Old saves discarded because migration is inconvenient | **Clear** | v2 fixture migrates through the full chain to v5 and is playable |
| **(contract body) "Harvest is the only routine source of player spice"** | **VIOLATED** | See §5 |

---

## 4. Completeness hunts

### 4a — every `world.player.spice` write site, categorised

```
$ grep -rn "player\.spice" src/ --include=*.ts --include=*.tsx | grep -v "\.test\.ts" | grep -E "\+=|-=|\.spice *="
src/game-engine/economy/settlementRun.ts:27:  world.player.spice -= outcome.paid
src/game-engine/SietchVisitSystem.ts:59:   world.player.spice -= result.spiceSpent
src/game-engine/DialogueSystem.ts:100:     world.player.spice = Math.max(0, world.player.spice + effect.spiceDelta);
src/game-engine/economy/marketOps.ts:41:   world.player.spice -= check.item.price
src/game-engine/economy/harvestRun.ts:127:  world.player.spice += scaled
```

| Site | Direction | Category | Verdict |
|---|---|---|---|
| `harvestRun.ts:127` | credit | crew harvest | **Allowed** — the designed sole income |
| `settlementRun.ts:27` | debit | tribute settlement | **Allowed** |
| `marketOps.ts:41` | debit | market purchase | **Allowed** |
| `SietchVisitSystem.ts:59` | debit | gift spend | **Allowed** as a debit — but see C3: unreachable from production UI |
| `DialogueSystem.ts:100` | **credit or debit** | dialogue story effect | **PROBLEM** — typed and logged (`story_reward`), but unbounded and repeatable. See §5 |

Five sites, one problem. Nothing hidden in the renderer: no file under
`src/game-render/` writes spice.

### 4b — `Math.random` / `Date.now` in `src/game-engine/` (non-test)

| Site | Status |
|---|---|
| `persistence.ts:45` — `savedAt: Date.now()` | **Declared.** Envelope metadata only; `state/schema.ts` excludes it from `CanonicalCampaignState`, so it cannot enter a hash |
| `faction/strategy-profiles.ts:77` | **Declared quarantine.** Reachable only from `GoalExecutor`, which nothing imports |
| `faction/GoalExecutor.ts:28,39,68` | **Declared quarantine.** Zero importers |
| `faction/conflict.ts:99` | **Declared quarantine.** Imported only by `GoalExecutor` |

Zero undeclared nondeterminism on the campaign path. I specifically checked the
assault path, since a player-triggered combat roll would be the easiest place
for one to hide: `commands/assaultCommand.ts` draws `createRng(world.rng)`
*after* validation passes, consumes one roll, writes `rng.state()` back — so a
refused assault leaves `world.rng` untouched. It does not route through
`faction/conflict.ts`.

### 4c — CommandOutcome coverage across every mutating bus handler

| Bus command | Returns/checks an outcome | Refusal visible | Note |
|---|---|---|---|
| `player:pledge_sietch` | yes | yes | reference seam |
| `player:assign_crew` | yes | yes | |
| `player:issue_equipment` | yes | yes | |
| `player:assault_fort` | yes | yes | |
| `player:settle_tribute` | yes | yes | |
| `player:gift_sietch` | returns one, **discarded** | **NO** | **C3 failure** — and no production emitter |
| `player:set_auto_ship` | returns one, **discarded** | **NO** | minor: UI gates the control |
| `player:buy_equipment` | **no** (void) | yes | `marketOps.ts:37` pushes the refusal itself. Contract-shape deviation, no player impact |
| `player:travel` | **no** (void) | mostly | `startTravel` pushes `rejectionMessage`, but is deliberately silent on `same-location` and `already-traveling` ("Silent on the two cases ordinary fumbling produces") — a defensible authored exception |
| `player:choose` | **no** (void) | **no** | **Largest un-outcomed mutating handler.** Writes spice, sietch loyalty, charisma, flags, ownership. Returns silently on unknown node or unknown choice. Also the vector for §5 |
| `player:talk` / `player:speak_to` | no | yes | mutates only `world.dialogue`; pushes an event when no conversation is available |
| `game:speed` / `game:difficulty` / `game:pause` | n/a | n/a | the established speed/pause boundary 02 explicitly permits |

### 4d — the ten contract fixtures, run individually

```
$ npx vitest run src/game-engine/GameState.test.ts \
    src/game-engine/commands/pledgeCommand.fixtures.test.ts \
    src/game-engine/commands/settleCommand.fixtures.test.ts \
    src/game-engine/dayRunner.determinism.test.ts \
    src/game-engine/dayRunner.ending.test.ts \
    src/game-engine/saveMigration.v5.test.ts \
    src/game-engine/legacySaveMigration.test.ts \
    src/game-engine/dayRunner.quarantine.test.ts \
    src/game-engine/dayRunner.sessionBoundary.test.ts

 Test Files  9 passed (9)
      Tests  41 passed (41)
```

| Fixture | File | Asserts what the row demands? |
|---|---|---|
| `new-campaign-normal` | `GameState.test.ts` | **Mostly.** Arrakeen / day 0 / 60 spice / no pledge / no crew / Q1 90 on day 12 all asserted. The row's "no faction-AI event" clause is explicitly *not* asserted here — the file declares the omission and defers to `dayRunner.quarantine.test.ts`, which does prove it by spy and field equality. Honest split, fully covered between the two |
| `pledge-below-threshold` | `pledgeCommand.fixtures.test.ts` | Yes — and proves "mutates nothing", not merely "refused" |
| `pledge-at-threshold` | same | Yes |
| `pledge-replayed` | same | Yes — pins charisma, crew count and flag to post-first values |
| `single-harvest-authority` | `settleCommand.fixtures.test.ts` (playability case) | Yes, and **stronger** than the row: runs 12 days instead of 3 and reconciles the sum of every harvest-delivery event against `pendingSettlement.stock`. One nit: `toBeCloseTo(…, 0)` tolerates 0.5 against `toFixed(1)` event rounding accumulated over 12 days — it passes, but the margin is thinner than it looks |
| `multi-day-catch-up` | `dayRunner.determinism.test.ts` | Yes — day 2→5 in one call vs three one-day calls, compared by `hashState` **and** `rng.step`, with `expect(rngStepA).toBeGreaterThan(0)` guarding against the "both branches did nothing" tautology |
| `settlement-reload` | `settleCommand.fixtures.test.ts` | Yes — decision deep-equal across the round trip, one settlement, one next deadline, second dispatch refused |
| `campaign-goal-authority` | `dayRunner.ending.test.ts` | Yes — every village player-owned in act 2, run stays active. Also asserts no unintended act jump |
| `seeded-prospect` | `dayRunner.determinism.test.ts` | Yes — same guard against a no-op pass |
| `legacy-save-migration` | `legacySaveMigration.test.ts` + fixture | Yes — the gap Round 9 says it closed is genuinely closed |

**No tautologies found.** Every determinism fixture guards against the
"identical because nothing happened" failure mode with an explicit
`toBeGreaterThan(0)` on the RNG step or the harvested total.

---

## 5. The biggest gap — unbounded repeatable dialogue spice income

`DialogueSystem.chooseDialogue` has **no once-only guard**. Any choice with a
`spiceDelta` effect re-applies its full value every time the node is reached:

```ts
// src/game-engine/DialogueSystem.ts:57-72 — no consumption tracking anywhere
export function chooseDialogue(choiceId: string): void {
  const node = currentNode();
  if (!node) return;
  const choice = node.choices.find(c => c.id === choiceId);
  if (!choice) return;
  if (choice.effect) applyEffect(choice.effect, world.dialogue!.villageId);
  ...
}

// :99-111
if (effect.spiceDelta) {
  world.player.spice = Math.max(0, world.player.spice + effect.spiceDelta);
  pushEvent('story_reward', ...);   // typed and logged — but not bounded
}
```

I swept every location in the game, standing at each, dispatching
`player:talk` then `player:choose` through the real bus, four conversations
deep (probe 6). **Seven locations yield unbounded positive spice**, and the
income is per-conversation with no cooldown, no flag, and no cap:

| Location | Tree | Spice per conversation |
|---|---|---|
| `plaster_basin` | `smuggler_outpost` | **+25** |
| `gara_kulon` | `smuggler_outpost` | **+25** |
| `habbanya_ridge` | `fremen_sietch` | +10 |
| `cave_of_birds` | `fremen_sietch` | +10 |
| `sihaya_ridge` | `fremen_sietch` | +10 |
| `red_chasm` | `fremen_sietch` | +10 |
| `bight_of_cliff` | `fremen_sietch` | +10 |

For scale: Q1 is **90 spice due on day 12**, and one crew harvests ~1.6/day
(probe 8). Probe 7 measures the whole tribute earned with **zero crews** in
**4 conversations** at a smuggler outpost, or **9** at a sietch — all inside a
single game day.

**Reachability, measured rather than assumed** (probe 9): none of the seven is
reachable on day 0. From Arrakeen on foot the only legal destinations are
`hagg` and `carthag`; `habbanya_ridge` is discovered but `out-of-range`, and
the rest are `undiscovered`. So this is not a day-0 exploit. But
`cave_of_birds` and `sihaya_ridge` are two of the three sietches Round 8 names
as the *intended* opening pledge targets — the player is meant to reach them in
Act 1, and the income is unbounded from that moment on.

**Why this is in scope for WP02, not waved off as pre-existing.** The
`spiceDelta` write predates this package. But WP02 touched this exact code,
added the `story_reward` event type, and wrote a comment there citing 02 "Crew
lifecycle" as satisfied. Commit `a696dcf` is titled "legacy economy removed;
**crew harvest is the only income**", and `trace.md` step 3 calls crew harvest
"**the only income source**". Both claims are false as stated. What WP02
actually established is that crew harvest is the only *passive, day-boundary*
income; an unbounded *active* income authority survived the sweep untouched and
unmeasured.

Against the contract: 02 "Crew lifecycle" says "Harvest is the only routine
source of player spice. Story effects, trade, and one-time rewards are
individually typed and logged." These rewards are typed and logged, so the
letter of the writer allowlist holds — but they are neither one-time nor
non-routine. 02's command-outcome contract also says "Repeating the same
idempotent command produces a refusal/no-op, never a second reward"; a repeated
`player:choose` produces a second reward, and a third, indefinitely.

---

## 6. Behavioural probes — code and raw output

Nine probes, written as one throwaway vitest file at `src/criticProbeWp02.test.ts`,
run at HEAD, deleted afterwards. All nine use the **real** `EventBus` (no
`vi.mock`) and dispatch through `wireCommands()`'s actual handlers, never the
command functions directly.

Shared harness:

```ts
import { EventBus } from './EventBus'
import { wireCommands } from './runtime/CommandWiring'
import { world, setWorld, createInitialState } from './game-engine/GameState'
import { update, initLoop } from './game-engine/GameLoop'
import { DAY_SECONDS } from './game-engine/TimeSystem'
import { serializeWorld, deserializeWorld } from './game-engine/persistence'
import { hashState } from './game-engine/state/hash'
import { LEGACY_PLEDGED_SAVE } from './game-engine/legacySaveMigration.fixture'

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}
```

Final run: **9 passed (9)**, exit 0.

### PROBE 1 — double-dispatch pledge and settle through the real bus

```ts
const unwire = wireCommands()
const state = createInitialState()
state.player.location = 'red_wall_sietch'
setWorld(state); initLoop()

EventBus.emit('player:pledge_sietch', { villageId: 'red_wall_sietch' })
const charismaAfter1 = world.charisma
const crews1 = world.troopGroups.length
EventBus.emit('player:pledge_sietch', { villageId: 'red_wall_sietch' })
expect(world.charisma).toBe(charismaAfter1)
expect(world.troopGroups.length).toBe(crews1)
expect(world.events[0].message).toBe('They have already pledged to you.')

EventBus.emit('player:assign_crew', {
  groupId: 'group_red_wall_sietch', task: 'harvest', targetId: 'field_red_wall_pan' })
for (let d = 0; d <= 12; d++) advanceToDay(d)
const amount = world.pendingSettlement!.legalRange.max
EventBus.emit('player:settle_tribute', { amount })
const spiceAfter1 = world.player.spice, cycleAfter1 = world.quota.cycleIndex
EventBus.emit('player:settle_tribute', { amount })
expect(world.player.spice).toBe(spiceAfter1)
expect(world.quota.cycleIndex).toBe(cycleAfter1)
```

```
P1 pledge: charisma 25 -> 25 | crews 1 -> 1
P1 pledge events: [
  'They have already pledged to you.',
  'The Fremen at Red Wall Sietch pledge their loyalty to you.'
]
P1 settle: spice 78.88978327339358 -> 0 -> 0
P1 settle: cycle 0 -> 1 -> 1
P1 settle events: [
  'There is no tribute decision waiting.',
  'Tribute short by 11. The balance is carried, with interest.',
  'Crews deliver 1.5 spice'
]
```

**Clean.** No second charisma award, no second crew, no second payment, and a
visible refusal on both replays.

### PROBE 2 — 40-day, four-cycle run with auto-ship enabled

```ts
state.player.spice = 5000
state.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1
state.flags[AUTO_SHIP_ENABLED_FLAG] = 1
// pledge + assign harvest, then:
for (let d = 0; d <= 40; d++) {
  advanceToDay(d)
  if (world.pendingSettlement !== null) pausedDays++
}
expect(pausedDays).toBe(0)
expect(world.quota.cycleIndex).toBe(4)
expect(world.quota.nextDueDay).toBe(44)
expect(world.quota.arrears).toBe(0)
```

```
P2 day 12: Tribute paid in full: 90 spice.
P2 day 20: Tribute paid in full: 150 spice.
P2 day 28: Tribute paid in full: 260 spice.
P2 day 36: Tribute paid in full: 390 spice.
P2 final: day 40 | cycleIndex 4 | nextDueDay 44 | pausedDays 0 | patience 3
        | arrears 0 | spice 4169.87
```

**Clean.** Four deadlines, four settlements, never paused, never double-settled,
arrears clear.

### PROBE 3 — frozen v2 fixture: migrate → play → save → reload (closes the C6 seam)

```ts
const migrated = deserializeWorld(JSON.stringify(LEGACY_PLEDGED_SAVE))
expect(migrated.player.spice).toBe(45)          // zero back-pay
expect(migrated.troopGroups).toHaveLength(1)    // exactly one backfilled crew
expect(migrated.player.troops).toBeUndefined()
expect(migrated.player.influence).toBeUndefined()
expect(migrated.goalType).toBeUndefined()
expect(hashState(deserializeWorld(serializeWorld(migrated)))).toBe(hashState(migrated))

setWorld(migrated); initLoop()
const spiceAtLoad = world.player.spice
advanceToDay(10); advanceToDay(11)
expect(world.player.spice).toBe(spiceAtLoad)    // legacy currentTask pays nothing

EventBus.emit('player:assign_crew', { groupId: 'group_red_wall_sietch',
  task: 'harvest', targetId: 'field_red_wall_pan' })
// ... 3 days, summing only 'Crews deliver X spice' events ...

const blob = serializeWorld(world)
const hashBeforeReload = hashState(world)
setWorld(deserializeWorld(blob)); initLoop()
expect(hashState(world)).toBe(hashBeforeReload)
advanceToDay(15); const hashPlusOne = hashState(world)
setWorld(deserializeWorld(blob)); initLoop(); advanceToDay(15)
expect(hashState(world)).toBe(hashPlusOne)
```

```
P3 migrated: spice 45 | crews [ 'group_red_wall_sietch(15)' ] | troops field undefined
           | influence field undefined | goalType undefined | sietch currentTask undefined
P3 idempotent hash: 03eca9834161b895 == 03eca9834161b895
P3 idle 2 days: spice 45 -> 45 | crew task idle | events []
P3 harvested via crew rule: 3.2 | other spice events: []
P3 save->reload hash: 2f39e3b1c3881683 -> 2f39e3b1c3881683 | equal: true
P3 +1 day both sides: c31151919f3818f0 vs c31151919f3818f0 | spice 48.208775955 -> 49.80833433727034
```

**Clean, and the strongest single result in the package.** A save carrying a
mid-progress legacy `currentTask` earns exactly nothing over two idle days;
income appears only once a crew is ordered; and the migrate → play → save →
reload → advance chain is hash-identical at both checkpoints.

### PROBE 4 — loyalty decay releases a pledge; win-back re-attaches the same crew

Two sietches pledged, because with only one the release trips `loss_abandoned`
the same day and freezes the run before win-back is reachable (measured on the
first attempt: `P4 run ended on day 60 with loss_abandoned`). Then the second
sietch's neglect clock is kept fresh while the first is abandoned.

```ts
EventBus.emit('player:pledge_sietch', { villageId: 'red_wall_sietch' })
world.player.location = 'cave_of_birds'                 // labeled probe teleport
EventBus.emit('player:pledge_sietch', { villageId: 'cave_of_birds' })
// ... 200 days, settling each cycle in full, until red_wall unpledges ...
world.player.location = 'red_wall_sietch'
world.sietches = world.sietches.map(x =>
  x.villageId === 'red_wall_sietch' ? { ...x, loyalty: 60 } : x)
EventBus.emit('player:pledge_sietch', { villageId: 'red_wall_sietch' })
expect(world.troopGroups).toHaveLength(2)               // not 3
expect(rePledged.crewIds).toEqual(['group_red_wall_sietch'])
```

```
P4 pledged: [ 'red_wall_sietch', 'cave_of_birds' ]
          | crews [ 'group_red_wall_sietch', 'group_cave_of_birds' ]
P4 released on day 60 | loyalty 29 | ending null
          | crews still [ 'group_red_wall_sietch', 'group_cave_of_birds' ]
          | pledged.count flag 1
P4 crew survived release: true
P4 re-pledged: true | crews [ 'group_red_wall_sietch', 'group_cave_of_birds' ]
          | crewIds [ 'group_red_wall_sietch' ]
          | charisma after 2 pledges 30 -> before win-back 65 -> after 70
```

**Clean.** Decay releases at loyalty 29 (below `UNPLEDGE_THRESHOLD` 30) on day
60, `pledged.count` re-derives to 1, the crew survives, and the re-pledge
re-attaches the *same* crew id rather than manufacturing a third crew.

Two side-observations worth recording for the campaign packages: releasing your
**only** pledge ends the run immediately with `loss_abandoned`; and I had to
write `loyalty` by hand because no production command can raise it (see C3).

### PROBE 5 — refusal visibility across every mutating bus command

```ts
function probeRefusal(label: string, emit: () => void): void {
  const state = createInitialState()
  state.player.location = 'arrakeen'     // deliberately not at any sietch
  setWorld(state); initLoop()
  const before = world.events.length
  emit()
  results.push([label, world.events.length > before, world.events[0]?.message ?? '(none)'])
}
```

```
P5 REFUSAL VISIBILITY
  VISIBLE | pledge (not present)               | You must stand among them to pledge their loyalty.
  SILENT  | gift (not present)                 | (none)
  VISIBLE | assign_crew (unknown crew)         | That crew no longer exists.
  VISIBLE | issue_equipment (unknown item)     | That equipment no longer exists.
  VISIBLE | assault_fort (unknown fort)        | There is no fort there.
  VISIBLE | settle_tribute (nothing pending)   | There is no tribute decision waiting.
  VISIBLE | buy_equipment (cannot afford)      | Meko does not deal in that.
  SILENT  | set_auto_ship (locked)             | (none)
  SILENT REFUSALS: [ 'gift (not present)', 'set_auto_ship (locked)' ]
```

**Two silent refusals.** This is the empirical basis for the C3 failure.

### PROBE 6 — every location swept for repeatable dialogue income

```ts
for (const vid of villageIds) {
  const state = createInitialState()
  state.player.location = vid
  state.villages = state.villages.map(v => v.id === vid ? { ...v, discovered: true } : v)
  setWorld(state); initLoop()
  const start = world.player.spice
  for (let i = 0; i < 4; i++) {                       // four whole conversations
    EventBus.emit('player:talk', undefined as never)
    if (!world.dialogue) break
    for (let step = 0; step < 8; step++) {            // greedy toward max spiceDelta
      const node = currentNode(); if (!node) break
      const best = [...node.choices].sort(
        (a, b) => (b.effect?.spiceDelta ?? 0) - (a.effect?.spiceDelta ?? 0))[0]
      if (!best) break
      EventBus.emit('player:choose', { choiceId: best.id })
    }
  }
  if (world.player.spice - start > 0) farmable.push(vid)
}
```

```
P6 hagg               delta      0 | trees story/pell_offer_root, story/pell_taught_root
P6 arrakeen           delta      0 | trees story/duke_briefing_root
P6 imperial_basin     delta      0 | trees story/krail_root
P6 red_wall_sietch    delta      0 | trees story/shadir_wary_root
P6 tsimpo             delta      0 | trees story/meko_first_root
P6 sietch_tabr        delta      0 | trees story/ysane_first_meeting_root
P6 carthag            delta      0 | trees story/varn_confident_root
P6 cielago_depression delta      0 | trees story/sabiha_root
P6 habbanya_ridge     delta     40 | trees fremen_sietch/fremen_start
P6 funeral_plain      delta      0 | trees neutral_settlement/neutral_greet
P6 plaster_basin      delta    100 | trees smuggler_outpost/smug_greet
P6 wind_pass          delta      0 | trees story/duncan_root
P6 old_gap            delta      0 | trees harkonnen_stronghold/hk_start
P6 bight_of_cliff     delta     40 | trees fremen_sietch/fremen_start
P6 great_flat         delta      0 | trees neutral_settlement/neutral_greet
P6 sihaya_ridge       delta     40 | trees fremen_sietch/fremen_start
P6 red_chasm          delta     40 | trees fremen_sietch/fremen_start
P6 cave_of_birds      delta     40 | trees fremen_sietch/fremen_start
P6 gara_kulon         delta    100 | trees smuggler_outpost/smug_greet
P6 LOCATIONS WITH REPEATABLE POSITIVE SPICE: [
  'habbanya_ridge (+40 over 4 conversations)', 'plaster_basin (+100 over 4 conversations)',
  'bight_of_cliff (+40 over 4 conversations)', 'sihaya_ridge (+40 over 4 conversations)',
  'red_chasm (+40 over 4 conversations)',      'cave_of_birds (+40 over 4 conversations)',
  'gara_kulon (+100 over 4 conversations)'
]
```

Note the authored **story** trees all yield 0 — the leak is confined to the
older faction-routed trees (`fremen_sietch`, `smuggler_outpost`).

### PROBE 7 — how fast dialogue trade pays Q1 with no crew at all

```
P7 discovered at day 0: [ 'hagg', 'arrakeen', 'red_wall_sietch', 'sietch_tabr',
                          'carthag', 'habbanya_ridge' ]
P7 cave_of_birds: +90 spice in 9 conversations (10.0/conversation), crews = 0, day = 0
P7 plaster_basin: +100 spice in 4 conversations (25.0/conversation), crews = 0, day = 0
```

The entire Q1 tribute, with zero crews, inside one game day.

### PROBE 8 — reconciling the browser trace's step-3 arithmetic

```
P8 crew size: 15 skill: 30 changeoverDaysLeft: 1
P8 day 0: spice 60                  | cumulative delivery events 0
P8 day 1: spice 61.606              | cumulative delivery events 1
P8 day 2: spice 63.206138100000004  | cumulative delivery events 2
P8 day 3: spice 64.80043569593501   | cumulative delivery events 3
P8 day 4: spice 66.38891410564484   | cumulative delivery events 4
P8 day 5: spice 67.97159456915924   | cumulative delivery events 5
P8 day 6: spice 69.5484982489818    | cumulative delivery events 6
```

The trace's `64.80043569593501` is the day-3 balance to the last digit, after
exactly **three** delivery events. Its "six" is a miscount. Crew "15 hands ·
skill 30" reproduces exactly.

### PROBE 9 — real travel reachability of the farm sites

```
P9 from arrakeen on foot, day 0:
  habbanya_ridge     ok=false reason=out-of-range
  cave_of_birds      ok=false reason=undiscovered
  plaster_basin      ok=false reason=undiscovered
  gara_kulon         ok=false reason=undiscovered
  sihaya_ridge       ok=false reason=undiscovered
  red_chasm          ok=false reason=undiscovered
  bight_of_cliff     ok=false reason=undiscovered
P9 legal destinations at day 0: [ 'hagg', 'carthag' ]
  from hagg: farm sites now legal = []
  from carthag: farm sites now legal = []
```

Not a day-0 exploit — but `cave_of_birds` and `sihaya_ridge` are named opening
pledge targets, so the sites sit squarely on the intended Act-1 path.

---

## 7. Do Rounds 7-9 of `progress.md` overstate?

Checked claim by claim. **Almost entirely accurate.** Rounds 7-9 are unusually
honest about their own deltas — the crew-sizing divergence, the organic-loss
timing shift, the one-click-pledge removal, and the C5 deferral are all flagged
by the builders themselves, not discovered by me.

| Round 9 claim | Audit |
|---|---|
| "Suite at trace close: 257 files / 2107 tests" | **Reproduced exactly** |
| "all ten 02 fixtures inventoried" | **True** — I located and ran each |
| "single-harvest-authority proven numerically" | **True**, and stronger than the row demands |
| "reload continuity byte-exact on every field with no replayed day" | **True as written** (it says *fields*, not hash) and the engine-level hash equality it cites is real |
| "six 'Crews deliver 1.6 spice' events" (trace) | **Overstated** — three. Documentation miscount; the spice figure disproves it |
| **`a696dcf` "crew harvest is the only income"** | **Overstated** — true for passive day-boundary income only. §5 |
| **`trace.md` step 3 "the only income source"** | **Overstated** — same reason |
| "TWO visible rejections" | **True** — both reproduce |
| "`equipmentIds` mirror made CrewPanel and the quota projection ignore issued gear — fixed" | **Corroborated**: `CrewPanel.tsx:23-27` now reads `Equipment.groupId`, the single holder link |
| "factionProfiles stops serializing" | **True** — `schema.ts` omits it, `persistence.ts` reseeds unconditionally |
| C5 "recorded now as a scope reading, not a miss" | **Defensible** — see C5 |

The one thing Rounds 7-9 never claim, and should have, is that anything outside
the day boundary was audited for spice writes. The sweep stopped at the two
legacy seams it set out to delete.

---

## 8. What did NOT reproduce

1. **`trace.md` step 3, "six *Crews deliver 1.6 spice* events".** The engine
   emits one per day; three harvest days produce three. The trace's own spice
   figure (`64.80043569593501` = day 3) is correct and contradicts the count.
   Documentation error, not a fabricated result; the substantive claims hold.
2. **`bash scripts/check-file-length.sh` as a meaningful gate.** It exits 0 on a
   clean tree without inspecting anything. Replaced with a manual sweep.
3. **Nothing else.** Every other number in the trace, Round 9, and the fixture
   suite reproduced on my own evidence.

---

## 9. Verdict

**Score: 7 / 10 against the exit proof.**

The exit proof has two halves. The browser-trace half is essentially met: one
pledge, one crew harvest, one reassignment, one tribute settlement and two
rejections are all demonstrated through production UI, with honestly-framed
reload continuity and no duplicate payout — every number reproducible from the
code except one event count. The "every acceptance criterion in 02 passes" half
is not met: C3 fails outright, and C5 is deferred under a scope reading I accept
but which still leaves the sentence literally false.

What earns the 7 is that the consolidation is genuinely done and genuinely
proven. The command substrate is real, the pledge chain is atomic and
idempotent under real bus double-dispatch, the day runner is ordered and
deterministic, the migration is clean and idempotent on a real frozen fixture,
and the fixtures are the least tautological I have audited in this repo. What
costs the 3 is that the package's headline claim — one income authority — is
false in the shipped runtime, and one of the systems 02 names as retained has no
production command path at all.

**Status: `in_progress`. `verified` is not warranted.**

### Single biggest remaining gap

**Unbounded repeatable dialogue spice income (§5).** Seven locations pay 10-25
spice per conversation with no cap, no cooldown and no once-flag, on the
intended Act-1 path. Four conversations at a smuggler outpost cover the entire
Q1 tribute with zero crews. This is a second income authority competing with
crew harvest — precisely the class of conflict WP02 exists to retire — and it
invalidates any balance evidence taken against the crew economy until it is
bounded.

### Recommended path to `verified`

1. Bound `spiceDelta` (and the other one-shot dialogue effects) with a
   consumption flag, or route story rewards through a typed command that
   refuses a second grant. Re-run the probe-6 sweep; every location must read 0.
2. Wire a production gift control and surface the discarded outcomes for
   `onGift` and `onAutoShip` (two lines each, matching `onPledge`'s shape).
3. Correct `trace.md` step 3: "six" → "three".
4. Note in `progress.md` that `a696dcf`'s and the trace's "only income" claims
   scope to passive day-boundary income until item 1 lands.
5. Delta re-audit of C3, the spice-writer hunt, and the two corrected documents.

Items 2-4 are small. Item 1 is the real work.

---

*Probes were written to a throwaway `src/criticProbeWp02.test.ts`, run at HEAD
`5d3fa6d`, and deleted. No commits made. This file is the only change left in
the working tree.*
