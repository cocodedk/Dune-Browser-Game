// character-shop/stilgar/src/model/materials.ts
// Flat PALETTE materials for R1 — MeshStandardMaterial, high roughness, no
// metalness, straight from spec.ts's hex constants. No DataTexture work
// this round (that is R3's "costume, materials, eyes" — gauntlet-loop.md);
// this is deliberately the simplest thing that reads correctly under the
// dev harness's ambient+directional lights.

import { MeshStandardMaterial } from 'three'
import { PALETTE } from '../spec'

export interface StilgarMaterials {
  skin: MeshStandardMaterial
  fabric: MeshStandardMaterial
  accent: MeshStandardMaterial
  hair: MeshStandardMaterial
  eyes: MeshStandardMaterial
}

/** roughness 0.9 across the board: skin, worn fabric and hair all read as
 *  matte under a single directional light — nothing on a sietch leader
 *  should read shiny/wet at this round's fidelity.
 *
 *  accent went back to FrontSide in R1 pass 3. It was DoubleSide only to
 *  paper over the old hood's zero-thickness cut edge; every cloth mesh is
 *  now a closed shell with real thickness (geometry/shell.ts), so the
 *  inside of the hood is a genuine lit surface and DoubleSide would only
 *  cost fill rate and hide a genuinely inverted normal if one ever
 *  appeared. */
export function createMaterials(): StilgarMaterials {
  return {
    skin: new MeshStandardMaterial({ color: PALETTE.skin, roughness: 0.9, metalness: 0 }),
    fabric: new MeshStandardMaterial({ color: PALETTE.fabric, roughness: 0.92, metalness: 0 }),
    accent: new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.92, metalness: 0 }),
    hair: new MeshStandardMaterial({ color: PALETTE.hair, roughness: 0.88, metalness: 0 }),
    // Full ibad: one flat PALETTE.eyes across the whole visible eye, no
    // white anywhere. Deliberately the SAME roughness family as the skin —
    // this round owns the eye's FORM, and R3 owns the wet/glow nuance that
    // would otherwise be authored here by accident.
    eyes: new MeshStandardMaterial({ color: PALETTE.eyes, roughness: 0.9, metalness: 0 }),
  }
}

export function disposeMaterials(materials: StilgarMaterials): void {
  materials.skin.dispose()
  materials.fabric.dispose()
  materials.accent.dispose()
  materials.hair.dispose()
  materials.eyes.dispose()
}
