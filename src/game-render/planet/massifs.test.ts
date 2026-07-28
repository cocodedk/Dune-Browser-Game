// src/game-render/planet/massifs.test.ts

import { describe, it, expect } from 'vitest'
import { massifsForSettlements, massifUplift, hashId } from './massifs'
import type { MassifSource } from './massifs'
import { biomeAt } from './biomes'
import { canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

const project = (p: { x: number; y: number }) =>
  canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT)

const SIETCHES: MassifSource[] = [
  { id: 'sietch_tabr', kind: 'sietch', position: { x: 140, y: 390 } },
  { id: 'red_wall_sietch', kind: 'sietch', position: { x: 70, y: 240 } },
  { id: 'hagg', kind: 'sietch', position: { x: 130, y: 80 } },
  { id: 'habbanya_ridge', kind: 'sietch', position: { x: -60, y: 430 } },
  { id: 'sihaya_ridge', kind: 'sietch', position: { x: 1430, y: 120 } },
]

const massifs = massifsForSettlements(SIETCHES, project)

/** The realistic range of the continental noise field. */
const NOISE_LOW = 0.30
const NOISE_HIGH = 0.70

describe('massifsForSettlements', () => {
  it('makes one massif per settlement that gets rock', () => {
    expect(massifs).toHaveLength(SIETCHES.length)
  })

  it('gives no rock to kinds that are not settlements on stone', () => {
    const none = massifsForSettlements(
      [{ id: 'camp', kind: 'field_camp', position: { x: 400, y: 250 } }], project,
    )
    expect(none).toEqual([])
  })

  it('is deterministic', () => {
    expect(massifsForSettlements(SIETCHES, project)).toEqual(massifs)
  })

  it('varies size, orientation and shape between settlements', () => {
    // The stated fear is a ring of identical circular patches. Four
    // independent varied parameters is the defence.
    for (const key of ['extentDeg', 'strength', 'bearing', 'stretch'] as const) {
      const values = new Set(massifs.map(m => m[key].toFixed(4)))
      expect(values.size).toBeGreaterThan(1)
    }
  })

  it('honours a per-place override', () => {
    const [low] = massifsForSettlements(
      [SIETCHES[0]], project, { sietch_tabr: 0.4 },
    )
    expect(low.strength).toBeLessThan(massifs[0].strength)
  })
})

describe('massifUplift: the sietch is on rock', () => {
  it('makes every sietch centre rock across the whole noise range', () => {
    // The entire point. If this fails, a sietch sits on open sand.
    for (const m of massifs) {
      for (let c = NOISE_LOW; c <= NOISE_HIGH; c += 0.05) {
        const lifted = Math.min(1, c + massifUplift(m.lat, m.lon, massifs))
        expect(biomeAt(m.lat, lifted).id).toBe('rock')
      }
    }
  })

  it('leaves the open desert alone', () => {
    // Far from every settlement the uplift must be exactly zero, or the rock
    // leaks and the planet stops being an erg.
    const far = { lat: -46, lon: 96 }
    expect(massifUplift(far.lat, far.lon, massifs)).toBe(0)
    expect(biomeAt(far.lat, 0.5).id).toBe('erg')
  })

  it('composes by maximum, never by sum', () => {
    // Two overlapping massifs must not add into a featureless plateau.
    const pair = massifsForSettlements([
      { id: 'a', kind: 'sietch', position: { x: 400, y: 250 } },
      { id: 'b', kind: 'sietch', position: { x: 412, y: 250 } },
    ], project)
    const peak = Math.max(...pair.map(m => m.strength))
    for (let lon = -6; lon <= 6; lon += 0.5) {
      expect(massifUplift(0, lon, pair)).toBeLessThanOrEqual(peak + 1e-9)
    }
  })
})

describe('massifUplift: shape', () => {
  it('never steps hard enough to draw a terrace', () => {
    const m = massifs[0]
    let maxStep = 0
    for (let d = -12; d < 12; d += 0.25) {
      const a = massifUplift(m.lat + d, m.lon, massifs)
      const b = massifUplift(m.lat + d + 0.25, m.lon, massifs)
      maxStep = Math.max(maxStep, Math.abs(a - b))
    }
    expect(maxStep).toBeLessThan(0.04)
  })

  it('falls to zero beyond its reach in every direction', () => {
    // extentDeg bounds distance in the massif's own rotated, stretched frame,
    // so the reach along the ridge is extentDeg * stretch. Testing a raw
    // latitude offset alone would be asserting the wrong axis.
    const m = massifs[0]
    const reach = m.extentDeg * m.stretch * 1.05
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const lat = m.lat + Math.sin(a) * reach
      const lon = m.lon + (Math.cos(a) * reach) / Math.cos((m.lat * Math.PI) / 180)
      expect(massifUplift(lat, lon, [m])).toBe(0)
    }
  })

  it('is never negative', () => {
    for (let lat = -80; lat <= 80; lat += 7) {
      for (let lon = -180; lon <= 180; lon += 11) {
        expect(massifUplift(lat, lon, massifs)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('handles the antimeridian without stranding a massif', () => {
    // Sihaya Ridge is past 140 degrees east; longitude wraps.
    const east = massifsForSettlements(
      [{ id: 'edge', kind: 'sietch', position: { x: 1673, y: 250 } }], project,
    )[0]
    expect(massifUplift(east.lat, east.lon, [east])).toBeGreaterThan(0.3)
  })
})

describe('massifUplift: the planet is still a desert', () => {
  it('covers only a small fraction of the sphere', () => {
    let lifted = 0
    let total = 0
    for (let lat = -88; lat <= 88; lat += 2) {
      // Weight by cos(lat) or the poles are wildly over-counted.
      const weight = Math.cos((lat * Math.PI) / 180)
      for (let lon = -180; lon < 180; lon += 2) {
        total += weight
        if (massifUplift(lat, lon, massifs) > 0.02) lifted += weight
      }
    }
    expect(lifted / total).toBeLessThan(0.06)
  })
})

describe('hashId', () => {
  it('is stable and in range', () => {
    expect(hashId('sietch_tabr')).toBe(hashId('sietch_tabr'))
    for (const id of ['', 'a', 'sietch_tabr', 'bight_of_cliff']) {
      expect(hashId(id)).toBeGreaterThanOrEqual(0)
      expect(hashId(id)).toBeLessThanOrEqual(1)
    }
  })

  it('separates different ids', () => {
    expect(hashId('hagg')).not.toBe(hashId('tsimpo'))
  })
})
