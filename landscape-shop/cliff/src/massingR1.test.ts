// landscape-shop/cliff/src/massingR1.test.ts
// R1-specific guards, split out of seam.test.ts once it passed the
// 200-line rule. Measured off the real built geometry, per seam.test.ts's
// own header rule — never off model/*Profile.ts's authoring functions,
// so a Cliff.ts that stopped consuming the profile would still fail
// these.

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createCliff } from './model/Cliff'
import { FOOTPRINT, ENTRANCE } from './spec'
import { triangleCountOf, boundsOf, entranceOf, frontSurface, interiorSamples, average } from './testHelpers'

describe('seam: R1 massing reads as a real massif, not a box', () => {
  it('the crest is varied, not flat: max height differs by mass across the width', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massing = root.getObjectByName('massing')
    if (!massing) throw new Error('massing group missing')

    const sliceWidth = FOOTPRINT.widthM / 8
    const sliceMaxY = new Map<number, number>()
    massing.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const position = mesh.geometry.attributes.position
      for (let i = 0; i < position.count; i++) {
        const slice = Math.floor((position.getX(i) + FOOTPRINT.widthM / 2) / sliceWidth)
        const y = position.getY(i)
        sliceMaxY.set(slice, Math.max(sliceMaxY.get(slice) ?? -Infinity, y))
      }
    })
    const maxima = Array.from(sliceMaxY.values())
    const range = Math.max(...maxima) - Math.min(...maxima)
    // A flat box scores 0 here; the authored crest spans well over 100m.
    expect(range).toBeGreaterThan(60)
    set.dispose()
  })

  it('the front face has relief, not a single flat plane: z varies with x', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massing = root.getObjectByName('massing')
    if (!massing) throw new Error('massing group missing')

    // R1.2 read this off a single named 'frontFace' mesh. R1.3's massing is
    // one welded formation, so the same property is measured off the front
    // SURFACE itself: the frontmost rock at each column across the width.
    const cells = frontSurface(massing, { minX: -300, maxX: 300, columns: 24, bandHeight: 200 })
    const fronts = Array.from(cells.values())
    // A flat plane scores 0; the prow, the scarp and the receding flanks
    // span tens of meters between them.
    expect(Math.max(...fronts) - Math.min(...fronts)).toBeGreaterThan(20)
    set.dispose()
  })

  it('the entrance recesses into the face by roughly ENTRANCE.recessM', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const size = boundsOf(entranceOf(root)).getSize(new Vector3())
    expect(Math.abs(size.z - ENTRANCE.recessM)).toBeLessThan(1)
    set.dispose()
  })

  it('stays under the R1 triangle budget for a distant hero asset', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    expect(triangleCountOf(root)).toBeLessThan(25000)
    set.dispose()
  })

  it('the crest has at least one hard riser (tiered/jagged), not just a smooth curve', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massing = root.getObjectByName('massing')
    if (!massing) throw new Error('massing group missing')

    const maxYByX = new Map<number, number>()
    massing.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const position = mesh.geometry.attributes.position
      for (let i = 0; i < position.count; i++) {
        const x = Math.round(position.getX(i) * 10) / 10
        maxYByX.set(x, Math.max(maxYByX.get(x) ?? -Infinity, position.getY(i)))
      }
    })
    const xs = Array.from(maxYByX.keys()).sort((a, b) => a - b)
    let maxAdjacentDelta = 0
    for (let i = 1; i < xs.length; i++) {
      const delta = Math.abs((maxYByX.get(xs[i]) ?? 0) - (maxYByX.get(xs[i - 1]) ?? 0))
      maxAdjacentDelta = Math.max(maxAdjacentDelta, delta)
    }
    // A smooth-only spline (the pre-critic "rounded dune" shape) never
    // jumps this much between neighboring samples; the authored tiers do.
    expect(maxAdjacentDelta).toBeGreaterThan(15)
    set.dispose()
  })

  it('no column of the face is a machined slot: every one varies in z with height', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massing = root.getObjectByName('massing')
    if (!massing) throw new Error('massing group missing')

    // R1.2 probed ONE authored cleft at x=60. R1.3 has no authored clefts to
    // point at, so the same property is asserted across the whole central
    // 80% of the width: nowhere is the front a constant-depth extrusion.
    const cells = frontSurface(massing, { minX: -240, maxX: 240, columns: 24, bandHeight: 40 })
    let checked = 0
    for (let column = 0; column < 24; column++) {
      const bands: number[] = []
      for (let band = 0; band < 5; band++) {
        const z = cells.get(`${column}:${band}`)
        if (z !== undefined) bands.push(z)
      }
      if (bands.length < 3) continue
      checked++
      // A constant-depth face (the pre-critic "machined slot") scores 0 here.
      expect(Math.max(...bands) - Math.min(...bands)).toBeGreaterThan(3)
    }
    expect(checked).toBeGreaterThan(15)
    set.dispose()
  })

  // R1.4 finding: "solid black with no gradient, no visible back wall or
  // floor catching light, no depth falloff — reads as a painted-on hole".
  // R1.5 finding: R1.4's fix WAS a real gradient (9->24/255) but the critic
  // still read it as flat black-on-black — a gradient a person can measure
  // is not the same as one a person SEES. So this guard is zoned, not just
  // ranged: the SILL (y in [-4, 1] — SILL_Y_BOTTOM..SILL_Y_TOP, socket.ts)
  // must land bright enough to read as a lit lip, while the roof (y >= 12,
  // clear of any bounce) stays obviously darker. Measured off the vertex
  // colours the model actually builds, never off socketTone.ts's authoring
  // function alone.
  it('the mouth has a sill a person can see, under a roof that stays dark', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const samples = interiorSamples(root)
    expect(samples.length).toBeGreaterThan(200)

    const all = samples.map((sample) => sample.luminance)
    const top = samples.filter((sample) => sample.y >= 12).map((sample) => sample.luminance)
    const sill = samples.filter((sample) => sample.y >= -4 && sample.y <= 1).map((sample) => sample.luminance)
    expect(top.length).toBeGreaterThan(10)
    expect(sill.length).toBeGreaterThan(10)

    // Rock in shadow OUTSIDE the mouth renders in the high 30s/255 at the
    // landing rig (post shadowSide-fix measurement), so the brightest
    // interior point must stay clearly under that or the hole reads as
    // more lit rock.
    expect(Math.max(...all)).toBeLessThan(0.2)
    // The sill itself: bright enough to be the thing a person's eye lands
    // on first inside the mouth (R1.5's actual bar), never so bright it
    // rivals the shadow-rock ceiling above.
    expect(average(sill)).toBeGreaterThan(0.12)
    expect(average(sill)).toBeLessThan(0.2)
    // The roof: no bounce reaches it, so it stays unmistakably darker than
    // the sill — this is what keeps the shape reading as a hole, not a box.
    expect(average(top)).toBeLessThan(0.06)
    // Not one flat tone anywhere: this is the "painted-on hole" guard.
    expect(Math.max(...all) / Math.min(...all)).toBeGreaterThan(3)
    set.dispose()
  })
})
