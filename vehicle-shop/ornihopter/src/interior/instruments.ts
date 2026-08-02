// vehicle-shop/ornihopter/src/interior/instruments.ts
// What is ON the dash: round gauges with bezels and needles, a nav globe, an
// annunciator block, tape instruments and guarded toggles. Faces come from
// dialFaces.ts as DataTextures (no canvas — see that file's header); the
// shell they mount on is consoleShell.ts.
//
// FOUND, round 6b: "4 identical pastel slabs... no dials, no gauges, no
// needles, no nav globe, no annunciator stack". That was accurate. The dash
// carried three rows of 0.12 x 0.10 flat-coloured boxes alternating mint,
// salmon and black, which at cockpit distance is a row of tiles. Every callout
// on .shots/reference/thopter-03.jpg's instrument inset — the globe top-left,
// the gauge cluster under it, the block of coloured annunciator tiles, the
// guarded switches on their rails — is a distinct SHAPE, and shape is what
// survives the distance.
//
// Everything here mounts on the raked panel via `onPanel`, which converts a
// position along the panel's slope into craft coordinates and tilts the part
// to lie flush. Nothing is placed by eye at an absolute y.

import { Group, Mesh, SphereGeometry, type Texture } from 'three'
import { CONSOLE, seatX } from './layout'
import { PANEL_BREAK_Z, PANEL_PITCH, surfaceYAt } from './consoleShell'
import { box, cylinderY, disposeGroup, type Placed } from './sceneUtils'
import { gaugeTexture, navGlobeTexture, tapeTexture } from './dialFaces'
import {
  dialFaceMaterial, darkDialMaterial, machinedMaterial, machinedDarkMaterial,
  amberLitMaterial, redLitMaterial, oliveMaterial, ivoryMaterial, gunmetalMaterial,
} from './materials'

/** u runs 0 at the panel's lower (pilot-facing) edge to 1 at its top. */
function panelZ(u: number): number {
  return PANEL_BREAK_Z + (CONSOLE.farZ - PANEL_BREAK_Z) * u
}

function onPanel(mesh: Mesh, x: number, u: number, lift = 0.02): Mesh {
  const z = panelZ(u)
  mesh.position.set(x, surfaceYAt(z) + lift * Math.cos(PANEL_PITCH), z + lift * Math.sin(PANEL_PITCH))
  mesh.rotation.x = PANEL_PITCH
  return mesh
}

/** Round gauge: a dark bezel can with a textured face lying in it. */
function gauge(group: Group, textures: Texture[], x: number, u: number, size: number, opts: {
  needleDeg: number
  dangerFromDeg?: number
}): void {
  const face = gaugeTexture(opts)
  textures.push(face)
  const can = cylinderY(size * 0.62, size * 0.62, 0.05, machinedDarkMaterial(), { x: 0, y: 0, z: 0 }, 14)
  group.add(onPanel(can, x, u, 0.012))
  const plate = box(size, 0.012, size, dialFaceMaterial(face), { x: 0, y: 0, z: 0 })
  group.add(onPanel(plate, x, u, 0.042))
}

/** The nav globe: a real sphere in a machined mount, graticule and all. */
function navGlobe(group: Group, textures: Texture[], x: number, u: number): void {
  const map = navGlobeTexture()
  textures.push(map)
  const mount = cylinderY(0.15, 0.17, 0.07, machinedMaterial(), { x: 0, y: 0, z: 0 }, 16)
  group.add(onPanel(mount, x, u, 0.02))
  const globe = new Mesh(new SphereGeometry(0.115, 20, 14), dialFaceMaterial(map))
  group.add(onPanel(globe, x, u, 0.085))
}

/**
 * The annunciator block: a grid of small lit tiles in a common frame, in the
 * reference's four colours. This is the one part of a cockpit that is a BLOCK
 * rather than a row, which is what makes it recognisable at a glance.
 */
function annunciators(group: Group, x: number, u: number): void {
  const cols = 4
  const rows = 3
  const tile = 0.075
  const gap = 0.018
  const width = cols * tile + (cols - 1) * gap
  const height = rows * tile + (rows - 1) * gap
  group.add(onPanel(box(width + 0.05, 0.02, height + 0.05, darkDialMaterial(), { x: 0, y: 0, z: 0 }), x, u, 0.012))
  const palette = [amberLitMaterial, redLitMaterial, oliveMaterial, ivoryMaterial, amberLitMaterial, oliveMaterial]
  const uSpan = (height + gap) / (CONSOLE.nearZ - CONSOLE.farZ)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c - (cols - 1) / 2) * (tile + gap)
      const du = ((rows - 1) / 2 - r) * ((tile + gap) / (height + gap)) * uSpan
      const material = palette[(r * cols + c) % palette.length]()
      group.add(onPanel(box(tile, 0.016, tile, material, { x: 0, y: 0, z: 0 }), x + dx, u + du, 0.03))
    }
  }
}

/** Vertical tape instrument. */
function tape(group: Group, textures: Texture[], x: number, u: number, indexAt: number): void {
  const map = tapeTexture(indexAt)
  textures.push(map)
  group.add(onPanel(box(0.13, 0.018, 0.3, darkDialMaterial(), { x: 0, y: 0, z: 0 }), x, u, 0.012))
  group.add(onPanel(box(0.1, 0.012, 0.26, dialFaceMaterial(map), { x: 0, y: 0, z: 0 }), x, u, 0.032))
}

/**
 * Guarded toggles on the flat switch deck: a toggle, and over it the wire
 * guard the reference board calls out as SWITCH GUARD RAILS — two posts and a
 * bar. A bare nub is a nub; a nub under a rail is a switch you must not throw
 * by accident, which says military.
 */
function guardedToggles(group: Group, xs: readonly number[], z: number): void {
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

export interface Instruments {
  group: Group
  dispose(): void
}

export function buildInstruments(): Instruments {
  const group = new Group()
  group.name = 'instruments'
  const textures: Texture[] = []

  // PILOT SIDE, laid out from the pilot's OWN x rather than from absolute
  // numbers, so the cluster stays in front of the eye if the seat moves again
  // (it moved twice this round while the window was being measured).
  const p = seatX(-1)
  navGlobe(group, textures, p, 0.62)
  gauge(group, textures, p - 0.44, 0.6, 0.19, { needleDeg: -55, dangerFromDeg: 95 })
  gauge(group, textures, p - 0.4, 0.22, 0.17, { needleDeg: 30 })
  gauge(group, textures, p - 0.17, 0.2, 0.17, { needleDeg: -20, dangerFromDeg: 105 })
  gauge(group, textures, p + 0.06, 0.2, 0.17, { needleDeg: 75 })
  gauge(group, textures, p + 0.29, 0.2, 0.17, { needleDeg: -110 })
  annunciators(group, p + 0.5, 0.66)
  tape(group, textures, p + 0.78, 0.45, 0.62)
  tape(group, textures, p + 0.94, 0.45, 0.38)

  guardedToggles(group, [p - 0.5, p - 0.32, p - 0.14], CONSOLE.nearZ - 0.18)

  // COPILOT SIDE. Named as its own group so interior/frustum.test.ts can check
  // it independently of the rest of the dash.
  const c = seatX(1)
  const copilot = new Group()
  copilot.name = 'console-copilot-cluster'
  gauge(copilot, textures, c + 0.62, 0.6, 0.19, { needleDeg: 40, dangerFromDeg: 100 })
  gauge(copilot, textures, c + 0.5, 0.28, 0.17, { needleDeg: -70 })
  gauge(copilot, textures, c + 0.73, 0.28, 0.17, { needleDeg: 15 })
  annunciators(copilot, c + 0.98, 0.66)
  group.add(copilot)

  return {
    group,
    dispose() {
      disposeGroup(group)
      for (const t of textures) t.dispose()
    },
  }
}
