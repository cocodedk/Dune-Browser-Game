// vehicle-shop/ornihopter/src/model/geometry/gear/plate.ts
// One swept plate segment — the only primitive the landing gear is built from.
//
// The kit's legs are not tubes. Every part of them (docs/dune_ornihopter_kit-3.png)
// is a THIN FLAT PLATE with hard edges: the hip boss on the lower flank, the
// paired slotted rails of the femur, the knee knuckle, the tibia, the foot.
// So the primitive here is a lofted rectangle, not a cylinder — the old gear's
// CylinderGeometry could never read as machined plate no matter what radius it
// was given.
//
// The section is defined against an explicit THICKNESS AXIS rather than a
// derived one: a leg plate's broad faces point fore and aft (thickAxis = +Z),
// which is the plane a splayed leg is stiff in, while a foot pad's broad faces
// point up and down (thickAxis = +Y). Deriving the frame from a cross product
// with a world axis instead would silently degenerate for the middle leg,
// whose foot runs very nearly straight outboard.
//
// Every face gets its OWN four vertices — 24 per segment, none shared. The
// gear renders with Ornithopter.ts's plain metal material, which does not set
// flatShading, so a shared-corner box would come out of computeVertexNormals()
// with averaged normals and read as a soft lozenge. Unshared corners make the
// facets hard without touching the material.

export type Vec3 = readonly [number, number, number]

export interface MeshBuffers {
  readonly positions: number[]
  readonly indices: number[]
}

export interface Section {
  /** Half-extent across the plate's broad face. */
  readonly halfBreadth: number
  /** Half-extent through the plate — the thin one. */
  readonly halfThick: number
  /** Shift of this ring's centre along the breadth axis. Two segments swept
   *  with equal and opposite offsets are the femur's paired rails, and the gap
   *  between them is the cutout the kit shows. */
  readonly offset?: number
}

export const PLATE_AXIS: Vec3 = [0, 0, 1]
export const PAD_AXIS: Vec3 = [0, 1, 0]

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function unit(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}

function step(from: Vec3, direction: Vec3, distance: number): Vec3 {
  return [
    from[0] + direction[0] * distance,
    from[1] + direction[1] * distance,
    from[2] + direction[2] * distance,
  ]
}

/** thickAxis with the sweep direction projected out, so the section stays
 *  perpendicular to the segment however it is angled. */
function thicknessNormal(axis: Vec3, sweep: Vec3): Vec3 {
  const along = axis[0] * sweep[0] + axis[1] * sweep[1] + axis[2] * sweep[2]
  return unit([axis[0] - sweep[0] * along, axis[1] - sweep[1] * along, axis[2] - sweep[2] * along])
}

function corners(centre: Vec3, breadth: Vec3, normal: Vec3, section: Section): Vec3[] {
  const c = step(centre, breadth, section.offset ?? 0)
  const wide = step(c, breadth, section.halfBreadth)
  const narrow = step(c, breadth, -section.halfBreadth)
  return [
    step(wide, normal, section.halfThick),
    step(wide, normal, -section.halfThick),
    step(narrow, normal, -section.halfThick),
    step(narrow, normal, section.halfThick),
  ]
}

function pushQuad(out: MeshBuffers, a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
  const base = out.positions.length / 3
  out.positions.push(...a, ...b, ...c, ...d)
  out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

/**
 * Twelve triangles closing one tapered plate from `from` to `to`.
 *
 * The four side quads and the two caps are wound so their normals face
 * outward — derived on paper against a unit box swept along +Y and then
 * MEASURED in gearMesh.test.ts, which checks every face of a segment points
 * away from its own centroid. Both caps needed the opposite order to the one
 * the side loop implies; the test is what says so, not this comment.
 */
export function pushSegment(
  out: MeshBuffers,
  from: Vec3,
  to: Vec3,
  start: Section,
  end: Section,
  thickAxis: Vec3 = PLATE_AXIS,
): void {
  const sweep = unit(sub(to, from))
  const normal = thicknessNormal(thickAxis, sweep)
  const breadth = cross(normal, sweep)
  const a = corners(from, breadth, normal, start)
  const b = corners(to, breadth, normal, end)
  for (let i = 0; i < 4; i++) {
    pushQuad(out, a[i], b[i], b[(i + 1) % 4], a[(i + 1) % 4])
  }
  pushQuad(out, a[0], a[1], a[2], a[3])
  pushQuad(out, b[3], b[2], b[1], b[0])
}
