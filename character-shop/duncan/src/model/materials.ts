// character-shop/duncan/src/model/materials.ts
// The four flat PALETTE materials this round ships: MeshStandardMaterial,
// high roughness, zero metalness — no textures until R3 (costume/materials)
// per character-shop/docs/gauntlet-loop.md. One instance of each colour,
// shared by every mesh that wears it, so dispose() releases exactly four
// materials regardless of how many meshes use them.

import { MeshStandardMaterial } from 'three'
import { PALETTE } from '../spec'

const ROUGHNESS = 0.9

export interface DuncanMaterials {
  skin: MeshStandardMaterial
  fabric: MeshStandardMaterial
  accent: MeshStandardMaterial
  hair: MeshStandardMaterial
}

export function buildMaterials(): DuncanMaterials {
  return {
    skin: new MeshStandardMaterial({ color: PALETTE.skin, roughness: ROUGHNESS, metalness: 0 }),
    fabric: new MeshStandardMaterial({ color: PALETTE.fabric, roughness: ROUGHNESS, metalness: 0 }),
    accent: new MeshStandardMaterial({ color: PALETTE.accent, roughness: ROUGHNESS, metalness: 0 }),
    hair: new MeshStandardMaterial({ color: PALETTE.hair, roughness: ROUGHNESS, metalness: 0 }),
  }
}

export function disposeMaterials(materials: DuncanMaterials): void {
  for (const material of Object.values(materials)) material.dispose()
}
