// character-shop/duncan/src/model/loft.ts
// Skins a station table (stations.ts) into ONE continuous surface: rings of
// vertices swept along the path, stitched, capped, and normal-smoothed as a
// single mesh. This is the only way a body region is allowed to be built in
// this shop — pass 4's method change. A torso is one loft; an arm from
// deltoid to wrist is one loft; a leg from hip to ankle is one loft. The
// stacked-cylinder assembly it replaces could not do the two things that
// make a figure read as flesh: it stepped at every seam, and it capped each
// segment with a flat disc — the "tabletop shoulder" a critic named.
//
// The ring is an EGG, not a circle: rz eases from rb at the back to rf at
// the front across the section, so a chest can project forward while the
// back stays broad and flat. It is C1-continuous at the sides (both the
// value and its slope match at theta = +/-PI/2), so no crease runs down the
// flanks.
//
// radialSegments defaults to a multiple of 4, which puts a real vertex
// exactly on +/-X: the measured half-width proportions.test.ts reads is then
// the authored radius, with none of the polygon shortfall that used to eat
// the width budget.

import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import type { MeshStandardMaterial, Object3D } from 'three'
import { profileAt } from './stations'
import type { Profile, Station } from './stations'
import type { Bin } from './primitives'

export interface LoftOptions {
  /** Rings sampled along the path. More = smoother curvature, not more form. */
  rings?: number
  radial?: number
  /** Rounded end caps, given as the HEIGHT the dome adds past the last
   *  station — absolute, so a table can be authored to land its crown or its
   *  chin on an exact landmark. 0 leaves a flat cap. */
  domeTopH?: number
  domeBottomH?: number
  /** A flat cap's centre vertex, raised out of the plane — the collar rim
   *  where the neck comes through the fatigues reads as a hem, not a lid. */
  topCapRise?: number
  /** Stature-metre tables minus the owning group's own world height. */
  originY?: number
}

const DOME_STEPS = 4

function ring(p: Profile, y: number, scale: number, radial: number, out: number[]): void {
  for (let i = 0; i < radial; i++) {
    const theta = (i / radial) * Math.PI * 2
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    const rz = (p.rb * (1 + c) + p.rf * (1 - c)) / 2
    out.push(p.cx + p.rx * scale * s, y, p.cz + rz * scale * c)
  }
}

function stitch(rings: number, radial: number, index: number[]): void {
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < radial; i++) {
      const next = (i + 1) % radial
      const a = j * radial + i
      const b = j * radial + next
      const c = (j + 1) * radial + next
      const d = (j + 1) * radial + i
      index.push(a, b, c, a, c, d)
    }
  }
}

/** Rings for one rounded end: a quarter-ellipse of height `h`, shrinking the
 *  section to nothing at the apex. The apex vertex itself is pushed by the
 *  caller so the fan can be wound per end. */
function domeRings(p: Profile, y0: number, h: number, radial: number, out: number[]): number {
  for (let k = 1; k < DOME_STEPS; k++) {
    const phi = (k / DOME_STEPS) * (Math.PI / 2)
    ring(p, y0 + h * Math.sin(phi), Math.cos(phi), radial, out)
  }
  return DOME_STEPS - 1
}

export function loft(
  bin: Bin, parent: Object3D, stations: Station[], material: MeshStandardMaterial,
  name: string, options: LoftOptions = {},
): Mesh {
  const radial = options.radial ?? 32
  const ringCount = options.rings ?? 40
  const originY = options.originY ?? 0
  const domeBottomH = options.domeBottomH ?? 0
  const domeTopH = options.domeTopH ?? 0
  const position: number[] = []
  const index: number[] = []

  const first = profileAt(stations, 0)
  const last = profileAt(stations, stations.length - 1)
  const firstY = first.y - originY
  const lastY = last.y - originY

  // Bottom cap rings run from the apex UP to the first station, so ring 0 is
  // always the lowest ring and stitch() never has to know which end it is on.
  let rings = 0
  if (domeBottomH > 0) {
    for (let k = DOME_STEPS - 1; k >= 1; k--) {
      const phi = (k / DOME_STEPS) * (Math.PI / 2)
      ring(first, firstY - domeBottomH * Math.sin(phi), Math.cos(phi), radial, position)
      rings++
    }
  }
  for (let r = 0; r < ringCount; r++) {
    const p = profileAt(stations, (r / (ringCount - 1)) * (stations.length - 1))
    ring(p, p.y - originY, 1, radial, position)
    rings++
  }
  if (domeTopH > 0) rings += domeRings(last, lastY, domeTopH, radial, position)
  stitch(rings, radial, index)

  // Both ends close on a single apex: the dome's pole, or a flat cap's
  // centre. Winding is mirrored between them so both faces point outward.
  const bottomApex = rings * radial
  position.push(first.cx, firstY - domeBottomH, first.cz)
  const topApex = bottomApex + 1
  position.push(last.cx, lastY + (domeTopH || options.topCapRise || 0), last.cz)
  const top = (rings - 1) * radial
  for (let i = 0; i < radial; i++) {
    const next = (i + 1) % radial
    index.push(i, bottomApex, next)
    index.push(top + i, top + next, topApex)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  bin.push(geometry)
  const mesh = new Mesh(geometry, material)
  mesh.name = name
  parent.add(mesh)
  return mesh
}
