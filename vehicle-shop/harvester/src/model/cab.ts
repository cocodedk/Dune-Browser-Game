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

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY, CAB } from '../spec'
import { roundedBox } from './rounded'

export interface CabParts {
  group: Group
  dispose(): void
}

export function buildCab(
  bodyMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
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
  rbox(halfW * 2, 1.4, halfD * 2, 0.6, bodyMaterial, 0, cabBottom + 0.7, zCenter)
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

  rbox(halfW * 2 + 0.6, 0.5, halfD * 2 + 0.6, 0.2, bodyMaterial, 0, roofTop - 0.25, zCenter)

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

  // A small antenna poking above the roof — cheap scale cue. Kept short so
  // the machine's overall height stays inside OVERALL.height + 2.
  const antenna = new CylinderGeometry(0.08, 0.08, 1.6, 6)
  geometries.push(antenna)
  const antennaMesh = new Mesh(antenna, accentMaterial)
  antennaMesh.position.set(2.5, roofTop + 0.4, zCenter - 1)
  antennaMesh.castShadow = true
  group.add(antennaMesh)

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
