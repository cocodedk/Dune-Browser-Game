// landscape-shop/cliff/tools/bake/scatter.mjs
// The small stuff at the foot of the formation, split out of instances.mjs
// so that file stays a readable composition table (and under the 200-line
// rule). Two scatters, each with a job:
//
//   talus()       — SCALE. A 600 m wall of a few big masses has nothing in
//                   it the eye can measure and reads as a tabletop rock no
//                   matter how tall it is made.
//   jointWedges() — the KIT SEAM. Where model/gateWall.ts's smooth prow
//                   dies into the baked rock, the two shape languages met
//                   along a bare intersection line: rounded cave-mouth rock
//                   butting hard faceted plates with nothing between them.
//                   These are the intermediate-scale rocks that bridge it.

// SCARP is passed in rather than imported: instances.mjs owns it, and
// importing it back from here would make the two modules circular.

/** Frontmost z a foot-scale block may take: it follows the scarp's own bow
 *  but is never allowed within 6 m of the formation's frontmost plane —
 *  the gate keeps that (compose.mjs throws if a block steals it). */
function scarpFrontAt(scarp, x, clearM) {
  return Math.max(scarp.planeZ + (scarp.bow * x * x) / 100 - clearM, scarp.planeZ + 6)
}

export function talus(scarp) {
  const seeded = [
    [-296, 44, 0.4], [-268, 30, 1.7], [-238, 52, 2.9], [-206, 34, 0.9],
    [-176, 46, 3.6], [-148, 28, 5.3], [148, 38, 1.2],
    [178, 50, 3.1], [212, 32, 5.9], [246, 46, 2.5], [276, 34, 4.8],
    [300, 40, 0.7],
  ]
  return seeded.map(([x, width, rotY], i) => ({
    name: `talus${i}`,
    src: 'boulder',
    // width/2 (not depth/2) because these are turned on the spot.
    sizeM: [width, width * 0.52, width * 0.86],
    pos: [x, -width * 0.12, scarpFrontAt(scarp, x, 14) + width / 2],
    rotY,
    mirrorX: i % 3 === 0,
    taperK: 0.2,
    noise: 0.035,
    seed: 200 + i * 7,
  }))
}

/**
 * Six blocks straddling the line where the prow's rim sinks into the rock
 * (model/gateWall.ts: roughly |x| = 80 at the foot, closing to |x| = 30 by
 * 90 m up). Each one is deliberately MID-SCALE — bigger than the talus,
 * far smaller than a mass — because the seam read as a seam precisely
 * because nothing in between existed: the eye jumped from a 200 m smooth
 * panel straight to a 40 m faceted plate. They are seated proud enough of
 * the scarp to break the joint line and low enough to stay out of the
 * gate's own aperture.
 *
 * [x, width, baseY, rotY, taper] — the pairs are deliberately NOT mirrored
 * across x = 0: the landing rig sees the west flank, and a symmetric pile
 * there would read as dressing rather than as rockfall.
 */
const WEDGES = [
  [-74, 56, -6, 0.85, 0.34],
  [-100, 72, -12, 2.35, 0.28],
  [-134, 60, -9, 4.05, 0.3],
  [-112, 44, 20, 1.4, 0.36],
  [78, 62, -8, 5.1, 0.3],
  [112, 52, -6, 3.2, 0.33],
]

// How far in front of the local scarp a wedge is allowed to stand, and the
// hard floor that keeps it out of the gate's own frontmost plane: the
// formation's -Z extreme must stay over x = 0 (compose.mjs throws if it
// wanders), so no wedge may reach within 0.6 m of SCARP.planeZ.
const WEDGE_PROUD_M = 2.2
const WEDGE_KEEP_BACK_M = 0.6

export function jointWedges(scarp) {
  return WEDGES.map(([x, width, baseY, rotY, taperK], i) => {
    const depth = width * 0.78
    // Its own AABB depth once turned — the talus's flat width/2 rule is too
    // coarse here, where a metre either way is the whole effect.
    const halfSpan = (Math.abs(width * Math.sin(rotY)) + Math.abs(depth * Math.cos(rotY))) / 2
    const front = Math.max(
      scarp.planeZ + (scarp.bow * x * x) / 100 - WEDGE_PROUD_M,
      scarp.planeZ + WEDGE_KEEP_BACK_M,
    )
    return {
      name: `jointWedge${i}`,
      src: 'boulder',
      sizeM: [width, width * 0.66, depth],
      pos: [x, baseY, front + halfSpan + 1],
      rotY,
      mirrorX: i % 2 === 1,
      taperK,
      // A dip apiece, so the wedges do not stack into a shelf of their own.
      dip: i % 2 === 0 ? 0.1 : -0.13,
      // Small on purpose: the placement above is only worth a metre or two,
      // and source-space noise scales up to about half of that.
      noise: 0.02,
      seed: 400 + i * 13,
    }
  })
}
