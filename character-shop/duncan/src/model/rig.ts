// character-shop/duncan/src/model/rig.ts
// Costume identity (spec.ts COSTUME.extras): a leather chest rig with strap
// lines, and a belt. Massing only — buckles, pouches and stitching are R3.
//
// The rig is not authored against numbers of its own. Every one of its
// sections is SAMPLED off TORSO_STATIONS at the height it sits at
// (stations.ts profileAtY) and then pushed proud or sunk. Consequences, all
// wanted: it can never drift off the body it is worn on however torso.ts is
// retuned; it curves with the ribcage instead of cutting a chord across it;
// and where its back is INSIDE the torso it reads as a front panel with no
// open shell edge and no back-face to render.
//
// Two pass-4 corrections, both from reading the renders:
//   - The panel wrapped 3% PROUD at the flanks, which made a band right
//     round the ribcage — a bodice, not a chest rig. Its sides are now sunk
//     (0.985) so only the front stands out and the plate's own outline is
//     where the two surfaces cross.
//   - The straps were boxes at a fixed Z. The ribcage's front recedes ~76mm
//     between the panel's top edge and the collar, so by the trapezius they
//     floated 40mm clear of the chest. They are now lofted, and each station
//     solves the torso's own front surface AT THAT STATION'S OWN X — a
//     section is an ellipse, so the surface at x=96mm sits 34mm further back
//     than the surface on the centreline at the same height.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import { profileAtY } from './stations'
import type { Profile, Station } from './stations'
import { TORSO_STATIONS } from './torso'
import { JOINTS } from './bodyPlan'

/** [height, front scale, side scale, back scale] against the torso's own
 *  section at that height. The panel's proudness FADES TO 1.00 at both ends
 *  — flush with the body — so its top and bottom edges sink into the chest
 *  instead of standing off it as the horizontal rims that made the first
 *  pass-4 build read as a rectangular bib. What is left is one closed curve
 *  where the two surfaces cross: a plate. */
const PANEL: [number, number, number, number][] = [
  [1.250, 1.000, 0.950, 0.90],
  [1.285, 1.060, 0.990, 0.90],
  [1.330, 1.075, 1.000, 0.90],
  [1.375, 1.055, 0.985, 0.90],
  [1.405, 1.000, 0.950, 0.90],
]
/** A belt really is a closed ring with hard edges, so it is the one piece
 *  proud all the way round and the one allowed a rim. */
const BELT: [number, number, number, number][] = [
  [1.150, 1.035, 1.035, 1.035],
  [1.176, 1.035, 1.035, 1.035],
  [1.202, 1.035, 1.035, 1.035],
]

/** Strap centreline: up off the panel, out toward the shoulder, and less
 *  proud as it climbs so the trapezius can take it over the top. */
const STRAP = { ys: [1.395, 1.450, 1.500, 1.545, 1.578], xs: [0.060, 0.068, 0.078, 0.088, 0.096], proud: [0.45, 0.45, 0.35, 0.15, 0.0], rx: 0.026, rz: 0.017 }

function worn(rows: [number, number, number, number][]): Station[] {
  return rows.map(([y, front, side, back]) => {
    const p = profileAtY(TORSO_STATIONS, y)
    return { y, rx: p.rx * side, rb: p.rb * back, rf: p.rf * front, cz: p.cz }
  })
}

/** Z of the torso's FRONT surface at lateral offset x — the ring is an egg,
 *  so this is not p.cz - p.rf except on the centreline. */
function frontZ(p: Profile, x: number): number {
  const theta = Math.PI - Math.asin(Math.min(0.985, Math.abs(x) / p.rx))
  const c = Math.cos(theta)
  return p.cz + ((p.rb * (1 + c) + p.rf * (1 - c)) / 2) * c
}

function strapStations(side: -1 | 1): Station[] {
  return STRAP.ys.map((y, i) => {
    const x = STRAP.xs[i]
    return {
      y, rx: STRAP.rx, rb: STRAP.rz, rf: STRAP.rz,
      cx: side * x,
      cz: frontZ(profileAtY(TORSO_STATIONS, y), x) + STRAP.rz * STRAP.proud[i],
    }
  })
}

export function buildRig(bin: Bin, materials: DuncanMaterials, pelvis: Group): void {
  const originY = JOINTS.pelvisY

  loft(bin, pelvis, worn(PANEL), materials.accent, 'chestRigPanel', {
    originY, rings: 24, radial: 32,
  })
  loft(bin, pelvis, worn(BELT), materials.accent, 'belt', {
    originY, rings: 10, radial: 32,
  })
  for (const side of [-1, 1] as const) {
    loft(bin, pelvis, strapStations(side), materials.accent, 'chestRigStrap', {
      originY, rings: 20, radial: 16, domeBottomH: 0.010, domeTopH: 0.010,
    })
  }
}
