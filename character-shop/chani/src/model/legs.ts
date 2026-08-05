// character-shop/chani/src/model/legs.ts
// One leg = a tapering tube hip-to-ankle plus a LOFTED BOOT. R1 pass 3 fixes
// three findings:
//
//   - Ski fins. Pass 2 folded heel/ball/toe into the leg tube's own path,
//     but that path segment runs almost entirely in Z, and the tube's ring
//     frame always contains (0,0,1) — so those rings collapsed into the
//     direction of travel and the foot came out as a flat blade. The boot is
//     now its own stack of rings (loft.ts) with a flat sole at Y=0, a long
//     asymmetric toe box forward, a heel behind, and a narrowing ankle
//     break; its top ring is buried inside the calf, so the tube's open end
//     never shows.
//   - The white crotch triangle. The femur mass is authored INBOARD of its
//     own armature joint (proportions.hipMassHalfX), so the two thighs sit
//     under the pelvis mass rather than out at hip width with a hole
//     between them, and the leg line runs hip -> knee -> ankle inward the
//     way a real leg does.
//   - Noodle limbs. Thigh 62mm vs calf 48mm radius with the knee pinched to
//     49mm between them, and every ring deeper than it is wide (DEPTH), so
//     the legs have front-to-back volume in profile.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { tube } from './primitives'
import { loft, type Ring } from './loft'

// The first radius is SMALLER than the second on purpose: that ring has to
// sit wholly inside the pelvis mass, because the tube has no end caps and an
// open ring poking out of its parent shows the background straight through
// the figure. The first pass-3 capture had a white notch in each hip from
// exactly this.
//
// Pass 3b thinned the top of the thigh (67 -> 62mm) and pulled its centre
// inboard (proportions.hipMassHalfX), so the thigh's outer surface now peaks
// at 158mm — clear of spec's 165mm hip. Before, the widest thing on the
// figure was the top of the leg, 1mm outside the hip it hangs from, which
// added to the bulbous-pad read.
const RADII = [0.056, 0.062, 0.060, 0.049, 0.048, 0.035, 0.031]
const DEPTH = [1.1, 1.12, 1.15, 1.05, 1.18, 1.12, 1.05]

/** Boot-local: Y=0 is the ground, the ring centres walk forward (zc < 0) as
 *  they drop, which is what puts a toe box in front of the ankle and a heel
 *  behind it. FULL keeps the sole and toe rings from tapering to a point —
 *  see Ring.full in loft.ts; without it a foot 265mm long and 94mm wide is
 *  a spearhead. The ankle rings return to a true ellipse. */
const FULL = 0.62

function bootRings(p: Proportions): Ring[] {
  const f = p.footLength
  return [
    { y: 0, rx: 0.044, zc: -f * 0.218, rzF: f * 0.435, rzB: f * 0.499, full: FULL },
    { y: 0.030, rx: 0.047, zc: -f * 0.195, rzF: f * 0.430, rzB: f * 0.480, full: FULL },
    { y: 0.062, rx: 0.045, zc: -f * 0.150, rzF: f * 0.360, rzB: f * 0.412, full: 0.72 },
    { y: 0.092, rx: 0.042, zc: -f * 0.075, rzF: f * 0.232, rzB: f * 0.322, full: 0.85 },
    { y: 0.120, rx: 0.038, zc: -f * 0.022, rzF: f * 0.165, rzB: f * 0.210 },
    { y: 0.150, rx: 0.028, zc: -f * 0.007, rzF: f * 0.112, rzB: f * 0.135 },
  ]
}

function buildOneLeg(group: Group, side: -1 | 1, p: Proportions, mat: ChaniMaterials): Mesh[] {
  // Leg-local X for a mass centred at `halfX` in WORLD half-width — the
  // group itself sits out at hipHalfWidth, so every offset here is negative.
  const at = (halfX: number): number => side * (halfX - p.hipHalfWidth)
  const hipX = at(p.hipMassHalfX)
  const kneeX = at(p.kneeHalfX)
  const ankleX = at(p.ankleHalfX)
  const path = [
    // Embedded ring: pulled inboard as well as up, so the whole ring clears
    // the pelvis surface (rx ~146mm at this height) with 11mm to spare.
    { x: at(p.hipMassHalfX * 0.75), y: 0.030, z: 0.006 },
    { x: hipX, y: 0, z: 0.004 },
    { x: hipX + (kneeX - hipX) * 0.47, y: -p.thighLen * 0.47, z: 0 },
    { x: kneeX, y: -p.thighLen, z: -0.004 },
    { x: kneeX + (ankleX - kneeX) * 0.37, y: -p.thighLen - p.calfLen * 0.37, z: 0.010 },
    { x: kneeX + (ankleX - kneeX) * 0.76, y: -p.thighLen - p.calfLen * 0.76, z: 0.006 },
    { x: ankleX, y: -p.thighLen - p.calfLen, z: 0 },
  ]
  const leg = tube(path, RADII, mat.fabric, 14, DEPTH)
  leg.name = side < 0 ? 'legMassL' : 'legMassR'

  const boot = loft(bootRings(p), mat.fabric, 22)
  boot.position.set(ankleX, -p.legH, 0)
  boot.name = side < 0 ? 'bootL' : 'bootR'

  group.add(leg, boot)
  return [leg, boot]
}

export function buildLegs(groups: { legL: Group; legR: Group }, p: Proportions, mat: ChaniMaterials): Mesh[] {
  return [
    ...buildOneLeg(groups.legL, -1, p, mat),
    ...buildOneLeg(groups.legR, 1, p, mat),
  ]
}
