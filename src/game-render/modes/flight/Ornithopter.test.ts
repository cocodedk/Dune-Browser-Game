// src/game-render/modes/flight/Ornithopter.test.ts
// The adapter's own contract, not the shop's: Ornithopter.ts's job is scale
// mapping and per-frame FlightState synthesis over a model the shop's own
// suite (vehicle-shop/ornihopter/src/seam.test.ts and friends) already
// covers in full. The shop model is DataTexture-only and constructs with no
// GL context — the same pattern Harvester.test.ts already proves for its own
// shop model, so this suite builds the real craft rather than a stub.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import { OVERALL } from '@shop/ornihopter/src/spec'
import { createOrnithopter, HULL_MAX_RADIUS } from './Ornithopter'

// The Stage-22 craft this adapter replaced measured 41.810m nose-to-tail
// (Box3 z-extent) before deletion — see Ornithopter.ts's own
// PINNED_OLD_LENGTH_M comment for how that number was taken.
const PINNED_OLD_LENGTH_M = 41.81041070398643
const EXPECTED_SCALE = PINNED_OLD_LENGTH_M / OVERALL.length
const OLD_HULL_MAX_RADIUS = 2.1

/** Every descendant's rotation.x/y/z, in traversal order — enough to catch
 *  any single wing pivot that turned between two calls. */
function rotationSnapshot(root: Object3D): number[] {
  const values: number[] = []
  root.traverse((child) => { values.push(child.rotation.x, child.rotation.y, child.rotation.z) })
  return values
}

describe('createOrnithopter (release adapter)', () => {
  it('wraps a non-empty shop model, scaled to the old craft\'s footprint', () => {
    const craft = createOrnithopter()
    expect(craft.group.children.length).toBeGreaterThan(0)
    expect(craft.group.scale.x).toBeCloseTo(EXPECTED_SCALE, 9)
    craft.dispose()
  })

  it('keeps the old craft\'s pinned nose-to-tail length within 10%', () => {
    const craft = createOrnithopter()
    craft.group.updateMatrixWorld(true)
    const size = new Box3().setFromObject(craft.group).getSize(new Vector3())
    expect(size.z).toBeGreaterThan(PINNED_OLD_LENGTH_M * 0.9)
    expect(size.z).toBeLessThan(PINNED_OLD_LENGTH_M * 1.1)
    craft.dispose()
  })

  it('beats the wings: some descendant transform changes between two updates', () => {
    const craft = createOrnithopter()
    craft.update(0) // first call: dt clamped, establishes the baseline pose
    const before = rotationSnapshot(craft.group)
    craft.update(500) // a real gap: dt clamps to the 0.1s ceiling and advances the beat
    const after = rotationSnapshot(craft.group)

    expect(after.length).toBe(before.length)
    const changed = before.some((value, i) => value !== after[i])
    expect(changed).toBe(true)
    craft.dispose()
  })

  it('exports a finite, positive HULL_MAX_RADIUS in the neighbourhood of the old value', () => {
    // The old hull was a body of revolution (radius 2.1, one value for every
    // axis); the shop hull is not, so this is a scaled analogue derived from
    // its widest single half-extent, not a bit-exact carryover — see
    // Ornithopter.ts's own comment on HULL_MAX_RADIUS. The wide upper bound
    // reflects that: a rectangular half-extent scaled the same way a
    // circular radius was is a looser tolerance by construction.
    expect(Number.isFinite(HULL_MAX_RADIUS)).toBe(true)
    expect(HULL_MAX_RADIUS).toBeGreaterThan(OLD_HULL_MAX_RADIUS)
    expect(HULL_MAX_RADIUS).toBeLessThan(OLD_HULL_MAX_RADIUS * 3)
  })

  it('disposes without throwing, and a second instance is independent', () => {
    const first = createOrnithopter()
    expect(() => first.dispose()).not.toThrow()

    const second = createOrnithopter()
    expect(second.group.scale.x).toBeCloseTo(EXPECTED_SCALE, 9)
    expect(() => second.update(16)).not.toThrow()
    second.dispose()
  })
})
