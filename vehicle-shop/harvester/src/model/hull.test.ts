// vehicle-shop/harvester/src/model/hull.test.ts
// Per-component invariant for the hull — split out of the old
// src/components.test.ts (round I0) so no single file carries every part's
// assertions and outgrows the 200-line cap as later rounds (I2 lands here)
// add to it. See testSupport.ts for the shared mats()/bounds() helpers.
//
// I2 pass 1 added: deck seams stay INSET (never above the deck's top
// plane), flank panels exist on the solid end blocks ONLY, the open
// middle's flank zone stays clear (the see-under gap), and cross-members
// stay inside the underframe's own envelope.
//
// I2 pass 2 (critic 4/10 — cross-members not visible, seams/taper weak)
// ADDS visible flank cross-beams and seam lips, and REFINES the open-middle
// probe from a single all-or-nothing box into a grid that admits slender
// spanning beams while still failing on anything that walls the gap off —
// see the probe test below for exactly how and why.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3, Mesh } from 'three'
import { buildHull } from './hull'
import { BODY, TRACK } from '../spec'
import { mats, bounds, named } from './testSupport'

describe('hull component', () => {
  it('is symmetric in X and spans the hull length', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const b = bounds(group)
    expect(Math.abs(b.min.x + b.max.x)).toBeLessThan(1e-6)
    expect(b.min.z).toBeCloseTo(BODY.noseZ, 0)
    expect(b.max.z).toBeCloseTo(BODY.tailZ, 0)
    expect(b.size.y).toBeGreaterThan(10)
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('deck seams are inset — no seam geometry above the deck top plane', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const seams = named(group, 'deckSeam')
    expect(seams.length).toBeGreaterThanOrEqual(3)
    for (const seam of seams) {
      const b = bounds(seam)
      expect(b.max.y).toBeLessThanOrEqual(BODY.deckTop + 1e-6)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('flank panels sit only on the solid nose/tail end blocks, read from spec', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const panels = named(group, 'flankPanel')
    expect(panels.length).toBeGreaterThan(0)
    for (const panel of panels) {
      const b = bounds(panel)
      const inNose = b.min.z >= BODY.noseZ - 1e-6 && b.max.z <= BODY.noseBlockAftZ + 1e-6
      const inTail = b.min.z >= BODY.tailBlockForeZ - 1e-6 && b.max.z <= BODY.tailZ + 1e-6
      expect(inNose || inTail).toBe(true)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the open middle stays see-through — beams may cross it, nothing may wall it off', () => {
    // REFINED from a single all-or-nothing probe box (pass 1) into a grid
    // spanning the WHOLE open middle, sliced into height bands. Pass 1's
    // probe would fail the instant ANY geometry entered its one box — which
    // is exactly why pass 2's cross-beams (destination 1) could not be
    // added without touching this test. The refined guard keeps the same
    // intent (daylight must still pass under the hull, at the hull's own
    // flank line) but checks it at every Z along the whole open span, band
    // by band, so a slender beam crossing ONE band at ONE z reads as "still
    // open" while a panel spanning ALL bands at ANY z — the thing that
    // would actually close the flank — still fails immediately.
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    group.updateMatrixWorld(true)

    const zStart = BODY.noseBlockAftZ + 1
    const zEnd = BODY.tailBlockForeZ - 1
    const zStep = 1
    const yLo = BODY.underThickness + 1
    const yHi = BODY.deckTop - BODY.deckThickness - 1
    const BANDS = 6
    const bandHeight = (yHi - yLo) / BANDS

    let totalCells = 0
    let hitCells = 0
    for (let z = zStart; z <= zEnd; z += zStep) {
      let bandsHitAtThisZ = 0
      for (let band = 0; band < BANDS; band++) {
        const y0 = yLo + band * bandHeight
        const probe = new Box3(
          new Vector3(BODY.halfWidth - 0.5, y0, z - 0.5),
          new Vector3(BODY.halfWidth + 0.5, y0 + bandHeight, z + 0.5),
        )
        let hit = false
        group.traverse((child) => {
          if (!(child instanceof Mesh)) return
          if (new Box3().setFromObject(child).intersectsBox(probe)) hit = true
        })
        totalCells++
        if (hit) {
          hitCells++
          bandsHitAtThisZ++
        }
      }
      // At EVERY z along the open span, at least one band must stay clear —
      // a full-height wall (all bands hit at some z) is exactly what a
      // regression to a closed flank would look like, and fails here.
      expect(bandsHitAtThisZ).toBeLessThan(BANDS)
    }
    // Overall the gap stays MOSTLY open — a handful of slender beams cover
    // only a small fraction of the grid; a wall spanning much of the length
    // would push this well past the cap even if no single z hit all bands.
    expect(hitCells / totalCells).toBeLessThan(0.2)
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('flank beams span the open middle at flank height, clear of deck and underframe', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const beams = named(group, 'flankBeam')
    expect(beams.length).toBeGreaterThanOrEqual(2)
    const innerFace = TRACK.centreX - TRACK.housing.width / 2
    for (const beam of beams) {
      const b = bounds(beam)
      // reaches toward both pods without crossing into their housings
      expect(Math.max(Math.abs(b.min.x), Math.abs(b.max.x))).toBeLessThanOrEqual(innerFace + 1e-6)
      expect(b.max.x - b.min.x).toBeGreaterThan(BODY.halfWidth) // spans most of the width, not a stub
      // floats in the gap: clear of the deck underside above and the
      // underframe top below
      expect(b.min.y).toBeGreaterThan(BODY.underThickness)
      expect(b.max.y).toBeLessThan(BODY.deckTop - BODY.deckThickness)
      // sits in the open middle only, never over the solid end blocks
      expect(b.min.z).toBeGreaterThanOrEqual(BODY.noseBlockAftZ - 1e-6)
      expect(b.max.z).toBeLessThanOrEqual(BODY.tailBlockForeZ + 1e-6)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('seam lips stand proud of the deck at each seam, framing the recessed groove', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const lips = named(group, 'deckSeamLip')
    expect(lips.length).toBeGreaterThanOrEqual(6)
    for (const lip of lips) {
      const b = bounds(lip)
      expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop - 1e-6)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('cross-members stay inside the underframe envelope and the pods\' inner faces', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const members = named(group, 'crossMember')
    expect(members.length).toBeGreaterThanOrEqual(2)
    const innerFace = TRACK.centreX - TRACK.housing.width / 2
    for (const member of members) {
      const b = bounds(member)
      expect(b.min.y).toBeGreaterThanOrEqual(-1e-6)
      expect(b.max.y).toBeLessThanOrEqual(BODY.underThickness + 1e-6)
      expect(Math.max(Math.abs(b.min.x), Math.abs(b.max.x))).toBeLessThan(innerFace)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })
})
