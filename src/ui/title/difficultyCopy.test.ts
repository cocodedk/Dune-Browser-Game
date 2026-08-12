// src/ui/title/difficultyCopy.test.ts
// Guards the copy against drifting from difficulty.ts's real numbers —
// 03-opening-experience.md "Title and run setup": "do not invent numbers."

import { describe, it, expect } from 'vitest'
import { difficultySummary, DIFFICULTY_ORDER, MULTIPLIER_LABELS } from './difficultyCopy'
import { DIFFICULTY_CONFIG } from '../../game-engine/difficulty'

describe('difficultySummary', () => {
  it('carries the exact DIFFICULTY_CONFIG object for each difficulty — no copied/invented numbers', () => {
    for (const id of DIFFICULTY_ORDER) {
      expect(difficultySummary(id).config).toBe(DIFFICULTY_CONFIG[id])
    }
  })

  it('every difficulty has a non-empty one-sentence description', () => {
    for (const id of DIFFICULTY_ORDER) {
      const summary = difficultySummary(id)
      expect(summary.sentence.length).toBeGreaterThan(0)
      expect(summary.sentence.split('. ').length).toBeLessThanOrEqual(2) // one sentence, one clause break at most
    }
  })

  it('Normal is the middle, default-focus entry', () => {
    expect(DIFFICULTY_ORDER[1]).toBe('normal')
  })
})

describe('MULTIPLIER_LABELS', () => {
  it('labels exactly the six DifficultyConfig fields — the details expander hides none of them', () => {
    const labelledKeys = MULTIPLIER_LABELS.map(([key]) => key).sort()
    const configKeys = Object.keys(DIFFICULTY_CONFIG.normal).sort()
    expect(labelledKeys).toEqual(configKeys)
  })
})
