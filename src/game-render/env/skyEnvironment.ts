// src/game-render/env/skyEnvironment.ts
// PMREMs the sky's own gradient into scene.environment, so a metal material
// finally has something physically-grounded to reflect instead of rendering
// black (metalness 1 has no diffuse term at all — see Ornithopter.ts) or
// leaning on an emissive workaround (the fix this file replaces).
//
// The prefilter pass is real GPU work — a GGX convolution across several
// roughness mips, not just a texture upload — so it must not run every frame.
// shouldRebakeEnvironment (skyEquirect.ts) throttles that; this module's own
// job is only to own the PMREMGenerator's lifecycle and re-point whichever
// scene is active at the current bake, which is cheap (a pointer check) even
// when nothing changed.

import {
  DataTexture, EquirectangularReflectionMapping, PMREMGenerator, RGBAFormat,
  UnsignedByteType, type Scene, type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three'
import type { AtmospherePalette } from '../materials/Atmosphere'
import {
  DEFAULT_EQUIRECT_SIZE, paintSkyEquirect, shouldRebakeEnvironment, type EquirectSize,
} from '../materials/skyEquirect'

export interface SkyEnvironment {
  /**
   * Point `scene` at the current sky reflection, for the given hour's
   * palette. Rebakes only when the palette has actually moved since the last
   * call; otherwise this just makes sure `scene.environment` is wired,
   * which matters right after a mode switch hands it a brand new Scene.
   */
  update(scene: Scene, palette: AtmospherePalette): void
  dispose(): void
}

export function createSkyEnvironment(
  renderer: WebGLRenderer,
  size: EquirectSize = DEFAULT_EQUIRECT_SIZE,
): SkyEnvironment {
  const pmrem = new PMREMGenerator(renderer)
  // Optional, but it moves the shader-compile stall to construction time
  // rather than onto whichever frame happens to trigger the first bake.
  pmrem.compileEquirectangularShader()

  let lastPalette: AtmospherePalette | null = null
  let renderTarget: WebGLRenderTarget | null = null
  let envTexture: Texture | null = null

  function bake(palette: AtmospherePalette): void {
    const pixels = paintSkyEquirect(palette, size)
    const source = new DataTexture(pixels, size.width, size.height, RGBAFormat, UnsignedByteType)
    source.mapping = EquirectangularReflectionMapping
    source.needsUpdate = true

    const next = pmrem.fromEquirectangular(source)
    // The source is only read synchronously inside fromEquirectangular's
    // render pass above; nothing holds a reference to it afterward.
    source.dispose()

    // Freed only now that `next` exists to replace it — never leaves
    // envTexture pointing at disposed GPU memory mid-update.
    renderTarget?.dispose()
    renderTarget = next
    envTexture = next.texture
    lastPalette = palette
  }

  return {
    update(scene, palette): void {
      if (shouldRebakeEnvironment(lastPalette, palette)) bake(palette)
      // A mode switch hands render() a brand new Scene with no environment
      // of its own; re-point it even on a frame that did not rebake.
      if (envTexture && scene.environment !== envTexture) {
        scene.environment = envTexture
      }
    },
    dispose(): void {
      renderTarget?.dispose()
      pmrem.dispose()
    },
  }
}
