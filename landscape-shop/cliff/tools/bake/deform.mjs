// landscape-shop/cliff/tools/bake/deform.mjs
// Reshapes one normalized source soup into one placed mass. These are the
// operations that make the committed bake a DERIVATIVE and not a repackaged
// asset: the feedstock's stacked-strata shape language survives, its
// proportions, its overhanging cap, its orientation and its silhouette do
// not.
//
// Order is load-bearing: cap taper and shear act in source space (so the
// strata courses stay horizontal relative to the mass), noise is hashed on
// the SOURCE position (so the feedstock's duplicated hard-edge vertices all
// move together and the shell never cracks open), and only then does the
// mass get scaled, spun and placed.

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Deterministic per-position white noise in [-1, 1). Quantizing the
 *  coordinates first is what guarantees two source vertices sharing a
 *  position get an identical displacement. */
function hashNoise(x, y, z, seed, channel) {
  let h = Math.imul(seed * 0x9e3779b1 + channel * 0x85ebca6b, 1) >>> 0
  for (const value of [x, y, z]) {
    h = Math.imul(h ^ (Math.round(value * 10000) | 0), 0xc2b2ae35) >>> 0
    h = (h ^ (h >>> 15)) >>> 0
  }
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1
}

/**
 * @param soup   normalized source ({ positions, index, height })
 * @param spec   see tools/bake/instances.mjs for the authored fields
 * @returns { positions: Float32Array, index: Uint32Array }
 */
export function deformInstance(soup, spec) {
  const src = soup.positions
  const out = new Float32Array(src.length)
  const taperK = spec.taperK ?? 0
  const taperP = spec.taperP ?? 1
  // A STRAIGHT wall on the taper envelope, as a fraction of the source's
  // widest ring. Measured source profile (see instances.mjs): the mesa is
  // widest at its FOOT — a talus skirt at radius 1.755 — then steps in to a
  // 1.0-1.2 column and flares again at the cap. Left alone, every instance
  // repeats that skirt ledge at 10% of its own height and stacks the
  // column's own courses proud of each other: the "same horizontal shelf-
  // terrace rhythm on every tower" the R1.3 critic read. capR near 0.6
  // shaves skirt and course out-steps flush into a sheer wall; capR at 1
  // keeps the full plated butte. Varying it per mass is what makes one
  // tower plated and its neighbour sheer.
  const capR = spec.capR ?? 1
  const shearX = spec.shearX ?? 0
  const shearZ = spec.shearZ ?? 0
  const dip = spec.dip ?? 0
  const amp = spec.noise ?? 0
  const [sx, sy, sz] = spec.scale
  const cos = Math.cos(spec.rotY ?? 0)
  const sin = Math.sin(spec.rotY ?? 0)
  const [px, py, pz] = spec.pos

  for (let i = 0; i < src.length; i += 3) {
    const y0 = src[i + 1]
    // Taper ENVELOPE, not a multiplier: nothing may stand further from the
    // mass's axis than a profile that narrows with height. It clips the
    // feedstock's overhanging summit flare (which at massif scale reads as a
    // plate hat on a cairn) while leaving the strata courses below it
    // untouched, so every course now steps BACK — which is what the lead's
    // "stacked strata, each course stepped back" actually describes.
    const radius = Math.hypot(src[i], src[i + 2])
    const limit = soup.maxRadius
      * Math.min(capR, 1 - taperK * Math.pow(y0 / soup.height, taperP))
    const pull = radius > limit && radius > 1e-6 ? limit / radius : 1
    let x = src[i] * pull + shearX * y0
    let y = y0
    let z = src[i + 2] * pull + shearZ * y0

    if (amp > 0) {
      // Damped to nothing at the foot so the base ring stays planar and
      // seats cleanly into the skirt.
      const damp = smoothstep(0, soup.height * 0.06, y0)
      x += hashNoise(src[i], y0, src[i + 2], spec.seed, 1) * amp * damp
      y += hashNoise(src[i], y0, src[i + 2], spec.seed, 2) * amp * damp * 0.6
      z += hashNoise(src[i], y0, src[i + 2], spec.seed, 3) * amp * damp
    }

    if (spec.mirrorX) x = -x
    x *= sx
    y *= sy
    z *= sz

    // BEDDING DIP. One source feeds every mass, so without this each one
    // shows the SAME horizontal shelf courses at the same fraction of its
    // height — a row of towers stamped with one shelf pattern, which is
    // exactly what the R1.3 critic named. Tilting the courses (a vertical
    // shear, so verticals stay vertical) turns the rhythm per mass; the
    // shear is damped to nothing over the bottom fifth so the mass's base
    // ring stays flat and seats into the skirt, which makes it a fold
    // rather than a whole mass leaning over.
    if (dip !== 0) y += dip * x * smoothstep(0, soup.height * sy * 0.2, y)

    out[i] = px + x * cos + z * sin
    out[i + 1] = py + y
    out[i + 2] = pz - x * sin + z * cos
  }

  // A mirror is a negative-determinant transform: without reversing the
  // winding, every face of that mass points inward and lights dark.
  const index = spec.mirrorX ? reverseWinding(soup.index) : Uint32Array.from(soup.index)
  return { positions: out, index }
}

function reverseWinding(index) {
  const out = new Uint32Array(index.length)
  for (let t = 0; t < index.length; t += 3) {
    out[t] = index[t]
    out[t + 1] = index[t + 2]
    out[t + 2] = index[t + 1]
  }
  return out
}

/** Shaves everything in front of a scarp surface, so a mass that was
 *  authored poking well forward ends as one sheer face instead of a lumpy
 *  hillside. The surface is not a plain plane: it leans back as it rises
 *  (batter, as a real scarp does) and bows away at its ends (bow), so the
 *  shaved face never reads as a machined cut. */
export function clampFront(positions, { planeZ, batter, bow }) {
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const limit = planeZ + batter * Math.max(0, positions[i + 1]) + (bow * x * x) / 100
    if (positions[i + 2] < limit) positions[i + 2] = limit
  }
}
