// landscape-shop/sietch/src/model/hearthStone.ts
// R3 FINAL: the hearth's own base. It used to be a turned CylinderGeometry
// — perfectly circular, perfectly level — and a fresh critic read it
// exactly for that: "the fire sits on a too-perfect black-and-white
// circular disc that reads as a display pedestal". A pedestal is turned
// on a lathe; a hearth is built by hand, stone by stone, and no two
// stones in a hand-laid ring share a radius or a height. This module is
// that ring: an irregular N-gon fan, radius and top height authored PER
// SEGMENT (never a formula — a formula is how you get a new kind of
// symmetry), built as flat-shaded triangle soup so each stone reads as
// its own facet rather than a smoothed blend into its neighbours
// (buildPiece.ts's same trick, for the same reason).
//
// SEATING: the brazier and its embers (dressingBake.json, supportY=0.35)
// are baked at an ABSOLUTE world height and stand centred within a few
// centimetres of the hearth's own centre (bbox centre ~(-6.0,-20.2), only
// 0.2 m off DRESSING.hearthAtM). The top fan's CENTRE VERTEX is left
// unperturbed at exactly HEARTH_LIP_HEIGHT_M, and only the RIM vertices
// (2.2 m+ out) carry height jitter — inside any one triangle, height
// interpolates linearly from the flat centre to a jittered rim, so a
// point 1.5 m out (the brazier's own farthest corner) sees at most ~70%
// of a rim stone's jitter and the guard's 5 cm tolerance (dressing.test.ts
// "nothing floats") is never in reach. Verified against the built mesh in
// dressingBake.test.ts / dressing.test.ts, not just asserted here.

import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three'
import { DRESSING } from '../spec'
import type { PaletteMaterials } from './materials'

export const HEARTH_RADIUS_M = 2.2
export const HEARTH_LIP_HEIGHT_M = 0.35
const BASE_TAPER = 1.08

// One row per hand-set stone: angle (degrees, strictly increasing, never
// evenly spaced), how far its outer face stands from the nominal radius
// (0.65 .. 1.35 -> the spec'd +-20-35%), and how far its top sits off
// HEARTH_LIP_HEIGHT_M (a few centimetres — "vary height slightly"). No
// row is a reflection or a rotation of another: that is what "break
// radial symmetry entirely" rules out.
const STONES: Array<[number, number, number]> = [
  [0, 1.18, 0.018],
  [21, 0.82, -0.031],
  [48, 1.31, 0.009],
  [79, 0.71, -0.014],
  [101, 1.05, 0.036],
  [132, 0.88, -0.026],
  [158, 1.24, 0.004],
  [184, 0.68, 0.021],
  [207, 1.12, -0.038],
  [233, 0.93, 0.013],
  [262, 1.34, -0.007],
  [288, 0.77, 0.029],
  [313, 1.02, -0.019],
  [339, 0.85, 0.006],
]

function push(out: number[], uv: number[], x: number, y: number, z: number, u: number, v: number): void {
  out.push(x, y, z)
  uv.push(u, v)
}

/** The irregular hand-set hearth stone: replaces the old lathed
 *  CylinderGeometry lip. Same mesh name ('hearthLip') so every other
 *  module and guard that looks the set up by name is unaffected. */
export function buildHearthStone(materials: PaletteMaterials): Mesh {
  const [cx, , cz] = DRESSING.hearthAtM
  const n = STONES.length
  const positions: number[] = []
  const uvs: number[] = []

  const rim = STONES.map(([deg, radiusFactor, heightJitter]) => {
    const rad = (deg * Math.PI) / 180
    const topR = HEARTH_RADIUS_M * radiusFactor
    return {
      topX: cx + Math.cos(rad) * topR,
      topZ: cz + Math.sin(rad) * topR,
      topY: HEARTH_LIP_HEIGHT_M + heightJitter,
      baseX: cx + Math.cos(rad) * topR * BASE_TAPER,
      baseZ: cz + Math.sin(rad) * topR * BASE_TAPER,
    }
  })

  for (let i = 0; i < n; i++) {
    const a = rim[i]
    const b = rim[(i + 1) % n]
    const ua = i / n
    const ub = (i + 1) / n

    // Top fan triangle: the centre vertex is unperturbed (the seating
    // guarantee above), so every facet tilts around the same flat keel.
    push(positions, uvs, cx, HEARTH_LIP_HEIGHT_M, cz, ua, 0.5)
    push(positions, uvs, a.topX, a.topY, a.topZ, ua, 1)
    push(positions, uvs, b.topX, b.topY, b.topZ, ub, 1)

    // Side wall, two triangles: base ring (y=0, the hall floor) up to
    // this stone's own jittered top — no bottom cap, the underside sits
    // flush on the floor plane and is never seen (same frugality call as
    // the disc it replaces).
    push(positions, uvs, a.baseX, 0, a.baseZ, ua, 0)
    push(positions, uvs, b.baseX, 0, b.baseZ, ub, 0)
    push(positions, uvs, a.topX, a.topY, a.topZ, ua, 1)

    push(positions, uvs, b.baseX, 0, b.baseZ, ub, 0)
    push(positions, uvs, b.topX, b.topY, b.topZ, ub, 1)
    push(positions, uvs, a.topX, a.topY, a.topZ, ua, 1)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()

  const mesh = new Mesh(geometry, materials.stoneShadow)
  mesh.name = 'hearthLip'
  return mesh
}
