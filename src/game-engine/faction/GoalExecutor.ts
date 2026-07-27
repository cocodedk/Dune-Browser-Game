// src/game-engine/faction/GoalExecutor.ts — Execution layer: turns faction goals into territory changes

import type { FactionProfile, Region } from '../../types';
import { world } from '../GameState';
import { resolveBattle, applyBattleResult } from './conflict';
import { toTerritoryWorld } from './adapter';
import { pushEvent } from '../EventSystem';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_CHANCE = 0.35;       // 35% chance per faction per day boundary
const TROOP_REGEN = 8;            // troops regenerated per faction per day
const MIN_TROOPS = 15;            // minimum troops needed to attempt action
const UNCLAIMED_TROOP_COST = 5;   // troop cost to occupy an unclaimed region
const MAX_TROOPS = 200;           // troop cap after regeneration

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Pick a target region for a faction.
 * Priority 1: unclaimed (owner === null), chosen randomly.
 * Priority 2: contested (aggression > 55 only), owned by a different non-neutral faction.
 * Returns null if nothing viable.
 */
function pickTarget(faction: FactionProfile): Region | null {
  const unclaimed = world.regions.filter(r => r.owner === null);
  if (unclaimed.length > 0) {
    return unclaimed[Math.floor(Math.random() * unclaimed.length)];
  }

  if (faction.strategy.aggression > 55) {
    const contested = world.regions.filter(
      r =>
        r.owner !== null &&
        r.owner !== 'neutral' &&
        r.owner !== faction.id,
    );
    if (contested.length > 0) {
      return contested[Math.floor(Math.random() * contested.length)];
    }
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute faction goals for one day boundary tick.
 *
 * Steps:
 *  1. Guard — return immediately if no factionProfiles.
 *  2. Troop regeneration — each faction gains TROOP_REGEN troops, capped at MAX_TROOPS.
 *  3. Per-faction action loop — potentially captures unclaimed or contested regions.
 */
export function executeGoals(actionChanceMultiplier: number = 1): void {
  if (world.factionProfiles.length === 0) return;

  // Step 2: Troop regeneration
  for (const fp of world.factionProfiles) {
    fp.resources.troops = Math.min(MAX_TROOPS, fp.resources.troops + TROOP_REGEN);
  }

  // Step 3: Per-faction action loop
  for (const faction of world.factionProfiles) {
    if (faction.id === 'player') continue;
    if (faction.resources.troops < MIN_TROOPS) continue;
    if (Math.random() > ACTION_CHANCE * actionChanceMultiplier) continue;

    const target = pickTarget(faction);
    if (!target) continue;

    const region = world.regions.find(r => r.id === target.id);
    if (!region) continue;

    if (region.owner === null) {
      // Unclaimed capture
      world.regions = world.regions.map(r =>
        r.id === region.id ? { ...r, owner: faction.id } : r,
      );
      faction.resources.troops -= UNCLAIMED_TROOP_COST;
      pushEvent('attack', `${faction.name} occupies ${region.name}`);
    } else {
      // Contested capture
      const defender = world.factionProfiles.find(f => f.id === region.owner);
      if (!defender) continue;

      const defenderId = region.owner;
      const result = resolveBattle(faction, defender, region, world.factionProfiles);
      const tWorld = toTerritoryWorld(world);
      const updated = applyBattleResult(result, tWorld, world.factionProfiles);

      world.regions = world.regions.map(r => updated.regions.find(ur => ur.id === r.id) ?? r);

      // Explicit troop deductions (TerritoryWorld factions carry no resources)
      faction.resources.troops = Math.max(0, faction.resources.troops - result.attackerLosses);
      defender.resources.troops = Math.max(0, defender.resources.troops - result.defenderLosses);

      if (result.outcome === 'attacker_wins') {
        pushEvent('attack', `${faction.name} captures ${region.name} from ${defenderId}`);
      } else if (result.outcome === 'defender_wins') {
        pushEvent('attack', `${faction.name} attacks ${region.name} — repelled`);
      }
      // stalemate: skip (too noisy)
    }
  }
}
