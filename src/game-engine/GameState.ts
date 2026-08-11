import type { WorldState, Village, FactionProfile, Region, Difficulty } from '../types';
import { INITIAL_VILLAGES } from '../data/villages';
import { INITIAL_SIETCHES } from '../data/sietches';
import factionsData from '../data/factions.json';
import regionsData from '../data/regions.json';
import { loadGame } from './persistence';
import { createQuotaState } from './quota/quota';
import { getDifficultyConfig } from './difficulty';
import { INITIAL_SPICE_FIELDS } from '../data/spiceFields';
import { INITIAL_FORTS } from '../data/forts';
import { generateSites } from './desert/sites';
import { actNumber } from './acts/transitions';

/** Fixes the deep desert for a game, so a reload finds the same secrets. */
const DESERT_SEED = 20250727;

/**
 * Default seed for callers that don't pass one — every existing test and UI
 * call site that invokes `createInitialState()` with no argument keeps
 * producing the exact same deterministic opening it always has.
 */
const DEFAULT_SEED = 1;

// Mutable world state — PoC uses module-level state for simplicity
export let world: WorldState = createInitialState();

/**
 * The canonical campaign opening (docs/PRD/game-completion/00-index.md
 * "Opening state"; 02-runtime-consolidation.md "Crew lifecycle"): Arrakeen,
 * day 0, 60 spice (a deliberate change from the prior 0), no pledged
 * sietches, no operational crew before the first pledge, and Q1 of 90 spice
 * due day 12. `seed` drives the campaign's single seeded RNG — never
 * Date.now() or Math.random() — so a production caller can pass one from
 * outside once that wiring exists; every call site not yet doing so gets a
 * fixed, still-deterministic default.
 */
export function createInitialState(seed: number = DEFAULT_SEED): WorldState {
  return {
    time: 0,
    speed: 1,
    villages: INITIAL_VILLAGES.map(v => ({ ...v })),
    player: {
      location: 'arrakeen',
      state: 'idle',
      travelTarget: null,
      arrivalTime: 0,
      influence: 5,
      spice: 60,
      troops: 0,
      prescience: 0,
    },
    aiTimers: {
      harkonnen: { nextDecisionAt: 10, lastDecision: null },
    },
    dialogue: null,
    events: [],
    goalAchieved: false,
    // goalType is not seeded: the PoC win-condition check that read it was
    // removed from GameLoop's campaign day path (WP01 quarantine, see
    // legacy-authority-inventory.md category 3). The field itself stays
    // optional on WorldState — see types.ts — because it is still
    // constructed by test fixtures outside this package's scope.
    factionProfiles: (factionsData as unknown as FactionProfile[]).map(f => ({ ...f, relations: { ...f.relations }, goals: [...f.goals] })),
    regions: (regionsData as unknown as Region[]).map(r => ({ ...r })),
    // crewIds is copied, not aliased — spreading a plain `{ ...s }` would
    // share one array per seed entry across every createInitialState() call
    // (New Game, a reset, a test fixture), so a future mutation to one run's
    // sietch.crewIds (W2b's pledge chain) would leak into every other run
    // built from the same seed module. factionProfiles above takes the same
    // precaution for its nested relations/goals.
    sietches: INITIAL_SIETCHES.map(s => ({ ...s, crewIds: [...(s.crewIds ?? [])] })),
    difficulty: 'normal' as Difficulty,
    scoutedDefense: {},
    paused: false,
    // 'act' mirrors the act as a number for dialogue gates, which compare
    // numerically while world.act is the string 'act1'..'act4'. Seeded here as
    // well as written on transition, or every act-gated conversation would be
    // unreadable until the story first turned. See actNumber in acts/transitions.
    flags: { act: actNumber('act1') },
    quota: createQuotaState(getDifficultyConfig('normal').quotaMultiplier),
    // No operational crew before the first pledge (02-runtime-consolidation.md
    // "Crew lifecycle"; 00-index.md "Opening state"). The first valid pledge
    // creates exactly one — see SietchSystem's pledge chain.
    troopGroups: [],
    spiceFields: INITIAL_SPICE_FIELDS.map(f => ({ ...f })),
    equipment: [],
    charisma: 20,
    act: 'act1',
    ending: null,
    forts: INITIAL_FORTS.map(f => ({ ...f })),
    wormSightings: [],
    desertSites: generateSites(DESERT_SEED),
    ecology: (regionsData as unknown as Region[]).map(r => ({
      regionId: r.id, vegetation: 0, windtraps: 0,
    })),
    rng: { seed, step: 0 },
    // A fresh campaign has processed no day yet — see types.ts's
    // lastProcessedDay doc and TimeSystem.ts's crossedDays().
    lastProcessedDay: null,
  };
}

export function resetWorld(): void {
  world = createInitialState();
}

export function setWorld(state: WorldState): void {
  world = state;
}

// Helper: get village by id
export function getVillage(id: string): Village | undefined {
  return world.villages.find(v => v.id === id);
}

// Helper: get player's current village
export function playerVillage(): Village | undefined {
  return getVillage(world.player.location);
}

export async function loadFromSave(): Promise<boolean> {
  try {
    const saved = await loadGame();
    if (!saved) return false;
    world = saved;
    return true;
  } catch {
    return false;
  }
}
