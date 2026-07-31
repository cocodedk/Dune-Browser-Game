// src/game-engine/worms/wormsign.test.ts

import { describe, it, expect } from 'vitest'
import {
  sightingStrength, activeSightings, pruneSightings, fieldIsDangerous,
  WORMSIGN_DAYS,
} from './wormsign'
import type { Sighting } from './wormsign'

const DAY = 60
const at = (fieldId: string, atTime: number): Sighting => ({ fieldId, atTime })

describe('sightingStrength', () => {
  it('is full the moment it happens', () => {
    expect(sightingStrength(at('f', 100), 100, DAY)).toBe(1)
  })

  it('has faded entirely by the last day', () => {
    expect(sightingStrength(at('f', 0), WORMSIGN_DAYS * DAY, DAY)).toBe(0)
    expect(sightingStrength(at('f', 0), WORMSIGN_DAYS * DAY * 3, DAY)).toBe(0)
  })

  it('decreases the whole way, never rising', () => {
    let previous = Infinity
    for (let t = 0; t <= WORMSIGN_DAYS * DAY; t += 5) {
      const s = sightingStrength(at('f', 0), t, DAY)
      expect(s).toBeLessThanOrEqual(previous + 1e-9)
      previous = s
    }
  })

  it('stays bold for the first day or two', () => {
    // The whole point is that the player sees it, so it must not fall off a
    // cliff the moment it appears.
    expect(sightingStrength(at('f', 0), DAY, DAY)).toBeGreaterThan(0.65)
  })

  it('treats a sighting from the future as fresh rather than negative', () => {
    // Loading a save, or a clock scrubbed backwards in debug, must not produce
    // a strength outside 0..1.
    const s = sightingStrength(at('f', 500), 100, DAY)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(1)
  })

  it('never divides by zero on a degenerate day length', () => {
    expect(Number.isNaN(sightingStrength(at('f', 0), 10, 0))).toBe(false)
  })
})

describe('activeSightings', () => {
  const list = [at('old', 0), at('fresh', 5 * DAY), at('mid', 2 * DAY)]

  it('returns the freshest first', () => {
    const active = activeSightings(list, 5 * DAY, DAY)
    expect(active[0].fieldId).toBe('fresh')
  })

  it('drops the ones that have faded out', () => {
    const active = activeSightings(list, 8 * DAY, DAY)
    expect(active.map(s => s.fieldId)).not.toContain('old')
  })

  it('returns nothing when there is nothing', () => {
    expect(activeSightings([], 100, DAY)).toEqual([])
  })
})

describe('pruneSightings', () => {
  it('keeps live sightings and drops dead ones', () => {
    // The old one must be past the whole WORMSIGN_DAYS window, not merely
    // older than the new one — it fades over six days, not on contact.
    const now = (WORMSIGN_DAYS + 1) * DAY
    const kept = pruneSightings([at('old', 0), at('new', now - DAY)], now, DAY)
    expect(kept.map(s => s.fieldId)).toEqual(['new'])
  })

  it('leaves the input untouched', () => {
    const input = [at('old', 0)]
    pruneSightings(input, 99 * DAY, DAY)
    expect(input).toHaveLength(1)
  })
})

describe('fieldIsDangerous', () => {
  it('flags a field with a fresh sighting', () => {
    expect(fieldIsDangerous([at('tabr', 0)], 'tabr', 0, DAY)).toBe(true)
  })

  it('clears once the sign has faded', () => {
    expect(fieldIsDangerous([at('tabr', 0)], 'tabr', 5 * DAY, DAY)).toBe(false)
  })

  it('does not flag a different field', () => {
    expect(fieldIsDangerous([at('tabr', 0)], 'hagg', 0, DAY)).toBe(false)
  })
})
