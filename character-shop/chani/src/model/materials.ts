// character-shop/chani/src/model/materials.ts
// The four flat PALETTE materials, built once and shared by every body-part
// builder — R1 is mass and line; ribbing and weathering DataTextures are R3
// (spec.ts COSTUME comment: "ribbing detail comes in R3"). High roughness
// on all four: skin, worn fabric and hair have no business looking wet or
// plastic under a point light.

import { MeshStandardMaterial } from 'three'
import { PALETTE } from '../spec'

export interface ChaniMaterials {
  skin: MeshStandardMaterial
  fabric: MeshStandardMaterial
  accent: MeshStandardMaterial
  hair: MeshStandardMaterial
  all: MeshStandardMaterial[]
}

export function createMaterials(): ChaniMaterials {
  const skin = new MeshStandardMaterial({ color: PALETTE.skin, roughness: 0.85, metalness: 0 })
  const fabric = new MeshStandardMaterial({ color: PALETTE.fabric, roughness: 0.95, metalness: 0 })
  const accent = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.9, metalness: 0 })
  const hair = new MeshStandardMaterial({ color: PALETTE.hair, roughness: 0.88, metalness: 0 })
  return { skin, fabric, accent, hair, all: [skin, fabric, accent, hair] }
}
