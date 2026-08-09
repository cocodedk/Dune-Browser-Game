// landscape-shop/sietch/src/model/materials.ts
// PALETTE-only flat materials (R1 bar: flat materials from PALETTE are
// fine, no texturing — landscape-shop/docs/gauntlet-loop.md). One shared
// instance per colour so Sietch.ts's dispose() only has to walk meshes
// once and every user of a given tone shares (and frees) the same object.

import { MeshStandardMaterial, DoubleSide, FrontSide } from 'three'
import { PALETTE } from '../spec'

/**
 * The envelope (walls/ceiling) is a thin shell seen from inside: DoubleSide
 * so the raycaster (and the renderer) see it regardless of winding —
 * ../../docs/gauntlet-loop.md R1 note on interior shells.
 */
export function shellMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, side: DoubleSide, roughness: 1 })
}

/** Solid ground-plane / cap forms — normal-facing is enough, FrontSide is
 *  cheaper and correct since these are always viewed from above/in-front. */
export function solidMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, side: FrontSide, roughness: 1 })
}

export interface PaletteMaterials {
  rock: MeshStandardMaterial
  rockShadow: MeshStandardMaterial
  rockGlowlit: MeshStandardMaterial
}

/** One shared material per PALETTE tone, built once per createSietch() call
 *  so Sietch.ts can dispose them exactly once each. */
export function buildPalette(): PaletteMaterials {
  return {
    rock: shellMaterial(PALETTE.rock),
    // DoubleSide: galleryRecess.ts's walls are viewed from inside a small
    // cavity, where a FrontSide face can end up facing away from the
    // camera depending on which wall of the recess it is.
    rockShadow: shellMaterial(PALETTE.rockShadow),
    rockGlowlit: solidMaterial(PALETTE.rockGlowlit),
  }
}
