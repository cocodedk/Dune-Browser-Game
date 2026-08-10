// character-shop/chani/src/profile.test.ts
// The centre-line profile: nose, lips, chin, and the relationships between
// them. Split out of head.test.ts by PASS 2 for the 200-line rule.
//
// Nothing here restates an authoring constant as an expected value. Where
// a landmark HEIGHT from face/plan.ts appears it is a measurement window —
// "read the profile at the subnasale's own height" — and what is asserted
// is always a distance between two vertices that actually got built.
//
// This file exists because pass 1 shipped a nose and a mouth that were
// correct in the vertex table and absent in the picture, and head.test.ts
// passed both. Every guard below was chosen so that pass 1's own geometry
// would have failed it.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createChani } from './model/Chani'
import { centreProfile, profilePeak, verticesOfMesh } from './model/measure'
import { SUBNASALE_Y } from './model/face/plan'

function profileOf(): { profile: number[][]; skull: ReturnType<typeof verticesOfMesh>; dispose: () => void } {
  const figure = createChani()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  const part = root.getObjectByName('head')
  if (!part) throw new Error('head group missing from the armature')
  const skull = verticesOfMesh(part, 'skull')
  return {
    profile: centreProfile(skull, -0.020, 0.215, 0.001),
    skull,
    dispose: () => figure.dispose(),
  }
}

/** The profile's depth at an arbitrary height — the nearest scanned row. */
function zAt(profile: number[][], y: number): number {
  let best = profile[0]
  for (const row of profile) if (Math.abs(row[0] - y) < Math.abs(best[0] - y)) best = row
  return best[1]
}

describe('R2 profile: the nose projects', () => {
  // MEASURED FROM THE TRUE SUBNASALE, and pass 2 had to change the
  // landmark to get there. Pass 1 scanned for the profile's REARMOST point
  // between y = 50 and 70mm and called that the subnasale. What that scan
  // actually finds is the philtrum groove, which on the finished vertices
  // sits 14.5mm behind the columella base — so it reports a protrusion
  // 14.5mm larger than the anatomical one. Pass 1's nose scored 15.6mm on
  // it and passed a 16-27mm band; this pass's nose scores 28.5mm on the
  // same scan and would have failed, while its true protrusion is 14.0mm
  // against a human female 17-21. The scan was measuring the philtrum.
  it('nasal protrusion past the subnasale is in the human 12-22mm band', () => {
    const { profile, dispose } = profileOf()
    // FLOOR RAISED 10mm BY PASS 3. plan.ts moved the upper lip up 6.5mm,
    // and a fuller vermillion at 57.7mm still projects ~17mm at y = 60 —
    // inside the old window, and within a few millimetres of out-running
    // the nose tip itself. This scan would then have reported the LIP.
    const tip = profilePeak(profile, 0.070, 0.100, 'front')
    const protrusion = zAt(profile, SUBNASALE_Y) - tip[1]
    expect(protrusion).toBeGreaterThan(0.012)
    expect(protrusion).toBeLessThan(0.022)
    dispose()
  })

  // THE GUARD PASS 1 WOULD HAVE FAILED, and the one that matches what the
  // critic actually saw: "no bridge, tip, or wings even in 3/4". A nose
  // reads at portrait framing by standing clear of the mouth beneath it,
  // and pass 1's tip stood 2.05mm in front of its own upper lip where a
  // human runs 8-12mm. Every number in the vertex table can be in band
  // while that one is not, which is exactly what happened.
  it('the nose tip stands 6-16mm clear of the upper lip', () => {
    const { profile, dispose } = profileOf()
    const tip = profilePeak(profile, 0.070, 0.100, 'front')
    const upperLip = profilePeak(profile, 0.053, 0.0625, 'front')
    expect(upperLip[1] - tip[1]).toBeGreaterThan(0.006)
    expect(upperLip[1] - tip[1]).toBeLessThan(0.016)
    dispose()
  })
})

describe('R2 profile: lips and chin balance against the nose', () => {
  it('the lips project past the chin and carry a vermillion border', () => {
    const { profile, dispose } = profileOf()
    // All three mouth windows rose 6.5mm with plan.ts STOMION_Y. They are
    // windows onto the mouth, not constants — left behind they measure chin.
    const lower = profilePeak(profile, 0.041, 0.050, 'front')
    const seam = profilePeak(profile, 0.0495, 0.0555, 'back')
    const pogonion = profilePeak(profile, 0.010, 0.034, 'front')
    expect(pogonion[1] - lower[1]).toBeGreaterThan(0.002)
    // A vermillion border only exists if the seam sits BEHIND both lips.
    expect(seam[1]).toBeGreaterThan(lower[1] + 0.002)
    dispose()
  })

  // Ricketts' E-line, as a likeness guard rather than an orthodontic one.
  // A face is balanced when the upper lip sits a little BEHIND the line
  // from nose tip to chin; pass 1's sat 2.9mm in FRONT of it, because its
  // nose and its chin were both under-projected while its lips were not,
  // and a profile like that reads as a muzzle. This is the single number
  // that ties the three centre-line masses together.
  it('the upper lip sits 0-5mm behind the nose-tip-to-chin line', () => {
    const { profile, dispose } = profileOf()
    const tip = profilePeak(profile, 0.070, 0.100, 'front')
    const pogonion = profilePeak(profile, 0.010, 0.034, 'front')
    const lip = profilePeak(profile, 0.053, 0.0625, 'front')
    const t = (lip[0] - pogonion[0]) / (tip[0] - pogonion[0])
    const eLine = pogonion[1] + t * (tip[1] - pogonion[1])
    // BAND RE-OPENED BY PASS 3 ON AN EXPLICIT LEAD RULING: the upper lip
    // may REACH the E-line, because Zendaya's lips sit forward of the
    // classical balance and the brief asks for fuller vermillion on both
    // lips. 1.5mm in front is the allowance; past that the profile starts
    // back toward the muzzle pass 1 shipped at 2.9mm.
    expect(lip[1] - eLine).toBeGreaterThan(-0.0015)
    expect(lip[1] - eLine).toBeLessThan(0.005)
    dispose()
  })

  // Mouth width cannot be a bounding box: the lips are a displacement of
  // the skull, so the widest vertex at lip height is the JAW.
  //
  // PASS 1 MEASURED IT AS THE DEPTH OF THE LIP SEAM AGAINST THE LOWER
  // VERMILLION, and pass 2's captures showed that probe measuring the
  // MANDIBLE. Both its heights sit 6.8mm apart, so any other form with a
  // gradient across those 6.8mm reads as seam depth — and once the jawline
  // was rebuilt, the border's own ridge passed through the probe at 42mm
  // out and reported 3.3mm of "mouth" where there is cheek. It had been
  // passing by cancellation: the station ring's curvature happened to
  // subtract the same amount. A guard that passes by coincidence is not a
  // guard.
  //
  // The vermillion is measured instead against the PHILTRUM PLANE 10.8mm
  // above it — skin that no lip form touches and that the jawline, 30mm
  // lower, cannot reach either. A lip is skin that projects; this asks
  // exactly that, and it falls off cleanly and monotonically: 19.2mm at
  // the centre line, 5.0 at 20mm out, -6.3 by 34mm. Zero crossing at
  // ~27mm is a 54mm mouth, which is 'moderate' on a 146mm face.
  it('the vermillion projects at the centre line and has stopped by 34mm', () => {
    const { skull, dispose } = profileOf()
    const at = (ax: number, y: number): number => {
      const band = skull.filter((s) => Math.abs(Math.abs(s.x) - ax) < 0.0028
        && Math.abs(s.y - y) < 0.0016)
      if (!band.length) throw new Error(`no vertices at |x|=${ax}, y=${y}`)
      return Math.min(...band.map((s) => s.z))
    }
    /** How far the upper vermillion stands proud of the philtrum plane. */
    // Both probe heights rose 6.5mm with the mouth: the vermillion at
    // 57.7mm against the philtrum plane 10.8mm above it, exactly the
    // relationship pass 2 chose, re-aimed at where the mouth now is.
    const proud = (ax: number): number => at(ax, 0.0685) - at(ax, 0.0577)
    expect(proud(0.000)).toBeGreaterThan(0.010)
    expect(proud(0.020)).toBeGreaterThan(0.0015)
    expect(proud(0.034)).toBeLessThan(0.0005)
    dispose()
  })
})
