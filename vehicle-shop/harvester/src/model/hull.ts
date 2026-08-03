// vehicle-shop/harvester/src/model/hull.ts
// COMPONENT 1 — the platform. A SEAMED deck (transverse panel gaps, each
// recessed below the top plane), a thin underframe web braced by a few
// full-envelope cross-members, a nose that STEPS DOWN toward the cutter, a
// low tail housing, and dark louvred flank panels on the solid end blocks
// ONLY — the open mid-section keeps no panel at all, the see-under gap that
// is this machine's identity. Reads spec.BODY only; no scene access, no
// crawler state.

import { BoxGeometry, Mesh, MeshStandardMaterial, Group, type BufferGeometry } from 'three'
import { BODY, TRACK, BOOM } from '../spec'
import { roundedBox } from './rounded'

const LENGTH = BODY.tailZ - BODY.noseZ

// Deck seams: the slab split into SEAM_COUNT+1 plates by transverse gaps.
// Each gap is a REAL absence of deck material with a dark filler recessed
// below the deck's top plane — deepened/widened (pass 2, critic: WEAK from
// 3/4) so the groove casts real shadow, not a hairline. A proud lip flanks
// each seam on the plate's own top, catching light at oblique angles.
const SEAM_COUNT = 4
const SEAM_WIDTH = 0.7
const SEAM_RECESS = 0.6
const SEAM_LIP_HEIGHT = 0.14
const SEAM_LIP_WIDTH = 0.3

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

// Flank cross-beams (pass 2, critic's fix): slender members spanning
// LATERALLY across the open middle. Y sits between the road wheels' own
// top (spec-derived: mid-flank height sits INSIDE the wheels' silhouette,
// invisible past them) and the housing's underside. Z is NOT the
// underframe ribs' spacing — a wheel's shadow along a grazing sightline is
// wider than its own footprint, so the true clear lanes were found by
// ray-tracing the low-flank/hero camera presets (tools/views.mjs) through
// the running gear's spec'd radii: two lanes survive, Z ~5.4-7.4 and
// ~10.5-11.3. There the beams silhouette against the sand THROUGH the
// see-under gap instead of hiding behind the wheels. Kept few and thin:
// the open-middle probe test fails if they ever approach a closed wall.
const RUNNING_GEAR_TOP = TRACK.sprocketY - TRACK.sprocketRadius + TRACK.roadWheelRadius * 2
const FLANK_BEAM_Y = (RUNNING_GEAR_TOP + TRACK.housing.yLow) / 2
const FLANK_BEAM_HEIGHT = 0.6
const FLANK_BEAM_DEPTH = 0.5
const FLANK_BEAM_Z = [6.4, 10.9] as const
const FLANK_BEAM_HALFWIDTH = TRACK.centreX - TRACK.housing.width / 2 - 0.1

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

export function buildHull(bodyMaterial: MeshStandardMaterial, darkMaterial: MeshStandardMaterial): HullParts {
  const group = new Group()
  group.name = 'hull'
  const geometries: BufferGeometry[] = []

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.name = name
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const rbox = (w: number, h: number, d: number, radius: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void => {
    const g = roundedBox(w, h, d, radius)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.name = name
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const deckHalf = BODY.halfWidth
  const deckY = BODY.deckTop - BODY.deckThickness / 2

  // Deck plates and their seams — the platform reads as plated, not poured.
  const segLen = LENGTH / (SEAM_COUNT + 1)
  const halfGap = SEAM_WIDTH / 2
  for (let i = 0; i <= SEAM_COUNT; i++) {
    const start = BODY.noseZ + i * segLen + (i > 0 ? halfGap : 0)
    const end = BODY.noseZ + (i + 1) * segLen - (i < SEAM_COUNT ? halfGap : 0)
    rbox(deckHalf * 2, BODY.deckThickness, end - start, 1.0, bodyMaterial, 0, deckY, (start + end) / 2, 'deckPlate')
  }
  for (let i = 1; i <= SEAM_COUNT; i++) {
    const seamZ = BODY.noseZ + i * segLen
    const seamHeight = BODY.deckThickness - SEAM_RECESS
    const seamTop = BODY.deckTop - SEAM_RECESS
    box(deckHalf * 2, seamHeight, SEAM_WIDTH, darkMaterial, 0, seamTop - seamHeight / 2, seamZ, 'deckSeam')
    // Proud lips flanking the seam, on each plate's own top surface — the
    // 3/4-angle read the recess alone misses.
    const lipOffset = halfGap + SEAM_LIP_WIDTH / 2
    box(deckHalf * 2, SEAM_LIP_HEIGHT, SEAM_LIP_WIDTH, darkMaterial, 0, BODY.deckTop + SEAM_LIP_HEIGHT / 2, seamZ - lipOffset, 'deckSeamLip')
    box(deckHalf * 2, SEAM_LIP_HEIGHT, SEAM_LIP_WIDTH, darkMaterial, 0, BODY.deckTop + SEAM_LIP_HEIGHT / 2, seamZ + lipOffset, 'deckSeamLip')
  }

  // Underframe: the end regions keep the ORIGINAL full thickness (matching
  // the solid nose/tail blocks above, so no new gap opens under the
  // flank panels there); only the OPEN MIDDLE thins to a web, its
  // cross-members reaching the full envelope so they read as bracing.
  const midLen = BODY.tailBlockForeZ - BODY.noseBlockAftZ
  rbox(deckHalf * 2, BODY.underThickness, BODY.noseBlockAftZ - BODY.noseZ, 0.6, bodyMaterial, 0, BODY.underThickness / 2, (BODY.noseZ + BODY.noseBlockAftZ) / 2)
  rbox(deckHalf * 2, BODY.underThickness, BODY.tailZ - BODY.tailBlockForeZ, 0.6, bodyMaterial, 0, BODY.underThickness / 2, (BODY.tailBlockForeZ + BODY.tailZ) / 2)
  rbox(deckHalf * 2, WEB_THICKNESS, midLen, 0.3, bodyMaterial, 0, WEB_THICKNESS / 2, (BODY.noseBlockAftZ + BODY.tailBlockForeZ) / 2)
  for (const cz of CROSS_MEMBER_Z) {
    box(deckHalf * 2, BODY.underThickness, CROSS_MEMBER_DEPTH, darkMaterial, 0, BODY.underThickness / 2, cz, 'crossMember')
  }
  // The visible companions, raised into the open gap at flank height, at
  // their OWN (camera-cleared) Z stations — see the FLANK_BEAM_* comment
  // above for why they do not share the underframe ribs' Z or height.
  for (const cz of FLANK_BEAM_Z) {
    box(FLANK_BEAM_HALFWIDTH * 2, FLANK_BEAM_HEIGHT, FLANK_BEAM_DEPTH, darkMaterial, 0, FLANK_BEAM_Y, cz, 'flankBeam')
  }

  // Raised trim lip around the deck edge — the film's deck reads as a
  // bordered platform, not a bare slab edge.
  const lipY = BODY.deckTop + 0.18
  box(0.5, 0.36, LENGTH, darkMaterial, -deckHalf + 0.05, lipY, 0)
  box(0.5, 0.36, LENGTH, darkMaterial, deckHalf - 0.05, lipY, 0)
  box(deckHalf * 2, 0.36, 0.5, darkMaterial, 0, lipY, BODY.noseZ + 0.05)
  box(deckHalf * 2, 0.36, 0.5, darkMaterial, 0, lipY, BODY.tailZ - 0.05)

  // Forward housing: two stepped tiers dropping toward the cutter, with the
  // intake grille refitted onto the lower front tier's face.
  const noseStepZ = BODY.noseBlockAftZ - NOSE_REAR_LEN
  rbox(deckHalf * 2, NOSE_REAR_TOP - 2, NOSE_REAR_LEN, 1.0, bodyMaterial, 0, (2 + NOSE_REAR_TOP) / 2, (noseStepZ + BODY.noseBlockAftZ) / 2, 'noseTierRear')
  rbox(NOSE_FRONT_HALFWIDTH * 2, NOSE_FRONT_TOP - 2, noseStepZ - BODY.noseZ, 0.8, bodyMaterial, 0, (2 + NOSE_FRONT_TOP) / 2, (BODY.noseZ + noseStepZ) / 2, 'noseTierFront')
  box(NOSE_FRONT_HALFWIDTH * 2 - 2, 4.0, 0.5, darkMaterial, 0, 4.5, BODY.noseZ + 0.4, 'noseGrille')
  // Tier-break trim: a dark strip on the rear tier's exposed shoulder, so
  // the width step (rear wider than the tapered front) reads as more than a
  // silhouette change. Pass-2 report: "boom"/"front" sit near the TAIL
  // looking toward the nose (verified empirically), not dead ahead of it.
  box(deckHalf * 2, 0.3, 0.3, darkMaterial, 0, NOSE_FRONT_TOP, noseStepZ, 'noseTierTrim')

  // Rear housing: a low processing tower at the tail, with vent slats.
  const tailLen = BODY.tailZ - BODY.tailBlockForeZ
  rbox(16, 6.0, tailLen, 0.9, bodyMaterial, 0, 9.0, (BODY.tailBlockForeZ + BODY.tailZ) / 2)
  box(12, 0.5, 0.4, darkMaterial, 0, 11.2, BODY.tailZ - 0.3)

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
      box(FLANK_THICKNESS, flankHeight, zLen, darkMaterial, panelX, flankCenterY, zCenter, 'flankPanel')
      const louvreX = side * (deckHalf + FLANK_THICKNESS + LOUVRE_THICKNESS / 2)
      for (let i = 1; i <= LOUVRE_COUNT; i++) {
        const y = flankBottom + (flankHeight * i) / (LOUVRE_COUNT + 1)
        box(LOUVRE_THICKNESS, LOUVRE_HEIGHT, zLen - 0.4, darkMaterial, louvreX, y, zCenter, 'flankPanel')
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
