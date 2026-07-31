// src/game-engine/faction/reputation.actions.test.ts
// Unit tests for applyPlayerAction (all 7 action types)

import { describe, it, expect } from 'vitest';
import type { FactionProfile } from '../../types';
import { applyPlayerAction } from './reputation';
import type { ReputationWorld } from './reputation';

function makeFaction(id: FactionProfile['id'], trust = 0, fear = 0): FactionProfile {
  return {
    id,
    name: id,
    type: 'house',
    resources: { spice: 0, solaris: 0, troops: 0, influence: 0 },
    strategy: { aggression: 50, diplomacy: 50, expansion: 50, greed: 50, loyaltyFocus: 50 },
    relations: { player: { trust, fear, trade: false, war: false } },
    goals: [],
  };
}

function makeWorld(): ReputationWorld {
  return {
    factions: [
      makeFaction('fremen'),
      makeFaction('harkonnen'),
      makeFaction('atreides'),
      makeFaction('smugglers'),
      makeFaction('emperor'),
    ],
  };
}

function trust(world: ReputationWorld, id: FactionProfile['id']): number {
  return world.factions.find(f => f.id === id)!.relations['player']!.trust;
}
function fear(world: ReputationWorld, id: FactionProfile['id']): number {
  return world.factions.find(f => f.id === id)!.relations['player']!.fear;
}

// ─── help_village ────────────────────────────────────────────────────────────

describe('applyPlayerAction: help_village', () => {
  it('increases trust by 15 for the affinity faction', () => {
    const result = applyPlayerAction({ type: 'help_village', factionAffinity: 'fremen' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(15);
  });

  it('leaves other factions unchanged', () => {
    const result = applyPlayerAction({ type: 'help_village', factionAffinity: 'fremen' }, makeWorld());
    expect(trust(result, 'harkonnen')).toBe(0);
    expect(trust(result, 'atreides')).toBe(0);
  });

  it('clamps trust at 100 when starting near max', () => {
    const world: ReputationWorld = { factions: [makeFaction('fremen', 95)] };
    const result = applyPlayerAction({ type: 'help_village', factionAffinity: 'fremen' }, world);
    expect(trust(result, 'fremen')).toBe(100);
  });
});

// ─── hoard_spice ─────────────────────────────────────────────────────────────

describe('applyPlayerAction: hoard_spice', () => {
  it('increases smugglers trust by 10', () => {
    const result = applyPlayerAction({ type: 'hoard_spice', amount: 50 }, makeWorld());
    expect(trust(result, 'smugglers')).toBe(10);
  });

  it('increases harkonnen fear by 5', () => {
    const result = applyPlayerAction({ type: 'hoard_spice', amount: 50 }, makeWorld());
    expect(fear(result, 'harkonnen')).toBe(5);
  });

  it('leaves other factions unchanged', () => {
    const result = applyPlayerAction({ type: 'hoard_spice', amount: 50 }, makeWorld());
    expect(trust(result, 'fremen')).toBe(0);
    expect(trust(result, 'atreides')).toBe(0);
    expect(trust(result, 'emperor')).toBe(0);
  });
});

// ─── ignore_attack ───────────────────────────────────────────────────────────

describe('applyPlayerAction: ignore_attack', () => {
  it('decreases victim faction trust by 10', () => {
    const result = applyPlayerAction({ type: 'ignore_attack', victimFaction: 'atreides' }, makeWorld());
    expect(trust(result, 'atreides')).toBe(-10);
  });

  it('decreases fremen trust by 8 when fremen is not the victim', () => {
    const result = applyPlayerAction({ type: 'ignore_attack', victimFaction: 'atreides' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(-8);
  });

  it('leaves unrelated factions unchanged', () => {
    const result = applyPlayerAction({ type: 'ignore_attack', victimFaction: 'atreides' }, makeWorld());
    expect(trust(result, 'harkonnen')).toBe(0);
    expect(trust(result, 'emperor')).toBe(0);
  });

  it('applies -10 to fremen when fremen is the victim (first branch wins)', () => {
    const result = applyPlayerAction({ type: 'ignore_attack', victimFaction: 'fremen' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(-10);
  });
});

// ─── attack_faction ──────────────────────────────────────────────────────────

describe('applyPlayerAction: attack_faction', () => {
  it('target gets trust -20 and fear +15', () => {
    const result = applyPlayerAction({ type: 'attack_faction', target: 'harkonnen' }, makeWorld());
    expect(trust(result, 'harkonnen')).toBe(-20);
    expect(fear(result, 'harkonnen')).toBe(15);
  });

  it('all other factions get trust +5', () => {
    const result = applyPlayerAction({ type: 'attack_faction', target: 'harkonnen' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(5);
    expect(trust(result, 'atreides')).toBe(5);
    expect(trust(result, 'smugglers')).toBe(5);
    expect(trust(result, 'emperor')).toBe(5);
  });
});

// ─── honor_agreement ─────────────────────────────────────────────────────────

describe('applyPlayerAction: honor_agreement', () => {
  it('partner gets trust +13 (10+3)', () => {
    const result = applyPlayerAction({ type: 'honor_agreement', partner: 'atreides' }, makeWorld());
    expect(trust(result, 'atreides')).toBe(13);
  });

  it('all other factions get trust +3', () => {
    const result = applyPlayerAction({ type: 'honor_agreement', partner: 'atreides' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(3);
    expect(trust(result, 'harkonnen')).toBe(3);
    expect(trust(result, 'smugglers')).toBe(3);
    expect(trust(result, 'emperor')).toBe(3);
  });
});

// ─── break_agreement ─────────────────────────────────────────────────────────

describe('applyPlayerAction: break_agreement', () => {
  it('partner gets trust -30 (-25-5)', () => {
    const result = applyPlayerAction({ type: 'break_agreement', partner: 'atreides' }, makeWorld());
    expect(trust(result, 'atreides')).toBe(-30);
  });

  it('all other factions get trust -5', () => {
    const result = applyPlayerAction({ type: 'break_agreement', partner: 'atreides' }, makeWorld());
    expect(trust(result, 'fremen')).toBe(-5);
    expect(trust(result, 'harkonnen')).toBe(-5);
    expect(trust(result, 'smugglers')).toBe(-5);
    expect(trust(result, 'emperor')).toBe(-5);
  });
});

// ─── trade_with_faction ───────────────────────────────────────────────────────

describe('applyPlayerAction: trade_with_faction', () => {
  it('target gets trust +8', () => {
    const result = applyPlayerAction({ type: 'trade_with_faction', target: 'smugglers', amount: 20 }, makeWorld());
    expect(trust(result, 'smugglers')).toBe(8);
  });

  it('other factions are unchanged', () => {
    const result = applyPlayerAction({ type: 'trade_with_faction', target: 'smugglers', amount: 20 }, makeWorld());
    expect(trust(result, 'fremen')).toBe(0);
    expect(trust(result, 'harkonnen')).toBe(0);
    expect(trust(result, 'atreides')).toBe(0);
  });
});
