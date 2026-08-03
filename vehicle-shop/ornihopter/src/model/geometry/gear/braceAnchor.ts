// vehicle-shop/ornihopter/src/model/geometry/gear/braceAnchor.ts
// Where a leg's SECOND bar starts and where it lands.
//
// Split out of ./stance.ts the way ./hipSeat.ts was, and for the same reason:
// stance.ts is the stance, and two of its constants had grown a page of
// derivation each. This is the half worth reading on its own, because the
// brace is what round 6d added and the numbers here are the ones a later round
// will be tempted to change.
//
// docs/profiles/kit-dossier.md §a measured the kit's leg as a two-bar linkage:
// "a long main strut -> a shorter brace strut crossing it (a scissor/four-bar
// mechanism, consistent with a foldable gear)". The assembled photographs
// (docs/dune_ornihopter_kit-2.png and the ...kit-3.png close-up) show the two
// bars reaching the fuselage at two separate points and converging low, with a
// long narrow void between them. That void is the whole point: a triangulated
// leg reads as ONE leg with structure, where two near-parallel sticks read as
// the "uncountable knot" the blind critic reported.

import type { Point3 } from './hipSeat'

/**
 * Fore/aft gap between a leg's two hull anchors, along the flank. Applied
 * AGAINST the leg's own rake, so the brace stands steeper than the main strut
 * and the triangle opens toward the hull instead of collapsing into two
 * parallel bars.
 *
 * MEASURED over a sweep, not chosen: every brace has to come out shorter than
 * the strut it braces at ALL THREE stations, and the front leg binds because
 * it rakes 1.7m forward and so its brace has the longest run to make. With
 * BRACE_ON_TIBIA the three ratios are 0.886 / 0.795 / 0.788 of the main
 * strut's own hip-knee-ankle path.
 */
export const BRACE_SPLIT = 1.05

/**
 * Where the brace lands, as a fraction down the TIBIA from the knee.
 *
 * REVISED, with the reason, from "0.66 of the way down the femur". That draft
 * read the dossier's "a long main strut -> a shorter brace strut" as shorter
 * than the FEMUR, which forces the apex ABOVE the knee — and the rendered side
 * view showed the consequence: the triangle occupied the top third of the leg
 * and everything below it was a single stick again, which is the defect this
 * round exists to remove. The dossier's "main strut" is the whole bar from hip
 * bracket to foot (it measures `Gear_left`'s principal length, 35.29mm, hip to
 * foot), so the bar to be shorter than is the leg's whole reach, not one
 * segment of it. Landing on the tibia puts the apex below the knee and opens
 * the void across roughly 70% of the leg, which is what kit-2's front leg
 * actually shows.
 */
export const BRACE_ON_TIBIA = 0.35

/** Station for the brace's own flank seat: BRACE_SPLIT against the rake. */
export function braceSeatZ(z: number, rakeZ: number): number {
  return z - Math.sign(rakeZ) * BRACE_SPLIT
}

/** The apex of the triangle, on the tibia below the knee. */
export function braceNodeAt(knee: Point3, ankle: Point3): Point3 {
  const at = (a: number, b: number): number => a + (b - a) * BRACE_ON_TIBIA
  return { x: at(knee.x, ankle.x), y: at(knee.y, ankle.y), z: at(knee.z, ankle.z) }
}
