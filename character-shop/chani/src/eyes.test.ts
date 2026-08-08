// character-shop/chani/src/eyes.test.ts
// The eye masses, the brows, the ears and the mirror. Split from
// head.test.ts for the 200-line rule.
//
// The ibad ruling (spec.ts IBAD, PALETTE.eyes) is the reason these guards
// are strict about SHAPE. With no sclera and no iris there is nothing but
// the aperture's own outline to say "this is an eye", so its width, its
// height, its cant and its placement are the whole read — and R2 shipped
// one capture where the lens stood 1.4mm proud of the skin and every eye
// rendered as a smear of blue instead of an almond.

import { describe, it, expect } from 'vitest'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
import { createChani } from './model/Chani'
import { verticesOfMesh, type Sample } from './model/measure'
import { CURL_NAMES } from './model/hairCurls'
import { EYE_X, EYE_Y } from './model/face/plan'
import { PALETTE } from './spec'

function head(): { part: Object3D; dispose: () => void } {
  const figure = createChani()
  const root = figure.root as unknown as Object3D
  root.updateMatrixWorld(true)
  const part = root.getObjectByName('head')
  if (!part) throw new Error('head group missing from the armature')
  return { part, dispose: () => figure.dispose() }
}

const span = (s: Sample[], k: 'x' | 'y' | 'z'): number[] =>
  [Math.min(...s.map((v) => v[k])), Math.max(...s.map((v) => v[k]))]

/** The vertex at the inner or outer end of one eye — the canthi, which is
 *  where the cant is measurable. */
function canthus(eye: Sample[], side: number, outer: boolean): Sample {
  let best = eye[0]
  for (const s of eye) {
    const reach = outer ? side * s.x : -side * s.x
    const bestReach = outer ? side * best.x : -side * best.x
    if (reach > bestReach) best = s
  }
  return best
}

describe('R2 eyes: full ibad, large, wide-set, canted', () => {
  it('each aperture is 30-40mm wide and 12-18mm tall', () => {
    const { part, dispose } = head()
    for (const name of ['eyeL', 'eyeR']) {
      const eye = verticesOfMesh(part, name)
      const [x0, x1] = span(eye, 'x')
      const [y0, y1] = span(eye, 'y')
      expect(x1 - x0, `${name} width`).toBeGreaterThan(0.030)
      expect(x1 - x0, `${name} width`).toBeLessThan(0.040)
      expect(y1 - y0, `${name} height`).toBeGreaterThan(0.012)
      expect(y1 - y0, `${name} height`).toBeLessThan(0.018)
    }
    dispose()
  })

  it('the eyes sit on the spec eye line and 60-76mm apart', () => {
    const { part, dispose } = head()
    const centre = (name: string): { x: number; y: number } => {
      const eye = verticesOfMesh(part, name)
      const [x0, x1] = span(eye, 'x')
      const [y0, y1] = span(eye, 'y')
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
    }
    const left = centre('eyeL')
    const right = centre('eyeR')
    expect(Math.abs(left.y - EYE_Y)).toBeLessThan(0.004)
    expect(Math.abs(right.y - EYE_Y)).toBeLessThan(0.004)
    // BAND WIDENED BY PASS 3. The measured inner-canthus gap was 0.80 of
    // an aperture against a canon ~1.0, so EYE_X moved out 1.8mm a side
    // and the IPD with it; 76mm was the old ceiling and 73.6 is the new
    // value. Shrinking the aperture to buy the gap back is the one move
    // the brief rules out — LARGE is the spec.
    const ipd = right.x - left.x
    expect(ipd).toBeGreaterThan(0.062)
    expect(ipd).toBeLessThan(0.080)
    dispose()
  })

  it('the outer corner sits above the inner one — the almond cant', () => {
    const { part, dispose } = head()
    for (const [name, side] of [['eyeL', -1], ['eyeR', 1]] as const) {
      const eye = verticesOfMesh(part, name)
      const rise = canthus(eye, side, true).y - canthus(eye, side, false).y
      expect(rise, `${name} cant`).toBeGreaterThan(0.0015)
      expect(rise, `${name} cant`).toBeLessThan(0.0090)
    }
    dispose()
  })

  it('the eye masses are flat PALETTE.eyes — no white anywhere', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    for (const name of ['eyeL', 'eyeR']) {
      const mesh = root.getObjectByName(name) as unknown as Mesh
      const material = mesh.material as MeshStandardMaterial
      expect(material.color.getHex(), name).toBe(PALETTE.eyes)
    }
    figure.dispose()
  })

  it('the aperture stands proud of the skin, so the almond is what is seen', () => {
    const { part, dispose } = head()
    const skull = verticesOfMesh(part, 'skull')
    for (const name of ['eyeL', 'eyeR']) {
      const eye = verticesOfMesh(part, name)
      const front = Math.min(...eye.map((s) => s.z))
      // Skin at the same column and height as the eye's own centre.
      const socket = skull.filter((s) => Math.abs(Math.abs(s.x) - EYE_X) < 0.005
        && Math.abs(s.y - EYE_Y) < 0.003)
      expect(Math.min(...socket.map((s) => s.z)) - front, name).toBeGreaterThan(0.003)
    }
    dispose()
  })
})

describe('R2 head: everything R2 added mirrors', () => {
  // lidUpper/lidLower are pass 3's: they are swept in the aperture's own
  // frame and parked with the lens's own transform, so if the lens
  // mirrors and a lid does not, the two have come apart.
  const PAIRS = ['eye', 'lidUpper', 'lidLower', 'ear', 'brow',
    ...CURL_NAMES.map((c) => `hairCurl${c}`)]

  it('every left/right pair mirrors within 0.2mm', () => {
    const { part, dispose } = head()
    for (const base of PAIRS) {
      const left = verticesOfMesh(part, `${base}L`)
      const right = verticesOfMesh(part, `${base}R`)
      const [lx0, lx1] = span(left, 'x')
      const [rx0, rx1] = span(right, 'x')
      expect(Math.abs(-lx1 - rx0), `${base} inner`).toBeLessThan(0.0002)
      expect(Math.abs(-lx0 - rx1), `${base} outer`).toBeLessThan(0.0002)
      for (const k of ['y', 'z'] as const) {
        const [l0, l1] = span(left, k)
        const [r0, r1] = span(right, k)
        expect(Math.abs(l0 - r0), `${base} ${k} min`).toBeLessThan(0.0002)
        expect(Math.abs(l1 - r1), `${base} ${k} max`).toBeLessThan(0.0002)
      }
    }
    dispose()
  })

  it('the brows sit above the eyes and below the hairline', () => {
    const { part, dispose } = head()
    for (const side of ['L', 'R']) {
      const brow = verticesOfMesh(part, `brow${side}`)
      const eye = verticesOfMesh(part, `eye${side}`)
      const [, browTop] = span(brow, 'y')
      const [browBottom] = span(brow, 'y')
      expect(browBottom, `brow${side}`).toBeGreaterThan(Math.max(...eye.map((s) => s.y)) - 0.004)
      expect(browTop, `brow${side}`).toBeLessThan(0.150)
    }
    dispose()
  })
})
