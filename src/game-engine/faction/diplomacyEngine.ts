// src/game-engine/faction/diplomacyEngine.ts — Pure function engine that decides which diplomatic actions to take

import type { FactionProfile, FactionId, Relation } from '../../types';
import type { DiplomaticAction } from './diplomacy';
import { ALLIANCE_TRUST_THRESHOLD, WAR_TRUST_FLOOR, TRIBUTE_FEAR_THRESHOLD } from './diplomacy';

export function tryProposeAlliance(
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
): DiplomaticAction | null {
  if (faction.strategy.diplomacy <= 60) return null;
  if (relation.trust < ALLIANCE_TRUST_THRESHOLD) return null;
  return { type: 'propose_alliance', actor: faction.id, target: targetId };
}

export function tryTradeSpice(
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
): DiplomaticAction | null {
  if (faction.strategy.greed <= 50) return null;
  if (relation.trust <= -20) return null;
  const amount = Math.floor(faction.resources.spice * 0.05);
  if (amount <= 0) return null;
  return { type: 'trade_spice', actor: faction.id, target: targetId, amount };
}

export function tryDeclareWar(
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
): DiplomaticAction | null {
  if (faction.strategy.aggression <= 70) return null;
  if (relation.trust >= WAR_TRUST_FLOOR) return null;
  if (relation.war) return null;
  return { type: 'declare_war', actor: faction.id, target: targetId };
}

export function tryDemandTribute(
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
): DiplomaticAction | null {
  if (faction.strategy.aggression <= 60) return null;
  if (relation.fear < TRIBUTE_FEAR_THRESHOLD) return null;
  return { type: 'demand_tribute', actor: faction.id, target: targetId, amount: 50 };
}

export function tryBreakAlliance(
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
): DiplomaticAction | null {
  if (relation.trust >= 0) return null;
  if (!relation.trade) return null;
  return { type: 'break_alliance', actor: faction.id, target: targetId };
}

type TryFn = (
  faction: FactionProfile,
  targetId: FactionId,
  relation: Relation,
) => DiplomaticAction | null;

const ACTION_ORDER: TryFn[] = [
  tryProposeAlliance,
  tryTradeSpice,
  tryDeclareWar,
  tryDemandTribute,
  tryBreakAlliance,
];

export function generateDiplomaticActions(
  faction: FactionProfile,
  allFactions: FactionProfile[],
): DiplomaticAction[] {
  if (faction.id === 'player') return [];

  const actions: DiplomaticAction[] = [];

  for (const target of allFactions) {
    if (target.id === faction.id) continue;
    if (actions.length >= 2) break;
    const relation = faction.relations[target.id];
    if (!relation) continue;
    for (const tryFn of ACTION_ORDER) {
      if (actions.length >= 2) break;
      const action = tryFn(faction, target.id, relation);
      if (action !== null) actions.push(action);
    }
  }

  return actions;
}