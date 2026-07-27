// src/game-render/materials/sandShader.glsl.ts
// GLSL chunks for the sand material, kept as strings in their own file so the
// material module stays under the 200-line cap.
//
// The whole desert aesthetic rests on this shader. Three techniques carry it:
//   1. Two-tone windward/slip-face colouring keyed on slope vs wind direction —
//      this is what produces legible crest lines instead of beige mush.
//   2. A slope-based albedo ramp, burnt orange in the troughs to pale gold at
//      the crests, which fakes ambient occlusion for free.
//   3. View-dependent procedural glint — thresholded high-frequency noise in
//      the specular term. Should read as mica in sunlight, never as glitter.

/** Injected before main() in the vertex shader. */
export const SAND_VERTEX_DECLARATIONS = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
`

/** Injected at the end of the vertex shader's main(). */
export const SAND_VERTEX_BODY = /* glsl */ `
vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
`

/** Injected before main() in the fragment shader. */
export const SAND_FRAGMENT_DECLARATIONS = /* glsl */ `
uniform vec3 uSandShadow;
uniform vec3 uSandCrest;
uniform vec3 uSlipFace;
uniform vec2 uWindDirection;
uniform float uGlintStrength;
uniform float uRippleScale;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

// Cheap hash-based value noise. Good enough for ripples and glint; the terrain
// silhouette comes from real geometry, not from this.
float sandHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float sandNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = sandHash(i);
  float b = sandHash(i + vec2(1.0, 0.0));
  float c = sandHash(i + vec2(0.0, 1.0));
  float d = sandHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`

/**
 * Injected in place of the diffuse colour assignment.
 *
 * Slope drives everything: flat ground reads as sun-bleached crest, steep
 * ground as shadowed trough, and slope facing away from the wind becomes the
 * darker slip face. Real dunes are asymmetric that way and the eye knows it
 * even when the viewer cannot say why.
 */
export const SAND_FRAGMENT_COLOR = /* glsl */ `
vec3 n = normalize(vWorldNormal);

// 0 on a vertical face, 1 on flat ground.
float flatness = clamp(n.y, 0.0, 1.0);

// Windward faces point into the wind; slip faces point away.
vec2 horizontalNormal = normalize(n.xz + vec2(1e-5));
float windAlignment = dot(horizontalNormal, normalize(uWindDirection));
float slipFaceAmount = smoothstep(0.15, 0.85, -windAlignment) * (1.0 - flatness);

// Ripples run perpendicular to the wind. Scaled by flatness so they do not
// smear across steep faces where sand would actually be sliding.
vec2 rippleUv = vWorldPosition.xz * uRippleScale;
rippleUv += uWindDirection * sandNoise(vWorldPosition.xz * 0.02) * 4.0;
float ripple = sandNoise(rippleUv) * 0.5 + sandNoise(rippleUv * 2.7) * 0.5;
float rippleShade = (ripple - 0.5) * 0.12 * flatness;

vec3 sand = mix(uSandShadow, uSandCrest, smoothstep(0.35, 0.98, flatness));
sand = mix(sand, uSlipFace, slipFaceAmount);
sand += rippleShade;

diffuseColor.rgb *= sand;
`

/**
 * Injected after the standard lighting has resolved.
 *
 * Thresholded so only a small fraction of grains catch the light at any angle;
 * a smooth falloff here looks like wet plastic rather than dry sand.
 */
export const SAND_FRAGMENT_GLINT = /* glsl */ `
vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
float grain = sandNoise(vWorldPosition.xz * 220.0);
float facing = clamp(dot(normalize(vWorldNormal), viewDirection), 0.0, 1.0);
float sparkle = smoothstep(0.86, 1.0, grain) * pow(1.0 - facing, 3.0);
gl_FragColor.rgb += sparkle * uGlintStrength;
`
