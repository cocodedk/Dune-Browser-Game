import type { WorldState, Village, FactionProfile, Region, Difficulty } from '../types';
import { INITIAL_VILLAGES } from '../data/villages';
import { INITIAL_SIETCHES } from '../data/sietches';
import factionsData from '../data/factions.json';
import regionsData from '../data/regions.json';
import { loadGame } from './persistence';

// Mutable world state — PoC uses module-level state for simplicity
export let world: WorldState = createInitialState();

export function createInitialState(): WorldState {
  return {
    time: 0,
    speed: 1,
    villages: INITIAL_VILLAGES.map(v => ({ ...v })),
    player: {
      location: 'sietch_tabr',
      state: 'idle',
      travelTarget: null,
      arrivalTime: 0,
      influence: 5,
      spice: 0,
      troops: 0,
    },
    aiTimers: {
      harkonnen: { nextDecisionAt: 10, lastDecision: null },
    },
    dialogue: null,
    events: [],
    goalAchieved: false,
    goalType: 'control_all_villages',
    factionProfiles: (factionsData as unknown as FactionProfile[]).map(f => ({ ...f, relations: { ...f.relations }, goals: [...f.goals] })),
    regions: (regionsData as unknown as Region[]).map(r => ({ ...r })),
    sietches: INITIAL_SIETCHES.map(s => ({ ...s })),
    difficulty: 'normal' as Difficulty,
    scoutedDefense: {},
    paused: false,
    flags: {},
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

// Helper: check if player controls all villages.
// A village counts as player-controlled when either:
//   - village.owner === 'player' (direct control), OR
//   - village.owner === 'fremen' AND the matching sietch is pledgedToPlayer
//     (Fedaykin/Muad'Dib authority)
export function playerControlsAll(): boolean {
  return world.villages.every(v => {
    if (v.owner === 'player') return true;
    if (v.owner !== 'fremen') return false;
    const sietch = world.sietches.find(s => s.villageId === v.id);
    return sietch?.pledgedToPlayer === true;
  });
}

// Helper: check PoC survival goal (survive 20 minutes = 1200 game-seconds at speed 1)
export function hasPlayerSurvived(): boolean {
  return world.time >= 1200;
}
