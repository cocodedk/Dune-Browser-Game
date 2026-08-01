// src/game-render/materials/neutralEnvMap.ts
// A black, do-nothing environment map, built once and shared.
//
// Three has no per-material "ignore scene.environment" switch. Once a
// material relies on scene.environment (its own .envMap left null), the
// renderer overwrites THAT material's envMapIntensity uniform with
// scene.environmentIntensity on every frame it draws — see
// WebGLRenderer.js's refreshMaterialUniforms, guarded on
// `material.envMap === null && scene.environment !== null`. So setting
// material.envMapIntensity directly does nothing for such a material; it is
// silently clobbered. (Measured against this exact bug: a sand patch with
// envMapIntensity 0 still jumped from luma 26.6 to 142.2 once
// scene.environment was populated.)
//
// Giving the material this texture as its own .envMap escapes that override
// — three's WebGLEnvironments then respects the material's own
// envMapIntensity again — and because the texture is solid black, the
// contribution is zero regardless of that value.
//
// Cheap to share: three auto-converts an EquirectangularReflectionMapping
// texture to a PMREM the first time a material using it is drawn, then
// caches the result by texture identity (WebGLEnvironments.js), so every
// caller of this function driving the same instance costs one conversion
// for the whole game, not one per opted-out material.

import {
  DataTexture, EquirectangularReflectionMapping, RGBAFormat, UnsignedByteType, type Texture,
} from 'three'

// Matches PMREMGenerator's documented minimum (64x32) so the one-time
// auto-conversion above takes the path three actually expects.
const WIDTH = 64
const HEIGHT = 32

let cached: Texture | null = null

/** A solid-black equirect texture, safe to assign directly as material.envMap. */
export function neutralEnvMap(): Texture {
  if (cached) return cached

  const data = new Uint8Array(WIDTH * HEIGHT * 4)
  for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque, RGB left at 0

  const texture = new DataTexture(data, WIDTH, HEIGHT, RGBAFormat, UnsignedByteType)
  texture.mapping = EquirectangularReflectionMapping
  texture.needsUpdate = true
  cached = texture
  return texture
}
