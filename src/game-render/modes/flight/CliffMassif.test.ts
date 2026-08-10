// src/game-render/modes/flight/CliffMassif.test.ts
// Measures the MOUNT, off the real built @land/cliff geometry — never off
// the arithmetic alone (this project's standing rule; landscape-shop's own
// seam.test.ts does the same for the shop side). This is the "measure the
// arc against the massif's bounds" guard the adapter's header promises.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import { FOOTPRINT } from '@land/cliff/src/spec'
import { generateHeightfield } from '../../terrain/heightfield'
import { createCliffMassif, mountFor, GATE_CLEARANCE_M } from './CliffMassif'
import { headingOf, positionAt, chaseCameraAt } from './FlightPath'
import type { FlightArc } from './FlightPath'

// Mirrors FlightMode.ts's real arc exactly (its ARC_LENGTH=1500 and
// destination={x:750,z:-200}) — the same "hardcode the measured shape"
// pattern FlightOrientation.test.ts uses for this identical arc.
const ARC: FlightArc = {
  from: { x: -750, y: 90, z: 200 },
  to: { x: 750, y: 90, z: -200 },
  apex: 70,
  touchdownY: 12,
}

const FIELD_SIZE = 2200
const HALF_FIELD = FIELD_SIZE / 2

function heightfieldFor(seed: number) {
  return generateHeightfield({
    resolution: 96, worldSize: FIELD_SIZE, seed, amplitude: 70, frequency: 3.1,
    octaves: 3, warpStrength: 0.9, ridgeMix: 0.6, stretch: [1, 3.2], edgeFalloff: 0.18,
  })
}

describe('mountFor: pure placement maths', () => {
  it('faces the entrance back along the heading — it greets the incoming craft', () => {
    const heading = headingOf(ARC)
    const mount = mountFor(ARC)
    // local -Z maps to world (-sin yaw, -cos yaw) — FlightPath.yawOf's own
    // rotation convention, applied to the entrance instead of the nose.
    const normal = { x: -Math.sin(mount.yaw), z: -Math.cos(mount.yaw) }
    expect(normal.x * heading.x + normal.z * heading.z).toBeCloseTo(-1, 6)
  })

  it('sits the entrance GATE_CLEARANCE_M beyond the destination, along the heading', () => {
    const heading = headingOf(ARC)
    const mount = mountFor(ARC)
    const dx = mount.entranceX - ARC.to.x
    const dz = mount.entranceZ - ARC.to.z
    expect(Math.hypot(dx, dz)).toBeCloseTo(GATE_CLEARANCE_M, 6)
    expect(dx * heading.x + dz * heading.z).toBeCloseTo(GATE_CLEARANCE_M, 6)
  })
})

describe('createCliffMassif: the real built set, mounted', () => {
  it('the rotated footprint clears the treadmill field (+-1100)', () => {
    const massif = createCliffMassif(ARC, heightfieldFor(7781))
    massif.group.updateMatrixWorld(true)
    const box = new Box3().setFromObject(massif.group)
    expect(box.min.x).toBeGreaterThanOrEqual(-HALF_FIELD)
    expect(box.max.x).toBeLessThanOrEqual(HALF_FIELD)
    expect(box.min.z).toBeGreaterThanOrEqual(-HALF_FIELD)
    expect(box.max.z).toBeLessThanOrEqual(HALF_FIELD)
    massif.dispose()
  })

  it('the entrance sub-group sits at the mounted entrance point', () => {
    const massif = createCliffMassif(ARC, heightfieldFor(7781))
    massif.group.updateMatrixWorld(true)
    const entrance = massif.group.getObjectByName('entrance')
    if (!entrance) throw new Error('entrance group missing from the mounted set')
    const center = new Box3().setFromObject(entrance).getCenter(new Vector3())
    const mount = mountFor(ARC)
    // Within a mass's worth of slop: the reference point mountFor solves
    // for is FOOTPRINT.depthM, an approximation of the real socket rim
    // (seam.test.ts only guards depth within 1% of spec).
    expect(Math.hypot(center.x - mount.entranceX, center.z - mount.entranceZ)).toBeLessThan(20)
    massif.dispose()
  })

  it('seats within the skirt allowance, at several seeds', () => {
    for (const seed of [1, 7781, 42, 9001, 55555]) {
      const massif = createCliffMassif(ARC, heightfieldFor(seed))
      expect(massif.group.position.y).toBeGreaterThanOrEqual(0)
      expect(massif.group.position.y).toBeLessThanOrEqual(40)
      massif.dispose()
    }
  })

  it('the skirt bottom never floats above the field\'s own lowest point, at several seeds', () => {
    // Proven, not just observed: the heightfield never dips below 0
    // anywhere in the field (heightfield.ts's `combined` term is clamped to
    // [0, amplitude]), so root.y - skirtDepthM <= 0 <= heightfield.min is
    // enough to guarantee no gap under the skirt ANYWHERE in the field, not
    // only at the one sampled point. The raw, unclamped sample alone
    // reached 42.5 at one of these five seeds -- this is the guard against
    // that regressing.
    for (const seed of [1, 7781, 42, 9001, 55555]) {
      const heightfield = heightfieldFor(seed)
      const massif = createCliffMassif(ARC, heightfield)
      expect(massif.group.position.y - FOOTPRINT.skirtDepthM).toBeLessThanOrEqual(heightfield.min)
      massif.dispose()
    }
  })

  it('the whole flight path stays on the near side of the entrance — no clipping into rock', () => {
    const mount = mountFor(ARC)
    const heading = headingOf(ARC)
    const outward = { x: -heading.x, z: -heading.z }
    const clears = (x: number, z: number): number => (
      (x - mount.entranceX) * outward.x + (z - mount.entranceZ) * outward.z
    )
    for (let t = 0; t <= 1; t += 0.02) {
      const p = positionAt(ARC, t)
      expect(clears(p.x, p.z)).toBeGreaterThanOrEqual(-1e-6)
      const cam = chaseCameraAt(ARC, t).position
      expect(clears(cam.x, cam.z)).toBeGreaterThanOrEqual(-1e-6)
    }
  })
})
