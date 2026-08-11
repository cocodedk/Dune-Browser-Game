// src/game-engine/legacySaveMigration.fixture.ts
//
// UNTOUCHED PRIOR-SCHEMA FIXTURE — do not "fix" this object to match the
// current shape. docs/PRD/game-completion/02-runtime-consolidation.md
// ("Save migration"): "Before enabling automatic migration for players,
// keep an untouched fixture for each prior schema version." This is the
// `legacy-save-migration` row of 02's "Deterministic fixtures" table: "Load
// a pledged save containing both task systems" — the retired aggregate
// player economy (`troops`/`influence`, `goalType`) AND the retired
// sietch threshold-task economy (`currentTask`/`outputProgress`)
// coexisting, exactly as a real pre-v3 save on disk would have recorded
// them, before either was superseded by the crew economy (W2a-e).
//
// A pledged sietch (red_wall_sietch) carries a legacy `currentTask` in
// progress but NO `troopGroups` entry at all — the crew system did not
// exist yet when this save was taken, so migration must backfill exactly
// one crew (step 2), not find one already there.

import type { VersionedSave } from './saveMigration'

export const LEGACY_PLEDGED_SAVE: VersionedSave = {
  version: 2,
  savedAt: 1700000000000,
  state: {
    time: 600, // day 10 — two days short of the Q1 deadline (day 12)
    speed: 1,
    villages: [
      { id: 'arrakeen', name: 'Arrakeen', position: { x: 430, y: 120 }, population: 800, spice: 5, loyalty: 35, owner: 'neutral', status: 'neutral', productionRate: 2, kind: 'palace', discovered: true, regionId: 'arrakeen' },
      { id: 'red_wall_sietch', name: 'Red Wall Sietch', position: { x: 70, y: 240 }, population: 280, spice: 4, loyalty: 80, owner: 'fremen', status: 'friendly', productionRate: 1.2, kind: 'sietch', discovered: true, regionId: 'red_wall_sietch' },
      { id: 'sietch_tabr', name: 'Sietch Tabr', position: { x: 140, y: 390 }, population: 450, spice: 10, loyalty: 45, owner: 'fremen', status: 'friendly', productionRate: 1, kind: 'sietch', discovered: false, regionId: 'sietch_tabr' },
      { id: 'carthag', name: 'Carthag', position: { x: 640, y: 350 }, population: 600, spice: 2, loyalty: 20, owner: 'harkonnen', status: 'neutral', productionRate: 1, kind: 'fort', discovered: true, regionId: 'carthag' },
    ],
    // The retired aggregate player economy: troops/influence alongside spice.
    player: { location: 'red_wall_sietch', state: 'idle', travelTarget: null, arrivalTime: 0, spice: 45, troops: 18, influence: 22, prescience: 0 },
    aiTimers: { harkonnen: { nextDecisionAt: 15, lastDecision: null } },
    dialogue: null,
    events: [],
    goalAchieved: false,
    goalType: 'control_all_villages', // the retired PoC completion authority
    factionProfiles: [],
    regions: [],
    sietches: [
      // Pledged, mid-progress on the retired threshold task system, no crew yet.
      {
        villageId: 'red_wall_sietch', pledgedToPlayer: true, fremenWorkers: 50,
        currentTask: 'harvest_spice', outputProgress: 3,
        loyalty: 80, morale: 60, lastVisitedDay: 8, giftedThisVisit: 0,
        lastMoraleVisitDay: 8, crewIds: [],
      },
      {
        villageId: 'sietch_tabr', pledgedToPlayer: false, fremenWorkers: 60,
        currentTask: null, outputProgress: 0,
        loyalty: 45, morale: 50, lastVisitedDay: 0, giftedThisVisit: 0,
        lastMoraleVisitDay: 0, crewIds: [],
      },
    ],
    difficulty: 'normal',
    scoutedDefense: {},
    paused: false,
    flags: { act: 1, 'met.shadir': true },
    quota: { nextDueDay: 12, amount: 90, cycleIndex: 0, patience: 3, arrears: 0, restoredThisAct: false },
    troopGroups: [], // no crew system yet — this is exactly what step 2 must backfill
    spiceFields: [
      { id: 'field_red_wall_pan', regionId: 'red_wall_sietch', position: { x: 75, y: 245 }, discovered: true, density: 55, capacity: 800, remaining: 800 },
    ],
    equipment: [],
    charisma: 20,
    act: 'act1',
    ending: null,
    ecology: [{ regionId: 'arrakeen', vegetation: 0, windtraps: 0 }],
    forts: [{ locationId: 'carthag', strength: 250, isCapital: false, destroyed: false }],
    wormSightings: [],
    desertSites: [],
    // No `rng`, no `lastProcessedDay` — this is a pre-v3 save; both are
    // added by the chain (migrateV2ToV3/migrateV3ToV4) on the way to v5.
  },
}
