import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG, getDifficultyConfig } from './difficulty';
import type { Difficulty } from '../types';

describe('getDifficultyConfig', () => {
  it('returns easy config with expected multipliers', () => {
    const config = getDifficultyConfig('easy');
    expect(config.playerSpiceMultiplier).toBe(1.5);
    expect(config.aiActionChanceMultiplier).toBe(0.7);
    expect(config.unrestMultiplier).toBe(0.7);
    expect(config.aiAggressionMultiplier).toBe(0.7);
    expect(config.reputationDecayMultiplier).toBe(0.5);
  });

  it('returns normal config with all 1.0 multipliers', () => {
    const config = getDifficultyConfig('normal');
    expect(config.playerSpiceMultiplier).toBe(1.0);
    expect(config.aiActionChanceMultiplier).toBe(1.0);
    expect(config.unrestMultiplier).toBe(1.0);
    expect(config.aiAggressionMultiplier).toBe(1.0);
    expect(config.reputationDecayMultiplier).toBe(1.0);
  });

  it('returns hard config with player multiplier < 1 and AI multipliers > 1', () => {
    const config = getDifficultyConfig('hard');
    expect(config.playerSpiceMultiplier).toBeLessThan(1);
    expect(config.aiActionChanceMultiplier).toBeGreaterThan(1);
    expect(config.unrestMultiplier).toBeGreaterThan(1);
    expect(config.aiAggressionMultiplier).toBeGreaterThan(1);
    expect(config.reputationDecayMultiplier).toBeGreaterThan(1);
  });

  it('contains all three difficulty keys', () => {
    const keys: Difficulty[] = ['easy', 'normal', 'hard'];
    for (const key of keys) {
      expect(DIFFICULTY_CONFIG[key]).toBeDefined();
    }
    expect(Object.keys(DIFFICULTY_CONFIG)).toHaveLength(3);
  });
});