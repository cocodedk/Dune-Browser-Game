// vehicle-shop/harvester/src/model/hull.ts
// COMPONENT 1 — the platform. A SEAMED, STEPPED deck (transverse panel
// gaps, each recessed below the top plane, the foremost plate stepped down
// toward the cutter), a thin underframe web braced by a few full-envelope
// cross-members plus slender daylight beams at the deck's own edge, a low
// tail housing, and dark louvred flank panels on the solid end blocks ONLY
// — the open mid-section keeps no panel at all, the see-under gap that is
// this machine's identity. Reads spec.BODY/TRACK/BOOM only; no scene
// access, no crawler state. Deck plate/seam/trim construction lives in
// ./hullDetail (split out, pass 3, to stay under the 200-line cap).

import { MeshStandardMaterial, Group, type BufferGeometry } from 'three'
import { BODY, BOOM } from '../spec'
import { box, rbox, buildDeck } from './hullDetail'

const LENGTH = BODY.tailZ - BODY.noseZ

// Nose taper: two stepped tiers under the deck, height AND width dropping
// toward the cutter (at -Z past BODY.noseZ) — the rear tier keeps the full
// hull width (continuous with the body), the front tier narrows toward the
// boom's own half-width (spec BOOM.halfWidth = 7) so the taper reads as the
// hull itself flowing down and in, not a bolt-on block. Neither tier extends
// past the existing noseZ/noseBlockAftZ bounds, so the hull's footprint is
// untouched.
const NOSE_REAR_LEN = 5.0
const NOSE_REAR_TOP = 11.0
const NOSE_FRONT_TOP = 8.0
const NOSE_FRONT_HALFWIDTH = BOOM.halfWidth

// Underframe: a thin web (visible through the open middle) plus a few
// full-envelope cross-members reading as chassis bracing, not empty air.
const WEB_THICKNESS = 1.0
const CROSS_MEMBER_DEPTH = 1.4
const CROSS_MEMBER_Z = [-8, 2, 12] as const

// Daylight beams (pass 3, destinations 2+4 — replaces pass 2's flank
// beams). Pass 2 placed these at Y ~7.45 (between the road wheels' top and
// the housing's underside), reasoning the sightline survives through the
// wheel gaps; the pass-3 critic (fresh captures, FINAL materials) found it
// does not, and a bright-marker diagnostic sweep confirmed why: from
// hero/rear34's elevation, the opaque full-width deck occludes everything
// below the track housing's own top (TRACK.housing.yHigh = 11.0) — the
// ONLY Y that rendered visible in that sweep (Y 4..11.5, at the pods' inner
// edge) was ~11.25-11.75, the sliver where the deck's own ROUNDED edge
// (radius 1.0 on every deckPlate) dips below its nominal top. Beams sit
// there now, and — the destination-4 fix — INSIDE the deck's own halfWidth
// (pass 2's beams were 0.1m WIDER than the deck itself, the unattached nub
// the critic found floating off the 4th plate's edge in top.png): they now
// read as a brace tucked under the deck's own edge, never poking past it.
const FLANK_BEAM_Y = 11.4
const FLANK_BEAM_HEIGHT = 0.3
const FLANK_BEAM_DEPTH = 0.5
const FLANK_BEAM_Z = [-10, 2, 13] as const
const FLANK_BEAM_HALFWIDTH = BODY.halfWidth - 0.2

// Flank panels: dark louvred cladding on the solid end blocks only. Kept
// PROUD of the hull's own halfWidth by a few centimetres so they read as
// applied panels, well inside the pods' inner face (spec TRACK, ~9.7m).
const FLANK_THICKNESS = 0.08
const LOUVRE_THICKNESS = 0.06
const LOUVRE_COUNT = 5
const LOUVRE_HEIGHT = 0.6

export interface HullParts {
  group: Group
  dispose(): void
}

/** I6 material wiring, no geometry: `trimMaterial` is the sixth tone
 *  (spec.TRIM_COLOR) and lands on the deck's own edge trim, the proud seam
 *  lips and the nose tier-break strip — the three runs whose job was already
 *  to draw an edge and which were dark-on-dark against everything around
 *  them. `bodyLowMaterial` is the same tan carrying the downward grime map,
 *  for the surfaces whose visible face is VERTICAL (nose tiers, underframe);
 *  see materials/plateTexel.ts for why that has to be a second material and
 *  not a second gradient. Both default to the old materials so the bounding
 *  tests construct the identical geometry with four throwaway materials. */
export function buildHull(
  bodyMaterial: MeshStandardMaterial,
  darkMaterial: MeshStandardMaterial,
  trimMaterial: MeshStandardMaterial = darkMaterial,
  bodyLowMaterial: MeshStandardMaterial = bodyMaterial,
): HullParts {
  const group = new Group()
  group.name = 'hull'
  const geometries: BufferGeometry[] = []
  const b = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void =>
    box(geometries, group, w, h, d, mat, x, y, z, name)
  const rb = (w: number, h: number, d: number, r: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void =>
    rbox(geometries, group, w, h, d, r, mat, x, y, z, name)

  const deckHalf = BODY.halfWidth

  buildDeck(geometries, group, bodyMaterial, darkMaterial, LENGTH, BODY.noseZ, deckHalf, trimMaterial)

  // Underframe: the end regions keep the ORIGINAL full thickness (matching
  // the solid nose/tail blocks above, so no new gap opens under the
  // flank panels there); only the OPEN MIDDLE thins to a web, its
  // cross-members reaching the full envelope so they read as bracing.
  const midLen = BODY.tailBlockForeZ - BODY.noseBlockAftZ
  rb(deckHalf * 2, BODY.underThickness, BODY.noseBlockAftZ - BODY.noseZ, 0.6, bodyLowMaterial, 0, BODY.underThickness / 2, (BODY.noseZ + BODY.noseBlockAftZ) / 2)
  rb(deckHalf * 2, BODY.underThickness, BODY.tailZ - BODY.tailBlockForeZ, 0.6, bodyLowMaterial, 0, BODY.underThickness / 2, (BODY.tailBlockForeZ + BODY.tailZ) / 2)
  rb(deckHalf * 2, WEB_THICKNESS, midLen, 0.3, bodyLowMaterial, 0, WEB_THICKNESS / 2, (BODY.noseBlockAftZ + BODY.tailBlockForeZ) / 2)
  for (const cz of CROSS_MEMBER_Z) {
    b(deckHalf * 2, BODY.underThickness, CROSS_MEMBER_DEPTH, darkMaterial, 0, BODY.underThickness / 2, cz, 'crossMember')
  }
  // Daylight beams — see the FLANK_BEAM_* comment above for the placement.
  for (const cz of FLANK_BEAM_Z) {
    b(FLANK_BEAM_HALFWIDTH * 2, FLANK_BEAM_HEIGHT, FLANK_BEAM_DEPTH, darkMaterial, 0, FLANK_BEAM_Y, cz, 'flankBeam')
  }

  // Forward housing: two stepped tiers dropping toward the cutter, with the
  // intake grille refitted onto the lower front tier's face.
  const noseStepZ = BODY.noseBlockAftZ - NOSE_REAR_LEN
  rb(deckHalf * 2, NOSE_REAR_TOP - 2, NOSE_REAR_LEN, 1.0, bodyLowMaterial, 0, (2 + NOSE_REAR_TOP) / 2, (noseStepZ + BODY.noseBlockAftZ) / 2, 'noseTierRear')
  rb(NOSE_FRONT_HALFWIDTH * 2, NOSE_FRONT_TOP - 2, noseStepZ - BODY.noseZ, 0.8, bodyLowMaterial, 0, (2 + NOSE_FRONT_TOP) / 2, (BODY.noseZ + noseStepZ) / 2, 'noseTierFront')
  b(NOSE_FRONT_HALFWIDTH * 2 - 2, 4.0, 0.5, darkMaterial, 0, 4.5, BODY.noseZ + 0.4, 'noseGrille')
  // Tier-break trim: a dark strip on the rear tier's exposed shoulder, so
  // the width step (rear wider than the tapered front) reads as more than a
  // silhouette change. Pass-2 report: "boom"/"front" sit near the TAIL
  // looking toward the nose (verified empirically), not dead ahead of it.
  b(deckHalf * 2, 0.3, 0.3, trimMaterial, 0, NOSE_FRONT_TOP, noseStepZ, 'noseTierTrim')

  // Rear housing: a low processing tower at the tail, with vent slats.
  const tailLen = BODY.tailZ - BODY.tailBlockForeZ
  rb(16, 6.0, tailLen, 0.9, bodyMaterial, 0, 9.0, (BODY.tailBlockForeZ + BODY.tailZ) / 2)
  b(12, 0.5, 0.4, darkMaterial, 0, 11.2, BODY.tailZ - 0.3)

  // Flank panels: dark louvred cladding on the solid end blocks ONLY. The
  // open middle (between noseBlockAftZ and tailBlockForeZ) gets no panel —
  // the see-under gap is pinned design, not a gap to close.
  const flankBottom = BODY.underThickness
  const flankTop = BODY.deckTop - BODY.deckThickness
  const flankHeight = flankTop - flankBottom
  const flankCenterY = (flankBottom + flankTop) / 2
  const ends: Array<[number, number]> = [
    [BODY.noseZ, BODY.noseBlockAftZ],
    [BODY.tailBlockForeZ, BODY.tailZ],
  ]
  for (const [z0, z1] of ends) {
    const zLen = z1 - z0
    const zCenter = (z0 + z1) / 2
    for (const side of [-1, 1] as const) {
      const panelX = side * (deckHalf + FLANK_THICKNESS / 2)
      b(FLANK_THICKNESS, flankHeight, zLen, darkMaterial, panelX, flankCenterY, zCenter, 'flankPanel')
      const louvreX = side * (deckHalf + FLANK_THICKNESS + LOUVRE_THICKNESS / 2)
      for (let i = 1; i <= LOUVRE_COUNT; i++) {
        const y = flankBottom + (flankHeight * i) / (LOUVRE_COUNT + 1)
        b(LOUVRE_THICKNESS, LOUVRE_HEIGHT, zLen - 0.4, darkMaterial, louvreX, y, zCenter, 'flankPanel')
      }
    }
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
