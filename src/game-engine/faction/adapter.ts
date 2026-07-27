// src/game-engine/faction/adapter.ts
// Bridges WorldState to the isolated world-view interfaces used by faction/territory modules.

import type { WorldState } from '../../types';
import type { TerritoryWorld } from '../territory/territory';
import type { ReputationWorld } from './reputation';
import type { GoalWorldView } from './goals';

/**
 * Extract a TerritoryWorld slice from WorldState.
 * Safe when factionProfiles is empty — returns empty factions array.
 */
export function toTerritoryWorld(state: WorldState): TerritoryWorld {
  return {
    regions: state.regions,
    factions: state.factionProfiles.map(f => ({
      id: f.id,
      relations: f.relations,
    })),
  };
}

/**
 * Extract a ReputationWorld slice from WorldState.
 */
export function toReputationWorld(state: WorldState): ReputationWorld {
  return {
    factions: state.factionProfiles,
  };
}

/**
 * Extract a GoalWorldView slice from WorldState.
 * Maps Village[] to the minimal {id, spice, owner} shape.
 * Goals start as [] — caller must pass saved goals separately.
 */
export function toGoalWorldView(state: WorldState): GoalWorldView {
  return {
    villages: state.villages.map(v => ({ id: v.id, spice: v.spice, owner: v.owner })),
    factions: state.factionProfiles.map(f => ({
      id: f.id,
      strategy: f.strategy,
      goals: [],   // FactionProfile.goals is FactionGoal[] (incompatible); caller manages Goal[]
    })),
  };
}
