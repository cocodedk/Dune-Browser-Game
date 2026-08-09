// landscape-shop/cliff/tools/bake/compose.mjs
// Merges the reshaped masses into one formation, shaves the gate buttress to
// a sheer plane, and normalizes the whole thing onto spec.ts's FOOTPRINT.
//
// TARGET mirrors landscape-shop/cliff/src/spec.ts. tools/ is plain node and
// cannot import the TypeScript spec, so the numbers are repeated here and
// written into the bake; massingR1.test.ts compares them back against
// FOOTPRINT, which is what makes the duplication safe.

import { deformInstance, clampFront } from './deform.mjs'
import { SCARP } from './instances.mjs'
import { rank } from './rank.mjs'

export const TARGET = {
  widthM: 600,
  heightM: 190,
  // Where the BAKED rock stops. The gate prow (procedural, model/
  // gateWall.ts) grows out of this scarp and stands about 7 m further
  // forward — just enough clearance for the carved socket to be cut without
  // rock closing over it. Any more and the prow reads as a swelling dome
  // pasted on the front, which is the failure both earlier rounds died of.
  frontZ: -212,
  backZ: 0,
}

export function compose(sources) {
  const masses = deformAll(sources)

  const positions = []
  const index = []
  const ranges = []
  let vertexBase = 0
  for (let m = 0; m < masses.length; m++) {
    const mass = masses[m]
    const from = index.length
    for (const value of mass.positions) positions.push(value)
    for (const i of mass.index) index.push(i + vertexBase)
    ranges.push({ name: sources[m].spec.name, from, to: index.length })
    vertexBase += mass.positions.length / 3
  }

  const merged = new Float32Array(positions)
  const indices = Uint32Array.from(index)
  normalize(merged)
  return {
    positions: merged,
    index: indices,
    masses: masses.length,
    hierarchy: rank(merged, indices, ranges),
  }
}

/** Deforms every instance and shaves the ones flagged clampFront. */
function deformAll(sources) {
  return sources.map(({ soup, spec }) => {
    const mass = deformInstance(soup, { ...spec, scale: fitScale(soup, spec) })
    if (spec.clampFront) clampFront(mass.positions, SCARP)
    return mass
  })
}

/** sizeM is the size the mass must END UP, which is not the size of the raw
 *  source box: capR and the cap taper both eat into the feedstock's own
 *  footprint (the mesa's widest ring is the talus skirt at its foot, and
 *  several masses clip that away completely). So the shape is deformed
 *  once at unit scale, measured, and only then fitted. Dip is excluded
 *  from the probe — it is applied after scaling, so it cannot be measured
 *  before one exists. */
function fitScale(soup, spec) {
  const probe = deformInstance(soup, {
    ...spec, scale: [1, 1, 1], rotY: 0, pos: [0, 0, 0], dip: 0,
  })
  const { min, max } = boundsOf(probe.positions)
  return spec.sizeM.map((wanted, axis) => wanted / Math.max(max[axis] - min[axis], 1e-6))
}

function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], positions[i + a])
      max[a] = Math.max(max[a], positions[i + a])
    }
  }
  return { min, max }
}

/** Lands the formation exactly on the spec box: width TARGET.widthM centred
 *  on x = 0, crest exactly TARGET.heightM (scaled about y = 0 so the masses
 *  keep the few meters of sink that bury their base rings), rock spanning
 *  TARGET.frontZ..TARGET.backZ. */
function normalize(positions) {
  const first = boundsOf(positions)
  const cx = (first.min[0] + first.max[0]) / 2
  const kx = TARGET.widthM / (first.max[0] - first.min[0])
  const ky = TARGET.heightM / first.max[1]
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - cx) * kx
    positions[i + 1] *= ky
    // BATTER, applied to the whole formation at once: rock leans back as it
    // rises. Without it, several columns of the front came out vertical to
    // within a meter over 120 m of height — a constant-depth extrusion, which
    // is exactly what the massing guards call a machined slot.
    positions[i + 2] += LEAN * positions[i + 1]
  }

  const leaned = boundsOf(positions)
  const kz = (TARGET.backZ - TARGET.frontZ) / (leaned.max[2] - leaned.min[2])
  for (let i = 2; i < positions.length; i += 3) {
    positions[i] = TARGET.backZ + (positions[i] - leaned.max[2]) * kz
  }
}

const LEAN = 0.12

/** Everything the bake must be true about itself. Thrown, not logged: a
 *  formation whose frontmost rock drifted off the entrance is a silent
 *  failure that no seam guard would catch. */
export function assertComposition(positions, socketDeepestZ) {
  const { min, max } = boundsOf(positions)
  expectClose('width', max[0] - min[0], TARGET.widthM, 0.01)
  expectClose('crest', max[1], TARGET.heightM, 0.01)
  expectClose('front', min[2], TARGET.frontZ, 0.01)
  expectClose('back', max[2], TARGET.backZ, 0.01)

  let frontmostX = Infinity
  let intrusion = Infinity
  const scarpColumns = new Set()
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]]
    if (z < min[2] + 0.05 && Math.abs(x) < Math.abs(frontmostX)) frontmostX = x
    if (z < TARGET.frontZ + 4) scarpColumns.add(Math.round(x / 10))
    if (Math.abs(x) < 45 && y > -10 && y < 50) intrusion = Math.min(intrusion, z)
  }
  const scarpWidth = scarpColumns.size * 10

  if (Math.abs(frontmostX) > 60) {
    throw new Error(`frontmost rock sits at x=${frontmostX.toFixed(1)}, not over the gate`)
  }
  if (scarpWidth < 120) {
    throw new Error(`scarp is only ${scarpWidth} m wide — the gate prow needs a face to grow out of`)
  }
  if (intrusion < socketDeepestZ + 2) {
    throw new Error(`rock at z=${intrusion.toFixed(2)} would cover the carved socket (${socketDeepestZ})`)
  }
  return { min, max }
}

function expectClose(what, actual, wanted, tolerance) {
  if (Math.abs(actual - wanted) > tolerance) {
    throw new Error(`${what}: ${actual.toFixed(4)} != ${wanted}`)
  }
}
