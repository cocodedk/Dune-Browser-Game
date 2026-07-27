// src/game-render/materials/SandMaterial.ts
// Patches MeshStandardMaterial via onBeforeCompile rather than writing a
// ShaderMaterial from scratch, so three's lighting, tone mapping and fog keep
// working and only the sand-specific behaviour is custom.

import { MeshStandardMaterial, Color, Vector2, type IUniform } from 'three'
import {
  SAND_VERTEX_DECLARATIONS,
  SAND_VERTEX_BODY,
  SAND_FRAGMENT_DECLARATIONS,
  SAND_FRAGMENT_COLOR,
  SAND_FRAGMENT_GLINT,
} from './sandShader.glsl'

export interface SandMaterialOptions {
  /** Deep trough colour — burnt orange. */
  shadowColor?: string
  /** Sun-bleached crest — pale gold. */
  crestColor?: string
  /** Slip face, away from the wind — cooler and darker. */
  slipFaceColor?: string
  /** Prevailing wind, in world XZ. */
  windDirection?: [number, number]
  /** 0 disables the mica sparkle (low quality tier). */
  glintStrength?: number
  rippleScale?: number
}

export interface SandMaterial {
  material: MeshStandardMaterial
  /** Retint for the current hour. Cheap — call every frame if you like. */
  setPalette(shadow: string | Color, crest: string | Color, slip: string | Color): void
  dispose(): void
}

const DEFAULTS: Required<SandMaterialOptions> = {
  shadowColor: '#8a4520',
  crestColor: '#e8c98a',
  slipFaceColor: '#6b3a2c',
  windDirection: [1, 0.35],
  glintStrength: 0.06,
  rippleScale: 0.9,
}

export function createSandMaterial(options: SandMaterialOptions = {}): SandMaterial {
  const opts = { ...DEFAULTS, ...options }

  const uniforms: Record<string, IUniform> = {
    uSandShadow: { value: new Color(opts.shadowColor) },
    uSandCrest: { value: new Color(opts.crestColor) },
    uSlipFace: { value: new Color(opts.slipFaceColor) },
    uWindDirection: {
      value: new Vector2(opts.windDirection[0], opts.windDirection[1]).normalize(),
    },
    uGlintStrength: { value: opts.glintStrength },
    uRippleScale: { value: opts.rippleScale },
  }

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    // Sand is rough and non-metallic; specular comes from the glint term only.
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false,
  })

  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SAND_VERTEX_DECLARATIONS}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\n${SAND_VERTEX_BODY}`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SAND_FRAGMENT_DECLARATIONS}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${SAND_FRAGMENT_COLOR}`,
      )
      // Applied after tone mapping so the sparkle survives ACES rather than
      // being rolled off with the rest of the highlights.
      .replace(
        '#include <tonemapping_fragment>',
        `#include <tonemapping_fragment>\n${SAND_FRAGMENT_GLINT}`,
      )
  }

  // Forces a recompile if the material is reused across quality changes.
  material.customProgramCacheKey = () => `sand-${opts.glintStrength}`

  return {
    material,
    setPalette(shadow, crest, slip): void {
      ;(uniforms.uSandShadow.value as Color).set(shadow)
      ;(uniforms.uSandCrest.value as Color).set(crest)
      ;(uniforms.uSlipFace.value as Color).set(slip)
    },
    dispose(): void {
      material.dispose()
    },
  }
}
