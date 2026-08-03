// vehicle-shop/ornihopter/src/model/geometry/wingChordHandedness.test.ts
// The user's rule, their words: a wing is a knife. The dull thick spine
// edge points FORWARD into the wind; the sharp curved cutting edge points
// REARWARD. Two independent places can get this backwards, and round 6e
// (commit ea4d2b5) fixed the wrong one.
//
// SECTION (wing/section.ts): which end of one station's cross-section — the
// rail (thick, dull) or the knife (thin, sharp) — sits toward -z (nose) vs
// +z (aft). ea4d2b5 negated this and got it backwards (rail aft, knife
// forward); reverted this round. Assertion (a) below.
//
// PLANFORM (wing/sweepProfile.ts): the SIGN of the measured centreline bow
// sweepOffsetAt applies. LEAD measurement off
// docs/profiles/wing-planform.json: the upper plate edge (offset+chord/2)
// has stdev 0.0099 over mid-span — essentially straight, the spine — the
// lower edge (offset-chord/2) has stdev 0.1912 — the curved knife edge.
// Under the old (un-negated) sign the straight spine traced the AFT edge of
// the assembled wing and the curved knife traced the NOSE edge: backwards.
// Fixed this round by negating sweepOffsetAt once. Assertion (b) below.
//
// The two are orthogonal by construction: (a) compares two vertices at ONE
// station, so the centreline every vertex there shares cancels out of the
// comparison — it can only ever see section.ts's own chord mapping. (b)
// takes, at each station, whichever of the section's two chordwise extremes
// is smaller/larger — not a fixed cycle index — so it reads the same
// envelope (centreline +/- half chord) regardless of which physical vertex
// section.ts currently assigns to which end. Verified empirically: with the
// tree as ea4d2b5 left it, (a) is red; reverting section.ts alone flips (a)
// green and leaves (b) red; only negating sweepOffsetAt afterward turns (b)
// green too. See this round's report for the numbers at each step.
//
// Read straight off the built mesh's own geometry, before the rig's fold
// pivot repositions the rigid blade: fold's fixed per-pair sweep fan mixes
// span into world Z by metres at the tip, which would swamp both signals.

import { describe, it, expect } from 'vitest'
import { Object3D } from 'three'
import type { Mesh } from 'three'
import { createOrnithopter } from '../Ornithopter'
import { SPAN_STATIONS, SECTION_POINTS } from './wingGeometry'
import { CYCLE_TO_SLOT } from './wing/section'
import type { FlightState } from '../../contracts'

/** BLADE_U's own labels (wing/section.ts): cycle 0 is the leading/nose
 *  chordwise extreme, cycle 1 the rail crest just aft of it, cycle 4 the
 *  trailing knife — the aft chordwise extreme. */
const NOSE_TIP_SLOT = CYCLE_TO_SLOT[0]
const RAIL_CREST_SLOT = CYCLE_TO_SLOT[1]
const KNIFE_SLOT = CYCLE_TO_SLOT[4]

function stationNear(target: number): number {
  let best = 0
  let bestDistance = Infinity
  SPAN_STATIONS.forEach((spanFraction, index) => {
    const distance = Math.abs(spanFraction - target)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

/** One representative midspan station: past the rod/blade flare (FLARE_END
 *  = 0.2059 in section.ts) so the section is pure blade. */
const MIDSPAN_STATION = stationNear(0.45)

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

/** The first `wing-blade` mesh found on the given side of the assembled craft. */
function bladeOn(side: 'left' | 'right'): Mesh {
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
  return blade
}

function stdev(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Over the mid-80% of span (excludes the outer/inner 10%), the built
 *  mesh's own leading (smaller z) and trailing (larger z) chordwise extreme
 *  at each station — min/max, not a fixed cycle index, so this isolates the
 *  planform sign alone (see header). */
function edgeTraces(mesh: Mesh): { leading: number[]; trailing: number[] } {
  const position = mesh.geometry.attributes.position
  const leading: number[] = []
  const trailing: number[] = []
  for (let station = 0; station < SPAN_STATIONS.length; station++) {
    const spanFraction = SPAN_STATIONS[station]
    if (spanFraction < 0.1 || spanFraction > 0.9) continue
    const nose = position.getZ(station * SECTION_POINTS + NOSE_TIP_SLOT)
    const knife = position.getZ(station * SECTION_POINTS + KNIFE_SLOT)
    leading.push(Math.min(nose, knife))
    trailing.push(Math.max(nose, knife))
  }
  expect(leading.length).toBeGreaterThan(0)
  return { leading, trailing }
}

const SIDES = ['left', 'right'] as const

for (const side of SIDES) {
  const label = side === 'left' ? 'port' : 'starboard'
  describe(`${label} wing, the knife rule (dull spine forward, sharp curved edge aft)`, () => {
    it('section: the trailing knife sits aft of the leading rail crest, in blade-local z', () => {
      const position = bladeOn(side).geometry.attributes.position
      const knifeZ = position.getZ(MIDSPAN_STATION * SECTION_POINTS + KNIFE_SLOT)
      const railZ = position.getZ(MIDSPAN_STATION * SECTION_POINTS + RAIL_CREST_SLOT)
      expect(knifeZ).toBeGreaterThan(railZ)
    })

    it('planform: the straight spine leads, the curved cutting edge trails', () => {
      const { leading, trailing } = edgeTraces(bladeOn(side))
      expect(stdev(leading)).toBeLessThan(stdev(trailing))
    })
  })
}
