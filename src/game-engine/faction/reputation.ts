// src/game-engine/faction/reputation.ts — Reputation System (PRD task 26)

import type { FactionId, FactionProfile, PlayerAction } from '../../types';

export type ReputationStanding =
  | 'revered'     // trust > 75
  | 'trusted'     // trust 40–75
  | 'neutral'     // trust -20 to 39
  | 'suspicious'  // trust -50 to -21
  | 'hostile';    // trust < -50

export type { PlayerAction };

export interface ReputationEntry {
  factionId: FactionId;
  name: string;
  standing: ReputationStanding;
  trust: number;
  fear: number;
}

export interface ReputationSummary {
  factions: ReputationEntry[];
}

// Minimal world view for reputation operations
export interface ReputationWorld {
  factions: FactionProfile[];
}

const clampTrust = (v: number) => Math.max(-100, Math.min(100, v));
const clampFear = (v: number) => Math.max(0, Math.min(100, v));

// Update FactionProfile.relations['player'] with clamped deltas — returns new FactionProfile
function updatePlayerRelation(
  faction: FactionProfile,
  delta: { trust?: number; fear?: number },
): FactionProfile {
  const existing = faction.relations['player'] ?? { trust: 0, fear: 0, trade: false, war: false };
  return {
    ...faction,
    relations: {
      ...faction.relations,
      player: {
        ...existing,
        trust: clampTrust(existing.trust + (delta.trust ?? 0)),
        fear: clampFear(existing.fear + (delta.fear ?? 0)),
      },
    },
  };
}

// Apply a player action — mutates relations['player'] on relevant factions; returns new world
export function applyPlayerAction(
  action: PlayerAction,
  world: ReputationWorld,
): ReputationWorld {
  const { factions } = world;

  if (action.type === 'help_village') {
    return {
      factions: factions.map(f =>
        f.id === action.factionAffinity ? updatePlayerRelation(f, { trust: 15 }) : f,
      ),
    };
  }

  if (action.type === 'hoard_spice') {
    return {
      factions: factions.map(f => {
        if (f.id === 'smugglers') return updatePlayerRelation(f, { trust: 10 });
        if (f.id === 'harkonnen') return updatePlayerRelation(f, { fear: 5 });
        return f;
      }),
    };
  }

  if (action.type === 'ignore_attack') {
    return {
      factions: factions.map(f => {
        if (f.id === action.victimFaction) return updatePlayerRelation(f, { trust: -10 });
        if (f.id === 'fremen') return updatePlayerRelation(f, { trust: -8 });
        return f;
      }),
    };
  }

  if (action.type === 'attack_faction') {
    return {
      factions: factions.map(f => {
        if (f.id === action.target) return updatePlayerRelation(f, { trust: -20, fear: 15 });
        // all other factions (rivals) gain trust
        return updatePlayerRelation(f, { trust: 5 });
      }),
    };
  }

  if (action.type === 'honor_agreement') {
    return {
      factions: factions.map(f => {
        const base = f.id === action.partner ? { trust: 10 } : {};
        // ALL factions gain trust += 3
        return updatePlayerRelation(f, { trust: (base.trust ?? 0) + 3 });
      }),
    };
  }

  if (action.type === 'break_agreement') {
    return {
      factions: factions.map(f => {
        const base = f.id === action.partner ? { trust: -25 } : {};
        // ALL factions lose trust -= 5
        return updatePlayerRelation(f, { trust: (base.trust ?? 0) - 5 });
      }),
    };
  }

  // trade_with_faction
  if (action.type === 'trade_with_faction') {
    return {
      factions: factions.map(f =>
        f.id === action.target ? updatePlayerRelation(f, { trust: 8 }) : f,
      ),
    };
  }

  return world;
}

// Compute per-cycle decay amount toward neutral
function decayValue(value: number, toward: number, multiplier: number = 1): number {
  const diff = value - toward;
  const abs = Math.abs(diff);
  if (abs <= 20) return value;
  const step = (abs > 75 ? 0.5 : 1) * multiplier;
  return diff > 0 ? value - step : value + step;
}

// Decay all faction relations['player'] trust/fear toward neutral each cycle
export function decayReputation(world: ReputationWorld, decayMultiplier: number = 1): ReputationWorld {
  return {
    factions: world.factions.map(f => {
      const rel = f.relations['player'];
      if (!rel) return f;
      return {
        ...f,
        relations: {
          ...f.relations,
          player: {
            ...rel,
            trust: clampTrust(decayValue(rel.trust, 0, decayMultiplier)),
            fear: clampFear(decayValue(rel.fear, 0, decayMultiplier)),
          },
        },
      };
    }),
  };
}

// Map trust value to standing label
export function getReputationStanding(
  factionId: FactionId,
  world: ReputationWorld,
): ReputationStanding {
  const faction = world.factions.find(f => f.id === factionId);
  const trust = faction?.relations['player']?.trust ?? 0;
  if (trust > 75) return 'revered';
  if (trust >= 40) return 'trusted';
  if (trust >= -20) return 'neutral';
  if (trust >= -50) return 'suspicious';
  return 'hostile';
}

// Return a summary of the player's reputation with all factions
export function getReputationSummary(world: ReputationWorld): ReputationSummary {
  return {
    factions: world.factions.map(f => {
      const rel = f.relations['player'];
      const trust = rel?.trust ?? 0;
      const fear = rel?.fear ?? 0;
      return {
        factionId: f.id,
        name: f.name,
        standing: getReputationStanding(f.id, world),
        trust,
        fear,
      };
    }),
  };
}
