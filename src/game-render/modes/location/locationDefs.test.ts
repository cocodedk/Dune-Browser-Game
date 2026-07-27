// src/game-render/modes/location/locationDefs.test.ts

import { describe, it, expect } from 'vitest'
import { dioramaFor, hotspotsFor } from './locationDefs'
import type { LocationKind } from '../../../types'

const ALL_KINDS: LocationKind[] = [
  'palace', 'sietch', 'smuggler_den', 'fort', 'field_camp', 'station',
]

describe('dioramaFor', () => {
  it('defines every location kind', () => {
    for (const kind of ALL_KINDS) {
      expect(dioramaFor(kind)).toBeDefined()
    }
  })

  it('keeps enclosure and hearth inside their ranges', () => {
    for (const kind of ALL_KINDS) {
      const def = dioramaFor(kind)
      expect(def.enclosure).toBeGreaterThanOrEqual(0)
      expect(def.enclosure).toBeLessThanOrEqual(1)
      expect(def.hearth).toBeGreaterThanOrEqual(0)
      expect(def.hearth).toBeLessThanOrEqual(1)
    }
  })

  it('uses valid hex colours throughout', () => {
    const hex = /^#[0-9a-f]{6}$/i
    for (const kind of ALL_KINDS) {
      const def = dioramaFor(kind)
      expect(def.skyTop).toMatch(hex)
      expect(def.skyBottom).toMatch(hex)
      expect(def.massing).toMatch(hex)
    }
  })

  it('differentiates the moods rather than reusing one look', () => {
    // If every kind rendered identically the diorama would add nothing.
    const signatures = ALL_KINDS.map(k => {
      const d = dioramaFor(k)
      return `${d.skyTop}${d.massing}${d.enclosure}`
    })
    expect(new Set(signatures).size).toBe(ALL_KINDS.length)
  })

  it('encloses interiors more than open sites', () => {
    expect(dioramaFor('smuggler_den').enclosure)
      .toBeGreaterThan(dioramaFor('field_camp').enclosure)
    expect(dioramaFor('sietch').enclosure)
      .toBeGreaterThan(dioramaFor('fort').enclosure)
  })

  it('falls back rather than throwing on an unknown kind', () => {
    expect(dioramaFor('nowhere' as LocationKind)).toBeDefined()
  })
})

describe('hotspotsFor', () => {
  it('offers a departure everywhere, so the player is never trapped', () => {
    for (const kind of ALL_KINDS) {
      const ids = hotspotsFor(kind, false).map(h => h.id)
      expect(ids).toContain('leave')
    }
  })

  it('offers speech only where someone is present', () => {
    expect(hotspotsFor('sietch', true).map(h => h.id)).toContain('talk')
    expect(hotspotsFor('sietch', false).map(h => h.id)).not.toContain('talk')
  })

  it('offers trade only at the smuggler den', () => {
    expect(hotspotsFor('smuggler_den', false).map(h => h.id)).toContain('trade')
    expect(hotspotsFor('palace', false).map(h => h.id)).not.toContain('trade')
  })

  it('keeps every hotspot inside the frame', () => {
    for (const kind of ALL_KINDS) {
      for (const spot of hotspotsFor(kind, true)) {
        expect(spot.x).toBeGreaterThanOrEqual(0)
        expect(spot.x).toBeLessThanOrEqual(1)
        expect(spot.y).toBeGreaterThanOrEqual(0)
        expect(spot.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('stays sparse — the panels are the control surface, not this', () => {
    for (const kind of ALL_KINDS) {
      expect(hotspotsFor(kind, true).length).toBeLessThanOrEqual(3)
    }
  })

  it('gives every hotspot a non-empty label', () => {
    for (const spot of hotspotsFor('smuggler_den', true)) {
      expect(spot.label.length).toBeGreaterThan(0)
    }
  })
})
