# Legacy-authority inventory (WP00 baseline)

Status of this document: evidence for a critic, not a verdict. It records what the
repository does today at commit `35cb647` (branch `feat/game-completion`, working tree
otherwise clean except an unrelated `saveMigration.ts` edit noted in git status). Every
line below is a direct read of `src/`; nothing here is inferred from a report or a memory
of an earlier session.

Scope: `src/game-engine/`, `src/game-render/`, `src/ui/`. Ownership assignment uses
`08-execution-plan.md`: WP01 = "runtime authority and seeded time... quarantine faction
simulation and PoC goals from campaign construction and day updates"; WP02 = "command,
pledge, crew, and tribute consolidation... make `TroopGroup` work the sole campaign
production authority; stop legacy sietch and village payouts... remove duplicate player
resource fields."

---

## 1. Legacy faction simulation reachable from campaign construction / day-update paths

Canonical decision violated: `00-index.md` — "Antagonist... The emergent faction
simulation is not active in campaign mode"; `02-runtime-consolidation.md` table row
"Emergent faction goals/diplomacy/territory updates | Do not call in campaign... Preserve
behind a non-shipping sandbox seam only"; migration step 4 — "Drop... faction-AI timers."

| Finding | Violates | Owner |
|---|---|---|
| `src/game-engine/GameState.ts:36-38` — `createInitialState()` seeds `world.aiTimers.harkonnen = { nextDecisionAt: 10, lastDecision: null }` on every new campaign. | Construction-time faction-AI-timer authority; migration step 4 names "faction-AI timers" as a field to drop. | WP01 |
| `src/game-engine/GameState.ts:43` — `createInitialState()` seeds `world.factionProfiles` from `factionsData` (`src/data/factions.json`, five non-player factions with `resources`/`relations`/`goals`). | Construction-time faction-simulation authority. | WP01 |
| `src/game-engine/GameLoop.ts:6` — `import { updateAI, updateFactionAI } from './AISystem'` | Day-update import of faction/AI systems. | WP01 |
| `src/game-engine/GameLoop.ts:8-14` — imports `decayReputation`, `toTerritoryWorld`/`toReputationWorld`/`toGoalWorldView` (adapter), `executeGoals`, `applyDiplomaticAction`/`updateRelations`, `generateDiplomaticActions` from `./faction/*`. | Direct engine-to-faction-module coupling in the file the spec calls out by name (`GameLoop`). | WP01 |
| `src/game-engine/GameLoop.ts:117` — `updateFactionSystems()` runs every day boundary: accumulates region unrest (line 30), credits faction spice from `produceSpice(r)` (lines 32-46), runs region defection (lines 48-56), decays reputation (58-60), and runs a full diplomacy resolution loop including `pushEvent('tribute_refused', ...)` (62-89). | "Emergent faction goals/diplomacy/territory updates... do not call in campaign." This is the entire emergent AI economy running unconditionally every day. | WP01 |
| `src/game-engine/GameLoop.ts:118` — `updateFactionAI()` call. | Same. | WP01 |
| `src/game-engine/GameLoop.ts:119` — `executeGoals(config.aiActionChanceMultiplier)` call. | Same; `executeGoals` (`faction/GoalExecutor.ts`) claims/attacks regions and calls `resolveBattle` in `faction/conflict.ts`. | WP01 |
| `src/game-engine/GameLoop.ts:139` — `updateAI()` runs **every frame** (not gated to day boundary), driving the Harkonnen village-attack timer. | Faction-AI timer reachable from the main frame loop, not just day updates. | WP01 |
| `src/game-engine/AISystem.ts:5-6` — imports `generateGoals` (`faction/goals`) and `toGoalWorldView` (`faction/adapter`); used in `updateFactionAI()` (lines 87-105) to generate and narrate per-faction goals every day. | Emergent faction goals reachable from campaign day-update. | WP01 |
| `src/game-engine/AISystem.ts:29-77` — `updateAI()`/`harkonnenDecision()`/`executeDecision()`: an independent, always-on Harkonnen timer (`world.aiTimers.harkonnen`) that calls `harkonnenAttack`/`harkonnenBribe` (`VillageSystem.ts`) on the player's weakest **village** by loyalty. Comment at lines 11-27 confirms this is "the only thing in the codebase that mechanically attacks or bribes." | Competes with the authored raid/fort pressure system (`economy/raidRun.ts`) the pack keeps as the sole antagonist mechanism; this is a second, parallel Harkonnen-pressure authority tied to the retired village-ownership model, not `TroopGroup`/sietch combat. | WP01 |
| `src/game-engine/VillageSystem.ts:63-86` — `harkonnenAttack()`/`harkonnenBribe()`, the mutation targets of the timer above: they flip `village.owner`/`village.status` and cut `village.loyalty` outside any authored act/raid rule. | Same as above — parallel antagonist authority. | WP01 |
| `src/game-engine/DialogueSystem.ts:9-10` — imports `applyPlayerAction` (`faction/reputation`) and `toReputationWorld` (`faction/adapter`); invoked at line 97-101 (`applyEffect`) whenever a dialogue choice carries `effect.reputationAction`. | Faction reputation system reachable from the player-facing dialogue command path, not just day updates. | WP01 |
| `src/data/dialogues-{core,fremen,atreides,emperor,neutral,smuggler}.ts` — 35 authored `reputationAction:` effects (e.g. `src/data/dialogues-fremen.ts:37`). | Confirms the path above is live/reachable, not dead code — every playthrough that talks to an NPC in these trees exercises the faction reputation engine. | WP01 |
| `src/game-engine/territory/territory.ts` (`accumulateUnrest`, `processRegionDefection`, `produceSpice`), imported by `GameLoop.ts:7`. Not physically under `game-engine/faction/`, but consumed by `faction/adapter.ts` and `faction/conflict.ts` and named explicitly in the spec's own retirement row ("territory updates"). | Same retirement row as faction goals/diplomacy. | WP01 |
| `src/types.ts:4,144` and `src/game-engine/GameState.ts:1,43` — `FactionProfile`/`Region` types flow into `WorldState`, so `world.factionProfiles`/`world.regions` are serialized in every save today. | Save payload carries faction-sim state; migration must drop or quarantine it (step 4). | WP01 (construction/serialization), WP02 (save migration) |
| `src/ui/FactionPanel.tsx:45-56`, mounted at `src/App.tsx:10,51` (`<OrnamentFrame plain><FactionPanel /></OrnamentFrame>`). Renders `world.factionProfiles` trust bars and per-faction spice. | Verbatim named in `02`'s acceptance criteria #2 — "Campaign UI renders no `FactionPanel`." This is not a dead component; it is mounted in the live App tree. | WP01 (data no longer produced) / WP02 (panel removal is part of "no legacy panel is hidden with CSS while its system continues changing campaign state") |

**Cross-reference into category 5:** `faction/GoalExecutor.ts:28,39,68` and `faction/conflict.ts:99` and `faction/strategy-profiles.ts:77` all call raw `Math.random()`; this whole chain is reachable from `GameLoop.ts:119` (`executeGoals`), so quarantining category 1 also removes three of the category-5 findings as a side effect. Listed once here to avoid double-counting in the category-5 table below (noted there with a cross-reference instead of a duplicate row).

---

## 2. Sietch threshold-based task/payout production, and village payouts

Canonical decision violated: `00-index.md` — "Campaign economy... The threshold-based
legacy sietch task/payout loop is removed from campaign play"; `02` table rows for
`SietchState.currentTask` and `Village.productionRate`; rejection criterion "One sietch
can generate spice through both crew harvest and legacy progress."

| Finding | Violates | Owner |
|---|---|---|
| `src/game-engine/sietch/updateSietches.ts:25-49` (`processOne`) — for a pledged sietch with `currentTask === 'harvest_spice'`, accrues `outputProgress` and once it crosses `HARVEST_PAYOUT_THRESHOLD` (3.0) pays a flat `HARVEST_SPICE_PAYOUT` (12); for `train_troops`, pays a flat `TRAIN_TROOPS_PAYOUT` (6) at the same threshold pattern (`sietch/types.ts:13-21`). | "The threshold-based legacy sietch task/payout loop is removed from campaign play." | WP02 |
| `src/game-engine/GameLoop.ts:120-132` — the day-boundary caller: `updateSietches(world.sietches)`, then for each payout, `world.player.spice += payout.amount` (spice) or `world.player.troops += payout.amount` (troops), each with its own `pushEvent`. | Same; this is where the legacy payout actually reaches player-visible state every day. | WP02 |
| `src/game-engine/SietchSystem.ts:49-65` (`assignPlayerSietchTask`) and `:70-76` (`stopPlayerSietchTask`) — production command handlers that set/clear `SietchState.currentTask`. | Player-facing commands that arm the retired payout loop. | WP02 |
| `src/runtime/CommandWiring.ts:68-73` — `onAssignTask`/`onStopTask` wire `player:assign_sietch_task` / `player:stop_sietch_task` (EventBus) straight to the handlers above; the same file (`:12`) imports them. | Full production wiring: UI → EventBus → engine command → threshold payout, not dead code. | WP02 |
| `src/types.bus.ts:31-35` — `BusEvents['player:assign_sietch_task']`, `['player:stop_sietch_task']`, and `['player:pledge_sietch']` are part of the shipped EventBus command contract. | `02`: "no campaign import, command, panel, event, projection, or save field may depend on [retired authority]." These are event-contract entries, not just handlers. | WP02 |
| `src/ui/SietchCommandSection.tsx` (whole file; task buttons at lines 70-142) — production UI for `assign_sietch_task`/`stop_sietch_task`, rendered inside `src/ui/VillagePanel.tsx:4,91-97` for every selected village with a sietch. | Verbatim named in `02`'s acceptance criteria #2 — "Campaign UI renders no... `SietchCommandSection`." Mounted live, not hidden. | WP02 |
| `src/data/sietches.ts:4-22` — all 19 sietches seeded with `currentTask: null, outputProgress: 0`, i.e. the legacy task-progress shape is part of every new campaign's initial state. | Construction-time legacy-shape seeding. | WP01/WP02 (state shape lives in WP01's versioned schema; removal of the field is WP02's) |
| `src/game-engine/VillageSystem.ts:20-39` (`updateVillages`) — every day boundary, `village.spice += village.productionRate` (line 24, `Village.productionRate` daily production), then calls `collectPlayerSpice()`. | `02` table row: "`Village.productionRate` daily production \| Stop applying to player resources." | WP02 |
| `src/game-engine/VillageSystem.ts:44-51` (`collectPlayerSpice`) — takes 10% of every player-owned village's spice stockpile (min 0.5) and does `world.player.spice += actual` (line 50). | Same row; this is the mechanism that actually moves legacy village production into the player's authoritative spice figure. | WP02 |
| `src/game-engine/GameLoop.ts:108` — `updateVillages()` is called unconditionally at every day boundary, before the authored harvest/quota/act pipeline (lines 110-116). | Same; confirms the legacy village economy runs on the exact same clock as the authored one, every day, for every campaign. | WP02 |
| `src/data/villages.wider.ts:29,43,57,...` — `productionRate` values (e.g. 1.6, 0.9, 2.1) are populated in the live village data, so the mechanism above is not starved of input. | Confirms reachability, not dead data. | WP02 |

---

## 3. PoC victory goals that can end or gate a campaign

Canonical decision violated: `00-index.md` — "Victory authority: The act/endgame machine
is the only campaign authority. PoC goals such as 'control all villages' do not end a
campaign"; `02` table row `goalType`/`control_all_villages`/`survive_20_min` → "Remove from
campaign state and UI."

| Finding | Violates | Owner |
|---|---|---|
| `src/game-engine/GameState.ts:41-42` — `createInitialState()` seeds `goalAchieved: false, goalType: 'control_all_villages'` on every new campaign. | Construction-time PoC-goal authority. | WP01 |
| `src/game-engine/GameLoop.ts:142-152` — end of `update()`: `if (world.goalType === 'control_all_villages' && playerControlsAll()) { world.goalAchieved = true; world.ending = 'win_military'; pushEvent('poc_goal_achieved', ...) } else if (world.goalType === 'survive_20_min' && hasPlayerSurvived()) { world.goalAchieved = true; world.ending = 'win_military'; ... }` | The sharpest violation in this inventory: this doesn't just set its own flag, it **writes `world.ending`** — the exact field `02` declares "the only progression authority" ("`world.act` and `world.ending` are the only progression authority") and hands it `'win_military'` regardless of act/objective state. A PoC condition can end the campaign through the field the spec reserves for the authored act machine. | WP01 |
| `src/game-engine/GameState.ts:104-111` (`playerControlsAll`) and `:114-116` (`hasPlayerSurvived`, `world.time >= 1200`) — the two PoC goal-check functions, imported directly into `GameLoop.ts:1`. | Same. | WP01 |
| `src/types.ts:89-90` — `WorldState.goalAchieved: boolean; goalType: 'control_all_villages' \| 'survive_20_min';` | Schema-level authority; every save today carries `goalType`. Migration must drop it per `02`'s migration step 4 ("Drop `goalType`..."). | WP01 (schema) / WP02 (save migration) |
| `src/ui/StatusBar.tsx:19,34-36,72-73` — reads `goalType`/`goalAchieved` from the store and renders `Villages: {playerVillages}/{villages.length}` or `Survive: {minutes}m {seconds}s / 20m` as the primary status-bar readout, plus `{goalAchieved ? 'RUN ENDED' : goalText}`. | Verbatim named in `02`'s acceptance criteria #2 — "Campaign UI renders no... PoC goal counter." Top-of-screen, always visible. | WP01 (data) / WP03 or WP11 (UI, outside this pack's WP00/WP01/WP02 removal scope but the reader is listed here per instructions) — **removal itself is WP02** since it is UI depending on retired state. |
| `src/game-engine/economy/actRun.ts:46,51` and `src/game-engine/EconomySystem.ts:72` — the **authored** act machine and quota loss-check also write `world.goalAchieved = true` / `world.ending = ...`. | Not a violation by itself — `02` explicitly allows `goalAchieved` to remain "temporarily as a derived compatibility value" — but it means `goalAchieved` currently has **three independent writers** (PoC goals, act machine, quota loss), which is exactly the kind of split authority WP01 must collapse to one. Listed for completeness, not as a standalone defect. | WP01 |
| `src/game-render/core/debugSources.ts:66-69` — `window.__DUNE__.endRun(ending)` sets `world.goalAchieved = true; world.ending = ending`. | Debug-only, not reachable through any production UI control — see "Out of campaign scope" below for why this is flagged separately rather than folded into the count. | n/a (debug tooling) |

---

## 4. `player.troops` and `player.influence`: every read/write

Canonical decision violated: `02` table rows — "`player.troops` aggregate \| Remove.
Combat power comes from positioned `TroopGroup` entities" and "`player.influence` \|
Remove after content migration. `world.charisma`, sietch loyalty, and faction-specific
flags already own its intended meanings."

### `player.troops`

| Finding | Kind | Owner |
|---|---|---|
| `src/types.ts:52` — `troops: number;` field declaration on the player state type. | Schema | WP01 |
| `src/game-engine/GameState.ts:33` — `createInitialState()` seeds `troops: 0`. | Write (construction) | WP01 |
| `src/game-engine/GameLoop.ts:129` — `world.player.troops += payout.amount` (legacy sietch `train_troops` payout, category 2). | Write | WP02 |
| `src/game-engine/CombatSystem.ts:3` (file-header comment: "Mutates world.villages, world.sietches, world.player.troops"), `:61` (`if (troopsCommitted > world.player.troops) return`), `:88` and `:111` (`world.player.troops -= lost` on win/loss). | Read + write, full combat subsystem | WP02 |
| `src/types.bus.ts:33` — `BusEvents['player:attack_village']: { targetVillageId: VillageId; troopsCommitted: number }`. | Event-contract dependency on the aggregate-troop concept (a raw committed count, not a `TroopGroup` id). | WP02 |
| `src/runtime/CommandWiring.ts:13,74-76` — imports and wires `attackVillage`/`scoutVillage` to `player:attack_village`/`player:scout_village`. | Production wiring | WP02 |
| `src/ui/StatusBar.tsx:70` — `<Readout label="troops" value={`${player.troops ?? 0}`} />`. | Read, production UI, top status bar. Verbatim the "aggregate troops figure" `02`'s acceptance criteria #2 forbids. | WP02 |
| `src/ui/VillagePanel.tsx:103` — `playerTroops={world.player.troops ?? 0}` passed into `AttackSection`. | Read | WP02 |
| `src/ui/AttackSection.tsx:5,11,29,59,68-70,89` — `DEFENDER_STRENGTH`/`SCOUT_COST` import from `CombatSystem`; entire attack panel is gated and sized off `playerTroops` (`< 10` disables it; small/strike/all-in buttons are `0.25`/`0.5`/`1.0` of the aggregate). | Read, full production UI | WP02 |

### `player.influence`

| Finding | Kind | Owner |
|---|---|---|
| `src/types.ts:50` — `influence: number;      // 0–100` field declaration. | Schema | WP01 |
| `src/game-engine/GameState.ts:31` — `createInitialState()` seeds `influence: 5`. | Write (construction) | WP01 |
| `src/game-engine/DialogueSystem.ts:81-83` (`applyEffect`) — `if (effect.influenceDelta) { world.player.influence = Math.max(0, Math.min(100, world.player.influence + effect.influenceDelta)) }`. | Write, production dialogue-effect path | WP02 |
| 68 authored `influenceDelta:` effects across `src/data/dialogues-{core,fremen,atreides,emperor,neutral,smuggler}.ts` and `src/data/dialogue/{act1-desert-b,act1-palace,act2-b,act3,duncan,reaches-desert,reaches-basin}.ts` (e.g. `src/data/dialogues-fremen.ts:37`, `src/data/dialogue/act3.ts:163`). | Write sources; confirms the field is live and accumulates across nearly every conversation in the game, not just a stub. | WP02 (content-effect migration, per migration step 5) |
| `src/ui/StatusBar.tsx:71` — `<Readout label="influence" value={`${player.influence}`} />`. | Read, production UI | WP02 |
| **Gate search result:** `grep` across `src/data/`, `src/game-engine/dialogue/conditions.ts`, and `src/game-engine/acts/` for any dialogue `condition`/`requires`/gate keyed on `influence` returned **no matches**. Every `influenceDelta` found is a write; nothing in engine-reachable code currently *reads* `player.influence` to gate content, an ending, or a dialogue branch. | Directly informs migration step 5 ("Map meaningful `influence`-gated content to explicit flags or charisma before removing the field"): today there is no meaningful gated content to remap — the field is accumulate-and-display only. This is a result, stated explicitly per the task's "none found" instruction, scoped to this one sub-question. | WP02 |

---

## 5. Unseeded randomness reachable from engine code

Canonical decision violated: `02` table row "`Math.random()` in campaign mutations \|
Replace with stored seeded RNG"; "Randomness" section — "Campaign randomness uses one
seeded engine service whose serializable state includes the seed and current step...
Prospecting, worms, combat variance, raids, and authored random event selection consume
it through explicit injected calls."

**Existing seeded-RNG infrastructure: none found.** `find`/`grep` across
`src/game-engine/` for `*random*`, `*rng*`, `seed`-named modules returned only
`desert/sites.ts`'s deterministic desert-layout hash (keyed off a fixed `DESERT_SEED`,
used once at construction, unrelated to day-to-day rolls) and comment-only matches. No
stored seed, no random cursor, no injectable RNG service exists anywhere in the engine
today — every finding below calls the global `Math.random()` directly at the mutation
layer.

| File:line | Code | Owner |
|---|---|---|
| `src/game-engine/CombatSystem.ts:46` | `const roll = 0.85 + Math.random() * 0.30` (`scoutVillage`) | WP02 (file itself retired per category 4) |
| `src/game-engine/CombatSystem.ts:77` | `: Math.round(defenderBase * (0.85 + Math.random() * 0.30))` (`attackVillage`, unscouted defense roll) | WP02 |
| `src/game-engine/economy/prospectRun.ts:52` | `const outcome = resolveFind(chance, Math.random(), Math.random(), richness)` | WP01 (seeded-RNG service is WP01's scope; this call site is retained-authoritative code that needs to consume the new service, not be removed) |
| `src/game-engine/economy/prospectRun.ts:100` | `if (Math.random() >= DEEP_DESERT_CHANCE) return` (`revealDesertSite`) | WP01 |
| `src/game-engine/economy/prospectRun.ts:107` | `const site = nextFind(world.desertSites, prospectRange(hasThopter), Math.random())` | WP01 |
| `src/game-engine/economy/raidRun.ts:76` | `Math.random()` passed into `resolveCombat(...)` for the authored raid roll | WP01 |
| `src/game-engine/economy/endgameOps.ts:75` | `Math.random()` passed into `resolveCombat(...)` for fort-assault resolution | WP01 |
| `src/game-engine/economy/harvestRun.ts:45` | `const worm = resolveWorm(hasHarvester, hasThopter, Math.random())` | WP01 |
| `src/game-engine/faction/GoalExecutor.ts:28,39,68` | Target selection (`unclaimed[Math.floor(Math.random() * ...)]`, `contested[...]`) and action-chance gate | WP01 (removed as part of category-1 quarantine, cross-referenced from there — not double-counted below) |
| `src/game-engine/faction/conflict.ts:99` | `const randomFactor = 0.85 + Math.random() * 0.30;` (battle resolution) | WP01 (same cross-reference) |
| `src/game-engine/faction/strategy-profiles.ts:77` | `const jitter = (): number => Math.random() * 2 * variance - variance;` | WP01 (same cross-reference) |

**`Date`/`Date.now` in engine code:**

| File:line | Code | Note | Owner |
|---|---|---|---|
| `src/game-engine/persistence.ts:32` | `{ version: CURRENT_SAVE_VERSION, savedAt: Date.now(), state: world }` | This is save **metadata** (a wall-clock timestamp for the save-slot list), not a world-state mutation or a gameplay roll. Listed for completeness per the task instruction, not claimed as a determinism violation — `savedAt` does not feed any simulation outcome. | n/a (no change required by `02`) |

No other `Date.now()`/`new Date()` call sites exist under `src/game-engine/`.

---

## 6. Duplicate resource paths — one player action, two resource/state fields

Canonical decision violated: `02` rejection criterion — "One sietch can generate spice
through both crew harvest and legacy progress"; goal statement — "A player action must
travel through one command path, mutate one authoritative representation, pay out once."

| Finding | The two paths | Owner |
|---|---|---|
| **Player spice, credited three independent ways every day boundary.** (1) `src/game-engine/economy/harvestRun.ts:93-94` — `world.player.spice += scaled` from `TroopGroup` harvest (authoritative, keep). (2) `src/game-engine/VillageSystem.ts:24,44-50` — `village.spice += village.productionRate` then `collectPlayerSpice()` does `world.player.spice += actual` (legacy village production). (3) `src/game-engine/GameLoop.ts:126` — `world.player.spice += payout.amount` from the legacy sietch `harvest_spice` threshold payout (category 2). All three run unconditionally at the same day boundary (`GameLoop.ts:108,110,120-132`), so a single day can credit the player's spice figure from crew work, village stockpile skim, and sietch threshold progress simultaneously. | Crew harvest vs. village production vs. sietch threshold payout, all writing `world.player.spice`. | WP02 |
| **`attackVillage` as an unauthorized second pledge path.** `src/game-engine/CombatSystem.ts:90-103` — on a won attack against a `fremen`-owned village, the handler sets `village.owner = 'fremen'`, `village.status = 'friendly'`, `village.loyalty = 60`, **and** (if a matching sietch exists) `sietch.pledgedToPlayer = true` plus `world.flags['pledged.count'] = pledgedCount(...)` — the code's own comment at lines 98-101 calls this "the second place a sietch can become pledged." This grants a pledge with none of the loyalty threshold, charisma-cap, or crew-creation steps the canonical pledge chain in `02` ("Sietches and loyalty" section, steps 1-5) requires, and awards no charisma and creates no crew. | One `player:attack_village` command mutates village ownership + sietch pledge state + the `pledged.count` flag + `player.troops`, none of it through the atomic pledge chain `SietchSystem.pledgePlayerSietch` uses. | WP02 |
| **Two parallel "troop economies" for the same military-strength concept.** `TroopGroup.skills.military` is trained via `src/game-engine/economy/upkeepRun.ts:49-60` (`runTrainingDay`, authoritative, keep) while `player.troops` — a completely separate aggregate count — is produced by the legacy sietch `train_troops` payout (`GameLoop.ts:129`) and spent by `CombatSystem.ts` attacks. A crew can be well-trained and a player can simultaneously hold an unrelated Fedaykin headcount with no connection between the two numbers. | Crew military-skill training vs. aggregate `player.troops` production/consumption — two representations of "military strength" advancing independently. | WP02 |
| **`checked and ruled out:`** whether region production (`GameLoop.ts:32-46`, `updateFactionSystems`) creates a second player-spice ledger via a `player` entry in `world.factionProfiles`. `src/data/factions.json` contains five factions (`harkonnen`, `fremen`, `atreides`, `smugglers`, `emperor`) and **no `player` id**, so `spiceByFaction`'s `r.owner === 'player'` branch computes a scaled amount that is looked up against a faction list with no matching profile and silently has nowhere to land in `world.factionProfiles`. This is not a second player-resource field — it is dead-end arithmetic inside the already-flagged category-1 faction loop, not a category-6 finding on its own. | n/a — recorded to show the check was made, not to inflate the count. | (covered by category 1) |
| **Simulation authority note (not a `world`-mutation duplicate, flagged for completeness):** `src/game-engine/balance/simulate.ts` (whole file) reimplements its own day-by-day economy loop — local `stock`, `crews: SimCrew[]`, synthetic crew creation every `PLEDGE_INTERVAL_DAYS` (lines 76-111), its own settlement math (lines 128-147) — instead of driving `runHarvestDay`/`assignCrew`/`pledgePlayerSietch`/`runQuotaCheck` through production commands. This matches `02`'s rejection criterion verbatim: "Simulation copies formulas or invents crews instead of issuing production commands." It does not mutate `world`, so it is not literally "one player action, two fields," but it is the parallel-economy risk the pack's goal statement names directly ("rather than approximate it with a parallel economy"). Its replacement is explicitly scoped to **WP04** ("Build the headless runner as a client of production commands and queries"), not WP01/WP02 — noted here rather than force-assigned to keep the ownership column accurate. | Two independent implementations of the Act-1 spice/quota economy: production engine vs. `simulate.ts`'s standalone model. | WP04 (not WP01/WP02 — flagged as a deviation from the requested WP01/WP02-only assignment because the execution plan names WP04 as this file's owner) |

---

## Out of campaign scope

The task asks for a separate list of ambiguous findings that might belong to workshop-only
code (`vehicle-shop/`, `character-shop/`, `landscape-shop/`).

- **No such findings exist.** All three shop roots (`vehicle-shop/`, `character-shop/`,
  `landscape-shop/`) live at the repository root, outside `src/`, and the task's search
  scope is `src/` only. A search of `src/` for the literal substring `-shop/` returned only
  three code **comments** referencing the shop pattern for context
  (`src/game-render/modes/flight/Ornithopter.ts:3,7,17,79`,
  `src/game-render/machines/Harvester.ts:3,7`, `src/game-render/modes/location/SietchSet.ts:68`)
  — none of them contain any of the six categories' patterns (`Math.random`, `player.troops`,
  `player.influence`, `goalType`, `SietchState`, `faction/` imports). Nothing in `src/`
  actually depends on shop-only code for a category-1–6 finding.

- **`src/game-render/core/debugSources.ts:66-69`** — `window.__DUNE__.endRun(ending)` sets
  `world.goalAchieved`/`world.ending` directly, and `giveEquipment` (lines 55-64) pushes raw
  equipment onto every `TroopGroup`. This is listed here rather than folded into category 3's
  count because it is **not reachable through any production UI control** — it exists only for
  manual console-driven testing (the file's header comment: "Everything `window.__DUNE__` can
  see and poke"). It is still worth a WP01 note because it is a `src/game-render/` file directly
  assigning `world` fields, which the ownership contract in `02` forbids ("`src/game-render/`...
  never awards resources, changes ownership, resolves arrival, or mutates campaign flags") —
  but it is debug tooling, not a campaign-authority violation a player can trigger, so it is not
  counted in the category-3 summary below.

---

## Summary counts

| Category | Findings recorded | "None found"? |
|---|---|---|
| 1. Legacy faction simulation reachable from construction/day-update | 16 | No — extensive findings, including the mounted `FactionPanel` |
| 2. Sietch threshold payout + village payouts | 11 | No — full production wiring confirmed end to end |
| 3. PoC victory goals gating/ending a campaign | 7 (6 counted + 1 debug-only note excluded, see "Out of campaign scope") | No — includes a direct write to `world.ending`, the act machine's reserved field |
| 4. `player.troops` / `player.influence` reads and writes | 16 (8 troops + 8 influence, including the "no influence-gate" sub-result) | No |
| 5. Unseeded randomness reachable from engine code | 11 `Math.random()` sites + 1 non-issue `Date.now()` metadata note; **no seeded-RNG service exists anywhere in the engine** | No for `Math.random`; the seeded-RNG-service *search itself* returned none found, which is the expected WP01 starting state |
| 6. Duplicate resource paths | 3 confirmed duplicates + 1 explicitly ruled-out check + 1 parallel-simulation note (owner deviates to WP04) | No |

Every category has at least one finding; none of the six categories is empty. The one
explicit "none found" result inside a category is the influence-gate sub-search in
category 4 (no engine-reachable code gates content on `player.influence` today), and it is
itself evidence WP02 needs — it means migration step 5 has nothing to remap, not that the
check was skipped.

## Notes for the consolidation diff

- Saves already serialize the full `WorldState`, so `goalType`, `player.troops`,
  `player.influence`, `world.aiTimers`, `world.factionProfiles`, `world.regions`, and every
  `SietchState.currentTask`/`outputProgress` are live fields in every save produced by the
  current build. WP02's migration work (`02`, "Save migration" section) has a non-empty set
  of fields to drop or convert on every one of them, not a hypothetical one.
- The unwired pure module `src/game-engine/sietch/loyalty.ts` (`checkPledge`, `giveGift`,
  `decayLoyalty`, `adjustLoyalty`, the `LoyaltyState` shape) implements the canonical pledge
  gate `02` requires, but nothing in production code calls it — `SietchSystem.pledgePlayerSietch`
  checks only `village.owner === 'fremen'` and `!sietch.pledgedToPlayer`, with no loyalty or
  charisma-cap check. This is the **new** authority missing, not legacy authority present, so
  it is not counted as a finding in the six categories above — recorded here as one sentence of
  context for whoever builds WP02's pledge chain, since the pure rules already exist and are
  tested in isolation.
