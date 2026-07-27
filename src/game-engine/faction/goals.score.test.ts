// src/game-engine/faction/goals.score.test.ts
// Unit tests for scoreGoal and updateGoals

import { describe, it, expect } from 'vitest';
import type { FactionProfile, Goal } from '../../types';
import type { GoalWorldView } from './goals';
import { scoreGoal, updateGoals, MAX_ACTIVE_GOALS } from './goals';

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
  return {
    villages: [],
    factions: [],
    ...overrides,
  };
}

// ─── scoreGoal ────────────────────────────────────────────────────────────────

describe('scoreGoal', () => {
  const faction = makeFaction();

  it('control_spice maps to greed / 100', () => {
    const goal: Goal = { type: 'control_spice', target: 'v1' };
    expect(scoreGoal(goal, faction)).toBe(90 / 100);
  });

  it('ally maps to diplomacy / 100', () => {
    const goal: Goal = { type: 'ally', target: 'fremen' };
    expect(scoreGoal(goal, faction)).toBe(20 / 100);
  });

  it('destroy maps to aggression / 100', () => {
    const goal: Goal = { type: 'destroy', target: 'fremen' };
    expect(scoreGoal(goal, faction)).toBe(80 / 100);
  });

  it('expand maps to expansion / 100', () => {
    const goal: Goal = { type: 'expand', target: 5 };
    expect(scoreGoal(goal, faction)).toBe(60 / 100);
  });
});

// ─── updateGoals ──────────────────────────────────────────────────────────────

describe('updateGoals', () => {
  it('prunes control_spice goal when target village is now owned by this faction', () => {
    const faction = makeFaction({ id: 'harkonnen' });
    const world = makeWorld({
      villages: [{ id: 'v1', spice: 10, owner: 'harkonnen' }],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const current: Goal[] = [{ type: 'control_spice', target: 'v1' }];
    const result = updateGoals(faction, world, current);
    expect(result.every(g => !(g.type === 'control_spice' && g.target === 'v1'))).toBe(true);
  });

  it('prunes ally goal when target faction is no longer in the world', () => {
    const faction = makeFaction({ id: 'harkonnen' });
    const world = makeWorld({
      villages: [],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const current: Goal[] = [{ type: 'ally', target: 'fremen' }];
    const result = updateGoals(faction, world, current);
    expect(result.find(g => g.type === 'ally' && g.target === 'fremen')).toBeUndefined();
  });

  it('prunes destroy goal when target faction is no longer in the world', () => {
    const faction = makeFaction({ id: 'harkonnen' });
    const world = makeWorld({
      villages: [],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const current: Goal[] = [{ type: 'destroy', target: 'fremen' }];
    const result = updateGoals(faction, world, current);
    expect(result.find(g => g.type === 'destroy' && g.target === 'fremen')).toBeUndefined();
  });

  it('keeps expand goals unconditionally', () => {
    const faction = makeFaction({ id: 'harkonnen', strategy: { aggression: 0, diplomacy: 0, expansion: 50, greed: 0, loyaltyFocus: 0 } });
    const world = makeWorld({
      villages: [{ id: 'v1', spice: 5, owner: 'neutral' }],
      factions: [{ id: 'harkonnen', strategy: faction.strategy, goals: [] }],
    });
    const current: Goal[] = [{ type: 'expand', target: 2 }];
    const result = updateGoals(faction, world, current);
    expect(result.find(g => g.type === 'expand')).toBeDefined();
  });

  it('returns at most MAX_ACTIVE_GOALS goals', () => {
    const faction = makeFaction({
      id: 'harkonnen',
      strategy: { aggression: 80, diplomacy: 70, expansion: 60, greed: 90, loyaltyFocus: 30 },
      relations: { fremen: { trust: -50, fear: 80, trade: false, war: false } },
    });
    const world = makeWorld({
      villages: [
        { id: 'v1', spice: 30, owner: 'fremen' },
        { id: 'v2', spice: 20, owner: 'fremen' },
        { id: 'v3', spice: 10, owner: 'fremen' },
        { id: 'v4', spice: 5, owner: 'fremen' },
      ],
      factions: [
        { id: 'harkonnen', strategy: faction.strategy, goals: [] },
        { id: 'fremen', strategy: { aggression: 50, diplomacy: 60, expansion: 40, greed: 30, loyaltyFocus: 70 }, goals: [] },
      ],
    });
    const result = updateGoals(faction, world, []);
    expect(result.length).toBeLessThanOrEqual(MAX_ACTIVE_GOALS);
  });

  it('tops up to MAX_ACTIVE_GOALS with fresh goals of different types', () => {
    // Start with 1 surviving expand goal; updateGoals should top up with other types
    const faction = makeFaction({
      id: 'harkonnen',
      strategy: { aggression: 80, diplomacy: 70, expansion: 60, greed: 90, loyaltyFocus: 30 },
      resources: { spice: 0, solaris: 0, troops: 100, influence: 0 },
      relations: { fremen: { trust: -50, fear: 80, trade: false, war: true } },
    });
    const world = makeWorld({
      villages: [{ id: 'v1', spice: 30, owner: 'fremen' }],
      factions: [
        { id: 'harkonnen', strategy: faction.strategy, goals: [] },
        { id: 'fremen', strategy: { aggression: 50, diplomacy: 60, expansion: 40, greed: 30, loyaltyFocus: 70 }, goals: [] },
      ],
    });
    const current: Goal[] = [{ type: 'expand', target: 2 }];
    const result = updateGoals(faction, world, current);
    expect(result.length).toBeGreaterThan(1);
    expect(result.length).toBeLessThanOrEqual(MAX_ACTIVE_GOALS);
    // The surviving expand goal is present
    expect(result.find(g => g.type === 'expand')).toBeDefined();
    // No duplicate types — top-up filters by survivingTypes
    const types = result.map(g => g.type);
    expect(new Set(types).size).toBe(types.length);
  });
});
