// src/game-render/modes/conversation/figureFaceLayout.test.ts
// The valuable test here isn't that computeFaceLayout runs — it's that it
// would fail if a feature silently collapsed to a degenerate size, drifted
// off-card at the extremes, or stopped responding to the axes the brief
// called out (age, jaw, build, eyeTilt) as needing to visibly change the
// face rather than nudge it.

import { describe, it, expect } from 'vitest'
import { computeFaceLayout, computeHeadPlacement, jawWidth } from './figureFaceLayout'
import { DEFAULT } from '../../../data/portraits'
import type { PortraitDef } from '../../../data/portraits'

const CARD_WIDTH = 300
const CARD_HEIGHT = 420

function def(overrides: Partial<PortraitDef>): PortraitDef {
  return { ...DEFAULT, ...overrides }
}

describe('computeFaceLayout', () => {
  it('gives every feature a strictly positive size', () => {
    const cases = [
      def({}),
      def({ age: 'old', jaw: 1.3, build: 1.35 }),
      def({ age: 'young', jaw: 0.75, build: 0.8 }),
      def({ age: 'old', jaw: 0.75, build: 1.35 }),
    ]
    for (const d of cases) {
      const headR = computeHeadPlacement(d, CARD_WIDTH, CARD_HEIGHT).headR
      const layout = computeFaceLayout(d, headR)
      expect(layout.jawHalfW).toBeGreaterThan(headR * 0.2)
      expect(layout.browHalfW).toBeGreaterThan(headR * 0.2)
      expect(layout.noseHalfW).toBeGreaterThan(headR * 0.03)
      expect(layout.cheekHalfW).toBeGreaterThan(headR * 0.2)
      expect(layout.mouthHalfW).toBeGreaterThan(headR * 0.1)
      expect(layout.chinHalfW).toBeGreaterThan(headR * 0.05)
    }
  })

  it('changes shape with age, jaw, build and eyeTilt, not just size', () => {
    const young = computeFaceLayout(def({ age: 'young', jaw: 0.8 }), 60)
    const old = computeFaceLayout(def({ age: 'old', jaw: 1.2 }), 60)
    expect(old.browY).not.toBeCloseTo(young.browY, 5)
    expect(old.mouthY).not.toBeCloseTo(young.mouthY, 5)
    expect(old.jawHalfW).not.toBeCloseTo(young.jawHalfW, 5)
    expect(old.ageHollow).toBeGreaterThan(young.ageHollow)

    const heavy = computeFaceLayout(def({ build: 1.35 }), 60)
    const lean = computeFaceLayout(def({ build: 0.8 }), 60)
    expect(heavy.jowlStrength).toBeGreaterThan(lean.jowlStrength)
    expect(heavy.cheekHalfW).toBeGreaterThan(lean.cheekHalfW)

    const tiltedUp = computeFaceLayout(def({ eyeTilt: 0.2 }), 60)
    const tiltedDown = computeFaceLayout(def({ eyeTilt: -0.2 }), 60)
    expect(tiltedUp.browTilt).not.toBeCloseTo(tiltedDown.browTilt, 5)
  })

  it('keeps every feature inside the card at extreme framing, age, jaw and build', () => {
    const extremes = [
      def({ age: 'old', jaw: 1.3, build: 1.35, framing: 1, eyeTilt: 0.2 }),
      def({ age: 'old', jaw: 1.3, build: 1.35, framing: 0, eyeTilt: -0.2 }),
      def({ age: 'young', jaw: 0.75, build: 0.8, framing: 1 }),
    ]
    for (const d of extremes) {
      const placement = computeHeadPlacement(d, CARD_WIDTH, CARD_HEIGHT)
      const layout = computeFaceLayout(d, placement.headR)

      const left = placement.headX - Math.max(layout.jawHalfW, layout.cheekHalfW)
      const right = placement.headX + Math.max(layout.jawHalfW, layout.cheekHalfW)
      const top = placement.headY + layout.browY
      const bottom = placement.headY + layout.chinY + placement.headR * 0.3

      expect(left).toBeGreaterThan(0)
      expect(right).toBeLessThan(CARD_WIDTH)
      expect(top).toBeGreaterThan(0)
      expect(bottom).toBeLessThan(CARD_HEIGHT)
    }
  })
})

describe('jawWidth', () => {
  it('widens with jaw but stays bounded so extremes still read as a head', () => {
    const narrow = jawWidth(60, 0.75)
    const wide = jawWidth(60, 1.3)
    expect(wide).toBeGreaterThan(narrow)
    expect(wide).toBeLessThan(60 * 1.1)
    expect(narrow).toBeGreaterThan(60 * 0.4)
  })
})
