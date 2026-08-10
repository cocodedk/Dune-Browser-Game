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
  eyes: MeshStandardMaterial
  all: MeshStandardMaterial[]
}

export function createMaterials(): ChaniMaterials {
  const skin = new MeshStandardMaterial({ color: PALETTE.skin, roughness: 0.85, metalness: 0 })
  const fabric = new MeshStandardMaterial({ color: PALETTE.fabric, roughness: 0.95, metalness: 0 })
  const accent = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.9, metalness: 0 })
  // Roughness 0.74, not 0.88. PALETTE.hair is near-black and R1's finding
  // on this exact hair was that it reads as a HOLE — a pixel scan proved
  // there was no gap and every critic saw one. A matte near-black surface
  // returns nothing but ambient, so authored curl masses have no value
  // step between them; at 0.74 the rig's key and rim break each mass out
  // of its neighbours. Colour is untouched PALETTE.hair.
  const hair = new MeshStandardMaterial({ color: PALETTE.hair, roughness: 0.74, metalness: 0 })
  // Full ibad (spec.ts IBAD): ONE flat PALETTE.eyes for the whole visible
  // eye, no white anywhere. Lower roughness than skin so the lens picks up
  // the rig's key as a soft highlight and reads as wet — that highlight is
  // the only thing standing in for an iris this round. Material nuance and
  // any glow are R3's, per the spec's own comment on PALETTE.eyes.
  const eyes = new MeshStandardMaterial({ color: PALETTE.eyes, roughness: 0.42, metalness: 0 })
  return { skin, fabric, accent, hair, eyes, all: [skin, fabric, accent, hair, eyes] }
}
