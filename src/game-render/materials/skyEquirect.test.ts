// src/game-render/materials/skyEquirect.test.ts
// Pure math only — skyEquirect.ts has no three.js, so its whole testable
// surface is plain numbers and byte buffers.

import { describe, it, expect } from 'vitest'
import {
  skyColorAt, paintSkyEquirect, paletteDistance, shouldRebakeEnvironment,
  DEFAULT_EQUIRECT_SIZE, REBAKE_THRESHOLD,
} from './skyEquirect'
import { paletteForTime } from './Atmosphere'

const DAY_SECONDS = 60
const FRAME_DT = 1 / 60

// A representative palette for shape/format tests — the exact hour does not
// matter for these, only that horizon and zenith actually differ.
const palette = paletteForTime(20, DAY_SECONDS)

describe('skyColorAt', () => {
  it('is flat horizon colour looking level or down, matching SkyDome\'s own clamp', () => {
    expect(skyColorAt(0, palette)).toEqual(palette.horizon)
    expect(skyColorAt(-1, palette)).toEqual(palette.horizon)
  })

  it('trends toward zenith looking straight up', () => {
    const up = skyColorAt(1, palette)
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(up[i] - palette.zenith[i])).toBeLessThan(0.01)
    }
  })
})

describe('paintSkyEquirect', () => {
  const size = DEFAULT_EQUIRECT_SIZE
  const data = paintSkyEquirect(palette, size)

  it('produces one RGBA byte quad per pixel', () => {
    expect(data.length).toBe(size.width * size.height * 4)
  })

  it('is fully opaque', () => {
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('is a pure vertical gradient — every column in a row is identical', () => {
    for (let row = 0; row < size.height; row++) {
      const base = row * size.width * 4
      for (let col = 1; col < size.width; col++) {
        const i = base + col * 4
        expect(data[i]).toBe(data[base])
        expect(data[i + 1]).toBe(data[base + 1])
        expect(data[i + 2]).toBe(data[base + 2])
      }
    }
  })

  it('bottom row matches the horizon colour exactly (nadir clamps like SkyDome)', () => {
    const bottom = (size.height - 1) * size.width * 4
    expect(data[bottom]).toBe(Math.round(palette.horizon[0] * 255))
    expect(data[bottom + 1]).toBe(Math.round(palette.horizon[1] * 255))
    expect(data[bottom + 2]).toBe(Math.round(palette.horizon[2] * 255))
  })
})

describe('paletteDistance / shouldRebakeEnvironment', () => {
  it('is zero, and never rebakes, for an identical palette', () => {
    const p = paletteForTime(20, DAY_SECONDS)
    expect(paletteDistance(p, p)).toBe(0)
    expect(shouldRebakeEnvironment(p, p)).toBe(false)
  })

  it('always bakes the first time, with no previous palette', () => {
    expect(shouldRebakeEnvironment(null, palette)).toBe(true)
  })

  // Measured (see scripts/ scratch analysis in the task's audit trail): the
  // worst single-frame (1/60s) palette distance across a full day at
  // DAY_SECONDS=60 is on the order of 1e-6 — three orders of magnitude below
  // REBAKE_THRESHOLD. These three instants span the fastest (dawn), a
  // moderate (noon), and the slowest-changing (midnight) parts of the day.
  const instants: Array<[string, number]> = [
    ['dawn', 53.4],
    ['midnight', 0],
    ['noon', 8.4],
  ]

  for (const [label, t] of instants) {
    it(`never rebakes for a single frame step at ${label}`, () => {
      const before = paletteForTime(t, DAY_SECONDS)
      const after = paletteForTime(t + FRAME_DT, DAY_SECONDS)
      expect(paletteDistance(before, after)).toBeLessThan(REBAKE_THRESHOLD / 1000)
      expect(shouldRebakeEnvironment(before, after)).toBe(false)
    })

    // One "hour" at this clock (DAY_SECONDS=60 / 24) is 2.5s — measured at
    // roughly 0.018-0.025 for these three instants, comfortably over the
    // threshold, so a real hour-scale change always triggers a rebake.
    it(`rebakes across an hour-scale (2.5s) change at ${label}`, () => {
      const before = paletteForTime(t, DAY_SECONDS)
      const after = paletteForTime(t + 2.5, DAY_SECONDS)
      expect(paletteDistance(before, after)).toBeGreaterThan(REBAKE_THRESHOLD)
      expect(shouldRebakeEnvironment(before, after)).toBe(true)
    })
  }
})
