// src/game-engine/faction/goals.ts
// PRD task 22 — Faction Goals System

import type { Goal, FactionProfile, FactionId, VillageId } from '../../types';

export const MAX_ACTIVE_GOALS = 3;

/** Minimal world snapshot needed for goal generation. */
export interface GoalWorldView {
  villages: Array<{ id: VillageId; spice: number; owner: FactionId }>;
  factions: Array<{ id: FactionId; strategy: FactionProfile['strategy']; goals: Goal[] }>;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function villagesOwnedBy(faction: FactionProfile, world: GoalWorldView): number {
  return world.villages.filter(v => v.owner === faction.id).length;
}

function enemyFactions(faction: FactionProfile, world: GoalWorldView): FactionId[] {
  return world.factions
    .filter(f => {
      if (f.id === faction.id) return false;
      const rel = faction.relations[f.id];
      return rel ? rel.war : false;
    })
    .map(f => f.id);
}

function allyTargets(faction: FactionProfile, world: GoalWorldView): FactionId[] {
  return world.factions
    .filter(f => {
      if (f.id === faction.id) return false;
      const rel = faction.relations[f.id];
      return rel ? !rel.war : true;
    })
    .map(f => f.id);
}

/** Emperor gate: only act when any faction exceeds 40% of total villages. */
function emperorPowerImbalanceExists(world: GoalWorldView): boolean {
  const total = world.villages.length;
  if (total === 0) return false;
  const threshold = total * 0.4;
  const counts = new Map<FactionId, number>();
  for (const v of world.villages) {
    counts.set(v.owner, (counts.get(v.owner) ?? 0) + 1);
  }
  for (const [, count] of counts) {
    if (count > threshold) return true;
  }
  return false;
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Scores a goal from 0.0 to 1.0 based on the faction's strategy profile.
 */
export function scoreGoal(
  goal: Goal,
  faction: FactionProfile,
  aggressionMultiplier: number = 1,
): number {
  const s = faction.strategy;
  switch (goal.type) {
    case 'control_spice': return s.greed / 100;
    case 'ally':          return s.diplomacy / 100;
    case 'destroy':       return Math.min(1, (s.aggression / 100) * aggressionMultiplier);
    case 'expand':        return s.expansion / 100;
  }
}

/**
 * Generates new goals for a faction based on its strategy profile and world state.
 * Results are sorted by score (desc) and capped at MAX_ACTIVE_GOALS.
 */
export function generateGoals(
  faction: FactionProfile,
  world: GoalWorldView,
  aggressionMultiplier: number = 1,
): Goal[] {
  // Emperor acts only when someone is dominating
  if (faction.id === 'emperor' && !emperorPowerImbalanceExists(world)) {
    return [];
  }

  const s = faction.strategy;
  const candidates: Goal[] = [];

  // greed > 60 → control_spice for high-spice villages not owned by this faction
  if (s.greed > 60) {
    const spiceVillages = world.villages
      .filter(v => v.owner !== faction.id && v.spice > 0)
      .sort((a, b) => b.spice - a.spice)
      .slice(0, MAX_ACTIVE_GOALS);
    for (const v of spiceVillages) {
      candidates.push({ type: 'control_spice', target: v.id });
    }
  }

  // destroy goals — threshold varies by faction
  const destroyThreshold = faction.id === 'smugglers' ? 40 : 60;
  if (s.aggression > destroyThreshold && faction.resources.troops > 50) {
    const enemies = enemyFactions(faction, world);
    if (enemies.length > 0) {
      candidates.push({ type: 'destroy', target: enemies[0] });
    }
  }

  // diplomacy > 60 → ally goals for non-war factions
  if (s.diplomacy > 60) {
    for (const id of allyTargets(faction, world)) {
      candidates.push({ type: 'ally', target: id });
    }
  }

  // expansion: if faction holds fewer villages than expansion threshold
  const ownedCount = villagesOwnedBy(faction, world);
  const expansionTarget = Math.round(world.villages.length * (s.expansion / 100));
  if (ownedCount < expansionTarget) {
    candidates.push({ type: 'expand', target: expansionTarget });
  }

  // Sort by score descending (Fremen's high diplomacy naturally promotes ally goals)
  candidates.sort((a, b) => scoreGoal(b, faction, aggressionMultiplier) - scoreGoal(a, faction, aggressionMultiplier));

  return candidates.slice(0, MAX_ACTIVE_GOALS);
}

/**
 * Prunes stale goals and tops up with newly generated ones.
 * @param currentGoals - The faction's current active Goal list (managed by this system).
 */
export function updateGoals(
  faction: FactionProfile,
  world: GoalWorldView,
  currentGoals: Goal[],
  aggressionMultiplier: number = 1,
): Goal[] {
  const liveIds = new Set(world.factions.map(f => f.id));

  const surviving = currentGoals.filter(goal => {
    switch (goal.type) {
      case 'control_spice': {
        const v = world.villages.find(x => x.id === goal.target);
        return !!v && v.spice > 0 && v.owner !== faction.id;
      }
      case 'ally':
        return liveIds.has(goal.target);
      case 'destroy':
        return liveIds.has(goal.target);
      case 'expand':
        return true;
    }
  });

  if (surviving.length >= MAX_ACTIVE_GOALS) {
    return surviving.slice(0, MAX_ACTIVE_GOALS);
  }

  // Top up without duplicating goal types already covered.
  const survivingTypes = new Set(surviving.map(g => g.type));
  const fresh = generateGoals(faction, world, aggressionMultiplier).filter(
    g => !survivingTypes.has(g.type),
  );

  const combined = [...surviving, ...fresh];
  combined.sort((a, b) => scoreGoal(b, faction, aggressionMultiplier) - scoreGoal(a, faction, aggressionMultiplier));
  return combined.slice(0, MAX_ACTIVE_GOALS);
}
