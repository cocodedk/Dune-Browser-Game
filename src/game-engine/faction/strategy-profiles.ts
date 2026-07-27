// src/game-engine/faction/strategy-profiles.ts
// PRD task 21 — Faction Strategy Profiles

import type { StrategyProfile, FactionProfile } from '../../types';

/** Decision types a faction AI can evaluate. */
export type DecisionType =
  | 'attack'
  | 'negotiate'
  | 'expand'
  | 'accumulate'
  | 'defend';

/** Maps each decision type to the strategy axis that drives it. */
const DECISION_WEIGHTS: Record<DecisionType, keyof StrategyProfile> = {
  attack:     'aggression',
  negotiate:  'diplomacy',
  expand:     'expansion',
  accumulate: 'greed',
  defend:     'loyaltyFocus',
};

/**
 * Returns a normalized weight (0.0–1.0) for a given decision type based on
 * the faction's strategy profile.
 *
 * @param faction  - The faction whose strategy profile is consulted.
 * @param decision - The candidate action to evaluate.
 * @returns A value in [0, 1] where 1.0 means the faction strongly favours this action.
 */
export function getStrategyModifier(
  faction: FactionProfile,
  decision: DecisionType,
): number {
  const axis = DECISION_WEIGHTS[decision];
  return faction.strategy[axis] / 100;
}

/**
 * Returns the dominant strategy axis (highest profile value) for a faction.
 * On ties the first encountered axis wins (declaration order of StrategyProfile).
 *
 * @param profile - The strategy profile to inspect.
 * @returns An object with the dominant axis name and its raw value (0–100).
 */
export function getDominantStrategy(
  profile: StrategyProfile,
): { axis: keyof StrategyProfile; value: number } {
  const axes = Object.keys(profile) as Array<keyof StrategyProfile>;
  let dominantAxis = axes[0];
  let dominantValue = profile[dominantAxis];

  for (const axis of axes) {
    if (profile[axis] > dominantValue) {
      dominantAxis = axis;
      dominantValue = profile[axis];
    }
  }

  return { axis: dominantAxis, value: dominantValue };
}

/**
 * Applies optional personality variance (±variance) to every axis of a
 * strategy profile. Values are clamped to [0, 100].
 * Returns a new profile — never mutates the original.
 *
 * @param profile  - Source strategy profile.
 * @param variance - Max deviation in either direction (default ±10).
 * @returns A new StrategyProfile with randomised offsets applied.
 */
export function applyPersonalityVariance(
  profile: StrategyProfile,
  variance = 10,
): StrategyProfile {
  const clamp = (v: number): number => Math.max(0, Math.min(100, v));
  const jitter = (): number => Math.random() * 2 * variance - variance;

  return {
    aggression:   clamp(profile.aggression   + jitter()),
    diplomacy:    clamp(profile.diplomacy    + jitter()),
    expansion:    clamp(profile.expansion    + jitter()),
    greed:        clamp(profile.greed        + jitter()),
    loyaltyFocus: clamp(profile.loyaltyFocus + jitter()),
  };
}
