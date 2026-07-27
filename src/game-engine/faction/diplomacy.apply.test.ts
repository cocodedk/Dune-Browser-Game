// src/game-engine/faction/diplomacy.apply.test.ts
// Unit tests for applyDiplomaticAction (all 5 action types)

import { describe, it, expect } from 'vitest';
import type { FactionId, FactionProfile, Relation } from '../../types';
import {
  applyDiplomaticAction,
  ALLIANCE_TRUST_THRESHOLD,
  TRIBUTE_FEAR_THRESHOLD,
} from './diplomacy';

function makeRelation(overrides: Partial<Relation> = {}): Relation {
  return { trust: 0, fear: 0, trade: false, war: false, ...overrides };
}

function makeFaction(id: FactionId, relations: Record<string, Relation> = {}): FactionProfile {
  return {
    id, name: id, type: 'house',
    resources: { spice: 0, solaris: 0, troops: 0, influence: 0 },
    strategy: { aggression: 0, diplomacy: 0, expansion: 0, greed: 0, loyaltyFocus: 0 },
    relations,
    goals: [],
  };
}

describe('applyDiplomaticAction — propose_alliance', () => {
  it('accepted=true when trust >= ALLIANCE_TRUST_THRESHOLD', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD }) }),
      makeFaction('harkonnen'),
    ];
    const result = applyDiplomaticAction({ type: 'propose_alliance', actor: 'player', target: 'harkonnen' }, factions);
    expect(result.accepted).toBe(true);
    expect(result.updatedRelation.trade).toBe(true);
    expect(result.updatedRelation.trust).toBe(ALLIANCE_TRUST_THRESHOLD + 10);
    expect(result.sideEffects).toHaveLength(0);
  });

  it('accepted=false when trust < ALLIANCE_TRUST_THRESHOLD, trust-5', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD - 1 }) }),
      makeFaction('harkonnen'),
    ];
    const result = applyDiplomaticAction({ type: 'propose_alliance', actor: 'player', target: 'harkonnen' }, factions);
    expect(result.accepted).toBe(false);
    expect(result.updatedRelation.trade).toBe(false);
    expect(result.updatedRelation.trust).toBe(ALLIANCE_TRUST_THRESHOLD - 1 - 5);
  });
});

describe('applyDiplomaticAction — break_alliance', () => {
  it('accepted=true always; trust-30; trade=false; sideEffects one entry per bystander', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 50, trade: true }) }),
      makeFaction('harkonnen'),
      makeFaction('fremen'),
      makeFaction('neutral'),
    ];
    const result = applyDiplomaticAction({ type: 'break_alliance', actor: 'player', target: 'harkonnen' }, factions);
    expect(result.accepted).toBe(true);
    expect(result.updatedRelation.trust).toBe(20);
    expect(result.updatedRelation.trade).toBe(false);
    expect(result.sideEffects).toHaveLength(2);
    expect(result.sideEffects.every(e => e.relationChange.trust === -10)).toBe(true);
    const ids = result.sideEffects.map(e => e.factionId);
    expect(ids).toContain('fremen');
    expect(ids).toContain('neutral');
  });
});

describe('applyDiplomaticAction — trade_spice', () => {
  it('accepted=true always; trust+5; no sideEffects', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 10 }) }),
      makeFaction('harkonnen'),
    ];
    const result = applyDiplomaticAction({ type: 'trade_spice', actor: 'player', target: 'harkonnen', amount: 10 }, factions);
    expect(result.accepted).toBe(true);
    expect(result.updatedRelation.trust).toBe(15);
    expect(result.sideEffects).toHaveLength(0);
  });
});

describe('applyDiplomaticAction — declare_war', () => {
  it('war=true; trust-50; sideEffects for factions target trusts >20', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 20 }) }),
      makeFaction('harkonnen', {
        fremen: makeRelation({ trust: 30 }),  // trust>20 → side effect
        neutral: makeRelation({ trust: 15 }), // trust<=20 → no side effect
      }),
      makeFaction('fremen'),
      makeFaction('neutral'),
    ];
    const result = applyDiplomaticAction({ type: 'declare_war', actor: 'player', target: 'harkonnen' }, factions);
    expect(result.accepted).toBe(true);
    expect(result.updatedRelation.war).toBe(true);
    expect(result.updatedRelation.trust).toBe(-30);
    expect(result.sideEffects).toHaveLength(1);
    expect(result.sideEffects[0].factionId).toBe('fremen');
    expect(result.sideEffects[0].relationChange.trust).toBe(-20);
  });
});

describe('applyDiplomaticAction — demand_tribute', () => {
  it('accepted=true when fear >= TRIBUTE_FEAR_THRESHOLD; trust-10; fear+5', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 30, fear: TRIBUTE_FEAR_THRESHOLD }) }),
      makeFaction('harkonnen'),
    ];
    const result = applyDiplomaticAction({ type: 'demand_tribute', actor: 'player', target: 'harkonnen', amount: 50 }, factions);
    expect(result.accepted).toBe(true);
    expect(result.updatedRelation.trust).toBe(20);
    expect(result.updatedRelation.fear).toBe(TRIBUTE_FEAR_THRESHOLD + 5);
    expect(result.updatedRelation.war).toBe(false);
  });

  it('accepted=false when fear < TRIBUTE_FEAR_THRESHOLD; trust-20; war=true', () => {
    const factions = [
      makeFaction('player', { harkonnen: makeRelation({ trust: 30, fear: TRIBUTE_FEAR_THRESHOLD - 1 }) }),
      makeFaction('harkonnen'),
    ];
    const result = applyDiplomaticAction({ type: 'demand_tribute', actor: 'player', target: 'harkonnen', amount: 50 }, factions);
    expect(result.accepted).toBe(false);
    expect(result.updatedRelation.trust).toBe(10);
    expect(result.updatedRelation.war).toBe(true);
  });
});
