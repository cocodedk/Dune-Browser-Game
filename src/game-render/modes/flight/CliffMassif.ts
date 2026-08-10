// src/game-render/modes/flight/CliffMassif.ts
// The release adapter over the cliff landscape shop
// (docs/PRD/dune92/04-asset-pipeline.md): mounts the static massif
// (@land/cliff) as the flight arc's destination landform. The shop ships a
// STATIC set at true scale, face-toward-its-own--Z (spec.ts's FOOTPRINT
// comment) and never writes its own root transform (contracts.ts) — scale,
// orientation and seating are entirely this adapter's job, same division of
// labour as Harvester.ts and Ornithopter.ts.
//
// MOUNT. The arc (FlightMode.ts) travels from {-750,200} to {750,-200}: a
// heading of about (0.97, -0.26), not a pure -Z approach — see
// FlightOrientation.test.ts's own measured-heading comment. The entrance's
// outward normal (local -Z) is rotated to point back along that heading
// (yaw = atan2(heading.x, heading.z), exactly PI past FlightPath.yawOf's own
// atan2(-heading.x, -heading.z) for the craft's nose — the entrance greets
// the craft rather than chasing it), then the whole set is translated so the
// entrance sits GATE_CLEARANCE_M beyond the touchdown point along that same
// heading: the player lands in front of the gate, not inside rock, and never
// exactly ON the destination coordinate where the craft itself settles.
// CliffMassif.test.ts measures the real, built geometry against this design
// (entrance-normal, clearance, and the rotated footprint against the
// treadmill's own bounds) rather than trusting the arithmetic alone.
//
// SEATING. The shop authors 40 m of skirt below its own y = 0 (spec.ts's
// FOOTPRINT.skirtDepthM). heightfield.ts's `combined` term is clamped to
// [0, amplitude] -- FlightMode's dune field never dips below world y = 0,
// anywhere in the field, at any seed -- so clamping the sample to
// [0, skirtDepthM] before seating makes "no floating base" a PROVEN
// property, not an empirical one: the skirt's own bottom (root.y - 40)
// lands at or below 0, which is at or below every point of terrain there
// is, not just the sampled one. Measured (CliffMassif.test.ts): the raw
// sample alone reached 42.5 m at one of five spot-checked seeds -- 2.5 m of
// exactly this gap, over five arbitrary seeds, without the clamp.

import { Group } from 'three'
import { createCliff } from '@land/cliff/src/model/Cliff'
import { FOOTPRINT } from '@land/cliff/src/spec'
import type { Heightfield } from '../../terrain/heightfield'
import { headingOf } from './FlightPath'
import type { FlightArc } from './FlightPath'

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/**
 * Metres the entrance sits beyond the destination, along the heading. Capped
 * by the treadmill field, not by taste: FlightMode's heightfield is
 * FIELD_SIZE (2200) wide, so the terrain mesh ends at world +-1100. The
 * massif's own footprint (600 x 220) rotated ~105 deg into this heading
 * sweeps roughly 367 m across the destination's own X — CliffMassif.test.ts
 * measures the real rotated bounds and asserts they clear +-1100 with this
 * value; 45 m leaves about 15 m of margin below the measured limit (~60 m)
 * for the shop's own 1% footprint tolerance (seam.test.ts) and the
 * dressing zone's own slight forward reach (tools/bake/dressPlan.mjs's
 * DRESS_FRONT_Z, -218.9, a hair short of the entrance rim).
 */
export const GATE_CLEARANCE_M = 45

export interface CliffMassif {
  readonly group: Group
  dispose(): void
}

export interface Mount {
  yaw: number
  /** Root position (the local x=0, z=0 back-plane reference point). */
  rootX: number
  rootZ: number
  /** Where the entrance itself lands — GATE_CLEARANCE_M beyond the
   *  destination along the heading. What the height sample is taken at. */
  entranceX: number
  entranceZ: number
}

/** Where the entrance ends up, and the root transform that puts it there —
 *  pure maths, reused by CliffMassif.test.ts so the guard measures the same
 *  numbers this adapter mounts with, not a re-derivation of them. */
export function mountFor(arc: FlightArc, clearanceM = GATE_CLEARANCE_M): Mount {
  const heading = headingOf(arc)
  // See FlightPath.yawOf's own docstring for this rotation convention:
  // rotating by angle y about Y sends local -Z to world (-sin y, 0, -cos y).
  // The craft's yaw solves that for local -Z -> world heading (nose-first);
  // the entrance wants local -Z -> world -heading (facing the oncoming
  // craft), which is the same equation with heading negated -- algebraically
  // exactly PI away from yawOf(arc).
  const yaw = Math.atan2(heading.x, heading.z)
  const entranceX = arc.to.x + heading.x * clearanceM
  const entranceZ = arc.to.z + heading.z * clearanceM
  // The local entrance reference point is (x=0, z=-FOOTPRINT.depthM); rotate
  // it by `yaw` and solve for the translation that lands it on the target.
  const entranceRelX = -FOOTPRINT.depthM * Math.sin(yaw)
  const entranceRelZ = -FOOTPRINT.depthM * Math.cos(yaw)
  return {
    yaw, entranceX, entranceZ,
    rootX: entranceX - entranceRelX,
    rootZ: entranceZ - entranceRelZ,
  }
}

export function createCliffMassif(arc: FlightArc, heightfield: Heightfield): CliffMassif {
  const model = createCliff()
  // Structural stand-in cast (contracts.ts's Object3DLike) -- see
  // Harvester.ts's identical comment: holds only as long as the shop and
  // the game share one node_modules/three instance.
  const group = model.root as unknown as Group

  const mount = mountFor(arc)
  group.rotation.y = mount.yaw
  group.position.x = mount.rootX
  group.position.z = mount.rootZ
  // Clamped to the skirt allowance itself -- see the header note on why
  // that makes "no floating base" a proven bound, not an empirical one.
  const sample = heightfield.heightAt(mount.entranceX, mount.entranceZ)
  group.position.y = clamp(sample, 0, FOOTPRINT.skirtDepthM)

  return {
    group,
    dispose(): void {
      model.dispose()
    },
  }
}
