// vehicle-shop/ornihopter/src/model/geometry/gear/leg.ts
// One leg, as the kit MEASURES one: a castellated locking loop on the flank
// (./hipBracket.ts) -> a long main strut -> a shorter brace strut triangulating
// with it -> a knuckle -> a tibia -> a slotted skid bar (./skid.ts).
//
// WHAT THIS REPLACES, and why. Round 4c built a good silhouette out of the
// wrong parts: a plain boss, two parallel femur rails with a slot between them,
// a knuckle, a tibia and a spade. docs/profiles/kit-dossier.md §a, measured off
// `Gear_left.stl` rather than off a photograph, describes a two-BAR linkage —
// "a hip bracket (a hollow rectangular loop with a castellated/notched edge)
// -> a long main strut -> a shorter brace strut crossing it (a scissor/four-bar
// mechanism) -> a foot that is itself a hollow elongated rectangular loop".
// None of that mechanism language was in the mesh.
//
// The two parallel rails are what the brace replaces. They cost the same two
// segments and read as one bar with a hairline down it; a main strut and a
// brace converging low read as a TRIANGLE, which is also the answer to the
// blind critic's "the legs read as an uncountable knot": triangulation is what
// says "one leg, with structure" instead of "two sticks that happen to meet".
//
// The main strut starts at stance.ts's BURIED anchor, not at the skin, so the
// old separate hip-boss segment is gone: one bar now runs from inside the hull,
// out through the bracket's window, to the knee. Same for the brace and its own
// anchor. That is why there is no boss in this file any more.
//
// Sixteen segments, 192 triangles, all in craft-local space for the RIGHT side.
// gearGeometry.ts mirrors the finished buffer; see its header for why the
// mirrored copy cannot reuse the same index order.

import { pushSegment, type MeshBuffers, type Section } from './plate'
import { towards, vec, walk } from './vec'
import { pushHipBracket } from './hipBracket'
import { pushSkid } from './skid'
import type { GearLeg } from './stance'

// Thicknesses are set for the SIDE view, where a leg plate is seen edge-on and
// its thickness is the only width it has. At the shot tool's framing the craft
// renders about 22 px per metre, so 0.27m of plate is six pixels. The main
// strut is thicker than the pair of rails it replaces because it is now doing
// their job alone; the brace is deliberately one step under it, so the eye can
// tell which bar is the leg and which is bracing it.
const MAIN_ROOT: Section = { halfBreadth: 0.26, halfThick: 0.135 }
const MAIN_KNEE: Section = { halfBreadth: 0.19, halfThick: 0.105 }
const BRACE_ROOT: Section = { halfBreadth: 0.18, halfThick: 0.105 }
const BRACE_TIP: Section = { halfBreadth: 0.13, halfThick: 0.085 }

const KNUCKLE: Section = { halfBreadth: 0.25, halfThick: 0.135 }
const KNUCKLE_REACH = 0.15

const TIBIA_ROOT: Section = { halfBreadth: 0.23, halfThick: 0.115 }
/** Wider at the tip than the spade era's 0.135: the tibia now lands on the
 *  skid's ankle tie, and a tip narrower than the slot between the rails would
 *  read as a bar stopping short of the foot it stands on. */
const TIBIA_TIP: Section = { halfBreadth: 0.17, halfThick: 0.09 }

export function pushLeg(out: MeshBuffers, leg: GearLeg): void {
  pushHipBracket(out, leg)

  const knee = vec(leg.knee)
  const ankle = vec(leg.ankle)
  pushSegment(out, vec(leg.hip), knee, MAIN_ROOT, MAIN_KNEE)
  pushSegment(out, vec(leg.braceHip), vec(leg.braceNode), BRACE_ROOT, BRACE_TIP)

  // The knuckle straddles the break rather than sitting on it, so the joint
  // reads as a fitting between two bars instead of a bend in one.
  const femurAxis = towards(vec(leg.hipSkin), knee)
  const tibiaAxis = towards(knee, ankle)
  pushSegment(
    out,
    walk(knee, femurAxis, -KNUCKLE_REACH),
    walk(knee, tibiaAxis, KNUCKLE_REACH),
    KNUCKLE, KNUCKLE,
  )
  pushSegment(out, knee, ankle, TIBIA_ROOT, TIBIA_TIP)

  pushSkid(out, leg)
}
