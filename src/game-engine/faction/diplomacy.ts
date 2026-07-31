// src/game-engine/faction/diplomacy.ts — Diplomacy System (PRD task 23)

import type { FactionId, Relation, FactionProfile } from '../../types';

export type DiplomaticAction =
  | { type: 'propose_alliance'; actor: FactionId; target: FactionId }
  | { type: 'break_alliance'; actor: FactionId; target: FactionId }
  | { type: 'trade_spice'; actor: FactionId; target: FactionId; amount: number }
  | { type: 'declare_war'; actor: FactionId; target: FactionId }
  | { type: 'demand_tribute'; actor: FactionId; target: FactionId; amount: number };

export type DiplomaticResult = {
  accepted: boolean;
  updatedRelation: Relation;
  sideEffects: Array<{ factionId: FactionId; relationChange: Partial<Relation> }>;
};

export type WorldDiplomacyEvent =
  | { type: 'alliance_broken'; actor: FactionId; target: FactionId }
  | { type: 'war_declared'; actor: FactionId; target: FactionId }
  | { type: 'tribute_refused'; actor: FactionId; target: FactionId };

export const ALLIANCE_TRUST_THRESHOLD = 40;
export const TRIBUTE_FEAR_THRESHOLD = 60;
export const WAR_TRUST_FLOOR = -30;

const clampTrust = (v: number) => Math.max(-100, Math.min(100, v));
const clampFear = (v: number) => Math.max(0, Math.min(100, v));

function getRelation(
  factions: FactionProfile[],
  actorId: FactionId,
  targetId: FactionId,
): Relation {
  const actor = factions.find(f => f.id === actorId);
  return actor?.relations[targetId] ?? { trust: 0, fear: 0, trade: false, war: false };
}

export function applyDiplomaticAction(
  action: DiplomaticAction,
  factions: FactionProfile[],
): DiplomaticResult {
  const rel = getRelation(factions, action.actor, action.target);

  if (action.type === 'propose_alliance') {
    const accepted = rel.trust >= ALLIANCE_TRUST_THRESHOLD;
    return {
      accepted,
      updatedRelation: accepted
        ? { ...rel, trade: true, trust: clampTrust(rel.trust + 10) }
        : { ...rel, trust: clampTrust(rel.trust - 5) },
      sideEffects: [],
    };
  }

  if (action.type === 'break_alliance') {
    const sideEffects = factions
      .filter(f => f.id !== action.actor && f.id !== action.target)
      .map(f => ({ factionId: f.id, relationChange: { trust: -10 } as Partial<Relation> }));
    return {
      accepted: true,
      updatedRelation: { ...rel, trade: false, trust: clampTrust(rel.trust - 30) },
      sideEffects,
    };
  }

  if (action.type === 'trade_spice') {
    return {
      accepted: true,
      updatedRelation: { ...rel, trust: clampTrust(rel.trust + 5) },
      sideEffects: [],
    };
  }

  if (action.type === 'declare_war') {
    const targetFaction = factions.find(f => f.id === action.target);
    const sideEffects: DiplomaticResult['sideEffects'] = [];
    if (targetFaction) {
      for (const f of factions) {
        if (f.id === action.actor || f.id === action.target) continue;
        const targetToAlly = targetFaction.relations[f.id];
        if (targetToAlly && targetToAlly.trust > 20) {
          sideEffects.push({ factionId: f.id, relationChange: { trust: -20 } });
        }
      }
    }
    return {
      accepted: true,
      updatedRelation: { ...rel, war: true, trust: clampTrust(rel.trust - 50) },
      sideEffects,
    };
  }

  // demand_tribute
  const accepted = rel.fear >= TRIBUTE_FEAR_THRESHOLD;
  // On refusal: war=true signals tribute_refused; caller detects via !accepted && war===true
  return {
    accepted,
    updatedRelation: accepted
      ? { ...rel, trust: clampTrust(rel.trust - 10), fear: clampFear(rel.fear + 5) }
      : { ...rel, trust: clampTrust(rel.trust - 20), war: true },
    sideEffects: [],
  };
}

export function updateRelations(
  event: WorldDiplomacyEvent,
  factions: FactionProfile[],
): FactionProfile[] {
  if (event.type === 'tribute_refused') return factions.map(f => ({ ...f }));

  return factions.map(f => {
    if (f.id === event.actor || f.id === event.target) return { ...f };

    if (event.type === 'alliance_broken') {
      const rel = f.relations[event.actor];
      if (!rel) return { ...f };
      return {
        ...f,
        relations: {
          ...f.relations,
          [event.actor]: { ...rel, trust: clampTrust(rel.trust - 5) },
        },
      };
    }

    // war_declared: allied factions of target (trust > 20 toward target) get trust -= 15 toward actor
    if (event.type === 'war_declared') {
      const relToTarget = f.relations[event.target];
      if (!relToTarget || relToTarget.trust <= 20) return { ...f };
      const relToActor = f.relations[event.actor];
      if (!relToActor) return { ...f };
      return {
        ...f,
        relations: {
          ...f.relations,
          [event.actor]: { ...relToActor, trust: clampTrust(relToActor.trust - 15) },
        },
      };
    }

    return { ...f };
  });
}
