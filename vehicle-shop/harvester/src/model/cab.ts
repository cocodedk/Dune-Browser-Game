// vehicle-shop/harvester/src/model/cab.ts
// COMPONENT 4 — the control cab: a squat two-step body wrapped in a
// continuous dark glass band (full width across the front, halfway down
// each side — no mullions, a cockpit not a slot), a roof rack, a rear
// boarding ladder, and a small antenna. No interior by design. Reads
// spec.CAB.
//
// I4 (immediate-improvements §4): a blind panel read "no visible cab or
// windows / no crew space" at the old 7 m width with a 3-mullion slot.
// The lead widened CAB.halfWidth 3.5 -> 5.5; this pass makes the glass a
// true wrap and adds the roof rack and rear ladder the panel also asked
// for. The old front-glass slant is dropped: a rotated plane's corners
// don't sit flush with an unrotated side panel, and a flush corner is what
// makes the wrap read continuous instead of two panes with a gap.
//
// I7 (immediate-improvements §9): the antenna gained a subtle SWAY driven
// by speed. See antennaSwayAngle below for why it is exactly zero at rest
// and bounded no matter how hard the machine drives.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY, CAB } from '../spec'
import { roundedBox } from './rounded'
import { wrapMod } from './beltPhase'
import { forwardSpeedOf } from './cutterDetail'
import { MAX_SPEED } from '../crawler/constants'

/** Cheap and alive, never busy: a phase that advances at a FIXED rate (so
 *  the sway has a natural rhythm) but an AMPLITUDE of 0 at rest and capped
 *  at ANTENNA_SWAY_MAX regardless of how far past MAX_SPEED the two tracks
 *  are driven — "subtle... bounded at max speed", the round's own words. */
export const ANTENNA_SWAY_MAX = 0.1
export const ANTENNA_SWAY_RATE = 2 * Math.PI * 0.6 // ~0.6 Hz, rad/s
const ANTENNA_SWAY_CYCLE = 2 * Math.PI

/** Advances only by dt — no wall clock, no speed dependence of its own — so
 *  a paused debug tick(dt) is exactly reproducible like every other phase
 *  in this shop. */
export function advanceAntennaPhase(phase: number, dt: number): number {
  return wrapMod(phase + ANTENNA_SWAY_RATE * dt, ANTENNA_SWAY_CYCLE)
}

/** forwardSpeedOf is the same helper the cutter's drum reads (cutterDetail
 *  .ts): the mean of the two signed track speeds, which is exactly what the
 *  paused debug handle's drive() sets. Zero at rest by construction (both
 *  track speeds 0 -> amplitude 0, whatever the phase); the min() caps the
 *  amplitude at ANTENNA_SWAY_MAX past MAX_SPEED instead of growing further. */
export function antennaSwayAngle(phase: number, trackLeft: number, trackRight: number): number {
  const speed = Math.abs(forwardSpeedOf(trackLeft, trackRight))
  if (speed <= 0) return 0
  const amplitude = ANTENNA_SWAY_MAX * Math.min(speed / MAX_SPEED, 1)
  return amplitude * Math.sin(phase)
}

export interface CabParts {
  group: Group
  /** Sway the antenna from the crawler's signed track speeds — zero at
   *  rest, bounded at max speed. */
  update(trackLeft: number, trackRight: number, dt: number): void
  dispose(): void
}

/** I6 material wiring, no geometry: `trimMaterial` (spec.TRIM_COLOR) takes the
 *  cab's SILL and its ROOF CAP — the two bands that already sandwich the dark
 *  wrap glass. Together they are the window frame the round asks for, without
 *  a new mesh: the sill spans deck+0..deck+1.4 and the glass starts at
 *  deck+1.3; the cap spans roof-0.5..roof and the glass ends at roof-0.3. A
 *  light band immediately above and below a dark band is a framed window from
 *  any distance, and it is what tells the eye this box is the command station
 *  and not another deck fixture — the I4 panel's finding. Defaults to accent
 *  so the cab's bounding tests build the same geometry as before. */
export function buildCab(
  bodyMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
  trimMaterial: MeshStandardMaterial = accentMaterial,
): CabParts {
  const group = new Group()
  group.name = 'cab'
  const geometries: BufferGeometry[] = []

  const box = (
    w: number, h: number, d: number, mat: MeshStandardMaterial,
    x: number, y: number, z: number, name?: string,
  ): Mesh => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    if (name) m.name = name
    group.add(m)
    return m
  }

  const rbox = (w: number, h: number, d: number, radius: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = roundedBox(w, h, d, radius)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const halfW = CAB.halfWidth
  const halfD = CAB.halfDepth
  const cabBottom = BODY.deckTop
  const roofTop = CAB.topY
  const zCenter = CAB.zCenter

  // Lower body, then the upper band holding the glass — the two-step read.
  // Rounded: the cab is a heavy industrial mass, not a crate.
  rbox(halfW * 2, 1.4, halfD * 2, 0.6, trimMaterial, 0, cabBottom + 0.7, zCenter)
  const wallHalfD = halfD - 0.3
  rbox(halfW * 2 + 0.3, roofTop - cabBottom - 1.4, wallHalfD * 2, 0.5, bodyMaterial, 0, (roofTop + cabBottom + 1.4) / 2, zCenter)

  // FULL-WIDTH WRAP GLASS — one dark band across the entire front face,
  // continuing around the corner and halfway down each side. Flat (no
  // slant, no mullions) so front and side panes meet flush at the corner.
  const wallFrontZ = zCenter - wallHalfD
  const wallHalfW = halfW + 0.15
  const glassY = cabBottom + 2.0
  const glassH = 1.4
  box(wallHalfW * 2, glassH, 0.2, darkMaterial, 0, glassY, wallFrontZ - 0.1, 'cabGlassFront')
  const sideDepth = halfD // half of the cab's total depth (2 * halfDepth)
  for (const side of [-1, 1] as const) {
    box(0.2, glassH, sideDepth, darkMaterial, side * (wallHalfW + 0.1), glassY, wallFrontZ + sideDepth / 2, 'cabGlassSide')
  }

  rbox(halfW * 2 + 0.6, 0.5, halfD * 2 + 0.6, 0.2, trimMaterial, 0, roofTop - 0.25, zCenter)

  // ROOF DETAIL — an equipment box so the flat roof doesn't read empty.
  // Offset from the antenna (x=2.5) so the two never intersect.
  box(3.0, 0.6, 2.0, darkMaterial, -1.5, roofTop + 0.3, zCenter + 0.3, 'roofRack')

  // ACCESS — a short ladder on the REAR face (+Z, away from the cutter at
  // -Z) reaching down to within half a metre of the deck: somewhere a crew
  // member could actually board from.
  const ladderZ = zCenter + halfD + 0.075
  const rungYs = [cabBottom + 0.3, cabBottom + 0.7, cabBottom + 1.1, cabBottom + 1.5]
  for (const y of rungYs) {
    box(1.2, 0.12, 0.15, darkMaterial, 0, y, ladderZ, 'ladderRung')
  }

  // A small antenna poking above the roof — cheap scale cue, and (I7) a
  // subtle sway with speed. Pivoted at its ROOF-LEVEL base, not its own
  // centre, so update() bends it like a whip antenna rather than spinning
  // it around its own middle. The pivot's world position (and so the
  // mesh's, before any sway) is identical to the old single-mesh version:
  // base at roofTop + 0.4 - height/2, mesh offset back up by height/2.
  const antennaHeight = 1.6
  const antennaPivot = new Group()
  antennaPivot.name = 'antennaPivot'
  antennaPivot.position.set(2.5, roofTop + 0.4 - antennaHeight / 2, zCenter - 1)
  group.add(antennaPivot)
  const antenna = new CylinderGeometry(0.08, 0.08, antennaHeight, 6)
  geometries.push(antenna)
  const antennaMesh = new Mesh(antenna, accentMaterial)
  antennaMesh.position.set(0, antennaHeight / 2, 0)
  antennaMesh.castShadow = true
  antennaPivot.add(antennaMesh)

  let antennaPhase = 0

  return {
    group,
    update(trackLeft, trackRight, dt) {
      antennaPhase = advanceAntennaPhase(antennaPhase, dt)
      antennaPivot.rotation.z = antennaSwayAngle(antennaPhase, trackLeft, trackRight)
    },
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
