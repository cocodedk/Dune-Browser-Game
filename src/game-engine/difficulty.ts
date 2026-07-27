import type { Difficulty } from '../types';

export interface DifficultyConfig {
  playerSpiceMultiplier: number;
  aiActionChanceMultiplier: number;
  unrestMultiplier: number;
  aiAggressionMultiplier: number;
  reputationDecayMultiplier: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { playerSpiceMultiplier: 1.5, aiActionChanceMultiplier: 0.7, unrestMultiplier: 0.7, aiAggressionMultiplier: 0.7, reputationDecayMultiplier: 0.5 },
  normal: { playerSpiceMultiplier: 1.0, aiActionChanceMultiplier: 1.0, unrestMultiplier: 1.0, aiAggressionMultiplier: 1.0, reputationDecayMultiplier: 1.0 },
  hard:   { playerSpiceMultiplier: 0.75, aiActionChanceMultiplier: 1.5, unrestMultiplier: 1.3, aiAggressionMultiplier: 1.5, reputationDecayMultiplier: 2.0 },
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIG[difficulty];
}