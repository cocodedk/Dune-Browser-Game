// src/game-engine/faction/strategy-profiles-variance.test.ts
// Unit tests for applyPersonalityVariance function

import { describe, it, expect } from 'vitest';
import type { StrategyProfile } from '../../types';
import { applyPersonalityVariance } from './strategy-profiles';

describe('applyPersonalityVariance', () => {
  it('with variance=0, output equals input profile', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 40,
      expansion: 60,
      greed: 75,
      loyaltyFocus: 30,
    };
    const result = applyPersonalityVariance(profile, 0);
    expect(result).toEqual(profile);
  });

  it('returns a new object (not mutated)', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 40,
      expansion: 60,
      greed: 75,
      loyaltyFocus: 30,
    };
    const result = applyPersonalityVariance(profile, 5);
    expect(result).not.toBe(profile);
    expect(profile).toEqual({
      aggression: 50,
      diplomacy: 40,
      expansion: 60,
      greed: 75,
      loyaltyFocus: 30,
    });
  });

  it('output stays in [0, 100]', () => {
    const profile: StrategyProfile = {
      aggression: 5,
      diplomacy: 95,
      expansion: 50,
      greed: 10,
      loyaltyFocus: 90,
    };
    for (let i = 0; i < 100; i++) {
      const result = applyPersonalityVariance(profile, 20);
      expect(result.aggression).toBeGreaterThanOrEqual(0);
      expect(result.aggression).toBeLessThanOrEqual(100);
      expect(result.diplomacy).toBeGreaterThanOrEqual(0);
      expect(result.diplomacy).toBeLessThanOrEqual(100);
      expect(result.expansion).toBeGreaterThanOrEqual(0);
      expect(result.expansion).toBeLessThanOrEqual(100);
      expect(result.greed).toBeGreaterThanOrEqual(0);
      expect(result.greed).toBeLessThanOrEqual(100);
      expect(result.loyaltyFocus).toBeGreaterThanOrEqual(0);
      expect(result.loyaltyFocus).toBeLessThanOrEqual(100);
    }
  });

  it('produces varied output with non-zero variance', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 50,
      expansion: 50,
      greed: 50,
      loyaltyFocus: 50,
    };
    const results: StrategyProfile[] = [];
    for (let i = 0; i < 20; i++) {
      results.push(applyPersonalityVariance(profile, 10));
    }
    const aggressionValues = results.map((r) => r.aggression);
    const minAgg = Math.min(...aggressionValues);
    const maxAgg = Math.max(...aggressionValues);
    expect(maxAgg - minAgg).toBeGreaterThan(0);
  });

  it('respects clamping at lower boundary', () => {
    const profile: StrategyProfile = {
      aggression: 2,
      diplomacy: 1,
      expansion: 0,
      greed: 3,
      loyaltyFocus: 2,
    };
    for (let i = 0; i < 50; i++) {
      const result = applyPersonalityVariance(profile, 5);
      expect(result.aggression).toBeGreaterThanOrEqual(0);
      expect(result.diplomacy).toBeGreaterThanOrEqual(0);
      expect(result.expansion).toBeGreaterThanOrEqual(0);
      expect(result.greed).toBeGreaterThanOrEqual(0);
      expect(result.loyaltyFocus).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects clamping at upper boundary', () => {
    const profile: StrategyProfile = {
      aggression: 98,
      diplomacy: 99,
      expansion: 100,
      greed: 97,
      loyaltyFocus: 96,
    };
    for (let i = 0; i < 50; i++) {
      const result = applyPersonalityVariance(profile, 5);
      expect(result.aggression).toBeLessThanOrEqual(100);
      expect(result.diplomacy).toBeLessThanOrEqual(100);
      expect(result.expansion).toBeLessThanOrEqual(100);
      expect(result.greed).toBeLessThanOrEqual(100);
      expect(result.loyaltyFocus).toBeLessThanOrEqual(100);
    }
  });

  it('applies variance to all axes', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 50,
      expansion: 50,
      greed: 50,
      loyaltyFocus: 50,
    };
    const result = applyPersonalityVariance(profile, 0);
    expect(result).toHaveProperty('aggression');
    expect(result).toHaveProperty('diplomacy');
    expect(result).toHaveProperty('expansion');
    expect(result).toHaveProperty('greed');
    expect(result).toHaveProperty('loyaltyFocus');
  });

  it('default variance is 10', () => {
    const profile: StrategyProfile = {
      aggression: 50,
      diplomacy: 50,
      expansion: 50,
      greed: 50,
      loyaltyFocus: 50,
    };
    for (let i = 0; i < 50; i++) {
      const result = applyPersonalityVariance(profile);
      expect(result.aggression).toBeGreaterThanOrEqual(0);
      expect(result.aggression).toBeLessThanOrEqual(100);
      expect(result.diplomacy).toBeGreaterThanOrEqual(0);
      expect(result.diplomacy).toBeLessThanOrEqual(100);
    }
  });
});
