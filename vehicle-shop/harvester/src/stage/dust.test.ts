// vehicle-shop/harvester/src/stage/dust.test.ts
// I7 tests-first, pinning the round's correctness question (a) — "parked
// machine: zero dust, plumes only when the tracks turn" — before any
// geometry, plus placement (behind the rear sprockets, both sides) and the
// opacity/size-scales-with-speed claim. Sprite/Group are plain three.js
// objects with no DOM/canvas dependency, same as every other component test
// in this shop.

import { describe, it, expect } from 'vitest'
import type { Sprite } from 'three'
import { TRACK } from '../spec'
import {
  advanceDustPhase, dustVisualAt, buildDustPlumes,
  DUST_CYCLE_DISTANCE, DUST_SPEED_SATURATION,
} from './dust'

describe('dust plumes — pure phase/visual maths', () => {
  it('correctness (a): zero dust at zero track speed, at any phase', () => {
    for (const phase of [0, 1, 3, DUST_CYCLE_DISTANCE - 0.01]) {
      expect(dustVisualAt(phase, 0)).toEqual({ scale: 0, opacity: 0 })
    }
  })

  it('opacity and size scale with |speed|', () => {
    const phase = DUST_CYCLE_DISTANCE / 2 // mid-cycle, clear of both zeros
    const slow = dustVisualAt(phase, 1)
    const fast = dustVisualAt(phase, DUST_SPEED_SATURATION)
    expect(fast.opacity).toBeGreaterThan(slow.opacity)
    expect(fast.scale).toBeGreaterThan(slow.scale)
    expect(slow.opacity).toBeGreaterThan(0)
  })

  it('reverse (negative speed) drives dust too — magnitude, not sign', () => {
    const phase = DUST_CYCLE_DISTANCE / 2
    expect(dustVisualAt(phase, -2)).toEqual(dustVisualAt(phase, 2))
  })

  it('saturates at DUST_SPEED_SATURATION — no bigger/denser beyond it', () => {
    const phase = DUST_CYCLE_DISTANCE / 2
    const atSat = dustVisualAt(phase, DUST_SPEED_SATURATION)
    const beyond = dustVisualAt(phase, DUST_SPEED_SATURATION * 5)
    expect(beyond).toEqual(atSat)
  })

  it('phase advances only by distance travelled (|speed| * dt), never by dt alone', () => {
    expect(advanceDustPhase(1, 0, 10)).toBe(1)
    expect(advanceDustPhase(0, 2, 1.5)).toBeCloseTo(3, 6)
  })

  it('phase wraps modulo the cycle so a plume repeats rather than growing forever', () => {
    expect(advanceDustPhase(DUST_CYCLE_DISTANCE - 1, 2, 1)).toBeCloseTo(1, 6)
  })
})

describe('dust plumes — placement and wiring', () => {
  it('sits behind the rear sprockets, both sides', () => {
    const dust = buildDustPlumes()
    const sprites = dust.group.children.filter((c) => c.name === 'dustPlume')
    expect(sprites.length).toBe(2)
    const xs = sprites.map((s) => s.position.x).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(-TRACK.centreX, 6)
    expect(xs[1]).toBeCloseTo(TRACK.centreX, 6)
    for (const sprite of sprites) {
      expect(sprite.position.z).toBeGreaterThan(TRACK.sprocketZ[1])
    }
    dust.dispose()
  })

  it('is invisible at construction — before any update(), parked reads as parked', () => {
    const dust = buildDustPlumes()
    for (const sprite of dust.group.children as Sprite[]) {
      expect(sprite.material.opacity).toBe(0)
      expect(sprite.scale.x).toBe(0)
    }
    dust.dispose()
  })

  it('update() at zero speed keeps both plumes at zero, every frame', () => {
    const dust = buildDustPlumes()
    for (let i = 0; i < 5; i++) dust.update(0, 0, 0.5)
    for (const sprite of dust.group.children as Sprite[]) {
      expect(sprite.material.opacity).toBe(0)
      expect(sprite.scale.x).toBe(0)
    }
    dust.dispose()
  })

  it('update() at nonzero speed makes both plumes visible', () => {
    const dust = buildDustPlumes()
    dust.update(2, 2, 1)
    for (const sprite of dust.group.children as Sprite[]) {
      expect(sprite.material.opacity).toBeGreaterThan(0)
      expect(sprite.scale.x).toBeGreaterThan(0)
    }
    dust.dispose()
  })

  it('each side reads its own track speed — starboard (+X) from trackRight', () => {
    const dust = buildDustPlumes()
    dust.update(0, 3, 1) // left stopped, right driving
    const sprites = dust.group.children as Sprite[]
    const starboard = sprites.find((s) => s.position.x > 0)!
    const port = sprites.find((s) => s.position.x < 0)!
    expect(starboard.material.opacity).toBeGreaterThan(0)
    expect(port.material.opacity).toBe(0)
    dust.dispose()
  })
})
