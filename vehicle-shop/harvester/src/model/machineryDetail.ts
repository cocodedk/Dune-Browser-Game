// vehicle-shop/harvester/src/model/machineryDetail.ts
// Deck-machinery detail helpers, split out of machinery.ts (I5) to keep both
// files under the 200-line cap once the deck grew two more hoppers, process
// pipes, edge railings and corner light masts: the blind panel's "reads as
// boulders", "functionless pipe cage" and "no scale cues" findings. Pure
// geometry; no scene access, no crawler state.

import { CylinderGeometry, Mesh, type BufferGeometry, type Group, type MeshStandardMaterial } from 'three'
import { BODY } from '../spec'
import { box, NOSE_DECK_STEPS } from './hullDetail'
import { roundedBox } from './rounded'

const DECK = BODY.deckTop

function cyl(
  geometries: BufferGeometry[], group: Group,
  rTop: number, rBottom: number, h: number, seg: number, mat: MeshStandardMaterial,
  x: number, y: number, z: number, name = '',
): void {
  const g = new CylinderGeometry(rTop, rBottom, h, seg)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = name
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
}

/** One processing hopper as an ENGINEERED VESSEL, not a boulder: a tapered
 *  body, a proud rim at the mouth, a reinforcing collar band (radius
 *  interpolated off the body's own taper, so it hugs the wall instead of
 *  floating), and three feet planting it on the deck. Every hopper in
 *  machinery.ts — old and new, whatever size — goes through this one
 *  builder so the family reads as one kind of thing.
 *
 *  I5 pass 2 (destination 2): feet used to sit at 0.78x the base radius —
 *  INSIDE the body's own widest point, so the tapered wall's silhouette
 *  always overhung them; from every named view they were entirely hidden
 *  behind the vessel's own base, which is why the round lost the "feet"
 *  claim despite the geometry existing. Feet now sit PAST the base radius
 *  (1.2x) so they poke out beyond the body's silhouette, like a real tank's
 *  splayed stands, wherever the sightline clears the vessel itself. */
export function buildHopper(
  geometries: BufferGeometry[], group: Group,
  bodyMat: MeshStandardMaterial, trimMat: MeshStandardMaterial,
  x: number, z: number, rTop: number, rBottom: number, h: number,
): void {
  cyl(geometries, group, rTop, rBottom, h, 8, bodyMat, x, DECK + h / 2, z, 'hopperBody')
  cyl(geometries, group, rTop + 0.3, rTop + 0.3, 0.3, 8, trimMat, x, DECK + h + 0.15, z, 'hopperRim')
  const collarF = 0.4
  const collarR = rBottom + (rTop - rBottom) * collarF
  cyl(geometries, group, collarR + 0.25, collarR + 0.25, 0.3, 8, trimMat, x, DECK + h * collarF, z, 'hopperCollar')
  const footR = rBottom * 1.2
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3
    box(geometries, group, 0.55, 0.35, 0.55, trimMat, x + Math.cos(a) * footR, DECK + 0.175, z + Math.sin(a) * footR, 'hopperFoot')
  }
}

/** A straight dark pipe run along Z — the process flow the deck was
 *  missing, threading past the hoppers toward the tail tower. */
export function buildPipeZ(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial,
  x: number, y: number, zFrom: number, zTo: number, radius: number,
): void {
  const g = new CylinderGeometry(radius, radius, zTo - zFrom, 8)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = 'processPipe'
  m.rotation.x = Math.PI / 2
  m.position.set(x, y, (zFrom + zTo) / 2)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
}

/** A pipe angled between two points sharing the same X — the gantry's own
 *  job, a drop from the winch down into the discharge bin. Single-axis
 *  rotation, the same trick cutter.ts's rams use: rotation.x sends the
 *  cylinder's own +Y to (0, cos t, sin t), and atan2(dz, dy) lays that axis
 *  along the YZ-plane vector from p0 to p1. */
export function buildPipeBetween(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial, radius: number,
  p0: readonly [number, number, number], p1: readonly [number, number, number],
): void {
  const dy = p1[1] - p0[1]
  const dz = p1[2] - p0[2]
  const len = Math.hypot(dy, dz)
  const g = new CylinderGeometry(radius, radius, len, 8)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = 'gantryDrop'
  m.position.set((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2)
  m.rotation.x = Math.atan2(dz, dy)
  m.castShadow = true
  group.add(m)
}

/** Rail height above the deck — read by machinery.test.ts so the ~1m
 *  correctness question is pinned against the same number the geometry
 *  actually uses, not a copied literal. */
export const RAIL_HEIGHT = 1.0
const RAIL_MID = 0.5
const RAIL_POST_SPACING = 3.8

/** A run of thin posts plus two horizontal bars along one open deck edge —
 *  a walkable platform's railing, not an open drop. deckY defaults to the
 *  normal deck top; a stepped nose plate passes its own lower top so the
 *  rail never floats above a plate that has dropped out from under it. */
export function buildRailRun(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial,
  x: number, zStart: number, zEnd: number, deckY: number = DECK,
): void {
  const len = zEnd - zStart
  const zMid = (zStart + zEnd) / 2
  box(geometries, group, 0.13, 0.1, len, mat, x, deckY + RAIL_HEIGHT, zMid, 'deckRailTop')
  box(geometries, group, 0.13, 0.1, len, mat, x, deckY + RAIL_MID, zMid, 'deckRailMid')
  const count = Math.max(2, Math.round(len / RAIL_POST_SPACING))
  for (let i = 0; i <= count; i++) {
    const z = zStart + (len * i) / count
    box(geometries, group, 0.13, RAIL_HEIGHT, 0.13, mat, x, deckY + RAIL_HEIGHT / 2, z, 'deckRailPost')
  }
}

/** Where the deck's foremost plate steps down (hullDetail.ts NOSE_DECK_STEPS
 *  applies to plate 0, spanning noseZ..noseZ+segLen; segLen = 48/5 = 9.6
 *  from hullDetail's own SEAM_COUNT=4, so the boundary is noseZ + 9.6). Kept
 *  here, not imported, because hullDetail exports the STEP HEIGHT but not
 *  this boundary — deriving it from the same SEAM_COUNT assumption hull.ts
 *  itself uses, so a future change to hull's plate count is the one place
 *  that would need this constant revisited too. */
const NOSE_PLATE_BOUNDARY_Z = BODY.noseZ + (BODY.tailZ - BODY.noseZ) / 5

/** The TRUE outer deck edge railing (destination 3): pass 1's rail wrapped
 *  an inboard run starting at the cab's own rear face (z -11.5), leaving
 *  the stretch alongside and ahead of the cab — verified bare by a direct
 *  crop of side.png, open sky with nothing in it — unrailed. This run spans
 *  the hull's own "open mid-section" bounds (BODY.noseBlockAftZ to
 *  BODY.tailBlockForeZ, the same two constants hull.ts's flank panels and
 *  underframe web already use to mean "open deck"), split at the nose
 *  plate's step so the forward sliver rides the LOWER plate top instead of
 *  floating above it. */
export function buildOuterRailRun(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial,
  x: number, noseBlockAftZ: number, tailBlockForeZ: number,
): void {
  buildRailRun(geometries, group, mat, x, noseBlockAftZ, NOSE_PLATE_BOUNDARY_Z, NOSE_DECK_STEPS[0])
  buildRailRun(geometries, group, mat, x, NOSE_PLATE_BOUNDARY_Z, tailBlockForeZ)
}

/** A thin light mast with a dark head — cheap scale cue at a deck corner. */
export function buildLightMast(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial,
  x: number, z: number,
): void {
  const height = 4.0
  cyl(geometries, group, 0.15, 0.18, height, 8, mat, x, DECK + height / 2, z, 'lightMastPole')
  box(geometries, group, 0.6, 0.45, 0.6, mat, x, DECK + height + 0.225, z, 'lightMastHead')
}

/** The discharge chute (destination 5): the discharge hopper sits right
 *  above the tail housing's own rounded rear corner (hull.ts, read-only) —
 *  from rear34 that corner reads as a bare tan ramp with no mechanism
 *  explaining it. Two failed placements first: centred INSIDE the
 *  housing's own box (x -8..8, y 6..12, z 19..24) rendered completely
 *  invisible, swallowed inside that opaque solid; reaching 2.5m past
 *  BODY.tailZ (24) to clear it broke assembled-footprint.test.ts's 60m pin
 *  (a lead-owned, cross-cutting invariant, not this file's to move). This
 *  one is short and steep, entirely past z=24 by under a metre — small
 *  enough to stay inside that pin's own +-2m slack while still being a
 *  real, fully external, fully rendered spout. rotation.x here is POSITIVE
 *  (opposite of the conveyor's beltTilt in machinery.ts), which sends the
 *  +Z end DOWN, not up — the direction this chute needs, toward the ground
 *  aft. */
export function buildDischargeChute(
  geometries: BufferGeometry[], group: Group, mat: MeshStandardMaterial,
  x: number, y: number, z: number, tilt: number,
): void {
  const g = roundedBox(2.2, 0.5, 1.6, 0.15)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = 'dischargeChute'
  m.position.set(x, y, z)
  m.rotation.x = tilt
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
}
