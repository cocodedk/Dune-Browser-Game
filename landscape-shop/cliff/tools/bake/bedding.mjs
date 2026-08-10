// landscape-shop/cliff/tools/bake/bedding.mjs
// Each mass's BEDDING PLANE, expressed in finished-formation coordinates.
//
// One geology, many attitudes. Every mass is a copy of the same source rock,
// so they all share one stratigraphic column — but deform.mjs gives each one
// its own `dip` (a vertical shear that tilts the bedding), its own rotation
// and its own place. R2 colours the courses, and a course only reads as rock
// if its bands run along that mass's OWN bedding. So the bake hands the model
// a plane per mass:
//
//     s(X, Y, Z) = a*X + b*Y + c*Z + d
//
// s is a stratigraphic height in meters: constant across one bedding surface,
// and equal to world Y where that surface crosses the mass's own axis. Two
// masses at the same s are in the same course, which is what makes the
// formation read as one rock stack seen at several attitudes.
//
// The coefficients are not hand-derived algebra. The whole chain from scaled
// mass-local coordinates to final formation coordinates (dip shear, rotation,
// placement, width/height normalize, batter lean, depth normalize) is AFFINE,
// so it is probed at four points, inverted, and the row that recovers local
// height becomes the plane. compose.mjs then checks every unshaved vertex of
// every mass against the height the deformer actually gave it.

/** Scaled mass-local (x, y, z) -> final formation (X, Y, Z), with the dip
 *  shear at full strength. Mirrors deform.mjs and compose.mjs's normalize()
 *  step for step; those are the two files to change together. */
function forwardMap(spec, factors) {
  const cos = Math.cos(spec.rotY ?? 0)
  const sin = Math.sin(spec.rotY ?? 0)
  const dip = spec.dip ?? 0
  const [px, py, pz] = spec.pos
  const { cx, kx, ky, kz, leanedMax, backZ, lean } = factors
  return (x, y, z) => {
    const xw = px + x * cos + z * sin
    const yw = py + y + dip * x
    const zw = pz - x * sin + z * cos
    const X = (xw - cx) * kx
    const Y = yw * ky
    return [X, Y, backZ + (zw + lean * Y - leanedMax) * kz]
  }
}

/** The plane for one mass. `s` is ky*(py + localY): the mass's own base
 *  height folded in, so course numbers are shared across the formation
 *  rather than restarting at every mass's foot. */
export function beddingPlane(spec, factors) {
  const forward = forwardMap(spec, factors)
  const origin = forward(0, 0, 0)
  const columns = [forward(1, 0, 0), forward(0, 1, 0), forward(0, 0, 1)]
    .map((point) => point.map((value, axis) => value - origin[axis]))
  const matrix = [0, 1, 2].map((row) => columns.map((column) => column[row]))
  const inverse = invert3(matrix)
  const [a, b, c] = inverse[1].map((value) => value * factors.ky)
  const base = factors.ky * spec.pos[1]
  return [a, b, c, base - (a * origin[0] + b * origin[1] + c * origin[2])]
}

// A block that has fallen off the wall is not still in place: its courses
// landed at whatever angle it came to rest at. The talus, the joint wedges
// and the blockfall boulders are all `boulder`-sourced debris, so their
// bedding is tilted away from the wall's — a colour-only tilt, since R1's
// geometry is settled and may not move. The angle is hashed off the mass's
// own name so no two neighbours lie the same way.
const FALLEN_TILT = 0.34 // tan(19 deg) — reads at the landing rig, still rock

export function tiltFallen(plane, name, centre) {
  const hash = [...name].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0), 0x811c9dc5)
  const angle = (hash / 0xffffffff) * Math.PI * 2
  const da = -FALLEN_TILT * Math.cos(angle)
  const dc = -FALLEN_TILT * Math.sin(angle)
  // Pivoted on the block's own centre, so tilting changes the bands' angle
  // without sliding the block into a different course.
  return [plane[0] + da, plane[1], plane[2] + dc, plane[3] - da * centre[0] - dc * centre[2]]
}

/** Worst disagreement, in meters, between the plane and the height the
 *  deformer actually gave each vertex. Vertices below the dip damp ramp are
 *  skipped (the shear is ramped there, so the bedding genuinely curves), as
 *  are vertices clampFront() shaved: those were moved through the bedding
 *  after the fact, and the plane — not their old height — is the truth. */
export function maxPlaneError(plane, positions, mass, range, ky) {
  let worst = 0
  for (let v = range.from; v < range.to; v++) {
    const local = mass.bedding[v - range.from]
    if (local < mass.dampTop) continue
    if (mass.moved && mass.moved[v - range.from]) continue
    const i = v * 3
    const s = plane[0] * positions[i] + plane[1] * positions[i + 1] + plane[2] * positions[i + 2] + plane[3]
    worst = Math.max(worst, Math.abs(s - ky * (local + mass.baseY)))
  }
  return worst
}

function invert3(m) {
  const cof = [
    [m[1][1] * m[2][2] - m[1][2] * m[2][1], m[0][2] * m[2][1] - m[0][1] * m[2][2], m[0][1] * m[1][2] - m[0][2] * m[1][1]],
    [m[1][2] * m[2][0] - m[1][0] * m[2][2], m[0][0] * m[2][2] - m[0][2] * m[2][0], m[0][2] * m[1][0] - m[0][0] * m[1][2]],
    [m[1][0] * m[2][1] - m[1][1] * m[2][0], m[0][1] * m[2][0] - m[0][0] * m[2][1], m[0][0] * m[1][1] - m[0][1] * m[1][0]],
  ]
  const det = m[0][0] * cof[0][0] + m[0][1] * cof[1][0] + m[0][2] * cof[2][0]
  if (Math.abs(det) < 1e-12) throw new Error('bedding: degenerate mass transform')
  return cof.map((row) => row.map((value) => value / det))
}
