// src/game-render/post/grade.ts
// Custom ShaderPass: vignette + film grain + edge-only chromatic aberration +
// an S-curve contrast lift and warm/cool split-tone, all in one fragment
// shader so the composer doesn't spend an extra render target per effect.
//
// Art direction from docs/PRD/dune92/02-architecture-3d.md: "apricot and
// amber skies, deep blue-violet shadows". The split-tone here is what pushes
// that into the post grade rather than leaving it to lighting alone — warm
// highlights, blue-violet shadows, split by luma so midtones stay neutral.

import { Vector2, type IUniform } from 'three'

export interface GradeUniformValues {
  vignetteStrength: number
  grainAmount: number
  aberrationStrength: number
  contrast: number
  warmTint: [number, number, number]
  coolTint: [number, number, number]
  splitToneStrength: number
}

// Subtle by design — this sits after ACES + OutputPass-adjacent bloom, and a
// heavy-handed grade is as much of an amateur tell as over-bloom.
export const VIGNETTE_STRENGTH = 0.22 // fraction of brightness lost at the far corner
export const GRAIN_AMOUNT = 0.018 // +/- luma noise; visible as texture, not static
export const ABERRATION_STRENGTH = 0.0022 // uv offset at the frame corner; ~0 at centre
export const CONTRAST_LIFT = 0.12 // blend toward smoothstep(0,1,x) for a gentle S-curve
// Apricot push on highlights, blue-violet push on shadows — see file header.
export const WARM_TINT: [number, number, number] = [1.05, 1.0, 0.92]
export const COOL_TINT: [number, number, number] = [0.9, 0.92, 1.08]
export const SPLIT_TONE_STRENGTH = 0.2

/** Pure, so the numbers above are covered by a test without a GL context. */
export function gradeUniformDefaults(): GradeUniformValues {
  return {
    vignetteStrength: VIGNETTE_STRENGTH,
    grainAmount: GRAIN_AMOUNT,
    aberrationStrength: ABERRATION_STRENGTH,
    contrast: CONTRAST_LIFT,
    warmTint: [...WARM_TINT],
    coolTint: [...COOL_TINT],
    splitToneStrength: SPLIT_TONE_STRENGTH,
  }
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// This pass runs BEFORE OutputPass in the composer chain (see
// PostPipeline.ts), so tDiffuse here is still in the composer's linear
// working colour space — no tone mapping or sRGB encoding applied yet.
// That's intentional: grading in linear space keeps the vignette and
// split-tone falloffs perceptually even, and OutputPass applies ACES +
// sRGB encoding exactly once, last, on this pass's output.
const FRAGMENT_SHADER = `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uVignetteStrength;
uniform float uGrainAmount;
uniform float uAberrationStrength;
uniform float uContrast;
uniform vec3 uWarmTint;
uniform vec3 uCoolTint;
uniform float uSplitToneStrength;
varying vec2 vUv;

float grainHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 centered = vUv - 0.5;
  // Aspect-corrected so the vignette reads as a screen-shaped falloff rather
  // than a circle squashed onto an ultrawide frame.
  vec2 aspectCentered = centered * vec2(uResolution.x / uResolution.y, 1.0);
  float dist = length(aspectCentered);

  // Chromatic aberration: near-zero at centre, grows with dist^3 so only the
  // outer frame edge fringes at all.
  vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);
  float aberration = uAberrationStrength * dist * dist * dist;
  vec3 color;
  color.r = texture2D(tDiffuse, vUv - dir * aberration).r;
  color.g = texture2D(tDiffuse, vUv).g;
  color.b = texture2D(tDiffuse, vUv + dir * aberration).b;

  float vignette = 1.0 - uVignetteStrength * smoothstep(0.3, 0.9, dist);
  color *= vignette;

  // Gentle S-curve: blend toward smoothstep rather than replace, so
  // uContrast=0 is a true no-op.
  vec3 curved = smoothstep(vec3(0.0), vec3(1.0), color);
  color = mix(color, curved, uContrast);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(uCoolTint, uWarmTint, smoothstep(0.15, 0.85, luma));
  color = mix(color, color * tint, uSplitToneStrength);

  float grain = (grainHash(vUv * uResolution + uTime) - 0.5) * uGrainAmount;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`

export interface GradeShaderDefinition {
  name: string
  uniforms: Record<string, IUniform>
  vertexShader: string
  fragmentShader: string
}

/** Fresh uniform objects per call — ShaderPass clones them anyway, but a
 * shared module-level object would let two pipelines fight over one Vector2. */
export function createGradeShader(): GradeShaderDefinition {
  const d = gradeUniformDefaults()
  return {
    name: 'DuneGradeShader',
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uVignetteStrength: { value: d.vignetteStrength },
      uGrainAmount: { value: d.grainAmount },
      uAberrationStrength: { value: d.aberrationStrength },
      uContrast: { value: d.contrast },
      uWarmTint: { value: d.warmTint },
      uCoolTint: { value: d.coolTint },
      uSplitToneStrength: { value: d.splitToneStrength },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  }
}
