// character-shop/stilgar/src/seam.test.ts
// The seam between the armature and the scene — lead-owned; see
// character-shop/docs/gauntlet-loop.md: "the ornithopter flew backwards for
// four rounds; no character will face backwards for one." Guards the three
// numbers every round after this one must keep true, measured off the real
// geometry — never asserted from spec.ts alone.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createStilgar } from './model/Stilgar'
import { PROPORTIONS } from './spec'

function minLocalZ(part: Object3D): number {
  part.updateMatrixWorld(true)
  const v = new Vector3()
  let min = Infinity
  part.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      part.worldToLocal(v)
      if (v.z < min) min = v.z
    }
  })
  return min
}

function headOf(root: Object3D): Object3D {
  const head = root.getObjectByName('head')
  if (!head) throw new Error('head group missing from the armature')
  return head
}

describe('seam: the figure stands to spec and faces its own -Z', () => {
  it('overall height is within 1% of PROPORTIONS.heightM', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    expect(size.y).toBeGreaterThan(PROPORTIONS.heightM * 0.99)
    expect(size.y).toBeLessThan(PROPORTIONS.heightM * 1.01)
    figure.dispose()
  })

  it('the head group has geometry at negative local Z (face-forward guard)', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    expect(minLocalZ(headOf(root))).toBeLessThan(0)
    figure.dispose()
  })

  it('the eye line falls inside the head geometry, consistent with spec', () => {
    const figure = createStilgar()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const headBox = new Box3().setFromObject(headOf(root))
    const eyeLineY = PROPORTIONS.eyeLineFraction * PROPORTIONS.heightM
    expect(eyeLineY).toBeGreaterThanOrEqual(headBox.min.y)
    expect(eyeLineY).toBeLessThanOrEqual(headBox.max.y)
    figure.dispose()
  })

  it('dispose does not throw', () => {
    const figure = createStilgar()
    expect(() => figure.dispose()).not.toThrow()
  })
})
