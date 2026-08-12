// src/ui/toastPolicy.test.ts
// Pure policy — no React, no DOM.

import { describe, it, expect } from 'vitest'
import {
  toastDurationMs, isToasted, BRIEF_MS, WEIGHTY_MS, MAX_VISIBLE,
} from './toastPolicy'
import type { GameEventType } from '../types'

// The full union, written out so a new event type added to types.ts without a
// decision here shows up as a failure rather than silently defaulting.
const ALL: GameEventType[] = [
  'alliance_offer', 'betrayal', 'attack', 'dialogue_start', 'dialogue_end',
  'village_selected', 'travel_start', 'travel_complete',
  'faction_decision', 'tribute_refused', 'poc_goal_achieved',
  'sietch_pledged', 'sietch_task_assigned', 'spice_shipment_received',
  'fedaykin_ready', 'story_reward',
]

describe('toastDurationMs', () => {
  it('gives every event type a decided duration', () => {
    for (const type of ALL) {
      expect(Number.isFinite(toastDurationMs(type)), type).toBe(true)
      expect(toastDurationMs(type), type).toBeGreaterThanOrEqual(0)
    }
  })

  it('passes routine confirmations briefly', () => {
    expect(toastDurationMs('sietch_task_assigned')).toBe(BRIEF_MS)
    expect(toastDurationMs('village_selected')).toBe(BRIEF_MS)
    expect(toastDurationMs('travel_start')).toBe(BRIEF_MS)
  })

  it('holds consequences a little longer', () => {
    expect(toastDurationMs('attack')).toBe(WEIGHTY_MS)
    expect(toastDurationMs('betrayal')).toBe(WEIGHTY_MS)
    expect(toastDurationMs('poc_goal_achieved')).toBe(WEIGHTY_MS)
    expect(WEIGHTY_MS).toBeGreaterThan(BRIEF_MS)
  })

  // The one case that would look like a bug rather than a preference: the
  // dialogue panel already puts these words on screen in a modal card, so a
  // toast would show the same line twice in two places at once.
  it('does not duplicate anything that already owns screen space', () => {
    expect(toastDurationMs('dialogue_start')).toBe(0)
    expect(toastDurationMs('dialogue_end')).toBe(0)
    expect(isToasted('dialogue_start')).toBe(false)
  })

  it('shows everything else', () => {
    const hidden = ALL.filter(t => !isToasted(t))
    expect(hidden).toEqual(['dialogue_start', 'dialogue_end'])
  })

  it('keeps the stack small enough not to wall off the map', () => {
    expect(MAX_VISIBLE).toBeGreaterThan(0)
    expect(MAX_VISIBLE).toBeLessThanOrEqual(4)
  })
})
