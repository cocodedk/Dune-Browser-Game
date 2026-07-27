# GLM-PLAN.md — Implementation Checklist

Ordered by dependency: each item depends on items above it.

## Phase 1: Close Integration Gaps (complete what's built but not wired)

- [x] **1A — Merge `world.factions` into `world.factionProfiles`**
  - Removed `Faction` type and `factions: Faction[]` from `WorldState`
  - Added `AITimer` type and `aiTimers` field to `WorldState` for AI timing
  - Refactored `AISystem.ts` to use `world.factionProfiles` + `world.aiTimers`
  - Added 6 unit tests in `AISystem.test.ts`

- [x] **1B — Wire diplomatic actions into game loop**
  - Created `diplomacyEngine.ts` with rule-based `generateDiplomaticActions()`
  - Added Step 5 (diplomacy) to `updateFactionSystems()` in `GameLoop.ts`
  - Applies `applyDiplomaticAction()` results to `world.factionProfiles`
  - Emits `tribute_refused` events; calls `updateRelations()` on refused tribute
  - Added `tribute_refused` to `GameEventType`; 24 new tests in `diplomacyEngine.test.ts`

## Phase 2: Difficulty Scaling (core gameplay, no external deps)

- [x] **2A — Add `Difficulty` type and selector**
  - Added `Difficulty` type (`'easy' | 'normal' | 'hard'`) to `types.ts`
  - Added `difficulty` field to `WorldState`; default `'normal'`
  - Added difficulty selector buttons (Easy/Normal/Hard) to `StatusBar.tsx`
  - Added `'game:difficulty'` to `BusEvents`; wired through `GameScene.ts`

- [x] **2B — Implement difficulty scaling rules**
  - Created `difficulty.ts` with `DifficultyConfig` and `DIFFICULTY_CONFIG` (easy/normal/hard)
  - Applied multipliers in `GameLoop.ts`: player spice, unrest, reputation decay
  - Added `actionChanceMultiplier` param to `executeGoals()` in `GoalExecutor.ts`
  - Added `unrestMultiplier` param to `accumulateUnrest()` in `territory.ts`
  - Added `decayMultiplier` param to `decayReputation()` in `reputation.ts`
  - Added `aggressionMultiplier` param to `scoreGoal()`, `generateGoals()`, `updateGoals()` in `goals.ts`
  - 5 new tests in `difficulty.test.ts`

## Phase 3: Persistence (IndexedDB save/load)

- [x] **3A — IndexedDB persistence layer**
  - Created `src/game-engine/persistence.ts` with `saveGame()`, `loadGame()`, `deleteSave()`, `hasSave()`
  - Saves `SaveData { savedAt, state }` wrapper with timestamp
  - 5 unit tests for JSON round-trip serialization

- [x] **3B — Resume from save**
  - Added `loadFromSave()` to `GameState.ts` — async, restores `world` from save or returns false
  - Wired `loadFromSave()` into `main.tsx` app boot — checks IDB before rendering

- [x] **3C — Save/Load UI in React**
  - Added `saveGame`, `loadGame`, `newGame` async actions to Zustand store
  - Added Save/Load/New buttons to `StatusBar.tsx` with save timestamp display
  - "New Game" has confirmation dialog

## Phase 4: Dialogue Content (expand PoC to full game)

- [x] **4A — Dialogue trees for all factions**
  - Added 5 new dialogue trees: `fremen_sietch`, `atreides_embassy`, `smuggler_outpost`, `emperor_delegation`, `neutral_settlement`
  - Split `dialogues.ts` into 6 files: `dialogues-core.ts`, `dialogues-fremen.ts`, `dialogues-atreides.ts`, `dialogues-smuggler.ts`, `dialogues-emperor.ts`, `dialogues-neutral.ts`
  - Each tree: 5-6 nodes, faction-themed, with `DialogueEffect` hooks and `reputationAction`

- [x] **4B — Dialogue effect dispatch**
  - Moved `PlayerAction` type to `types.ts` (shared location)
  - Added `reputationAction?: PlayerAction` to `DialogueEffect`
  - `DialogueSystem.applyEffect()` now calls `applyPlayerAction()` + `toReputationWorld()` when `reputationAction` is present
  - Added `reputationAction` to 24+ dialogue choices across all 7 trees
  - 5 unit tests for dialogue reputation dispatch

## Phase 5: Visual / Audio Polish

- [x] **5A — Character portraits (code scaffolding)**
  - Created `src/data/portraitConfig.ts` with `PortraitKey` type, `DIALOGUE_PORTRAITS` mapping, `PORTRAIT_ASSETS` paths, `PORTRAIT_FACTION` colors
  - Updated `DialoguePanel.tsx` with faction-colored portrait placeholder area
  - Created `public/assets/portraits/.gitkeep` for future portrait images
  - Ready to swap in real `.png` assets without code changes

- [x] **5B — Ambient audio loop (code scaffolding)**
  - Created `src/game-render/AudioManager.ts` with `playAmbient()`, `stopAmbient()`, `setVolume()`, `toggleMute()`, EventBus `'audio:changed'` emissions
  - Wired AudioManager in `GameScene.ts` — plays `'ambient_desert'` on scene start
  - Added mute/unmute toggle to `StatusBar.tsx` with `'audio:mute'` EventBus event
  - Added `'audio:changed'` and `'audio:mute'` to `BusEvents`
  - Created `public/assets/audio/.gitkeep` for future audio file
  - Commented-out preload in `BootScene.ts` — uncomment when audio asset is available

## Phase 6: Spice Economy, Troops & Combat, Player Diplomacy

The player currently can only travel and talk — no strategic spending decisions. Phase 6 adds three interlocking systems that create a core loop: **spice funds troops, troops enable combat/diplomacy, combat/diplomacy earn spice.**

### 6A — Player troops & garrison (types + state)

- Add to `Player` in `types.ts`:
  - `troops: number` — player's mobile force (recruited with spice)
  - `garrison: Record<VillageId, number>` — troops stationed at owned villages for defense
- Initialize `troops: 0`, `garrison: {}` in `GameState.ts`
- Add EventBus actions: `'player:recruit'`, `'player:station'`, `'player:unstation'`

### 6B — Spice economy system

- Create `src/game-engine/spiceEconomy.ts`:
  - `recruitTroops(world, count)` — costs 10 spice per troop, must be at an owned village, adds to `player.troops`. Village population must be >= count * 10 (you recruit from the local populace). Minimum 1 troop.
  - `bribeFaction(world, factionId, spiceAmount)` — costs spice, increases `factionProfile.relations['player'].trust` by `spiceAmount / 5` (5 spice = 1 trust). Cannot bribe a faction at war with you (use propose alliance first).
  - `tradeWithFaction(world, factionId, spiceAmount)` — give spice to a faction in exchange for a village loyalty boost at one of their villages (+`spiceAmount / 3` loyalty). Must be at one of their villages.
- Add `SpiceAction` type to `types.ts` for EventBus: `{ type: 'recruit'; count: number } | { type: 'bribe'; factionId: FactionId; amount: number } | { type: 'trade'; factionId: FactionId; amount: number }`
- Tests: cost validation, population check, trust changes, loyalty changes, edge cases (0 spice, at wrong village, at war)

### 6C — Combat system (player-initiated attacks)

- Create `src/game-engine/combat.ts`:
  - `attackVillage(world, villageId, troopCount)` — player attacks a non-owned village with N troops (deducted from `player.troops`). Uses the existing `resolveBattle` from `conflict.ts` with a synthetic `FactionProfile` for the player.
  - Player combat power = `troopCount * strategyModifier` where player strategy modifier is 1.0 (no bonus).
  - Defender power = garrison troops (or militia = `village.population * 0.05` if no garrison) * defender strategy modifier * home bonus.
  - Attacker wins: village owner becomes `'player'`, loyalty set to 40, remaining troops garrison the village.
  - Defender wins: player loses troops, village unchanged. Player troops that attacked are lost.
  - Stalemate: both sides take losses, village unchanged.
- `stationTroops(world, villageId, count)` — move troops from `player.troops` to `player.garrison[villageId]`. Must own the village.
- `unstationTroops(world, villageId, count)` — move garrison back to mobile force. Must own the village.
- Integrate with AI attacks: when Harkonnen attacks a player village with garrison, defender power includes garrison.
- Add EventBus actions: `'player:attack'`, `'troops:station'`, `'troops:unstation'`
- Add `GameEventType` entries: `'combat'`, `'troops_recruited'`
- Tests: attack outcomes, garrison defense, stalemate, troop deduction, village capture

### 6D — Player-initiated diplomacy

- Create `src/game-engine/playerDiplomacy.ts`:
  - `proposeAlliance(world, factionId)` — uses `applyDiplomaticAction` from `diplomacy.ts`. Costs 20 spice. If trust >= `ALLIANCE_TRUST_THRESHOLD` (40), alliance forms (`trade: true`). If rejected, trust -5.
  - `declareWar(world, factionId)` — sets `war: true` on both sides. Free action, but has reputation consequences.
  - `demandTribute(world, factionId, amount)` — uses existing `applyDiplomaticAction`. If faction fears player (fear >= 60), they pay spice to player. If refused, trust drops and may trigger war.
  - `breakAlliance(world, factionId)` — breaks `trade: true`, major trust hit (-30 to target, -10 to all bystanders).
- All actions push events to the event log.
- Add `GameEventType` entries: `'alliance_formed'`, `'war_declared'`, `'tribute_paid'`, `'alliance_broken'`
- Add EventBus action: `'player:diplomacy'`
- Tests: each action's trust/cost/state changes, rejection cases, edge cases

### 6E — UI for new mechanics

- **VillagePanel.tsx** — add action section when player owns or is at a village:
  - "Recruit" button (shows cost, troop input) — only at owned villages
  - "Station Troops" / "Recall Troops" — slider or +/- buttons
  - "Attack" button — only at non-owned villages, shows troop count selector
  - Show village garrison count and player troop count
- **FactionPanel.tsx** — add diplomacy buttons per faction:
  - "Propose Alliance" (20 spice)
  - "Trade" (spend spice for loyalty at their village)
  - "Bribe" (spend spice for trust)
  - "Demand Tribute" (requires fear >= 60)
  - "Declare War" / "Break Alliance"
- **StatusBar.tsx** — show player troop count next to spice/influence
- **EventLog.tsx** — add icons for new event types (combat, alliance, tribute, recruitment)
- Wire all buttons through `EventBus` → `store.ts` → engine functions
- All panels must show meaningful feedback (e.g., "Not enough spice", "Already allied", "Must be at village")

### Design Principles

- **Spice is the universal currency**: everything costs spice, creating real tradeoffs
- **Troops are a commitment**: once recruited, they need to be maintained or lost. Garrison troops defend but can't attack elsewhere
- **Diplomacy has costs and risks**: bribes and trades cost spice, alliances can be broken, wars are dangerous
- **Existing AI systems remain**: Harkonnen AI, multi-faction goals, and diplomacy engine all still run. Player actions add to the same world state
- **Difficulty multipliers apply**: troop costs, garrison limits, and bribe costs should scale with difficulty

## Verification

After completing each phase, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npm test
sh .githooks/pre-commit
```