// src/game-render/modes/location/hotspotPick.test.ts

import { describe, it, expect } from 'vitest'
import { pickHotspot, DEFAULT_RADIUS } from './hotspotPick'
import { hotspotsFor } from './locationDefs'
import type { Hotspot } from './locationDefs'

const spots = hotspotsFor('sietch', true)
const talk = spots.find(s => s.id === 'talk')!
const leave = spots.find(s => s.id === 'leave')!

/** Pointer coordinates for a hotspot, applying the flip a caller would. */
const pointerAt = (h: Hotspot) => ({ nx: h.x, ny: 1 - h.y })

describe('pickHotspot', () => {
  it('finds a spot pointed at directly', () => {
    const p = pointerAt(talk)
    expect(pickHotspot(spots, p.nx, p.ny)?.id).toBe('talk')
  })

  it('flips y between pointer space and frame space', () => {
    // The bug this pins: hotspots are normalised from the bottom, pointer
    // events from the top. Getting it backwards puts every target in the
    // mirror image of where it is painted.
    const p = pointerAt(talk)
    expect(pickHotspot(spots, p.nx, p.ny)?.id).toBe('talk')
    // Pointing at the *unflipped* position must not hit it.
    expect(pickHotspot(spots, talk.x, talk.y)?.id).not.toBe('talk')
  })

  it('returns null on empty space', () => {
    expect(pickHotspot(spots, 0.02, 0.98)).toBeNull()
  })

  it('returns null when there are no spots', () => {
    expect(pickHotspot([], 0.5, 0.5)).toBeNull()
  })

  it('respects the radius', () => {
    const p = pointerAt(talk)
    expect(pickHotspot(spots, p.nx + DEFAULT_RADIUS * 0.5, p.ny)?.id).toBe('talk')
    expect(pickHotspot(spots, p.nx + DEFAULT_RADIUS * 2, p.ny)).toBeNull()
  })

  it('picks the nearest when targets overlap', () => {
    // A row of people stands close together; the one pointed at must win.
    const crowd: Hotspot[] = [
      { id: 'a', label: 'A', x: 0.40, y: 0.5 },
      { id: 'b', label: 'B', x: 0.46, y: 0.5 },
    ]
    expect(pickHotspot(crowd, 0.455, 0.5)?.id).toBe('b')
    expect(pickHotspot(crowd, 0.405, 0.5)?.id).toBe('a')
  })

  it('can reach every spot a sietch offers', () => {
    // The property that matters: nothing painted is unclickable.
    for (const spot of spots) {
      const p = pointerAt(spot)
      expect(pickHotspot(spots, p.nx, p.ny)?.id).toBe(spot.id)
    }
  })

  it('separates talk from depart', () => {
    const p = pointerAt(leave)
    expect(pickHotspot(spots, p.nx, p.ny)?.id).toBe('leave')
  })
})
