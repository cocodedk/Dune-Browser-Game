// vehicle-shop/ornihopter/src/model/geometry/hullBox.ts
// A UV-mapped axis-aligned box, emitted as raw positions and uvs so
// hullGreebles.ts's detail can be concatenated straight into the hull's single
// BufferGeometry rather than added as separate meshes. One mesh means one
// material, which means every greeble picks up the same weathering maps as the
// skin it sits on — a greeble with its own flat material is exactly what reads
// as "stuck on" in a render.
//
// Every face is emitted with its own four vertices, matching hullLoft.ts's
// per-panel duplication, so computeVertexNormals() gives hard box edges rather
// than rounding them off.
//
// One face may be given its own UV rectangle: the intake grilles need their
// outward face pointed at the fine-rib texture island while their other five
// faces stay plain machinery tone (see hullUv.ts).

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface UvRect {
  readonly u0: number
  readonly u1: number
  readonly v0: number
  readonly v1: number
}

export interface BoxMesh {
  positions: number[]
  uvs: number[]
}

/** Which face gets the override rectangle, if any. */
export type BoxFace = 'px' | 'nx' | 'py'

interface FaceSpec {
  readonly n: readonly [number, number, number]
  /** Tangent axis indices into (x, y, z); AXES[t1] x AXES[t2] must equal n,
   *  which is what makes the emitted winding outward-facing on every face. */
  readonly t1: 0 | 1 | 2
  readonly t2: 0 | 1 | 2
}

const FACES: Readonly<Record<string, FaceSpec>> = {
  px: { n: [1, 0, 0], t1: 1, t2: 2 },
  nx: { n: [-1, 0, 0], t1: 2, t2: 1 },
  py: { n: [0, 1, 0], t1: 2, t2: 0 },
  ny: { n: [0, -1, 0], t1: 0, t2: 2 },
  pz: { n: [0, 0, 1], t1: 0, t2: 1 },
  nz: { n: [0, 0, -1], t1: 1, t2: 0 },
}

const AXES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

/**
 * Six faces, twelve triangles, 36 vertices. `uv` covers every face; `faceUv`
 * (with `face`) overrides one of them.
 */
export function buildBox(
  centre: Vec3,
  half: Vec3,
  uv: UvRect,
  face?: BoxFace,
  faceUv?: UvRect,
): BoxMesh {
  const positions: number[] = []
  const uvs: number[] = []
  const c = [centre.x, centre.y, centre.z]
  const h = [half.x, half.y, half.z]

  for (const [name, spec] of Object.entries(FACES)) {
    const rect = name === face && faceUv ? faceUv : uv
    const a1 = AXES[spec.t1]
    const a2 = AXES[spec.t2]
    const e1 = a1.map((v) => v * h[spec.t1])
    const e2 = a2.map((v) => v * h[spec.t2])
    const base = spec.n.map((v, i) => c[i] + v * h[i])
    const corner = (m1: number, m2: number): readonly number[] =>
      base.map((v, i) => v + e1[i] * m1 + e2[i] * m2)
    const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
    const quadUv: ReadonlyArray<readonly [number, number]> = [
      [rect.u0, rect.v0], [rect.u1, rect.v0], [rect.u1, rect.v1], [rect.u0, rect.v1],
    ]
    for (const i of [0, 1, 2, 0, 2, 3]) {
      positions.push(quad[i][0], quad[i][1], quad[i][2])
      uvs.push(quadUv[i][0], quadUv[i][1])
    }
  }
  return { positions, uvs }
}
