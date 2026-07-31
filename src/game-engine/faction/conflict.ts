// src/game-engine/faction/conflict.ts — PRD task 25: Conflict Resolution

import type { FactionId, Region, RegionId, FactionProfile } from '../../types';
import { getStrategyModifier } from './strategy-profiles';
import { captureRegion, type TerritoryWorld } from '../territory/territory';

// ── Local battle types (do NOT add to src/types.ts) ──────────────────────────

export type BattleOutcome = 'attacker_wins' | 'defender_wins' | 'stalemate';

export interface BattleResult {
  outcome: BattleOutcome;
  regionId: RegionId;
  attacker: FactionId;
  defender: FactionId;
  attackerLosses: number;
  defenderLosses: number;
}

export interface BattleContext {
  regionId: RegionId;
  isHomeTerritory: boolean;   // defender gets +20% bonus if true
  alliedSupport: FactionId[]; // factions contributing power to this side
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Net-power margin above/below which a clear winner is declared. */
const STALEMATE_THRESHOLD = 5;

const HOME_BONUS = 1.2;
const ALLY_TROOP_SHARE = 0.1;
const WINNER_LOSS_RATE = 0.1;
const LOSER_LOSS_RATE = 0.25;
const STALEMATE_LOSS_RATE = 0.15;

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute effective combat power for a faction in a given context.
 *
 * Formula:
 *   base = faction.resources.troops
 *   × getStrategyModifier(faction, role === 'attacker' ? 'attack' : 'defend')
 *   × 1.2  (defender only, when isHomeTerritory)
 *   + 10 % of each allied faction's troops
 */
export function getFactionPower(
  faction: FactionProfile,
  context: BattleContext,
  role: 'attacker' | 'defender',
  allFactions: FactionProfile[],
): number {
  const decisionType = role === 'attacker' ? 'attack' : 'defend';
  let power = faction.resources.troops * getStrategyModifier(faction, decisionType);

  if (role === 'defender' && context.isHomeTerritory) {
    power *= HOME_BONUS;
  }

  for (const allyId of context.alliedSupport) {
    const ally = allFactions.find(f => f.id === allyId);
    if (ally) {
      power += ally.resources.troops * ALLY_TROOP_SHARE;
    }
  }

  return power;
}

/**
 * Resolve a battle between attacker and defender over a region.
 *
 * randomFactor = 0.85 + Math.random() * 0.30  (range 0.85–1.15)
 * net = attackPower × randomFactor − defendPower
 * net >  STALEMATE_THRESHOLD → attacker_wins
 * net < −STALEMATE_THRESHOLD → defender_wins
 * else                        → stalemate
 *
 * Losses are based on troop values (not effective power):
 *   winner  → 10 % of own troops
 *   loser   → 25 % of own troops
 *   stalemate → both 15 % of own troops
 */
export function resolveBattle(
  attacker: FactionProfile,
  defender: FactionProfile,
  region: Region,
  allFactions: FactionProfile[],
): BattleResult {
  const isHome = region.owner === defender.id;

  const attackCtx: BattleContext = { regionId: region.id, isHomeTerritory: false, alliedSupport: [] };
  const defendCtx: BattleContext = { regionId: region.id, isHomeTerritory: isHome, alliedSupport: [] };

  const attackPower = getFactionPower(attacker, attackCtx, 'attacker', allFactions);
  const defendPower = getFactionPower(defender, defendCtx, 'defender', allFactions);

  const randomFactor = 0.85 + Math.random() * 0.30;
  const net = attackPower * randomFactor - defendPower;

  let outcome: BattleOutcome;
  let attackerLosses: number;
  let defenderLosses: number;

  if (net > STALEMATE_THRESHOLD) {
    outcome = 'attacker_wins';
    attackerLosses = Math.floor(attacker.resources.troops * WINNER_LOSS_RATE);
    defenderLosses = Math.floor(defender.resources.troops * LOSER_LOSS_RATE);
  } else if (net < -STALEMATE_THRESHOLD) {
    outcome = 'defender_wins';
    attackerLosses = Math.floor(attacker.resources.troops * LOSER_LOSS_RATE);
    defenderLosses = Math.floor(defender.resources.troops * WINNER_LOSS_RATE);
  } else {
    outcome = 'stalemate';
    attackerLosses = Math.floor(attacker.resources.troops * STALEMATE_LOSS_RATE);
    defenderLosses = Math.floor(defender.resources.troops * STALEMATE_LOSS_RATE);
  }

  return {
    outcome,
    regionId: region.id,
    attacker: attacker.id,
    defender: defender.id,
    attackerLosses,
    defenderLosses,
  };
}

/**
 * Apply a BattleResult to world state (immutable).
 *
 * attacker_wins  → calls captureRegion; deducts troop losses from both sides
 * defender_wins  → no territory change; deducts troop losses from both sides
 * stalemate      → no territory change; deducts troop losses from both sides
 *
 * NOTE: Troop deductions are applied to factions stored in TerritoryWorld.
 * Caller is responsible for syncing with FactionProfile if needed.
 */
export function applyBattleResult(
  result: BattleResult,
  world: TerritoryWorld,
  allFactions: FactionProfile[], // eslint-disable-line @typescript-eslint/no-unused-vars
): TerritoryWorld {
  // Deduct troop losses from TerritoryWorld factions (no-op if field absent)
  const deductTroops = (
    w: TerritoryWorld,
    factionId: FactionId,
    losses: number,
  ): TerritoryWorld => ({
    ...w,
    factions: w.factions.map(f => {
      if (f.id !== factionId) return f;
      // TerritoryWorld factions may carry an optional resources sub-object;
      // if present, subtract troops; otherwise leave unchanged.
      const extended = f as typeof f & { resources?: { troops: number } };
      if (!extended.resources) return f;
      return {
        ...f,
        resources: {
          ...extended.resources,
          troops: Math.max(0, extended.resources.troops - losses),
        },
      };
    }),
  });

  let updated = world;

  if (result.outcome === 'attacker_wins') {
    const { world: captured } = captureRegion(result.regionId, result.attacker, updated);
    updated = captured;
  }

  updated = deductTroops(updated, result.attacker, result.attackerLosses);
  updated = deductTroops(updated, result.defender, result.defenderLosses);

  return updated;
}
