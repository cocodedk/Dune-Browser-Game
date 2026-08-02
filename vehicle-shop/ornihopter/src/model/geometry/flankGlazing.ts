// vehicle-shop/ornihopter/src/model/geometry/flankGlazing.ts
// The OUTSIDE of the Apache side panes: the glass that fills hullFlankCut.ts's
// opening, and the trim that frames it.
//
// It is built here and added by canopyGeometry.ts's buildCanopy() rather than
// as its own model part, for two reasons that are really one: the panes belong
// to the same GLAZING FAMILY as the deck lens — same tint, same frame tone,
// one material pair for both — and every raycast harness in the shop already
// takes `[cockpit.root, canopy.group]` as the airframe. A pane hung anywhere
// else would be invisible to the zero-escape contract, which is exactly the
// class of hole interior/enclosure.test.ts exists to catch.
//
// THE PANE IS RECESSED, like the deck panel's glazing strip: the glass sits
// GLASS_RECESS inboard of the skin, so the cut edge of the flank stands proud
// of it all the way round and the opening reads as a machined rebate with a
// pane in it. Laid flush it read as a sticker; laid proud it reads as a
// blister. The trim strips then lie just outboard of the skin along all four
// edges and on the hull's own station breaks, THIN on purpose — the user asked
// for thinner frames in the same breath as the panes.

import {
  BufferGeometry, BufferAttribute, Group, Mesh, Vector3, type Material,
} from 'three'
import {
  WINDOW_FORE_Z, WINDOW_AFT_Z, flankWindowEdgeAt, flankMullionZs,
} from './flankWindow'

/** How far inboard of the skin the glass sits. */
const GLASS_RECESS = 0.05
/** How far outboard of the skin the trim strips stand. */
const TRIM_PROUD = 0.02
/** Trim width, measured across the strip on the flank surface. THIN: the
 *  canopy's own aperture rails are 0.09 and the user's ruling asks for less
 *  than that here. */
const TRIM_W = 0.055

type Sign = 1 | -1
const SIDES: readonly Sign[] = [1, -1]

function facet(points: readonly Vector3[]): BufferGeometry {
  const array = new Float32Array(points.length * 3)
  points.forEach((p, i) => array.set([p.x, p.y, p.z], i * 3))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(array, 3))
  geometry.computeVertexNormals()
  return geometry
}

const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3): BufferGeometry =>
  facet([a, b, c, a, c, d])

/** Corner of the opening at (z, side), with a lateral offset: negative is
 *  inboard (the recess), positive outboard (the trim). `t` slides between the
 *  sill corner (0) and the header corner (1) along the cut edge. */
function corner(z: number, sign: Sign, t: number, offset: number): Vector3 | null {
  const edge = flankWindowEdgeAt(z)
  if (!edge) return null
  const x = edge.low.x + (edge.high.x - edge.low.x) * t
  const y = edge.low.y + (edge.high.y - edge.low.y) * t
  return new Vector3(sign * (x + offset), y, z)
}

/** Stations the panes and trim are built over: the opening's ends plus the
 *  hull breaks inside it, so a pane edge always lands on real structure. */
function paneStations(): number[] {
  return [WINDOW_FORE_Z, ...flankMullionZs(), WINDOW_AFT_Z]
}

export interface FlankGlazing {
  group: Group
  geometries: BufferGeometry[]
}

/**
 * Both flanks' panes and trim, using the canopy's own glass and frame
 * materials so the family is literally shared rather than matched by eye.
 */
export function buildFlankGlazing(glass: Material, frame: Material): FlankGlazing {
  const group = new Group()
  group.name = 'flankGlazing'
  const geometries: BufferGeometry[] = []

  const add = (geometry: BufferGeometry, material: Material): void => {
    geometries.push(geometry)
    group.add(new Mesh(geometry, material))
  }
  /** A band of surface between two t values, across one bay. */
  const band = (
    zA: number, zB: number, sign: Sign, t0: number, t1: number, offset: number, material: Material
  ): void => {
    const a0 = corner(zA, sign, t0, offset)
    const a1 = corner(zA, sign, t1, offset)
    const b0 = corner(zB, sign, t0, offset)
    const b1 = corner(zB, sign, t1, offset)
    if (!a0 || !a1 || !b0 || !b1) return
    add(quad(a0, a1, b1, b0), material)
  }

  const stations = paneStations()
  for (const sign of SIDES) {
    for (let i = 0; i < stations.length - 1; i++) {
      const zA = stations[i]
      const zB = stations[i + 1]
      // The pane: one flat plate per bay, edge to edge of the opening.
      band(zA, zB, sign, 0, 1, -GLASS_RECESS, glass)
      // Sill and header trim, lying on the cut edge.
      band(zA, zB, sign, 0, 0.055, TRIM_PROUD, frame)
      band(zA, zB, sign, 0.945, 1, TRIM_PROUD, frame)
    }
    // Jambs at the two ends, and one mullion per hull break between.
    for (const z of [WINDOW_FORE_Z, ...flankMullionZs(), WINDOW_AFT_Z]) {
      const zA = Math.max(WINDOW_FORE_Z, z - TRIM_W / 2)
      const zB = Math.min(WINDOW_AFT_Z, z + TRIM_W / 2)
      band(zA, zB, sign, 0, 1, TRIM_PROUD, frame)
    }
  }
  return { group, geometries }
}
