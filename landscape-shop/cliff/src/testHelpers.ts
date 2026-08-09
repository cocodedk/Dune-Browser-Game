// landscape-shop/cliff/src/testHelpers.ts
// Shared measurement helpers for seam.test.ts and massingR1.test.ts — split
// out once the guards grew past the 200-line rule. Not itself a test file;
// no vitest globals here.

import { Box3, Color } from 'three'
import type { BufferAttribute, Material, Object3D, Mesh } from 'three'

export function triangleCountOf(root: Object3D): number {
  let triangles = 0
  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    const index = mesh.geometry.index
    const position = mesh.geometry.attributes.position
    triangles += index ? index.count / 3 : position.count / 3
  })
  return triangles
}

export function withinOnePercent(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= expected * 0.01
}

export function boundsOf(part: Object3D): Box3 {
  part.updateMatrixWorld(true)
  return new Box3().setFromObject(part)
}

export function entranceOf(root: Object3D): Object3D {
  const entrance = root.getObjectByName('entrance')
  if (!entrance) throw new Error('entrance marker missing from the set')
  return entrance
}

/** The frontmost (most negative) z of `part` in each cell of an x-by-y grid,
 *  measured off real vertices. Cells the rock never reaches stay undefined.
 *  This is how the massing guards read a merged shell: R1.2 could name a
 *  single 'frontFace' mesh, R1.3's massing is one welded formation. */
export function frontSurface(
  part: Object3D,
  bins: { minX: number; maxX: number; columns: number; bandHeight: number },
): Map<string, number> {
  const cells = new Map<string, number>()
  const width = (bins.maxX - bins.minX) / bins.columns
  part.updateMatrixWorld(true)
  part.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    const position = mesh.geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      if (x < bins.minX || x >= bins.maxX) continue
      const column = Math.floor((x - bins.minX) / width)
      const band = Math.floor(position.getY(i) / bins.bandHeight)
      const key = `${column}:${band}`
      const z = position.getZ(i)
      const seen = cells.get(key)
      if (seen === undefined || z < seen) cells.set(key, z)
    }
  })
  return cells
}

export function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((child) => {
    const mesh = child as Mesh
    if (mesh.isMesh) meshes.push(mesh)
  })
  return meshes
}

/** The unlit interior faces, named. gateLip is deliberately absent: it is
 *  the LIT rim of the mouth, not part of the void (massingR1.test.ts). */
export const INTERIOR_MESHES = ['gateChamfer', 'gateJamb', 'gateShaft', 'gateSeal', 'gateSill']

export interface InteriorSample {
  /** World Y — the zone key: sill (y in [-4, 1]) vs roof (y >= 12). */
  y: number
  luminance: number
}

/** Every interior vertex's world Y and displayed (sRGB) relative luminance,
 *  read straight off the baked vertex colours — never off
 *  socketTone.ts's authoring function alone. */
export function interiorSamples(root: Object3D): InteriorSample[] {
  const out: InteriorSample[] = []
  const colour = new Color()
  for (const name of INTERIOR_MESHES) {
    const mesh = root.getObjectByName(name) as Mesh | null
    if (!mesh) throw new Error(`interior mesh ${name} missing`)
    // Unlit, always: a lit interior is the "box" the dark treatment replaced.
    if ((mesh.material as Material).type !== 'MeshBasicMaterial') {
      throw new Error(`${name} is lit — the void must stay unlit`)
    }
    const position = mesh.geometry.getAttribute('position') as BufferAttribute | undefined
    const color = mesh.geometry.getAttribute('color') as BufferAttribute | undefined
    if (!position || !color) throw new Error(`${name} carries no baked tone`)
    for (let i = 0; i < color.count; i++) {
      colour.fromBufferAttribute(color, i)
      const hex = colour.getHex()
      const luminance = (0.2126 * ((hex >> 16) & 0xff)
        + 0.7152 * ((hex >> 8) & 0xff)
        + 0.0722 * (hex & 0xff)) / 255
      out.push({ y: position.getY(i), luminance })
    }
  }
  return out
}

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
