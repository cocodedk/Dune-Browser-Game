// src/game-render/materials/sandShader.glsl.ts
// GLSL chunks for the sand material, kept as strings in their own file so the
// material module stays under the 200-line cap.
//
// The whole desert aesthetic rests on this shader. Techniques it carries:
//   1. Two-tone windward/slip-face colouring keyed on slope vs wind direction —
//      this is what produces legible crest lines instead of beige mush.
//   2. A slope-based albedo ramp, burnt orange in the troughs to pale gold at
//      the crests, which fakes ambient occlusion for free.
//   3. A rock band keyed on slope alone, well past the sand's own angle of
//      repose, for heightfield.ts's escarpment (Finding 3).
//   4. Ripple shading by the ripple field's own gradient dotted with the sun's
//      bearing, not by the noise value — so ripples relight through the day
//      instead of showing random dark patches (Finding 6).
//   5. Half-vector-gated glint (Finding 5): thresholded high-frequency noise,
//      gated so it only lights up between the view and the sun, the way real
//      mica catches a glitter path rather than glowing at every angle.

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
uniform vec3 uSunDirection;
uniform vec3 uRockColor;
uniform float uRadialUp;

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

// Two octaves of the same field the ripple shading samples — shared so the
// gradient below differences the exact surface being drawn, not an
// approximation of it.
float rippleField(vec2 uv) {
  return sandNoise(uv) * 0.5 + sandNoise(uv * 2.7) * 0.5;
}
`

/**
 * Injected in place of the diffuse colour assignment.
 *
 * Slope drives everything: flat ground reads as sun-bleached crest, steep
 * ground as shadowed trough, slope facing away from the wind becomes the
 * darker slip face, and slope steeper than any dune can stand becomes rock.
 */
export const SAND_FRAGMENT_COLOR = /* glsl */ `
vec3 n = normalize(vWorldNormal);

// Which way is "up" here.
//
// This was clamp(n.y, ...) — the world Y component of the normal — which is
// only "up" on a flat plane. The same material also dresses the globe, where
// the surface normal points radially outward, so at the equator n.y is ~0 and
// every fragment there was classified as a vertical face. The rock band below
// keys on exactly that, so the whole equatorial belt of the planet painted
// itself the dark rock colour whatever biome it actually was, and the slip-face
// term piled on top of it. Measured over a captured noon disc: mean luma 37
// with 83% of it under 40, on a hemisphere the sun was lighting head-on.
// A sphere centred on the origin has its own up at every point, so the globe
// passes uRadialUp = 1 and gets it per fragment.
vec3 up = uRadialUp > 0.5 ? normalize(vWorldPosition) : vec3(0.0, 1.0, 0.0);

// 0 on a vertical face, 1 on flat ground.
float flatness = clamp(dot(n, up), 0.0, 1.0);

// Rock band, keyed on slope alone: DesertTerrain's dunes are tuned to cap out
// near the 34-degree angle of repose (flatness ~0.83 — see its amplitude
// comment); heightfield.ts's escarpment is built steep enough to clear that
// with margin (~55 degrees at its steepest, by the Gaussian slope estimate in
// DesertTerrain.ts's comment — arithmetic, not measured from a render).
// Smoothstepped so the join is a gradient, not a seam.
float rockAmount = 1.0 - smoothstep(0.5, 0.72, flatness);

// Windward faces point into the wind; slip faces point away.
vec2 horizontalNormal = normalize(n.xz + vec2(1e-5));
float windAlignment = dot(horizontalNormal, normalize(uWindDirection));
float slipFaceAmount = smoothstep(0.15, 0.85, -windAlignment) * (1.0 - flatness);

// Ripples run perpendicular to the wind. Scaled by flatness so they do not
// smear across steep faces where sand would actually be sliding.
vec2 rippleUv = vWorldPosition.xz * uRippleScale;
rippleUv += uWindDirection * sandNoise(vWorldPosition.xz * 0.02) * 4.0;

// Central-difference gradient of the ripple field, dotted with the sun's
// horizontal bearing: which way a ripple *faces* the sun, not what the noise
// happens to sample at that point, is what a real raking light lights.
float rEps = 0.35;
vec2 rippleGrad = vec2(
  rippleField(rippleUv + vec2(rEps, 0.0)) - rippleField(rippleUv - vec2(rEps, 0.0)),
  rippleField(rippleUv + vec2(0.0, rEps)) - rippleField(rippleUv - vec2(0.0, rEps))
);
vec2 sunHorizontal = normalize(uSunDirection.xz + vec2(1e-5));
float rippleLight = clamp(dot(-rippleGrad, sunHorizontal) * 4.0, -1.0, 1.0);

// Fades with distance so the gradient's high frequency stops aliasing in the
// middle distance. Bracketed against CameraRig's own bounds — StrategicMode
// clamps the surface camera to WORLD_SIZE*0.22..0.62, i.e. 968..2728 world
// units — full strength at the nearest the camera gets, gone by the farthest.
float rippleDistance = length(cameraPosition - vWorldPosition);
float rippleFade = 1.0 - smoothstep(968.0, 2728.0, rippleDistance);

float rippleShade = rippleLight * 0.12 * flatness * rippleFade * (1.0 - rockAmount);

vec3 sand = mix(uSandShadow, uSandCrest, smoothstep(0.35, 0.98, flatness));
sand = mix(sand, uSlipFace, slipFaceAmount);
sand += rippleShade;

// Rock takes none of the sand terms above — no ripple (a cliff is not
// wind-rippled sand), no slip-face tint (that asymmetry is sand-specific) —
// darker and redder, with a little low-frequency variation so it is not a
// flat paint fill.
vec3 rock = uRockColor * (0.8 + 0.2 * sandNoise(vWorldPosition.xz * 0.01));
sand = mix(sand, rock, rockAmount);

diffuseColor.rgb *= sand;
`

/**
 * Injected after the standard lighting has resolved.
 *
 * Gated on the half-vector between view and sun direction rather than pure
 * view-facing (Finding 5), so a low sun with the camera facing it produces a
 * glitter path across the dunes instead of an angle-independent speckle.
 */
export const SAND_FRAGMENT_GLINT = /* glsl */ `
vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
float grain = sandNoise(vWorldPosition.xz * 220.0);
vec3 halfDirection = normalize(viewDirection + normalize(uSunDirection));
float glintGate = pow(clamp(dot(normalize(vWorldNormal), halfDirection), 0.0, 1.0), 48.0);
// Recomputed rather than reused from the colour chunk above: chunks share a
// main(), but not a guaranteed variable scope, and a cliff face has no glint.
float glintFlatness = clamp(normalize(vWorldNormal).y, 0.0, 1.0);
float glintRock = 1.0 - smoothstep(0.5, 0.72, glintFlatness);
float sparkle = smoothstep(0.86, 1.0, grain) * glintGate * (1.0 - glintRock);
gl_FragColor.rgb += sparkle * uGlintStrength;
`
