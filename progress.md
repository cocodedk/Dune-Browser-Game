# Dune Browser Game — Implementation Progress

## Legend
- [x] done
- [ ] not started / pending

---

## Gate
- [x] 00 — PoC gate passed

## Core Engine (impl/01–10) — implemented as PoC, living in src/game-engine/
- [x] 01 — Project structure
- [x] 02 — World model (WorldState, Village, Player, Faction in types.ts)
- [x] 03 — Game loop (GameLoop.ts)
- [x] 04 — Time system (TimeSystem.ts)
- [x] 05 — Event system (EventSystem.ts)
- [x] 06 — Village system (VillageSystem.ts)
- [x] 07 — Travel system (TravelSystem.ts)
- [x] 08 — Dialogue system (DialogueSystem.ts)
- [x] 09 — Economy (spice production in VillageSystem)
- [x] 10 — AI system (AISystem.ts + LLMClient.ts)

## Faction / Diplomacy System (impl/20–26) — self-contained modules, not yet wired into game loop
- [x] 20 — Faction types + data (factions.json, regions.json, FactionProfile types)
- [x] 21 — Strategy profiles (strategy-profiles.ts + unit tests)
- [x] 22 — Goals system (goals.ts + unit tests)
- [x] 23 — Diplomacy system (diplomacy.ts + unit tests)
- [x] 24 — Territory control (territory.ts + unit tests)
- [x] 25 — Conflict resolution (conflict.ts + unit tests)
- [x] 26 — Reputation system (reputation.ts + unit tests)

## Integration
- [x] Add factionProfiles[] + regions[] to WorldState (GameState.ts loads from JSON)
- [x] Adapter module (adapter.ts) — bridges WorldState to TerritoryWorld / ReputationWorld / GoalWorldView
- [x] Territory updates wired into GameLoop day boundary (unrest, spice production, defection)
- [x] Reputation decay wired into GameLoop day boundary
- [x] Multi-faction goal AI wired into GameLoop day boundary (event logging, gated on factionProfiles)
- [x] Faction combat execution — GoalExecutor.ts: 35% chance/day, unclaimed capture, resolveBattle for contested regions, village owner sync
- [x] Diplomatic action effects wired into game loop
- [x] Reputation sync with PoC world.factions (eliminated — old Faction[] merged into factionProfiles)

## Persistence (PRD §5.10)
- [x] Save / load WorldState to IndexedDB
- [x] Resume-from-save (world state, not restart)
- [x] Save/load UI in React

## Player Agency — DUNE 1992 Sietch Loop
- [x] Sietch domain model (`src/game-engine/sietch/types.ts`, `src/data/sietches.ts`) — 8 sietches, one per village, all start unpledged
- [x] Pure rules: `assignTask.ts` (+ 13 tests), `updateSietches.ts` (+ 12 tests) — day-boundary harvest payout
- [x] `SietchSystem.ts` — pledge + assign_task handlers, gated on player presence + fremen ownership
- [x] `player:pledge_sietch` + `player:assign_sietch_task` EventBus commands
- [x] `SietchCommandSection.tsx` — pledge prompt, progress bar, assign harvest button (shown when player is at fremen village)
- [x] Event types: `sietch_pledged`, `sietch_task_assigned`, `spice_shipment_received`
- [x] Ownership-authority correction: `sietch_tabr` starts fremen-owned; GoalExecutor no longer syncs village owner from region owner
- [x] End-to-end verified in browser: pledge → assign → wait → spice delivered to player (12 spice/cycle)

## Vertical Slice / Polish (PRD §17.10)
- [x] Map visual upgrade (multi-layer dunes, sand patches, road glow, territory zone halos)
- [x] Village marker upgrade (faction letter badges, larger circles, dynamic color refresh)
- [x] FactionPanel React component (5 factions, trust bars, spice, live-updating)
- [x] GameScene.ts split into MapRenderer + VillageMarkers
- [x] Territory polygon map — 8 filled faction-colored zones with click detection (TerritoryZones.ts)
- [x] Shared faction color constants — CSS + Phaser hex (factionColors.ts)
- [x] 8 villages aligned with 8 region IDs, territory-center positions (villages.ts)
- [x] Distance-based travel time replacing hard-coded 3-village table (TravelSystem.ts)
- [x] VillagePanel: all 7 faction labels + region spice yield + unrest display
- [x] Character portraits (code scaffolding — portraitConfig.ts, DialoguePanel placeholder, assets dir)
- [x] Ambient audio loop (code scaffolding — AudioManager.ts, StatusBar mute toggle, assets dir)
- [x] Full dialogue content (7 trees across 6 files, all factions covered)
- [x] Difficulty scaling (Difficulty type, config, multipliers in GameLoop/GoalExecutor/territory/reputation/goals)

## Infrastructure ✓
- [x] Vitest unit tests (186 tests, 17 files)
- [x] Playwright E2E tests (8 tests)
- [x] Pre-commit hook (lint + typecheck + build + unit tests + E2E)
- [x] Bundle budget enforcement
- [x] 200-line file limit enforcement
