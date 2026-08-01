// src/game-render/materials/SandMaterial.ts
// Patches MeshStandardMaterial via onBeforeCompile rather than writing a
// ShaderMaterial from scratch, so three's lighting, tone mapping and fog keep
// working and only the sand-specific behaviour is custom.

import { MeshStandardMaterial, Color, Vector2, Vector3, type IUniform } from 'three'
import {
  SAND_VERTEX_DECLARATIONS, SAND_VERTEX_BODY, SAND_FRAGMENT_DECLARATIONS,
  SAND_FRAGMENT_COLOR, SAND_FRAGMENT_GLINT,
} from './sandShader.glsl'
import { SAND_FOG_DECLARATIONS, SAND_FOG_FRAGMENT } from './sandFogShader.glsl'
import { getSandTextures } from './sandTextures'
import { neutralEnvMap } from './neutralEnvMap'
// Reused, not duplicated: shadowRig.ts already names 124 as the dune
// amplitude; the fog height scale (Finding 1) wants the same order of size.
import { STRATEGIC_TERRAIN_AMPLITUDE } from '../env/shadowRig'

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
  /**
   * Multiply the sand palette by the geometry's per-vertex colour.
   *
   * Used by the globe to tint ice, rock and salt pan differently without a
   * second material. Off by default and it must stay that way: the flat
   * terrain mesh carries no colour attribute, and enabling this for geometry
   * that lacks one leaves vColor undefined.
   */
  vertexColors?: boolean
  /** false skips the procedural normal/roughness/AO bake (low quality tier). */
  detailMaps?: boolean
  /**
   * UV tiling factor for the detail maps. Caller-controlled because one
   * material serves both the flat desert (WORLD_SIZE 4400 units) and the
   * planet globe (radius 1000) — a single default cannot read as fine
   * ripples on both without this.
   */
  mapRepeat?: number
  /** Bump intensity of the baked ripple normal map. */
  normalStrength?: number
  /** Darker, redder band for slope past any dune's angle of repose (Finding 3). */
  rockColor?: string
  /** Fog's exp(-worldY / scale) falloff (Finding 1, skyMath.ts's heightFogFactor). */
  fogHeightScale?: number
  /**
   * Up is radially outward, not world +Y. The globe must set this: slope-keyed
   * terms ask how far a normal tilts from up, and on a sphere world +Y is up
   * only at the pole, so the equator reads as cliff and paints itself rock.
   */
  radialUp?: boolean
}

export interface SandMaterial {
  material: MeshStandardMaterial
  /** Retint for the current hour. Cheap — call every frame if you like. */
  setPalette(shadow: string | Color, crest: string | Color, slip: string | Color): void
  /** Scale the mica sparkle with light level. */
  setGlint(strength: number): void
  /** World-space sun direction — feeds the ripple relight and glint gate (Findings 5, 6). */
  setSunDirection(x: number, y: number, z: number): void
  dispose(): void
}

const DEFAULTS: Required<SandMaterialOptions> = {
  shadowColor: '#8a4520',
  crestColor: '#e8c98a',
  slipFaceColor: '#6b3a2c',
  windDirection: [1, 0.35],
  glintStrength: 0.06,
  rippleScale: 0.9,
  vertexColors: false,
  detailMaps: true,
  mapRepeat: 180,
  normalStrength: 2.2,
  rockColor: '#3d1a12',
  fogHeightScale: STRATEGIC_TERRAIN_AMPLITUDE,
  radialUp: false,
}

export function createSandMaterial(options: SandMaterialOptions = {}): SandMaterial {
  const opts = { ...DEFAULTS, ...options }

  const uniforms: Record<string, IUniform> = {
    uSandShadow: { value: new Color(opts.shadowColor) },
    uSandCrest: { value: new Color(opts.crestColor) },
    uSlipFace: { value: new Color(opts.slipFaceColor) },
    uWindDirection: { value: new Vector2(opts.windDirection[0], opts.windDirection[1]).normalize() },
    uGlintStrength: { value: opts.glintStrength },
    uRippleScale: { value: opts.rippleScale },
    // Placeholder matching SkyDome's own, until the first setSunDirection.
    uSunDirection: { value: new Vector3(0.4, 0.6, 0.7).normalize() },
    uRockColor: { value: new Color(opts.rockColor) },
    uFogHeightScale: { value: opts.fogHeightScale },
    uRadialUp: { value: opts.radialUp ? 1 : 0 },
  }

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    // The sand chunk multiplies into diffuseColor *after* <color_fragment>,
    // which is where three applies vColor — so a vertex tint survives intact
    // and modulates the whole palette rather than replacing it.
    vertexColors: opts.vertexColors,
    // Sand is rough and non-metallic; specular comes from the glint term only.
    // With a roughnessMap bound this is the factor the map's G channel
    // multiplies, so the map's crest/trough contrast still lands near 0.95.
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false,
    // Opts out of scene.environment — see neutralEnvMap.ts.
    envMap: neutralEnvMap(),
  })

  // Assigning normalMap/roughnessMap/aoMap here (rather than in the
  // onBeforeCompile below) lets three's own MeshStandardMaterial shader
  // chunks handle them — normal_fragment_maps, roughnessmap_fragment,
  // aomap_fragment — none of which touch <color_fragment> or
  // <tonemapping_fragment>, the two chunks the sand shader patches. The
  // vertexColors and palette-injection paths are therefore untouched.
  const maps = opts.detailMaps
    ? getSandTextures({
        repeat: opts.mapRepeat,
        normalStrength: opts.normalStrength,
        ripple: { windDirection: opts.windDirection },
      })
    : null
  if (maps) {
    material.normalMap = maps.normalMap
    // Green inverted on purpose: the bake works in canvas space (y-down) while
    // CanvasTexture leaves flipY true and v-mirrors on upload, so G arrives as
    // the exact negation of the OpenGL convention. At (1, 1) the ripples light
    // inverted — crests read as troughs. Flipped here, not in the bake, which
    // is already at its line cap.
    material.normalScale = new Vector2(1, -1)
    material.roughnessMap = maps.ormMap
    material.aoMap = maps.ormMap
    material.aoMapIntensity = 1
  }

  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SAND_VERTEX_DECLARATIONS}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\n${SAND_VERTEX_BODY}`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${SAND_FRAGMENT_DECLARATIONS}\n${SAND_FOG_DECLARATIONS}`,
      )
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
      // Full override, not an addition — see sandFogShader.glsl.ts (Finding 1).
      .replace('#include <fog_fragment>', SAND_FOG_FRAGMENT)
  }

  // Forces a recompile if the material is reused across quality changes.
  material.customProgramCacheKey = () =>
    `sand-${opts.glintStrength}-${opts.vertexColors}-${!!maps}-${opts.radialUp}`

  return {
    material,
    setPalette(shadow, crest, slip): void {
      ;(uniforms.uSandShadow.value as Color).set(shadow)
      ;(uniforms.uSandCrest.value as Color).set(crest)
      ;(uniforms.uSlipFace.value as Color).set(slip)
    },
    setGlint(strength: number): void {
      uniforms.uGlintStrength.value = Math.max(0, strength)
    },
    setSunDirection(x, y, z): void {
      ;(uniforms.uSunDirection.value as Vector3).set(x, y, z).normalize()
    },
    dispose(): void {
      material.dispose()
    },
  }
}
