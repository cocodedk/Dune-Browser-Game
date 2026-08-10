// character-shop/chani/src/model/loft.ts
// The depth primitive. R1 pass 2 revolved a radius profile around Y and then
// squashed the whole mesh in Z (primitives.lathe), which gives every
// cross-section the SAME front/back shape: a torso built that way has no
// chest projection, no lumbar hollow and no glute curve, so the profile view
// collapses into a flat cutout — exactly what the pass-2 critic found.
//
// A Ring here is an ELLIPSE with independently authored half-depths front
// (-Z, the face side) and back (+Z), so the surface a body actually has —
// belly out, waist tucked, bust forward, thoracic curve back, seat back — is
// authored directly as two profile lines instead of one radius. `lobe`/
// `lobeB` add a symmetric PAIR of soft swells on the front or back of a ring
// (chest, glutes) without ever becoming separate meshes: they are a term in
// this surface, so they flow in the profile instead of being glued on.
//
// Both end rows are capped, so every mass built here is a closed solid —
// depth.test.ts checks the signed volume of each one to prove the winding
// faces outward.

import { Mesh, BufferGeometry, Float32BufferAttribute, type MeshStandardMaterial } from 'three'

export interface Ring {
  /** Cross-section height in the mesh's own local space. */
  y: number
  /** Half-width in X. The silhouette tests measure this. */
  rx: number
  /** Cross-section centre in X. Zero for everything on the centre line;
   *  R2 added it so an EYE could be authored as a station table like
   *  everything else — an almond's widest slice sits inboard of its lower
   *  lid and outboard of its upper-lid peak, and without a per-ring X
   *  centre a stack of ellipses can only ever be a symmetric lens. The
   *  hair curls use it to snake. Mirroring a mass is negating this, which
   *  leaves the winding alone — scaling X by -1 would invert it. */
  xc?: number
  /** Half-depth toward the FRONT (-Z) from zc. */
  rzF: number
  /** Half-depth toward the BACK (+Z) from zc. */
  rzB: number
  /** Cross-section centre in Z; front surface is zc-rzF, back is zc+rzB. */
  zc?: number
  /** Extra forward projection, as a pair of soft lobes either side of the
   *  centre line — the integrated pec/breast volume. */
  lobe?: number
  /** Same, projecting backward: the glutes. */
  lobeB?: number
  /** Cross-section fullness. 1 (default) is a true ellipse; below 1 the
   *  section fills toward a rounded rectangle, reaching most of its width
   *  well before the end of its depth. An ellipse tapers to a POINT at its
   *  long end, which is why the boots first read as elf shoes: a foot is
   *  blunt, and no ellipse is. Half-extents — the numbers the silhouette
   *  tests measure — are unchanged either way. */
  full?: number
}

const TAU = Math.PI * 2
/** Lobe centres sit ~24deg off the centre line, so at a 0.155m half-width
 *  the pair lands ~63mm either side of the sternum, and the Gaussian's own
 *  tail leaves a shallow valley between them rather than a cleft. */
const LOBE_AT = 0.42
const LOBE_WIDTH = 0.45
const gauss = (d: number): number => Math.exp(-((d / LOBE_WIDTH) ** 2))

/** |v|^p keeping v's sign: p = 1 traces an ellipse, p < 1 a fuller
 *  section. */
const swell = (v: number, p: number): number => (p === 1 ? v : Math.sign(v) * Math.abs(v) ** p)

function ringPoint(r: Ring, theta: number, out: number[]): void {
  const p = r.full ?? 1
  const cos = Math.cos(theta)
  // Folded angle: 0 at the front centre line, PI at the back, so a lobe
  // term written once applies to both sides of the body by construction.
  const a = theta > Math.PI ? TAU - theta : theta
  // Blend front half-depth into back half-depth across the ring; at the
  // sides (theta = PI/2) the surface passes through zc either way, which is
  // where a torso's widest point genuinely sits.
  const rz = r.rzB + (r.rzF - r.rzB) * 0.5 * (1 + cos)
  let z = (r.zc ?? 0) - rz * swell(cos, p)
  if (r.lobe) z -= r.lobe * gauss(a - LOBE_AT)
  if (r.lobeB) z += r.lobeB * gauss(Math.PI - a - LOBE_AT)
  out.push((r.xc ?? 0) + r.rx * swell(Math.sin(theta), p), r.y, z)
}

/** Loft a stack of elliptical rings, bottom row first, and cap both ends.
 *  Winding is (row, row+1, theta+1) so the face normal comes out as
 *  up x d(theta) — outward. */
export function loft(
  rings: readonly Ring[], material: MeshStandardMaterial, segments = 24,
): Mesh {
  const positions: number[] = []
  const indices: number[] = []

  for (const ring of rings) {
    for (let j = 0; j < segments; j++) ringPoint(ring, (j / segments) * TAU, positions)
  }

  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const jn = (j + 1) % segments
      const a = i * segments + j
      const b = i * segments + jn
      const c = (i + 1) * segments + j
      const d = (i + 1) * segments + jn
      indices.push(a, c, b, b, c, d)
    }
  }

  const first = rings[0]
  const last = rings[rings.length - 1]
  const bottomHub = positions.length / 3
  positions.push(first.xc ?? 0, first.y, first.zc ?? 0)
  const topHub = bottomHub + 1
  positions.push(last.xc ?? 0, last.y, last.zc ?? 0)
  const topRow = (rings.length - 1) * segments
  for (let j = 0; j < segments; j++) {
    const jn = (j + 1) % segments
    indices.push(bottomHub, j, jn)
    indices.push(topHub, topRow + jn, topRow + j)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new Mesh(geometry, material)
}
