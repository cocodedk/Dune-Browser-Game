// character-shop/chani/src/model/Chani.ts
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

export function createChani(): CharacterModel {
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
