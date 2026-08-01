// vehicle-shop/ornihopter/src/interior/cabinShellWall.ts
// The cabin's side-wall liner panels. Split out of cabinShell.ts in round
// 4b.2 purely to keep that file under the repo's 200-line cap (see
// hullSection.ts, split out of the same file for the same reason in round
// 4b) — no behaviour here is new to this file, only to its own history below.
//
// FOUND, round 4b.2: the wall's BASE was still planted at a constant
// WALL.halfX (2.3m) regardless of the hull's own taper, the one number round
// 4b's floor/bulkhead rebuild never touched (that round's report named this
// exact gap and dispatched this round to close it). Measured against the
// pre-fix code: every base vertex at the wall's own station z's sat
// 0.77-2.15m outside the hull skin (outwardDistance), and 0.95-2.3m past
// hullInteriorHalfWidthAt at the same z — the full 2.3m at the nose, where
// the hull has no width at COCKPIT.floorY at all. Fixed the same way as the
// floor (cabinShell.ts's buildFloor): the base now reads
// hullInteriorHalfWidthAt(COCKPIT.floorY, z) instead of a constant, segmented
// finely (hullSection.ts's hullZSamples, the floor's own FLOOR_SEGMENTS idea
// pulled out to a shared helper so this file does not re-derive or drift from
// it) so the curve is traced rather than chorded, and a span is only drawn
// when BOTH ends independently verify positive — the floor's own
// segment-drop, not a pinch to x=0 (hullSection.ts's header explains why
// pinching was rejected there: an unverified end is not a safe vertex, it is
// an unanswered question). The TOP edge (canopySectionAt) is untouched.
// Greeble ribs skip the same way a base-less span does: nothing to attach to.
//
// FOUND, round 3: the previous wall was a flat box at a constant half-width
// (2.3m) the whole cabin length, while the canopy's own sill narrows to 0.7m
// at the nose and bulges to 2.5m at the shoulder. The wall sat OUTSIDE the
// canopy's own footprint for most of the forward run — not just failing to
// meet the glazing, but standing somewhere the shell never reached, which is
// the "entire right half... unbounded open sky" a blind critic reported.
// canopySectionAt is now the single source for both, so the wall's top edge
// cannot land anywhere the canopy itself does not.
//
// FOUND, round 2: the four black rectangular panes a blind critic reported
// floating unattached at upper-left of the pilot frame (progress.md) were the
// four ribs below — coded well above the wall's own top edge, attached to
// nothing. Fixed by moving them onto the wall's own face; they now also
// track its taper.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { canopySectionAt, CANOPY_STATION_Z } from '../model/geometry/canopyGeometry'
import { WALL, FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'
import { hullInteriorHalfWidthAt, hullZSamples } from './hullSection'
import { box, flatQuad, type Placed } from './sceneUtils'
import { hullLinerMaterial, gunmetalMaterial } from './materials'

// Kept inboard of the canopy's own sill rail beam (canopyGeometry.ts's
// BEAM_THICKNESS) so the liner's top edge never pokes past it into the glass.
const SILL_MARGIN = 0.08
// Outer breakpoints for the wall's z-span. Not used to bound the base
// directly (see buildSideWall) but still the exact z's the TOP edge
// (canopySectionAt) is piecewise-linear over, so hullZSamples is called once
// per bracket rather than once across the whole span — a sub-sample can never
// straddle a canopy kink and chord across it (round 3's own fix, preserved).
const WALL_ZS = [
  FLOOR_FRONT_Z, CANOPY_STATION_Z.nose, CANOPY_STATION_Z.shoulder, CANOPY_STATION_Z.rear, FLOOR_REAR_Z,
]

/**
 * Side wall. TOP edge unchanged since round 3: canopySectionAt(z), inset by
 * SILL_MARGIN. BASE edge, since round 4b.2, is no longer a constant half-width
 * — it is hullInteriorHalfWidthAt(COCKPIT.floorY, z), the same function and
 * the same fixed height cabinShell.ts's buildFloor already reads, so the
 * wall's own foot can never stand outside the hull skin the floor is itself
 * bounded by. Each of the four canopy-station brackets is sub-sampled
 * (hullZSamples) so the base curve is traced rather than chorded, and — the
 * floor's own rule, not a new one — a span is only drawn when BOTH ends
 * independently verify positive, never pinched to x=0 at the one end that
 * failed.
 */
export function buildSideWall(sign: 1 | -1): Group {
  const group = new Group()
  group.name = sign === -1 ? 'wall-pilot' : 'wall-copilot'
  const material = hullLinerMaterial()

  for (let i = 0; i < WALL_ZS.length - 1; i++) {
    const samples = hullZSamples(WALL_ZS[i], WALL_ZS[i + 1])
    for (let j = 0; j < samples.length - 1; j++) {
      const za = samples[j]
      const zb = samples[j + 1]
      const wa = hullInteriorHalfWidthAt(COCKPIT.floorY, za)
      const wb = hullInteriorHalfWidthAt(COCKPIT.floorY, zb)
      if (wa <= 0 || wb <= 0) continue // either end unverified at floor height — do not bridge to it
      const ta = canopySectionAt(za)
      const tb = canopySectionAt(zb)
      const bottomA: Placed = { x: sign * wa, y: COCKPIT.floorY, z: za }
      const bottomB: Placed = { x: sign * wb, y: COCKPIT.floorY, z: zb }
      const topB: Placed = { x: sign * (tb.halfWidth - SILL_MARGIN), y: tb.baseY, z: zb }
      const topA: Placed = { x: sign * (ta.halfWidth - SILL_MARGIN), y: ta.baseY, z: za }
      group.add(flatQuad(bottomA, bottomB, topB, topA, material))
    }
  }

  // Greeble ribs — see layout.ts WALL for why only forward of z=-9.5 is
  // worth detailing. X/Y interpolate the same way the quads above do, between
  // the hull-derived base and the canopy's local sill, at the rib's own
  // height fraction, so they sit ON the tapered face, not beside it. A rib
  // whose own z has no verified base (same test as the quads above) is
  // skipped rather than drawn floating with nothing to attach to — round 2's
  // original bug, in a new guise.
  const barCount = 4
  const span = WALL.greebleZMax - WALL.greebleZMin
  const heightFrac = 0.6
  for (let i = 0; i < barCount; i++) {
    const z = WALL.greebleZMin + (span * (i + 0.5)) / barCount
    const baseX = hullInteriorHalfWidthAt(COCKPIT.floorY, z)
    if (baseX <= 0) continue
    const top = canopySectionAt(z)
    const bottomX = sign * baseX
    const topX = sign * (top.halfWidth - SILL_MARGIN)
    const ribX = bottomX + (topX - bottomX) * heightFrac - sign * 0.04
    const ribY = COCKPIT.floorY + (top.baseY - COCKPIT.floorY) * heightFrac
    group.add(box(0.03, 0.3, span / barCount - 0.05, gunmetalMaterial(), { x: ribX, y: ribY, z }))
  }
  return group
}
