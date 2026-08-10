// character-shop/chani/src/head.test.ts
// R2's measured bar: the head's own proportions, read back off the
// triangles that actually got built.
//
// Nothing here restates an authoring constant. This project's history
// includes a reported 43.2% that reproduced at 8%, and R2's own first
// three captures each disproved a number the vertex table was happy with:
// a 7mm lip that no mesh row landed on, a 30mm nose that measured 28.9mm
// of protrusion against a human 21, and a brow ridge that measured 13.6mm
// of relief where this harness needs ~17mm to cast a shadow. Every
// assertion below is a landmark found by scanning vertices.
//
// Eye placement, symmetry and the ibad ruling live in eyes.test.ts.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createChani } from './model/Chani'
import {
  centreProfile, frontmost, halfWidth, profilePeak, rearmost, verticesOf, verticesOfMesh,
  type Sample,
} from './model/measure'
import { EYE_X, EYE_Y, GONION_Y, ZYGION_Y } from './model/face/plan'
import { PROPORTIONS } from './spec'

function head(): { part: Object3D; dispose: () => void } {
  const figure = createChani()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  const part = root.getObjectByName('head')
  if (!part) throw new Error('head group missing from the armature')
  return { part, dispose: () => figure.dispose() }
}

/** The chin's bottom edge: the lowest height whose centre-line surface is
 *  still within 20mm of the pogonion's own projection. Below it the
 *  surface has turned back under the jaw and become throat. */
function mentonY(profile: number[][]): number {
  const pogonion = profilePeak(profile, 0.010, 0.034, 'front')
  let best = pogonion[0]
  for (const [y, z] of profile) {
    if (z < pogonion[1] + 0.020 && y < best) best = y
  }
  return best
}

/** The hairline, found where hair vertices near the centre line first come
 *  forward of the skin at the same height. */
function trichionY(hair: Sample[], skull: Sample[]): number {
  for (let y = 0.150; y < 0.215; y += 0.002) {
    const near = (s: Sample): boolean => Math.abs(s.x) < 0.012 && Math.abs(s.y - y) < 0.006
    const h = hair.filter(near)
    const k = skull.filter(near)
    if (!h.length || !k.length) continue
    if (Math.min(...h.map((s) => s.z)) < Math.min(...k.map((s) => s.z))) return y
  }
  throw new Error('the hair never crosses in front of the forehead')
}

describe('R2 head: the facial thirds sit inside human bands', () => {
  it('menton-subnasale, subnasale-brow and brow-trichion are each 28-40% of the face', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const profile = centreProfile(skull, -0.020, 0.215)
    const menton = mentonY(profile)
    // WINDOW NARROWED BY PASS 3. It looks for the profile's rearmost
    // point, and plan.ts raised the lip seam to 52.5mm — which is also a
    // recess, and was inside the old 50-70mm window. It would have been
    // found instead of the philtrum groove, silently shortening the lower
    // third by 14mm.
    const subnasale = profilePeak(profile, 0.060, 0.072, 'back')[0]
    const brow = frontmost(skull, { yMin: 0.120, yMax: 0.145, axMin: 0.024, axMax: 0.036 }).y
    const trichion = trichionY(verticesOfMesh(part, 'hairCrown'), skull)

    const face = trichion - menton
    const thirds = [subnasale - menton, brow - subnasale, trichion - brow]
    expect(face).toBeGreaterThan(0.150)
    for (const third of thirds) {
      expect(third / face).toBeGreaterThan(0.28)
      expect(third / face).toBeLessThan(0.40)
    }
    dispose()
  })

  // Against the SCALP, not the hair. The canon that puts the eye line at
  // half the head height means menton-to-vertex, and vertex is the top of
  // the skull; hair sits on top of that and is not head height. Measured
  // against the hair crown this lands at 0.478, which is not a fault in
  // the face — it is 17mm of curl.
  it('the eye line sits within 4mm of half the skull height', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const menton = mentonY(centreProfile(skull, -0.020, 0.215))
    const vertex = Math.max(...skull.map((s) => s.y))
    expect(EYE_Y - menton).toBeGreaterThan((vertex - menton) * 0.5 - 0.004)
    expect(EYE_Y - menton).toBeLessThan((vertex - menton) * 0.5 + 0.004)
    dispose()
  })

  it('head height stays inside the spec band with the hair counted', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const menton = mentonY(centreProfile(skull, -0.020, 0.215))
    const crown = Math.max(...verticesOf(part).map((s) => s.y))
    const fraction = (crown - menton) / PROPORTIONS.heightM
    expect(fraction).toBeGreaterThanOrEqual(PROPORTIONS.headHeightFraction.min)
    expect(fraction).toBeLessThanOrEqual(PROPORTIONS.headHeightFraction.max)
    dispose()
  })
})

describe('R2 head: widths carry the heart shape', () => {
  it('bizygomatic width is 0.50-0.66 of head height', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const menton = mentonY(centreProfile(skull, -0.020, 0.215))
    const crown = Math.max(...verticesOf(part).map((s) => s.y))
    const bizygomatic = 2 * halfWidth(skull, ZYGION_Y - 0.006, ZYGION_Y + 0.006)
    expect(bizygomatic / (crown - menton)).toBeGreaterThan(0.50)
    expect(bizygomatic / (crown - menton)).toBeLessThan(0.66)
    dispose()
  })

  it('the jaw tapers: bigonial is 0.66-0.86 of bizygomatic', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const bigonial = halfWidth(skull, GONION_Y - 0.004, GONION_Y + 0.004)
    const bizygomatic = halfWidth(skull, ZYGION_Y - 0.006, ZYGION_Y + 0.006)
    expect(bigonial / bizygomatic).toBeGreaterThan(0.66)
    expect(bigonial / bizygomatic).toBeLessThan(0.86)
    dispose()
  })
})

describe('R2 head: relief is sized for the harness lights, not the table', () => {
  // R1 measured a 12mm brow that rendered as a smudge and a 16.8mm one
  // that rendered. These guards hold the finished vertices above that line
  // so a later round cannot quietly flatten the face back out.
  it('the brow ridge stands at least 15mm proud of the socket floor', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    // WINDOW MOVED DOWN 7mm BY PASS 2, because the ridge did. warp.ts's
    // BROW_Y went from EYE_Y + 14.8 to EYE_Y + 10.0 to close the
    // brow-to-lid gap the critic named, and the finished peak now measures
    // at y = 124.8 — below the old window's floor of 126, so the old
    // window was scanning the ridge's upper flank and reporting the relief
    // of a form it had missed the top of.
    const brow = frontmost(skull, { yMin: 0.119, yMax: 0.135, axMin: 0.024, axMax: 0.038 })
    // The |x| window tracks EYE_X, which moved out 1.8mm this pass. A
    // socket-floor probe pinned to a literal measures the socket of
    // whatever eye position the last pass happened to have.
    const socket = rearmost(skull, {
      yMin: EYE_Y - 0.004, yMax: EYE_Y + 0.004,
      axMin: EYE_X - 0.006, axMax: EYE_X + 0.004, zMax: 0,
    })
    expect(socket.z - brow.z).toBeGreaterThan(0.015)
    dispose()
  })

  it('the cheekbone stands at least 8mm proud of the hollow beneath it', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    const arch = frontmost(skull, { yMin: ZYGION_Y - 0.006, yMax: ZYGION_Y + 0.006, axMin: 0.042, axMax: 0.056 })
    const hollow = rearmost(skull,
      { yMin: 0.076, yMax: 0.090, axMin: 0.042, axMax: 0.054, zMax: 0 })
    expect(hollow.z - arch.z).toBeGreaterThan(0.008)
    dispose()
  })
})
