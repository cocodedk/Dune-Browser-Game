// src/game-engine/faction/goals.generate.test.ts
// Unit tests for generateGoals (including emperor gate)

import { describe, it, expect } from 'vitest';
import type { FactionId, FactionProfile, Goal } from '../../types';
import type { GoalWorldView } from './goals';
import { generateGoals, MAX_ACTIVE_GOALS } from './goals';

function makeFaction(overrides: Partial<FactionProfile> = {}): FactionProfile {
  return {
    id: 'harkonnen',
    name: 'House Harkonnen',
    type: 'house',
    resources: { spice: 100, solaris: 50, troops: 200, influence: 75 },
    strategy: { aggression: 80, diplomacy: 20, expansion: 60, greed: 90, loyaltyFocus: 30 },
    relations: {},
    goals: [],
    ...overrides,
  };
}

function makeWorld(overrides: Partial<GoalWorldView> = {}): GoalWorldView {
  return { villages: [], factions: [], ...overrides };
}

// ─── generateGoals ────────────────────────────────────────────────────────────

describe('generateGoals', () => {
  it('greed > 60 generates control_spice goals for unowned high-spice villages', () => {
    const faction = makeFaction({ strategy: { aggression: 0, diplomacy: 0, expansion: 0, greed: 61, loyaltyFocus: 0 } });
    const world = makeWorld({
      villages: [
        { id: 'v1', spice: 50, owner: 'fremen' },
        { id: 'v2', spice: 10, owner: 'harkonnen' },
      ],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const goals = generateGoals(faction, world);
    const spiceGoals = goals.filter((g): g is Goal & { type: 'control_spice' } => g.type === 'control_spice');
    expect(spiceGoals.length).toBeGreaterThan(0);
    expect(spiceGoals.every(g => g.target !== 'v2')).toBe(true);
  });

  it('aggression > 60 + troops > 50 generates destroy goal for enemy factions', () => {
    const faction = makeFaction({
      strategy: { aggression: 61, diplomacy: 0, expansion: 0, greed: 0, loyaltyFocus: 0 },
      resources: { spice: 0, solaris: 0, troops: 51, influence: 0 },
      relations: { fremen: { trust: -50, fear: 80, trade: false, war: true } },
    });
    const world = makeWorld({
      factions: [
        { id: 'harkonnen', strategy: faction.strategy, goals: [] },
        { id: 'fremen', strategy: { aggression: 50, diplomacy: 60, expansion: 40, greed: 30, loyaltyFocus: 70 }, goals: [] },
      ],
    });
    const goals = generateGoals(faction, world);
    expect(goals.find(g => g.type === 'destroy' && g.target === 'fremen')).toBeDefined();
  });

  it('smugglers aggression threshold is 40 (not 60)', () => {
    const faction = makeFaction({
      id: 'smugglers',
      type: 'smuggler',
      strategy: { aggression: 41, diplomacy: 0, expansion: 0, greed: 0, loyaltyFocus: 0 },
      resources: { spice: 0, solaris: 0, troops: 51, influence: 0 },
      relations: { harkonnen: { trust: -50, fear: 80, trade: false, war: true } },
    });
    const world = makeWorld({
      factions: [
        { id: 'smugglers', strategy: faction.strategy, goals: [] },
        { id: 'harkonnen', strategy: { aggression: 80, diplomacy: 20, expansion: 60, greed: 90, loyaltyFocus: 30 }, goals: [] },
      ],
    });
    const goals = generateGoals(faction, world);
    expect(goals.find(g => g.type === 'destroy')).toBeDefined();
  });

  it('diplomacy > 60 generates ally goals for non-war factions', () => {
    const faction = makeFaction({
      strategy: { aggression: 0, diplomacy: 61, expansion: 0, greed: 0, loyaltyFocus: 0 },
      relations: { fremen: { trust: 30, fear: 0, trade: false, war: false } },
    });
    const world = makeWorld({
      factions: [
        { id: 'harkonnen', strategy: faction.strategy, goals: [] },
        { id: 'fremen', strategy: { aggression: 50, diplomacy: 60, expansion: 40, greed: 30, loyaltyFocus: 70 }, goals: [] },
      ],
    });
    const goals = generateGoals(faction, world);
    expect(goals.find(g => g.type === 'ally' && g.target === 'fremen')).toBeDefined();
  });

  it('expansion: generates expand goal when ownedCount < expansionTarget', () => {
    const faction = makeFaction({
      id: 'harkonnen',
      strategy: { aggression: 0, diplomacy: 0, expansion: 80, greed: 0, loyaltyFocus: 0 },
    });
    const world = makeWorld({
      villages: [
        { id: 'v1', spice: 0, owner: 'fremen' },
        { id: 'v2', spice: 0, owner: 'fremen' },
        { id: 'v3', spice: 0, owner: 'fremen' },
        { id: 'v4', spice: 0, owner: 'fremen' },
        { id: 'v5', spice: 0, owner: 'fremen' },
      ],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const goals = generateGoals(faction, world);
    expect(goals.find(g => g.type === 'expand')).toBeDefined();
  });

  it('emperor gate: returns [] when no faction holds more than 40% of villages', () => {
    // 10 villages: 4 harkonnen + 3 fremen + 3 neutral = max 40% exactly, strict > blocks
    // Emperor has greed:90 so it WOULD generate goals if the gate didn't block.
    const faction = makeFaction({
      id: 'emperor',
      type: 'empire',
      strategy: { aggression: 0, diplomacy: 0, expansion: 0, greed: 90, loyaltyFocus: 0 },
    });
    const ownerOf = (i: number): FactionId =>
      i < 4 ? 'harkonnen' : i < 7 ? 'fremen' : 'neutral';
    const villages: GoalWorldView['villages'] = Array.from({ length: 10 }, (_, i) => ({
      id: `v${i}`,
      spice: 10,
      owner: ownerOf(i),
    }));
    const world = makeWorld({
      villages,
      factions: [{ id: 'emperor', strategy: faction.strategy, goals: [] }],
    });
    expect(generateGoals(faction, world)).toEqual([]);
  });

  it('emperor gate: generates goals when a faction holds more than 40% of villages', () => {
    // 10 villages, 5 owned by harkonnen = 50% — triggers
    const faction = makeFaction({
      id: 'emperor',
      type: 'empire',
      strategy: { aggression: 0, diplomacy: 0, expansion: 80, greed: 0, loyaltyFocus: 0 },
    });
    const villages2: GoalWorldView['villages'] = Array.from({ length: 10 }, (_, i) => ({
      id: `v${i}`,
      spice: 0,
      owner: (i < 5 ? 'harkonnen' : 'neutral') as FactionId,
    }));
    const world = makeWorld({
      villages: villages2,
      factions: [
        { id: 'emperor', strategy: faction.strategy, goals: [] },
        { id: 'harkonnen', strategy: { aggression: 80, diplomacy: 20, expansion: 60, greed: 90, loyaltyFocus: 30 }, goals: [] },
      ],
    });
    const goals = generateGoals(faction, world);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('results capped at MAX_ACTIVE_GOALS and sorted by score descending', () => {
    const faction = makeFaction({
      strategy: { aggression: 80, diplomacy: 70, expansion: 60, greed: 90, loyaltyFocus: 30 },
      resources: { spice: 0, solaris: 0, troops: 100, influence: 0 },
      relations: { fremen: { trust: -50, fear: 80, trade: false, war: true } },
    });
    const world = makeWorld({
      villages: [
        { id: 'v1', spice: 50, owner: 'fremen' },
        { id: 'v2', spice: 40, owner: 'fremen' },
        { id: 'v3', spice: 30, owner: 'fremen' },
        { id: 'v4', spice: 20, owner: 'fremen' },
      ],
      factions: [
        { id: 'harkonnen', strategy: faction.strategy, goals: [] },
        { id: 'fremen', strategy: { aggression: 50, diplomacy: 60, expansion: 40, greed: 30, loyaltyFocus: 70 }, goals: [] },
      ],
    });
    const goals = generateGoals(faction, world);
    expect(goals.length).toBeLessThanOrEqual(MAX_ACTIVE_GOALS);
    for (let i = 1; i < goals.length; i++) {
      const prev = goals[i - 1];
      const curr = goals[i];
      const prevScore = prev.type === 'control_spice' ? 0.9 : prev.type === 'destroy' ? 0.8 : prev.type === 'ally' ? 0.7 : 0.6;
      const currScore = curr.type === 'control_spice' ? 0.9 : curr.type === 'destroy' ? 0.8 : curr.type === 'ally' ? 0.7 : 0.6;
      expect(prevScore).toBeGreaterThanOrEqual(currScore);
    }
  });
});
