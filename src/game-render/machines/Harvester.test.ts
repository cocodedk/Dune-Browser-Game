// src/game-render/machines/Harvester.test.ts
// The adapter's own contract, not the shop's: Harvester.ts's job is scale
// mapping, fog policy, and dt synthesis over a model the shop's own suite
// (vehicle-shop/harvester/src/seam.test.ts and friends) already covers in
// full. The shop model is DataTexture-only and constructs with no GL
// context — same pattern seam.test.ts already proves for this exact model,
// so this suite builds the real machine rather than a stub.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import { createHarvester } from './Harvester'

/** Every descendant's rotation.x/y/z, in traversal order — enough to catch
 *  any single wheel, sprocket or roller that turned between two calls. */
function rotationSnapshot(root: Object3D): number[] {
  const values: number[] = []
  root.traverse((child) => { values.push(child.rotation.x, child.rotation.y, child.rotation.z) })
  return values
}

describe('createHarvester (release adapter)', () => {
  it('wraps a non-empty shop model, scaled from true metres (scale/20)', () => {
    const machine = createHarvester(2)
    expect(machine.group.children.length).toBeGreaterThan(0)
    expect(machine.group.scale.x).toBe(0.1) // 2 / 20
    machine.dispose()
  })

  it('keeps the assembled footprint (hull + cutter overhang) within the old placeholder\'s silhouette', () => {
    const machine = createHarvester(2)
    machine.group.updateMatrixWorld(true)
    const size = new Box3().setFromObject(machine.group).getSize(new Vector3())
    // Old placeholder body was scale*2.4 long; the shop's full 60m footprint
    // (48m hull + cutter) lands a bit past that once mapped through /20.
    expect(size.z).toBeGreaterThan(2.2 * 2)
    expect(size.z).toBeLessThan(3.2 * 2)
    machine.dispose()
  })

  it('synthesises dt from elapsedMs and drives the shop model forward', () => {
    const machine = createHarvester(1)
    machine.update(0) // first call: dt clamped, establishes the baseline pose
    const before = rotationSnapshot(machine.group)
    machine.update(500) // a real gap: dt clamps to the 0.1s ceiling and moves the machine
    const after = rotationSnapshot(machine.group)

    expect(after.length).toBe(before.length)
    const changed = before.some((value, i) => value !== after[i])
    expect(changed).toBe(true)
    machine.dispose()
  })

  it('disposes without throwing, and a second instance is independent', () => {
    const first = createHarvester(1)
    expect(() => first.dispose()).not.toThrow()

    const second = createHarvester(1)
    expect(second.group.scale.x).toBe(0.05) // 1 / 20, unaffected by the first instance's dispose
    expect(() => second.update(16)).not.toThrow()
    second.dispose()
  })
})
