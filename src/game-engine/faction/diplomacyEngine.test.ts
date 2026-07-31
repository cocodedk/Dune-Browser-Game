// src/game-engine/faction/diplomacyEngine.test.ts
// Unit tests for generateDiplomaticActions and individual try* functions

import { describe, it, expect } from 'vitest';
import type { FactionProfile, Relation } from '../../types';
import {
  generateDiplomaticActions,
  tryProposeAlliance,
  tryTradeSpice,
  tryDeclareWar,
  tryDemandTribute,
  tryBreakAlliance,
} from './diplomacyEngine';
import { ALLIANCE_TRUST_THRESHOLD, WAR_TRUST_FLOOR, TRIBUTE_FEAR_THRESHOLD } from './diplomacy';

function makeRelation(overrides: Partial<Relation> = {}): Relation {
  return { trust: 0, fear: 0, trade: false, war: false, ...overrides };
}

function makeFaction(
  id: FactionProfile['id'],
  strategy: Partial<FactionProfile['strategy']> = {},
  relations: Record<string, Relation> = {},
  spice = 100,
): FactionProfile {
  return {
    id,
    name: id === 'player' ? 'Player' : `House ${id}`,
    type: 'house',
    resources: { spice, solaris: 500, troops: 50, influence: 30 },
    strategy: {
      aggression: 0,
      diplomacy: 0,
      expansion: 0,
      greed: 0,
      loyaltyFocus: 0,
      ...strategy,
    },
    relations,
    goals: [],
  };
}

function makeAllFactions(actor: FactionProfile, target: FactionProfile): FactionProfile[] {
  return [actor, target];
}

describe('tryProposeAlliance', () => {
  it('returns action when diplomacy > 60 and trust >= ALLIANCE_TRUST_THRESHOLD', () => {
    const faction = makeFaction('harkonnen', { diplomacy: 70 });
    const rel = makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD });
    const result = tryProposeAlliance(faction, 'atreides', rel);
    expect(result).toEqual({ type: 'propose_alliance', actor: 'harkonnen', target: 'atreides' });
  });

  it('returns null when diplomacy <= 60', () => {
    const faction = makeFaction('harkonnen', { diplomacy: 60 });
    const rel = makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD });
    expect(tryProposeAlliance(faction, 'atreides', rel)).toBeNull();
  });

  it('returns null when trust < ALLIANCE_TRUST_THRESHOLD', () => {
    const faction = makeFaction('harkonnen', { diplomacy: 70 });
    const rel = makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD - 1 });
    expect(tryProposeAlliance(faction, 'atreides', rel)).toBeNull();
  });
});

describe('tryTradeSpice', () => {
  it('returns action when greed > 50 and trust > -20', () => {
    const faction = makeFaction('smugglers', { greed: 60 }, {}, 200);
    const rel = makeRelation({ trust: 0 });
    const result = tryTradeSpice(faction, 'atreides', rel);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('trade_spice');
    if (result && result.type === 'trade_spice') expect(result.amount).toBe(10);
  });

  it('returns null when greed <= 50', () => {
    const faction = makeFaction('smugglers', { greed: 50 }, {}, 200);
    const rel = makeRelation({ trust: 0 });
    expect(tryTradeSpice(faction, 'atreides', rel)).toBeNull();
  });

  it('returns null when trust <= -20', () => {
    const faction = makeFaction('smugglers', { greed: 60 }, {}, 200);
    const rel = makeRelation({ trust: -20 });
    expect(tryTradeSpice(faction, 'atreides', rel)).toBeNull();
  });

  it('returns null when spice is 0', () => {
    const faction = makeFaction('smugglers', { greed: 60 }, {}, 0);
    const rel = makeRelation({ trust: 0 });
    expect(tryTradeSpice(faction, 'atreides', rel)).toBeNull();
  });
});

describe('tryDeclareWar', () => {
  it('returns action when aggression > 70, trust < WAR_TRUST_FLOOR, not at war', () => {
    const faction = makeFaction('harkonnen', { aggression: 80 });
    const rel = makeRelation({ trust: WAR_TRUST_FLOOR - 1, war: false });
    const result = tryDeclareWar(faction, 'fremen', rel);
    expect(result).toEqual({ type: 'declare_war', actor: 'harkonnen', target: 'fremen' });
  });

  it('returns null when aggression <= 70', () => {
    const faction = makeFaction('harkonnen', { aggression: 70 });
    const rel = makeRelation({ trust: WAR_TRUST_FLOOR - 1, war: false });
    expect(tryDeclareWar(faction, 'fremen', rel)).toBeNull();
  });

  it('returns null when trust >= WAR_TRUST_FLOOR', () => {
    const faction = makeFaction('harkonnen', { aggression: 80 });
    const rel = makeRelation({ trust: WAR_TRUST_FLOOR, war: false });
    expect(tryDeclareWar(faction, 'fremen', rel)).toBeNull();
  });

  it('returns null when already at war', () => {
    const faction = makeFaction('harkonnen', { aggression: 80 });
    const rel = makeRelation({ trust: WAR_TRUST_FLOOR - 1, war: true });
    expect(tryDeclareWar(faction, 'fremen', rel)).toBeNull();
  });
});

describe('tryDemandTribute', () => {
  it('returns action when aggression > 60 and fear >= TRIBUTE_FEAR_THRESHOLD', () => {
    const faction = makeFaction('harkonnen', { aggression: 70 });
    const rel = makeRelation({ fear: TRIBUTE_FEAR_THRESHOLD });
    const result = tryDemandTribute(faction, 'fremen', rel);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('demand_tribute');
    expect(result!.actor).toBe('harkonnen');
    expect(result!.target).toBe('fremen');
  });

  it('returns null when aggression <= 60', () => {
    const faction = makeFaction('harkonnen', { aggression: 60 });
    const rel = makeRelation({ fear: TRIBUTE_FEAR_THRESHOLD });
    expect(tryDemandTribute(faction, 'fremen', rel)).toBeNull();
  });

  it('returns null when fear < TRIBUTE_FEAR_THRESHOLD', () => {
    const faction = makeFaction('harkonnen', { aggression: 70 });
    const rel = makeRelation({ fear: TRIBUTE_FEAR_THRESHOLD - 1 });
    expect(tryDemandTribute(faction, 'fremen', rel)).toBeNull();
  });
});

describe('tryBreakAlliance', () => {
  it('returns action when trust < 0 and trade === true', () => {
    const faction = makeFaction('emperor');
    const rel = makeRelation({ trust: -5, trade: true });
    const result = tryBreakAlliance(faction, 'harkonnen', rel);
    expect(result).toEqual({ type: 'break_alliance', actor: 'emperor', target: 'harkonnen' });
  });

  it('returns null when trust >= 0', () => {
    const faction = makeFaction('emperor');
    const rel = makeRelation({ trust: 0, trade: true });
    expect(tryBreakAlliance(faction, 'harkonnen', rel)).toBeNull();
  });

  it('returns null when trade is false', () => {
    const faction = makeFaction('emperor');
    const rel = makeRelation({ trust: -10, trade: false });
    expect(tryBreakAlliance(faction, 'harkonnen', rel)).toBeNull();
  });
});

describe('generateDiplomaticActions', () => {
  it('proposes alliance when diplomacy > 60 and trust >= threshold', () => {
    const actor = makeFaction('atreides', { diplomacy: 70 }, {
      harkonnen: makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD }),
    });
    const target = makeFaction('harkonnen');
    const actions = generateDiplomaticActions(actor, makeAllFactions(actor, target));
    expect(actions.some(a => a.type === 'propose_alliance')).toBe(true);
  });

  it('declares war when aggression > 70 and trust < floor', () => {
    const actor = makeFaction('harkonnen', { aggression: 80 }, {
      fremen: makeRelation({ trust: WAR_TRUST_FLOOR - 1, war: false }),
    });
    const target = makeFaction('fremen');
    const actions = generateDiplomaticActions(actor, makeAllFactions(actor, target));
    expect(actions.some(a => a.type === 'declare_war')).toBe(true);
  });

  it('trades spice when greed > 50 and trust > -20', () => {
    const actor = makeFaction('smugglers', { greed: 60 }, {
      atreides: makeRelation({ trust: 0 }),
    }, 200);
    const target = makeFaction('atreides');
    const actions = generateDiplomaticActions(actor, makeAllFactions(actor, target));
    expect(actions.some(a => a.type === 'trade_spice')).toBe(true);
  });

  it('returns at most 2 actions', () => {
    const actor = makeFaction('harkonnen', { aggression: 90, greed: 60 }, {
      fremen: makeRelation({ trust: WAR_TRUST_FLOOR - 1, war: false, fear: TRIBUTE_FEAR_THRESHOLD }),
      atreides: makeRelation({ trust: -50, war: false, fear: TRIBUTE_FEAR_THRESHOLD }),
      smugglers: makeRelation({ trust: -50, war: false, fear: TRIBUTE_FEAR_THRESHOLD }),
    }, 500);
    const targets = [
      makeFaction('fremen'),
      makeFaction('atreides'),
      makeFaction('smugglers'),
    ];
    const allFactions = [actor, ...targets];
    const actions = generateDiplomaticActions(actor, allFactions);
    expect(actions.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array for player faction', () => {
    const player = makeFaction('player', { diplomacy: 80 }, {
      harkonnen: makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD }),
    });
    const target = makeFaction('harkonnen');
    const actions = generateDiplomaticActions(player, makeAllFactions(player, target));
    expect(actions).toEqual([]);
  });

  it('skips targets with no relation entry', () => {
    const actor = makeFaction('harkonnen', { aggression: 80 }, {});
    const target = makeFaction('fremen');
    const actions = generateDiplomaticActions(actor, makeAllFactions(actor, target));
    expect(actions).toEqual([]);
  });

  it('does not target self', () => {
    const actor = makeFaction('harkonnen', { diplomacy: 70 }, {
      harkonnen: makeRelation({ trust: ALLIANCE_TRUST_THRESHOLD }),
    });
    const actions = generateDiplomaticActions(actor, [actor]);
    expect(actions).toEqual([]);
  });
});