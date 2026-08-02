// vehicle-shop/ornihopter/src/interior/panelParts.ts
// The round-6b instrument vocabulary — round gauge, nav globe, annunciator
// block, tape instrument, guarded toggle — lifted out of instruments.ts when
// round 9b turned that file into an assembly of a glass cockpit. These were the
// strongest element of the old panel ("every callout on the reference's
// instrument inset is a distinct SHAPE, and shape is what survives the
// distance") and they survive unchanged in kind, changed in SHARE: the gauges
// are now a standby cluster beside the MFDs rather than the whole dash, and the
// annunciator block and tapes are authored a size smaller so the displays
// dominate. Faces still come from dialFaces.ts as DataTextures.

import { Group, Mesh, SphereGeometry, type Texture } from 'three'
import { CONSOLE } from './layout'
import { box, cylinderY, type Placed } from './sceneUtils'
import { onPanel, uPer } from './panelMount'
import { gaugeTexture, navGlobeTexture, tapeTexture } from './dialFaces'
import {
  dialFaceMaterial, darkDialMaterial, machinedMaterial, machinedDarkMaterial,
  amberLitMaterial, redLitMaterial, oliveMaterial, ivoryMaterial, gunmetalMaterial,
} from './materials'

export interface GaugeSpec {
  needleDeg: number
  dangerFromDeg?: number
}

/** Round gauge: a dark bezel can with a textured face lying in it. The face
 *  mesh is named so a guard can count the analog dials in a cluster. */
export function gauge(
  group: Group,
  textures: Texture[],
  x: number,
  u: number,
  size: number,
  opts: GaugeSpec
): void {
  const face = gaugeTexture(opts)
  textures.push(face)
  const can = cylinderY(size * 0.62, size * 0.62, 0.05, machinedDarkMaterial(), { x: 0, y: 0, z: 0 }, 14)
  group.add(onPanel(can, x, u, 0.012))
  const plate = box(size, 0.012, size, dialFaceMaterial(face), { x: 0, y: 0, z: 0 })
  plate.name = 'analog-dial'
  group.add(onPanel(plate, x, u, 0.042))
}

/** The nav globe: a real sphere in a machined mount, graticule and all. */
export function navGlobe(group: Group, textures: Texture[], x: number, u: number, radius = 0.1): void {
  const map = navGlobeTexture()
  textures.push(map)
  const mount = cylinderY(radius * 1.3, radius * 1.48, 0.07, machinedMaterial(), { x: 0, y: 0, z: 0 }, 16)
  group.add(onPanel(mount, x, u, 0.02))
  const globe = new Mesh(new SphereGeometry(radius, 20, 14), dialFaceMaterial(map))
  group.add(onPanel(globe, x, u, radius * 0.74))
}

/**
 * The annunciator block: a grid of small lit tiles in a common frame, in the
 * reference's four colours. This is the one part of a cockpit that is a BLOCK
 * rather than a row, which is what makes it recognisable at a glance.
 */
export function annunciators(group: Group, x: number, u: number): void {
  const cols = 4
  const rows = 3
  const tile = 0.06
  const gap = 0.014
  const width = cols * tile + (cols - 1) * gap
  const height = rows * tile + (rows - 1) * gap
  group.add(onPanel(box(width + 0.04, 0.02, height + 0.04, darkDialMaterial(), { x: 0, y: 0, z: 0 }), x, u, 0.012))
  const palette = [amberLitMaterial, redLitMaterial, oliveMaterial, ivoryMaterial, amberLitMaterial, oliveMaterial]
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c - (cols - 1) / 2) * (tile + gap)
      const du = uPer(((rows - 1) / 2 - r) * (tile + gap))
      const material = palette[(r * cols + c) % palette.length]()
      group.add(onPanel(box(tile, 0.016, tile, material, { x: 0, y: 0, z: 0 }), x + dx, u + du, 0.03))
    }
  }
}

/** Vertical tape instrument. */
export function tape(group: Group, textures: Texture[], x: number, u: number, indexAt: number): void {
  const map = tapeTexture(indexAt)
  textures.push(map)
  group.add(onPanel(box(0.1, 0.018, 0.22, darkDialMaterial(), { x: 0, y: 0, z: 0 }), x, u, 0.012))
  group.add(onPanel(box(0.075, 0.012, 0.19, dialFaceMaterial(map), { x: 0, y: 0, z: 0 }), x, u, 0.032))
}

/**
 * Guarded toggles on the flat switch deck: a toggle, and over it the wire
 * guard the reference board calls out as SWITCH GUARD RAILS — two posts and a
 * bar. A bare nub is a nub; a nub under a rail is a switch you must not throw
 * by accident, which says military.
 */
export function guardedToggles(group: Group, xs: readonly number[], z: number): void {
  for (const x of xs) {
    const base: Placed = { x, y: CONSOLE.topY + 0.012, z }
    group.add(box(0.1, 0.025, 0.09, machinedDarkMaterial(), base))
    group.add(cylinderY(0.014, 0.02, 0.075, ivoryMaterial(), { x, y: CONSOLE.topY + 0.055, z }, 6))
    for (const side of [-1, 1] as const) {
      group.add(box(0.014, 0.1, 0.014, gunmetalMaterial(), { x: x + side * 0.05, y: CONSOLE.topY + 0.06, z }))
    }
    group.add(box(0.115, 0.014, 0.014, gunmetalMaterial(), { x, y: CONSOLE.topY + 0.107, z }))
  }
}
