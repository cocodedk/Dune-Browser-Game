// src/game-engine/faction/strategy-profiles.test.ts
// Unit tests for faction strategy profiles: getStrategyModifier & getDominantStrategy

import { describe, it, expect } from 'vitest';
import type { StrategyProfile, FactionProfile } from '../../types';
import {
  getStrategyModifier,
  getDominantStrategy,
} from './strategy-profiles';

describe('getStrategyModifier', () => {
  const mockFaction: FactionProfile = {
    id: 'harkonnen',
    name: 'House Harkonnen',
    type: 'house',
    resources: { spice: 100, solaris: 50, troops: 200, influence: 75 },
    strategy: {
      aggression: 80,
      diplomacy: 20,
      expansion: 60,
      greed: 90,
      loyaltyFocus: 30,
    },
    relations: {},
    goals: [],
  };

  it('attack decision returns strategy[aggression] / 100', () => {
    const result = getStrategyModifier(mockFaction, 'attack');
    expect(result).toBe(80 / 100);
  });

  it('negotiate decision returns strategy[diplomacy] / 100', () => {
    const result = getStrategyModifier(mockFaction, 'negotiate');
    expect(result).toBe(20 / 100);
  });

  it('expand decision returns strategy[expansion] / 100', () => {
    const result = getStrategyModifier(mockFaction, 'expand');
    expect(result).toBe(60 / 100);
  });

  it('accumulate decision returns strategy[greed] / 100', () => {
    const result = getStrategyModifier(mockFaction, 'accumulate');
    expect(result).toBe(90 / 100);
  });

  it('defend decision returns strategy[loyaltyFocus] / 100', () => {
    const result = getStrategyModifier(mockFaction, 'defend');
    expect(result).toBe(30 / 100);
  });

  it('returns normalized value in [0, 1] range', () => {
    const faction = {
      ...mockFaction,
      strategy: { aggression: 0, diplomacy: 50, expansion: 100, greed: 25, loyaltyFocus: 75 },
    };
    expect(getStrategyModifier(faction, 'attack')).toBe(0);
    expect(getStrategyModifier(faction, 'negotiate')).toBe(0.5);
    expect(getStrategyModifier(faction, 'expand')).toBe(1);
    expect(getStrategyModifier(faction, 'accumulate')).toBe(0.25);
    expect(getStrategyModifier(faction, 'defend')).toBe(0.75);
  });
});

describe('getDominantStrategy', () => {
  it('returns axis with highest value', () => {
    const profile: StrategyProfile = {
      aggression: 40,
      diplomacy: 30,
      expansion: 50,
      greed: 80,
      loyaltyFocus: 20,
    };
    const result = getDominantStrategy(profile);
    expect(result.axis).toBe('greed');
    expect(result.value).toBe(80);
  });

  it('on tie, first declaration order wins', () => {
    const profile: StrategyProfile = {
      aggression: 75,
      diplomacy: 75,
      expansion: 50,
      greed: 60,
      loyaltyFocus: 40,
    };
    const result = getDominantStrategy(profile);
    expect(result.axis).toBe('aggression');
    expect(result.value).toBe(75);
  });

  it('handles all axes equal', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 50,
      expansion: 50,
      greed: 50,
      loyaltyFocus: 50,
    };
    const result = getDominantStrategy(profile);
    expect(result.axis).toBe('aggression');
    expect(result.value).toBe(50);
  });

  it('handles single dominant axis clearly', () => {
    const profile: StrategyProfile = {
      aggression: 10,
      diplomacy: 95,
      expansion: 15,
      greed: 20,
      loyaltyFocus: 5,
    };
    const result = getDominantStrategy(profile);
    expect(result.axis).toBe('diplomacy');
    expect(result.value).toBe(95);
  });

  it('handles extreme value at boundary', () => {
    const profile: StrategyProfile = {
      aggression: 0,
      diplomacy: 0,
      expansion: 0,
      greed: 0,
      loyaltyFocus: 100,
    };
    const result = getDominantStrategy(profile);
    expect(result.axis).toBe('loyaltyFocus');
    expect(result.value).toBe(100);
  });
});
