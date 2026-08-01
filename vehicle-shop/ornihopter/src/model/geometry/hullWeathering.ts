// vehicle-shop/ornihopter/src/model/geometry/hullWeathering.ts
// The hull's procedural albedo + roughness maps. hullTexel.ts decides what
// each texel looks like; this file owns the buffers, the colour spaces and the
// DataTexture objects.
//
// Built as plain Uint8Array RGBA buffers -> DataTexture, NOT a
// document.createElement('canvas') CanvasTexture. The unit suite runs in node
// with no GL context and no `document` — Ornithopter.test.ts and seam.test.ts
// both construct the whole craft — so a CanvasTexture would throw there and
// take the entire suite down. This is the house pattern for exactly this
// situation (src/game-render/modes/flight/geometry/hullWeathering.ts in the
// game tree, and materials/neutralEnvMap.ts before it); the technique is
// copied here rather than imported, because the vehicle shop does not depend
// on the game tree.
//
// TEXTURE SIZE. 512 rather than 256 because the fine-rib intake grille
// (hullUv.ts's GRILLE island) needs fifteen visible ribs across roughly a
// tenth of the u axis; at 256 they alias into a grey smear at capture
// distance. Two 1 MB buffers is a cheap price for the one feature the kit
// close-up makes unmissable.

import {
  DataTexture, RGBAFormat, SRGBColorSpace, NoColorSpace, ClampToEdgeWrapping,
  LinearFilter, LinearMipmapLinearFilter, UnsignedByteType, type Texture,
} from 'three'
import { texelAt } from './hullTexel'

const SIZE = 512

export interface HullWeatheringMaps {
  map: Texture
  roughnessMap: Texture
  /** Both textures, so the caller can dispose what it allocated — a Material's
   *  own dispose() does NOT release the textures bound to it. */
  textures: Texture[]
}

function finish(texture: DataTexture, srgb: boolean): DataTexture {
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  // Clamped, never repeating: the layout has detail islands past HULL_U_MAX
  // (hullUv.ts), so wrapping would fold the grille back onto the skin.
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/**
 * Both maps from one pass over the texel grid. Same source content, but two
 * INDEPENDENT texture objects and buffers — never one aliased into the other —
 * because albedo wants sRGB and roughness wants linear data, and a shared
 * object could not carry both colour spaces at once.
 */
export function buildHullWeatheringMaps(): HullWeatheringMaps {
  const albedoData = new Uint8Array(SIZE * SIZE * 4)
  const roughData = new Uint8Array(SIZE * SIZE * 4)

  for (let y = 0; y < SIZE; y++) {
    const v = (y + 0.5) / SIZE
    for (let x = 0; x < SIZE; x++) {
      const u = (x + 0.5) / SIZE
      const { albedo, roughness01 } = texelAt(u, v)
      const i = (y * SIZE + x) * 4
      albedoData[i] = Math.round(albedo[0])
      albedoData[i + 1] = Math.round(albedo[1])
      albedoData[i + 2] = Math.round(albedo[2])
      albedoData[i + 3] = 255
      const r = Math.round(roughness01 * 255)
      roughData[i] = r
      roughData[i + 1] = r
      roughData[i + 2] = r
      roughData[i + 3] = 255
    }
  }

  const map = finish(new DataTexture(albedoData, SIZE, SIZE, RGBAFormat, UnsignedByteType), true)
  const roughnessMap = finish(
    new DataTexture(roughData, SIZE, SIZE, RGBAFormat, UnsignedByteType), false,
  )
  return { map, roughnessMap, textures: [map, roughnessMap] }
}
