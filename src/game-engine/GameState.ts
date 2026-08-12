import type { WorldState, Village, Region, Difficulty } from '../types';
import { INITIAL_VILLAGES } from '../data/villages';
import { INITIAL_SIETCHES } from '../data/sietches';
import { seedFactionProfiles } from '../data/factionProfiles';
import regionsData from '../data/regions.json';
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
 * due day 12 on Normal. `seed` drives the campaign's single seeded RNG —
 * never Date.now() or Math.random() — so a production caller can pass one
 * from outside once that wiring exists; every call site not yet doing so
 * gets a fixed, still-deterministic default.
 *
 * `difficulty` (03-opening-experience.md "Title and run setup": "Difficulty
 * is written once into campaign state") is this function's ONE write site —
 * see difficulty.ts's DIFFICULTY_CONFIG. It also drives the seeded quota
 * multiplier below, so Q1 is genuinely 68 on Easy / 90 on Normal / 117 on
 * Hard from the first frame (createQuotaState rounds 90 * quotaMultiplier),
 * not merely a label applied after the fact —
 * see the New Campaign setup panel (ui/title/NewCampaignPanel.tsx), the
 * chunk that made this a real constructor parameter instead of a post-hoc
 * StatusBar mutation.
 */
export function createInitialState(seed: number = DEFAULT_SEED, difficulty: Difficulty = 'normal'): WorldState {
  return {
    time: 0,
    speed: 1,
    villages: INITIAL_VILLAGES.map(v => ({ ...v })),
    player: {
      location: 'arrakeen',
      state: 'idle',
      travelTarget: null,
      arrivalTime: 0,
      spice: 60,
      prescience: 0,
    },
    aiTimers: {
      harkonnen: { nextDecisionAt: 10, lastDecision: null },
    },
    dialogue: null,
    events: [],
    goalAchieved: false,
    // goalType is gone from WorldState entirely (WP02f) — the PoC
    // win-condition check that used to read it was removed from GameLoop's
    // campaign day path in WP01 (legacy-authority-inventory.md category 3),
    // and no field remains to seed here.
    // Static, quarantined-sandbox content — not persisted (see
    // data/factionProfiles.ts's doc for why); every load reseeds fresh the
    // same way a New Game already does.
    factionProfiles: seedFactionProfiles(),
    regions: (regionsData as unknown as Region[]).map(r => ({ ...r })),
    // crewIds is copied, not aliased — spreading a plain `{ ...s }` would
    // share one array per seed entry across every createInitialState() call
    // (New Game, a reset, a test fixture), so a future mutation to one run's
    // sietch.crewIds (W2b's pledge chain) would leak into every other run
    // built from the same seed module. factionProfiles above takes the same
    // precaution for its nested relations/goals.
    sietches: INITIAL_SIETCHES.map(s => ({ ...s, crewIds: [...(s.crewIds ?? [])] })),
    difficulty,
    scoutedDefense: {},
    paused: false,
    // 'act' mirrors the act as a number for dialogue gates, which compare
    // numerically while world.act is the string 'act1'..'act4'. Seeded here as
    // well as written on transition, or every act-gated conversation would be
    // unreadable until the story first turned. See actNumber in acts/transitions.
    flags: { act: actNumber('act1') },
    quota: createQuotaState(getDifficultyConfig(difficulty).quotaMultiplier),
    pendingSettlement: null,
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
