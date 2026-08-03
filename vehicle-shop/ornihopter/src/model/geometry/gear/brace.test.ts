// vehicle-shop/ornihopter/src/model/geometry/gear/brace.test.ts
// The second bar, as a proportion rather than as a picture.
//
// Split out of ./stance.test.ts alongside ./braceAnchor.ts. The brace is what
// round 6d added to the stance, and the thing that will be tempting to nudge
// later is exactly the pair of ratios asserted here.

import { describe, it, expect } from 'vitest'
import { GEAR_LEGS, type Point3 } from './stance'
import { BRACE_SPLIT } from './braceAnchor'

function span(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

describe('the brace strut', () => {
  it('is SHORTER than the strut it braces, on every leg', () => {
    // kit-dossier.md §a: a long main strut and a SHORTER brace. A brace longer
    // than its own strut is not a brace, it is a second leg — and twelve of
    // those is the "uncountable knot" the blind critic reported.
    //
    // The bar is the main strut's WHOLE hip-to-foot path, which is what the
    // dossier's "main strut" means (it measures `Gear_left`'s 35.29mm
    // principal length, hip to foot). An earlier draft compared against the
    // femur alone; braceAnchor.ts's BRACE_ON_TIBIA records why that was the
    // wrong bar and what the render showed when it was used.
    //
    // FAIL-FIRST, at (BRACE_SPLIT, node) = (0.82, 0.74 of the femur): the
    // front leg's brace measured 2.293m against a 2.255m femur — longer than
    // the thing it braced, on the leg with the longest forward rake.
    for (const leg of GEAR_LEGS) {
      const main = span(leg.hipSkin, leg.knee) + span(leg.knee, leg.ankle)
      const brace = span(leg.braceHipSkin, leg.braceNode)
      expect(brace).toBeLessThan(main)
      // ...and not so short that the two bars are effectively one.
      expect(brace).toBeGreaterThan(main * 0.6)
    }
  })

  it('opens a triangle big enough to be seen', () => {
    for (const leg of GEAR_LEGS) {
      // The two anchors have to be far enough apart to READ as two.
      const gap = Math.abs(leg.braceHipSkin.z - leg.hipSkin.z)
      expect(gap).toBeGreaterThan(0.8)
      expect(gap).toBeCloseTo(BRACE_SPLIT, 6)
      // The apex has to sit BELOW the knee, or the void closes over the top
      // third of the leg and everything under it reads as one stick again.
      expect(leg.braceNode.y).toBeLessThan(leg.knee.y)
      // ...and the void has to run PAST THE MIDPOINT of the leg's own drop.
      // That is the bar, and it is a design intent rather than a fitted
      // number: the apex sits at 0.594 / 0.598 / 0.601 of the drop on the
      // three stations, so 0.55 is a floor with room, not a line drawn round
      // today's value. The femur-node draft this replaces sat at 0.40.
      const legDrop = leg.hipSkin.y - leg.foot.y
      expect((leg.hipSkin.y - leg.braceNode.y) / legDrop).toBeGreaterThan(0.55)
    }
  })

  it('anchors the brace forward on legs that rake aft, and aft on the one that rakes forward', () => {
    // The split is applied AGAINST the rake so the two bars diverge at the
    // hull. Applied WITH it they would lie nearly parallel, which is the
    // "two sticks" read this whole round is trying to kill.
    for (const leg of GEAR_LEGS) {
      const rake = leg.foot.z - leg.hipSkin.z
      const split = leg.braceHipSkin.z - leg.hipSkin.z
      expect(Math.sign(split)).toBe(-Math.sign(rake))
    }
  })
})
