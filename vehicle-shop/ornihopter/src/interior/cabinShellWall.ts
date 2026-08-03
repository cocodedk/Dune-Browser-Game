// vehicle-shop/ornihopter/src/interior/cabinShellWall.ts
// The cabin's side liner: floor to roof, tracing the hull's own section.
//
// FOUND, round 6b, by raycasting the pilot frustum against the built meshes
// (interior/sightlines.ts): looking to port, 100% of the frame was rays that
// left the airframe. Not "dark", not "untextured" — absent. The wall's top
// edge stopped at CANOPY_SIDE_SILL_Y, a shoulder-height line the round-6a
// canopy rebuild left it clamped to, and the metre of upper flank between
// that line and the deck had no liner at all. The hull skin is FrontSide, so
// from inside it is not there either, and the pilot was looking straight out
// through the side of the craft into sunlit desert.
//
// The wall now runs from COCKPIT.floorY to canopyFrame.ts's own roof line, and
// it traces the section's real corners on the way: hullSectionBreakpoints
// gives the chine and the upper-flank break at each station, so the liner is
// three panels tall — tucked lower flank, flank, upper flank — exactly the
// polygon hullCrossSection.ts lofts on the outside. Top edge and roof edge are
// the same function of z (canopyLayout.ts's roofHalfWidthAt), so they meet by
// construction rather than by two guesses that happen to agree.
//
// FOUND, round 4b.2 and still true: the BASE reads
// hullInteriorHalfWidthAt(COCKPIT.floorY, z), not a constant half-width, and a
// span is drawn only when both ends independently verify positive.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { FLOOR_FRONT_Z, FLOOR_REAR_Z, WALL } from './layout'
import { RAIL_Y, roofHalfWidthAt, roofYAt } from './canopyLayout'
import { deckYAt } from '../model/geometry/canopyPlan'
import { hullInteriorHalfWidthAt, hullSectionBreakpoints, hullZSamples } from './hullSection'
import { flankWindowEdgeAt } from '../model/geometry/flankWindow'
import { FLANK_OPENINGS, bayOpening } from '../model/geometry/flankOpenings'
import { buildFlankPane } from './flankPaneFrame'
import { box, flatQuad, type Placed } from './sceneUtils'
import { hullLinerMaterial, armorMaterial, gunmetalMaterial } from './materials'

/** Vertical band count in the liner: floor, chine, upper-flank break, roof. */
const PROFILE_POINTS = 4

/**
 * The station's own vertical breakpoints, normalised to a fixed count so two
 * neighbouring stations always pair index-for-index. Over the cockpit run both
 * corners genuinely fall between the floor and the roof, so the padding below
 * is defensive rather than load-bearing — but a station that lost a corner
 * would otherwise silently chord across it.
 */
function profileYs(z: number): number[] | null {
  const ys = hullSectionBreakpoints(z, COCKPIT.floorY, roofYAt(z))
  if (ys.length < 2) return null
  while (ys.length < PROFILE_POINTS) ys.splice(1, 0, (ys[0] + ys[1]) / 2)
  while (ys.length > PROFILE_POINTS) ys.splice(1, 1)
  return ys
}

/**
 * FOUND by raycast, round 6b, and the reason the wall's top does NOT simply
 * stop where the roof liner starts: two quads that share an edge are not
 * watertight to a ray that grazes that edge. With the wall's top corner and
 * the roof band's outboard corner at the same point, three rays in ten
 * thousand — all sweeping up and outboard, all within a centimetre of the
 * junction — passed between them and left the craft. Butting surfaces is the
 * defect; OVERLAPPING them is the fix. The top band leans 0.04m inboard and
 * runs 0.055m PAST the roof plane, so wall and roof interpenetrate and the
 * junction is solid from every direction. Inboard rather than outboard on
 * purpose: outboard would poke the liner through the hull skin, which is the
 * bug round 4b spent a whole round removing.
 */
const TOP_OVERLAP_X = 0.04

interface Profile {
  ys: number[]
  xs: number[]
  /** Band index the liner does NOT emit — the Apache side pane's opening. */
  skip: number
}

/**
 * ROUND 11, the B6 user ruling. Over a side window's run the liner gains two
 * extra breakpoints — the opening's own sill and header, read from
 * model/geometry/flankWindow.ts so the hole in the cabin and the hole in the
 * skin are the same rectangle — and stops emitting the band between them.
 * Everything else about the wall is unchanged, including the sill rail below
 * it: the glass starts where the armoured tub ends (round 9d), it does not
 * replace it.
 *
 * ROUND 15 runs the same code over the quarter opening. One thing differs and
 * is deliberate: there the hull's upper-flank break falls BELOW the sill
 * (0.836 against 0.970 at 1.45m aft) instead of inside the opening, so the
 * splice drops a corner and the chine-to-sill band chords across it — measured
 * 0.045m, INBOARD, the safe direction (round 4b's bug was liner poking OUT).
 */
function widthsAt(z: number, windowed: boolean): Profile | null {
  const ys = profileYs(z)
  if (!ys) return null
  const top = ys.length - 1
  ys[top] = deckYAt(z) - 0.005
  const opening = windowed ? flankWindowEdgeAt(z) : null
  if (opening) {
    // floor, chine, SILL, HEADER, roof — the upper-flank break between them
    // is inside the opening and goes with it.
    ys.splice(2, 1, opening.low.y, opening.high.y)
  }
  const xs = ys.map((y) => hullInteriorHalfWidthAt(y, z))
  xs[xs.length - 1] = roofHalfWidthAt(z) - TOP_OVERLAP_X
  if (xs.some((x) => x <= 0)) return null
  return { ys, xs, skip: opening ? 2 : -1 }
}

function panels(group: Group, sign: 1 | -1, za: number, zb: number): void {
  const windowed = bayOpening(za, zb) !== null
  const a = widthsAt(za, windowed)
  const b = widthsAt(zb, windowed)
  if (!a || !b || a.ys.length !== b.ys.length) return
  const material = hullLinerMaterial()
  for (let i = 0; i < a.ys.length - 1; i++) {
    if (i === a.skip) continue
    const lowA: Placed = { x: sign * a.xs[i], y: a.ys[i], z: za }
    const lowB: Placed = { x: sign * b.xs[i], y: b.ys[i], z: zb }
    const highB: Placed = { x: sign * b.xs[i + 1], y: b.ys[i + 1], z: zb }
    const highA: Placed = { x: sign * a.xs[i + 1], y: a.ys[i + 1], z: za }
    group.add(flatQuad(lowA, lowB, highB, highA, material))
  }
}

/** Half-width of the liner at the shoulder rail's own height. */
function railHalfWidthAt(z: number): number {
  return hullInteriorHalfWidthAt(RAIL_Y, z)
}

/**
 * The shoulder rail: a longitudinal beam down each side at the pilot's own
 * shoulder line. This is what puts a hard edge at the outboard limit of the
 * view — "nothing anchors a seated body" was the ergonomic half of the
 * critique, and a tub whose edge you can see is most of the answer. ROUND
 * 9d: this IS the "high sill" a critic read as "the same olive as
 * everything" — onto the dark armor tone, named so crewPalette.test.ts can
 * hold it there.
 */
function shoulderRail(group: Group, sign: 1 | -1): void {
  const samples = hullZSamples(FLOOR_FRONT_Z, FLOOR_REAR_Z, 0.5)
  for (let i = 0; i < samples.length - 1; i++) {
    const za = samples[i]
    const zb = samples[i + 1]
    const wa = railHalfWidthAt(za)
    const wb = railHalfWidthAt(zb)
    if (wa <= 0 || wb <= 0) continue
    const mesh = box(0.1, 0.14, zb - za, armorMaterial(), {
      x: (sign * (wa + wb)) / 2 - sign * 0.05,
      y: RAIL_Y,
      z: (za + zb) / 2,
    })
    mesh.name = 'sill-rail'
    group.add(mesh)
  }
}

/**
 * Side wall for one flank. Sub-sampled finely (hullZSamples) so the base and
 * top curves are traced rather than chorded, and a span is only drawn when
 * both ends verify — the floor's own rule since round 4b.
 */
export function buildSideWall(sign: 1 | -1): Group {
  const group = new Group()
  group.name = sign === -1 ? 'wall-pilot' : 'wall-copilot'

  // EVERY window's two ends are sampled EXACTLY, so no band ever straddles a
  // boundary with one end open and the other closed — including the 0.10m
  // post between the quarter pane and round 11's, which is a band of its own.
  const samples = [
    ...hullZSamples(FLOOR_FRONT_Z, FLOOR_REAR_Z, 0.3),
    ...FLANK_OPENINGS.flatMap((o) => [o.foreZ, o.aftZ]),
  ].sort((p, q) => p - q)
  for (let i = 0; i < samples.length - 1; i++) panels(group, sign, samples[i], samples[i + 1])

  group.add(buildFlankPane(sign))
  shoulderRail(group, sign)

  // Greeble ribs on the flank panel, between the rail and the floor. X and Y
  // interpolate between the hull-derived base and the rail so they sit ON the
  // tapered face rather than beside it; a rib whose z has no verified base is
  // skipped rather than drawn floating (round 2's original bug).
  const barCount = 5
  const span = WALL.greebleZMax - WALL.greebleZMin
  for (let i = 0; i < barCount; i++) {
    const z = WALL.greebleZMin + (span * (i + 0.5)) / barCount
    const baseX = hullInteriorHalfWidthAt(COCKPIT.floorY, z)
    const railX = railHalfWidthAt(z)
    if (baseX <= 0 || railX <= 0) continue
    const frac = 0.55
    group.add(
      box(0.05, 0.34, span / barCount - 0.06, gunmetalMaterial(), {
        x: sign * (baseX + (railX - baseX) * frac - 0.03),
        y: COCKPIT.floorY + (RAIL_Y - COCKPIT.floorY) * frac,
        z,
      })
    )
  }
  return group
}
