// vehicle-shop/ornihopter/src/interior/apachePanel.test.ts
// ROUND 9b guard: the instrument panel is an AH-64E-style GLASS cockpit, not a
// board of round dials. docs/apache-gauntlet.md's B2 element list and B3
// measurement list are the bar; this file mechanises the parts of both that can
// be measured off the built meshes rather than off a capture.
//
// FAIL-FIRST, measured against the tree at 72da8a8 (round 6b's panel):
//   mfd-screen meshes found ......... 0   (bar: exactly 2)
//   mfd-key meshes per bezel ........ n/a (bar: >= 8 each)
//   ufd-unit ........................ absent
//   standby-cluster ................. absent (13 analog dials loose on the dash)
//   panel-carrier ................... absent (the dash IS the olive structure)
// Every `it` below was RED. Nothing in here restates a number the panel modules
// export — the dimensions are read off the built geometry, in metres, the way a
// critic reads them off the screen.
//
// WHY MEASURE THE LOCAL BOX AND NOT THE WORLD BOX. Every panel part lies on the
// raked panel at PANEL_PITCH (~37 degrees), so a world-axis-aligned Box3 of a
// 0.36 x 0.27 screen reports a squashed 0.36 x 0.16 x 0.22 — it measures the
// SHADOW, not the face. The two largest extents of the geometry's own bounding
// box, scaled by the world scale, are the face's real-world width and height at
// any orientation.

import { describe, it, expect, afterAll } from 'vitest'
import { Box3, Vector3, type Mesh, type Object3D, type MeshStandardMaterial } from 'three'
import { createCockpit } from './Cockpit'
import { CONSOLE } from './layout'
import { surfaceYAt } from './consoleShell'
import { consoleBodyMaterial } from './materials'

const cockpit = createCockpit()
const root = cockpit.root as unknown as Object3D
root.updateMatrixWorld(true)

afterAll(() => cockpit.dispose())

function allNamed(from: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  from.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}

/** Face width and height in metres: the two largest extents of the mesh's own
 *  geometry box, taken in world scale. Orientation-independent by design. */
function faceSize(object: Object3D): { width: number; height: number } {
  const mesh = object as Mesh
  mesh.geometry.computeBoundingBox()
  const local = mesh.geometry.boundingBox as Box3
  const size = local.getSize(new Vector3())
  const scale = new Vector3()
  mesh.getWorldScale(scale)
  const extents = [size.x * scale.x, size.y * scale.y, size.z * scale.z].sort((a, b) => b - a)
  return { width: extents[0], height: extents[1] }
}

/** sRGB relative luminance of a material's base colour, 0..1. */
function luminance(object: Object3D): number {
  const material = (object as Mesh).material as MeshStandardMaterial
  const c = material.color
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

/** The nearest ancestor that is one MFD unit — bezel, keys and screen. */
function unitOf(screen: Object3D): Object3D {
  let node: Object3D | null = screen
  while (node) {
    if (node.name === 'mfd-unit') return node
    node = node.parent
  }
  throw new Error('mfd-screen is not inside an mfd-unit group')
}

describe('two large MFDs dominate the panel (B2, B3)', () => {
  it('the cockpit carries exactly two MFD screens', () => {
    const screens = allNamed(root, 'mfd-screen')
    expect(screens.length).toBe(2)
  })

  it('each MFD face is at least 0.30m x 0.23m of real screen', () => {
    // 0.30 x 0.23 is what B3's "each >= 140 px wide in the 1600x1000 frame"
    // costs in metres at this panel's distance: the raked panel sits 1.4-1.7m
    // from PILOT_EYE, and the pilot camera's 68-degree vertical FOV at 16:10
    // spans +/-47.2 degrees horizontally, so 800 px = tan(47.2) = 1.079 at
    // unit distance. 0.30m at 1.55m subtends 0.30/1.55/1.079 * 800 = 143 px.
    const sizes = allNamed(root, 'mfd-screen').map(faceSize)
    const report = sizes
      .map((s) => `${s.width.toFixed(3)}x${s.height.toFixed(3)}`)
      .join(' ')
    const undersized = sizes.filter((s) => s.width < 0.3 || s.height < 0.23)
    expect(`${undersized.length} undersized of ${sizes.length}: ${report}`).toBe(
      `0 undersized of ${sizes.length}: ${report}`
    )
    expect(sizes.length).toBe(2)
  })

  it('each MFD sits in a bezel carrying at least 8 distinct keys', () => {
    const counts = allNamed(root, 'mfd-screen').map(
      (screen) => allNamed(unitOf(screen), 'mfd-key').length
    )
    expect(counts.length).toBe(2)
    for (const count of counts) expect(count).toBeGreaterThanOrEqual(8)
  })

  it('the two screens are separate meshes at separate stations, not one split face', () => {
    const [a, b] = allNamed(root, 'mfd-screen').map((s) => s.getWorldPosition(new Vector3()))
    expect(a.distanceTo(b)).toBeGreaterThan(0.3)
  })
})

describe('the up-front display and its keypad (B2)', () => {
  it('a UFD unit exists with a display strip and a data-entry keypad', () => {
    const ufd = allNamed(root, 'ufd-unit')
    expect(ufd.length).toBe(1)
    expect(allNamed(ufd[0], 'ufd-screen').length).toBeGreaterThanOrEqual(1)
    expect(allNamed(ufd[0], 'ufd-key').length).toBeGreaterThanOrEqual(12)
  })
})

describe('the round-6b analog gauges survive as a STANDBY cluster (B2)', () => {
  it('one standby cluster holds at least three of the analog dials', () => {
    const clusters = allNamed(root, 'standby-cluster')
    expect(clusters.length).toBe(1)
    expect(allNamed(clusters[0], 'analog-dial').length).toBeGreaterThanOrEqual(3)
  })

  it('the standby cluster is a SMALL share of the panel: no wider than one MFD bezel', () => {
    // "Keep the best, shrink their share" — a standby cluster that is still the
    // widest thing on the dash has not been consolidated, it has been renamed.
    const cluster = new Box3().setFromObject(allNamed(root, 'standby-cluster')[0])
    const bezel = new Box3().setFromObject(unitOf(allNamed(root, 'mfd-screen')[0]))
    const w = (b: Box3) => b.getSize(new Vector3()).x
    expect(w(cluster)).toBeLessThanOrEqual(w(bezel) * 1.15)
  })
})

describe('a dark panel carrier, not the olive structure (B2)', () => {
  it('the carrier exists and is markedly darker than the console body', () => {
    const carrier = allNamed(root, 'panel-carrier')
    expect(carrier.length).toBe(1)
    const body = consoleBodyMaterial()
    const bodyLuma = 0.2126 * body.color.r + 0.7152 * body.color.g + 0.0722 * body.color.b
    body.dispose()
    expect(luminance(carrier[0])).toBeLessThan(bodyLuma * 0.5)
  })
})

describe('nothing new rises into the pilot sightline (B4.1)', () => {
  it('every new panel part stays below the glareshield lip', () => {
    // forwardCone.test.ts is the real proof and must stay green untouched; this
    // is the cheap mechanical companion that says WHICH part broke it. The
    // glareshield's own top (consoleShell.ts's glareshield: 0.07 thick, centred
    // 0.06 above the panel's top edge) is the ceiling nothing on the dash may
    // pass, because the pilot's -6-degree ray already clears it by 32mm.
    const ceiling = surfaceYAt(CONSOLE.farZ) + 0.06 + 0.035
    const parts = ['mfd-unit', 'ufd-unit', 'standby-cluster', 'panel-carrier']
    const tops = parts.map((name) => {
      const found = allNamed(root, name)
      expect(found.length).toBeGreaterThanOrEqual(1)
      const top = Math.max(
        ...found.map((o) => new Box3().setFromObject(o).max.y)
      )
      return `${name}=${top.toFixed(3)}`
    })
    const over = parts.filter((name) =>
      allNamed(root, name).some((o) => new Box3().setFromObject(o).max.y > ceiling)
    )
    expect(`${over.join(',')} | ceiling ${ceiling.toFixed(3)} | ${tops.join(' ')}`).toBe(
      ` | ceiling ${ceiling.toFixed(3)} | ${tops.join(' ')}`
    )
  })
})
