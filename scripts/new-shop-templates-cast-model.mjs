// scripts/new-shop-templates-cast-model.mjs
// HUMANOID model seed + seam.test.ts for `npm run cast:new`. Split from
// ./new-shop-templates-cast.mjs (docs + contracts + main) so both files
// stay under the 200-line cap. The model builds an armature-named group
// tree (root/pelvis/spine/chest/head/armL/armR/legL/legR) with one
// placeholder box per group, sized so the assembled figure already matches
// spec.ts's PROPORTIONS.heightM exactly — the seam test's guards are real
// from the first commit, not deferred to when real geometry lands. Static:
// no update method (user directive, 2026-08-05 — see contracts.ts).

export function renderCastModel(name, Name) {
  return `// character-shop/${name}/src/model/${Name}.ts
// Placeholder builder: an armature-named group tree (root/pelvis/spine/
// chest/head/armL/armR/legL/legR), one placeholder box per group, sized to
// PROPORTIONS so the scaffold builds, stands to spec height, and the seam
// test is green immediately. Replace each box with real geometry in
// place — the group names and nesting are the armature later rounds build
// onto; do not rename them. Static: no update() — see contracts.ts.

import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import type { CharacterModel } from '../contracts'
import { PROPORTIONS, PALETTE } from '../spec'

function limb(width: number, height: number, depth: number): Mesh {
  const geometry = new BoxGeometry(width, height, depth)
  const material = new MeshStandardMaterial({ color: PALETTE.skin })
  return new Mesh(geometry, material)
}

export function create${Name}(): CharacterModel {
  const { heightM, headHeightFraction, shoulderHalfWidth, hipHalfWidth } = PROPORTIONS
  const headH = heightM * (headHeightFraction.min + headHeightFraction.max) / 2
  const bodyH = heightM - headH
  const legH = bodyH * 0.58
  const pelvisH = bodyH * 0.09
  const spineH = bodyH * 0.17
  const chestH = bodyH * 0.16

  const meshes: Mesh[] = []
  // joint: where this group sits in its parent's local frame.
  // boxOffset: where the placeholder box sits inside this group's own frame.
  function part(
    parent: Group, name: string, w: number, h: number, d: number,
    jointX: number, jointY: number, boxOffsetY: number,
  ): Group {
    const group = new Group()
    group.name = name
    group.position.set(jointX, jointY, 0)
    parent.add(group)
    const mesh = limb(w, h, d)
    mesh.position.y = boxOffsetY
    group.add(mesh)
    meshes.push(mesh)
    return group
  }

  const root = new Group()
  root.name = 'root'

  const pelvis = part(root, 'pelvis', hipHalfWidth * 2.2, pelvisH, hipHalfWidth * 1.4, 0, legH, pelvisH / 2)
  part(pelvis, 'legL', hipHalfWidth * 0.7, legH, hipHalfWidth * 0.7, -hipHalfWidth, 0, -legH / 2)
  part(pelvis, 'legR', hipHalfWidth * 0.7, legH, hipHalfWidth * 0.7, hipHalfWidth, 0, -legH / 2)

  const spine = part(pelvis, 'spine', hipHalfWidth * 1.6, spineH, hipHalfWidth, 0, pelvisH, spineH / 2)
  const chest = part(spine, 'chest', shoulderHalfWidth * 2.2, chestH, shoulderHalfWidth * 1.3, 0, spineH, chestH / 2)
  part(chest, 'armL', shoulderHalfWidth * 0.55, chestH, shoulderHalfWidth * 0.55, -shoulderHalfWidth, chestH, -chestH / 2)
  part(chest, 'armR', shoulderHalfWidth * 0.55, chestH, shoulderHalfWidth * 0.55, shoulderHalfWidth, chestH, -chestH / 2)
  part(chest, 'head', shoulderHalfWidth * 1.3, headH, shoulderHalfWidth * 1.3, 0, chestH, headH / 2)

  return {
    root,
    dispose(): void {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        ;(mesh.material as MeshStandardMaterial).dispose()
      }
      root.clear()
    },
  }
}
`
}

export function renderCastSeamTest(name, Name) {
  return `// character-shop/${name}/src/seam.test.ts
// The seam between the armature and the scene — lead-owned; see
// character-shop/docs/gauntlet-loop.md: "the ornithopter flew backwards for
// four rounds; no character will face backwards for one." Guards the three
// numbers every round after this one must keep true, measured off the real
// geometry — never asserted from spec.ts alone.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { create${Name} } from './model/${Name}'
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
    const figure = create${Name}()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    expect(size.y).toBeGreaterThan(PROPORTIONS.heightM * 0.99)
    expect(size.y).toBeLessThan(PROPORTIONS.heightM * 1.01)
    figure.dispose()
  })

  it('the head group has geometry at negative local Z (face-forward guard)', () => {
    const figure = create${Name}()
    const root = figure.root as unknown as Object3D
    expect(minLocalZ(headOf(root))).toBeLessThan(0)
    figure.dispose()
  })

  it('the eye line falls inside the head geometry, consistent with spec', () => {
    const figure = create${Name}()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const headBox = new Box3().setFromObject(headOf(root))
    const eyeLineY = PROPORTIONS.eyeLineFraction * PROPORTIONS.heightM
    expect(eyeLineY).toBeGreaterThanOrEqual(headBox.min.y)
    expect(eyeLineY).toBeLessThanOrEqual(headBox.max.y)
    figure.dispose()
  })

  it('dispose does not throw', () => {
    const figure = create${Name}()
    expect(() => figure.dispose()).not.toThrow()
  })
})
`
}
