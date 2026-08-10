// landscape-shop/cliff/src/model/surface.ts
// R2's single integration point: everything lit in the set gets its surface
// here, after the geometry exists and before anything is rendered.
//
// One place, on purpose. The builders each own a shape (massif, prow, socket,
// skirt) and none of them should have to know the geology; keeping the paint
// out of them also leaves model/socket.ts at the size it already is. The list
// below is therefore the whole inventory of lit rock in the set — if a mesh
// is not named here it is either the unlit mouth interior (model/socketTone.ts
// owns that) or it does not exist.

import type { Group, Mesh, Object3D } from 'three'
import { paintFaces, paintVertices, useVertexColors, type HaloAt } from './paintRock'
import { planeForTriangle, HERO_PLANE, COURSE_M } from './strata'
import { socketRadius } from './gateWall'
import { paintDressing } from './dressTone'

/** Rock the sietch's own traffic has darkened. socketRadius is 1 exactly on
 *  the aperture's edge, so the halo runs from the rim out to about twice the
 *  mouth's radius and is gone by then.
 *
 *  Kept TIGHT and shallow on purpose. A first pass ran it to 2.4 mouth-radii
 *  at nearly half strength; measured on the rendered landing frame it dropped
 *  the whole wall around the gate from 65 to 50 of 255, which reads as a
 *  stain across the prow rather than as wear at a doorway. A rim is a rim.
 *
 *  Its edge is BROKEN ON THE BEDDING, like every other weathering boundary in
 *  the set (model/weathering.ts's beddedHeight). A clean radial falloff round
 *  the mouth was one of the smooth gradients the R2 landing critic read as an
 *  airbrush; soot climbing the wall in half-course steps is not. */
const HALO_INNER = 1
const HALO_OUTER = 1.9
const gateHalo: HaloAt = (x, y) => {
  const step = COURSE_M / 2
  const broken = Math.round((y + 2.2 * Math.sin(x * 0.19 + 0.7)) / step) * step
  const t = (HALO_OUTER - socketRadius(x, broken)) / (HALO_OUTER - HALO_INNER)
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/** Everything cut into or piled against the hero mass carries the HERO
 *  bedding: the prow, the mouth's own lit rim, and the skirt going under the
 *  sand. Sharing one plane is what lines their courses up with the baked rock
 *  behind them instead of leaving a colour seam down the join.
 *
 *  FLAT ones are painted per face, because they are flat-shaded (grid.
 *  flatShade) and a flat-shaded facet wants one flat colour: band edges then
 *  land on facet edges, which is how a low-poly cliff reads as bedded rock
 *  instead of a smudged gradient. The skirt bands keep their per-vertex
 *  gradient — they are smooth-shaded sand, and sand has no facets. */
const FLAT_SURFACES: Array<{ name: string; halo: boolean }> = [
  { name: 'gateWall', halo: true },
  { name: 'gateLip', halo: true },
]
const SMOOTH_SURFACES = ['skirtRock', 'sandApron']

const heroPlaneAt = (): typeof HERO_PLANE => HERO_PLANE

export function surfaceCliff(root: Group): void {
  const massif = root.getObjectByName('massif') as Mesh | null
  if (!massif) throw new Error('massif mesh missing — nothing to surface')
  paintFaces(massif.geometry, planeForTriangle)
  useVertexColors(massif)

  for (const { name, halo } of FLAT_SURFACES) {
    const mesh = find(root, name)
    paintFaces(mesh.geometry, heroPlaneAt, halo ? gateHalo : undefined)
    useVertexColors(mesh)
  }

  for (const name of SMOOTH_SURFACES) {
    const mesh = find(root, name)
    paintVertices(mesh.geometry, HERO_PLANE)
    useVertexColors(mesh)
  }

  // R3's dressing is the one part of the set this file does not paint itself.
  // Its three families want three different rules — flat rock, smooth sand and
  // an UNLIT stack of cargo inside the mouth — and folding them in here would
  // put this file past the 200-line rule. It stays the single integration
  // point: nothing else calls model/dressTone.ts.
  paintDressing(root)
}

function find(root: Object3D, name: string): Mesh {
  const mesh = root.getObjectByName(name) as Mesh | null
  if (!mesh) throw new Error(`surface: ${name} is missing from the set`)
  return mesh
}
