// landscape-shop/sietch/src/model/materials.ts
// The R2 material family: six materials, no more. Three carry authored
// world-anchored maps baked from the set's own geometry (surface/maps.ts)
// and three are the tinted, tool-marked stone every box-shaped mass in
// the hall is cut from. One shared instance per role, built once per
// createSietch() call, so Sietch.ts's dispose() frees each exactly once.
//
//   shell        the vault and the mouth collar — arc-length U, depth V
//   wall         the back-wall cap — world-planar, in metres
//   floor        the walkable strip — world-planar, in metres
//   stone        raw cut masses: ramp treads, stair treads, the pier
//   stoneShadow  what light does not reach: socket interiors, the skirt
//   stoneWorn    what hands and feet polish: jambs, the tier, the hearth
//
// Base roughness is deliberately below 1. At roughness 1 a point light
// leaves no specular term at all, so the polished-by-use surfaces this
// round authors — the tier walkway, the jambs, the desire lines on the
// floor — would have nothing to be polished RELATIVE TO, and the whole
// wear story would be invisible no matter how well it was baked.

import { MeshStandardMaterial, DoubleSide, FrontSide, type DataTexture } from 'three'
import { PALETTE } from '../spec'
import { chiselMaps, floorMaps, shellMaps, wallMaps, type MapSet } from './surface/maps'

const ROUGH_STONE = 0.92
const ROUGH_WORN = 0.66
const NORMAL_SCALE_SHELL = 0.8
// The floor is lit at a few degrees off grazing by a hearth 2 m above it,
// so a normal that would read as texture on a wall swings N.L through
// zero here and prints as a black band. Measured, not guessed: at 0.75
// the desire lines rendered as dark streaks across the whole floor.
const NORMAL_SCALE_FLOOR = 0.3
const NORMAL_SCALE_STONE = 0.45

export interface PaletteMaterials {
  shell: MeshStandardMaterial
  wall: MeshStandardMaterial
  floor: MeshStandardMaterial
  stone: MeshStandardMaterial
  stoneShadow: MeshStandardMaterial
  stoneWorn: MeshStandardMaterial
  /** Every DataTexture the family owns. Materials do not own their
   *  textures in three, so if this list did not exist nothing would ever
   *  free them. */
  textures: DataTexture[]
}

/**
 * A mapped surface. DoubleSide throughout: the hall is a thin shell seen
 * from inside, so the raycaster (and the renderer) must see it regardless
 * of winding — ../../docs/gauntlet-loop.md R1 note on interior shells.
 * The base colour is white because the whole albedo lives in the map.
 */
function mappedMaterial(maps: MapSet, side: typeof DoubleSide | typeof FrontSide, normalScale: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    side,
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
    roughness: 1,
  })
  material.normalScale.set(normalScale, normalScale)
  return material
}

/** Tool-marked stone for the hall's box-shaped masses: one tiling adze
 *  map (surface/chisel.ts) shared by all three tints — the same crew's
 *  tool, differently lit and differently worn. */
function stoneMaterial(
  color: number, roughness: number, chisel: { normalMap: DataTexture; roughnessMap: DataTexture },
): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color, side: DoubleSide, roughness,
    normalMap: chisel.normalMap, roughnessMap: chisel.roughnessMap,
  })
  material.normalScale.set(NORMAL_SCALE_STONE, NORMAL_SCALE_STONE)
  return material
}

export function buildPalette(): PaletteMaterials {
  const shellSet = shellMaps()
  const wallSet = wallMaps()
  const floorSet = floorMaps()
  const chiselSet = chiselMaps()

  return {
    shell: mappedMaterial(shellSet, DoubleSide, NORMAL_SCALE_SHELL),
    wall: mappedMaterial(wallSet, DoubleSide, NORMAL_SCALE_SHELL),
    floor: mappedMaterial(floorSet, FrontSide, NORMAL_SCALE_FLOOR),
    stone: stoneMaterial(PALETTE.rock, ROUGH_STONE, chiselSet),
    stoneShadow: stoneMaterial(PALETTE.rockShadow, ROUGH_STONE, chiselSet),
    stoneWorn: stoneMaterial(PALETTE.rockGlowlit, ROUGH_WORN, chiselSet),
    textures: [
      shellSet.map, shellSet.normalMap, shellSet.roughnessMap,
      wallSet.map, wallSet.normalMap, wallSet.roughnessMap,
      floorSet.map, floorSet.normalMap, floorSet.roughnessMap,
      chiselSet.normalMap, chiselSet.roughnessMap,
    ],
  }
}
