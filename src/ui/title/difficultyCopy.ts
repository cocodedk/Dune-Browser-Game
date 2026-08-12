// src/ui/title/difficultyCopy.ts
// The New Campaign setup panel's difficulty copy — authored from
// difficulty.ts's actual DIFFICULTY_CONFIG numbers, never invented ones
// (docs/PRD/game-completion/03-opening-experience.md "Title and run
// setup": "Each option explains its player-facing effect in one sentence").
//
// Of DifficultyConfig's six multipliers, only two are reachable from the
// production campaign day loop today: `playerSpiceMultiplier` scales crew
// harvest yield (game-engine/economy/harvestRun.ts) and `quotaMultiplier`
// scales the Emperor's tribute demand (game-engine/economy/settlementRun.ts
// and GameState.ts's seeded initial quota — so this is literally true from
// day one: Q1 is 68 on Easy, 90 on Normal, 117 on Hard —
// createQuotaState rounds 90 * quotaMultiplier).
// `aiAggressionMultiplier` scales raid strength (economy/raidRun.ts) but
// raids are blocked in Act 1 (`raidInterval('act1')` returns null —
// baseline/captures.md), so it is not opening-reachable.
// `aiActionChanceMultiplier`, `unrestMultiplier` and
// `reputationDecayMultiplier` have zero production callers at all today
// (AISystem.updateAI and territory.ts's accumulateUnrest are both
// unreachable from the campaign day path — see dayRunner.ts's step list).
// The one-sentence copy below names only the two live, opening-reachable
// levers; the details expander shows every configured number, including the
// not-yet-live ones, so nothing about the real config is hidden from a
// curious player.

import type { Difficulty } from '../../types'
import { getDifficultyConfig, type DifficultyConfig } from '../../game-engine/difficulty'

export interface DifficultySummary {
  id: Difficulty
  label: string
  sentence: string
  config: DifficultyConfig
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

const SENTENCES: Record<Difficulty, string> = {
  easy: 'Crew harvest income runs higher and the Emperor asks for less — more room to recover from a mistake.',
  normal: "Crew harvest income and the Emperor's tribute run at their intended rates — the balance the campaign is designed around.",
  hard: 'Crew harvest income runs lower and the Emperor asks for more — the margin for error is thin from day one.',
}

export function difficultySummary(id: Difficulty): DifficultySummary {
  return { id, label: LABELS[id], sentence: SENTENCES[id], config: getDifficultyConfig(id) }
}

/** Display order for the setup panel — Normal in the middle, its own
 * default focus (03: "Normal is the default"). */
export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'normal', 'hard']

/** Field-label pairs for the details expander's raw multiplier table, in a
 * fixed, readable order rather than `Object.entries`'s declaration order. */
export const MULTIPLIER_LABELS: readonly (readonly [keyof DifficultyConfig, string])[] = [
  ['playerSpiceMultiplier', 'crew harvest income'],
  ['quotaMultiplier', "Emperor's tribute demand"],
  ['aiAggressionMultiplier', 'raid strength (not reachable in the opening)'],
  ['aiActionChanceMultiplier', 'AI action frequency (unused today)'],
  ['unrestMultiplier', 'territory unrest (unused today)'],
  ['reputationDecayMultiplier', 'faction reputation decay (unused today)'],
]
