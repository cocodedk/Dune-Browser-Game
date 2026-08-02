// vehicle-shop/ornihopter/src/model/geometry/wingChordHandedness.test.ts
// User's finding: every wing blade was mirrored across its own span axis —
// tip doglegs curled toward the nose instead of trailing aft, and the
// straight edge that should lead sat aft instead. The master blade
// (wing/section.ts) is authored once and shared by all eight wings, so the
// bug and its fix both live there (see rodPoints/bladePoints' z negation).
//
// Why this oracle, not a plain vertex average over the whole cross-section:
// BLADE_U puts five of the eight cycle points on the leading side (u <=
// 0.18) and only three on the trailing side (u >= 0.8), so a mean over all
// eight is permanently leading-biased regardless of handedness — and it is
// swamped by wing/sweepProfile.ts's measured sweep, which already carries
// the whole cross-section aft toward the tip on its own, untouched by this
// fix. Checked before writing this: no combination of the existing
// vertices' raw z ever reads red for this bug. The trailing-knife vertex
// (section.ts's `KNIFE` point, cycle 4) is a single, load-bearing, named
// landmark rather than an arbitrary pick — the blade's true aft chordwise
// extreme — so its position relative to that station's OWN measured sweep
// centreline isolates the master's chordwise handedness cleanly.
//
// Read straight off the built mesh's own geometry, before the rig's fold
// pivot repositions the rigid blade: fold's fixed per-pair sweep fan mixes
// span into world Z by metres at the tip — enough to swamp and even flip
// this signal depending on which of the four pairs is sampled. The master's
// own coordinate frame is what stays comparable across all eight wings,
// which is what "at rest" means for a defect that lives entirely in it.

import { describe, it, expect } from 'vitest'
import { Object3D } from 'three'
import type { Mesh } from 'three'
import { createOrnithopter } from '../Ornithopter'
import { SPAN_STATIONS, SECTION_POINTS } from './wingGeometry'
import { CYCLE_TO_SLOT } from './wing/section'
import { sweepOffsetAt } from './wing/sweepProfile'
import type { FlightState } from '../../contracts'

const TRAILING_KNIFE_SLOT = CYCLE_TO_SLOT[4]

function restState(): FlightState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -50 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    throttle: 0.5,
    speed: 50,
    altitude: 100,
    beatPhase: 0,
    beatHz: 2.6,
  }
}

/** Trailing-knife z, relative to its own station's measured sweep
 *  centreline, averaged over every station whose span fraction matches. */
function trailingKnifeBandZ(mesh: Mesh, predicate: (spanFraction: number) => boolean): number {
  const position = mesh.geometry.attributes.position
  let sum = 0
  let count = 0
  for (let station = 0; station < SPAN_STATIONS.length; station++) {
    const spanFraction = SPAN_STATIONS[station]
    if (!predicate(spanFraction)) continue
    const z = position.getZ(station * SECTION_POINTS + TRAILING_KNIFE_SLOT)
    sum += z - sweepOffsetAt(spanFraction)
    count++
  }
  expect(count).toBeGreaterThan(0)
  return sum / count
}

/** Outboard-15%-band vs 40-70%-band trailing-knife centroid, for the first
 *  `wing-blade` mesh found on the given side of the assembled craft. */
function bandCentroids(side: 'left' | 'right'): { outboard: number; mid: number } {
  const craft = createOrnithopter()
  craft.update(restState())
  let blade: Mesh | undefined
  ;(craft.root as unknown as Object3D).traverse((child) => {
    if (blade) return
    const mesh = child as Mesh
    if (mesh.name !== 'wing-blade') return
    const position = mesh.geometry.attributes.position
    const tipX = position.getX(position.count - SECTION_POINTS)
    if ((side === 'left' && tipX < 0) || (side === 'right' && tipX > 0)) blade = mesh
  })
  if (!blade) throw new Error(`no ${side} wing-blade mesh found`)
  const outboard = trailingKnifeBandZ(blade, (s) => s >= 0.85)
  const mid = trailingKnifeBandZ(blade, (s) => s >= 0.4 && s <= 0.7)
  craft.dispose()
  return { outboard, mid }
}

describe('wing blade chordwise handedness (user finding: doglegs curled toward the nose)', () => {
  it('trails the port outer wing tip aft of mid-span, not toward the nose', () => {
    const { outboard, mid } = bandCentroids('left')
    expect(outboard).toBeGreaterThan(mid)
  })

  it('mirrors the same aft-trailing handedness on the starboard outer wing', () => {
    const { outboard, mid } = bandCentroids('right')
    expect(outboard).toBeGreaterThan(mid)
  })
})
