// src/game-render/materials/SkyDome.ts
// Gradient sky dome with a sun disk and a horizon dust band.
//
// A flat clear-colour background is the single fastest way to make a 3D scene
// look unfinished. A gradient dome plus a hazy horizon band costs one draw
// call and does more for the sense of place than any amount of geometry.

import {
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  Color,
  Vector3,
  type IUniform,
} from 'three'

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  // Kill translation so the dome stays centred on the camera forever.
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;
uniform float uHazeStrength;
uniform float uSunBoost;
uniform vec3 uMoonDirection;
uniform vec3 uMoonColor;
// Precomputed on the CPU by starVisibilityFor (see below) rather than
// re-derived here from a raw elevation uniform, so the fade curve has one
// tested implementation instead of a duplicate copy in GLSL.
uniform float uStarVisibility;

varying vec3 vDirection;

// Cheap hash for a per-cell star field. Good enough for points of light; nothing
// about the terrain's silhouette leans on this.
float starHash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453123);
}

// Finding 4: midnight was a dead black screen. Thresholded so only a small
// fraction of sky cells hold a star — a smooth falloff here would look like
// fog, not a clear night sky.
float starField(vec3 dir) {
  vec3 cell = floor(dir * 220.0);
  float star = smoothstep(0.986, 1.0, starHash(cell));
  float brightness = 0.5 + 0.5 * starHash(cell + 7.0);
  return star * brightness;
}

void main() {
  vec3 dir = normalize(vDirection);

  // Non-linear blend keeps the interesting colour near the horizon where the
  // player is actually looking, instead of spreading it evenly up the dome.
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));

  // Dust band: thickest at the horizon, gone by ~15 degrees up. This is the
  // layer that sells "atmosphere you could choke on".
  float haze = exp(-max(dir.y, 0.0) * 7.0) * uHazeStrength;
  sky = mix(sky, uHorizon, haze);

  // Stars fade in above the haze band only — a star inside the dust band
  // would read as a lens artifact, not a point of light in a clear sky.
  sky += vec3(0.85, 0.92, 1.0) * starField(dir) * uStarVisibility * (1.0 - haze);

  // Sun disk with a wide soft bloom halo around a hard core. uSunBoost (see
  // sunDiskBoostFor) scales both up near the horizon, where a real sunset
  // sun reads larger and hazier than the same sun straight overhead.
  float sunAmount = max(dot(dir, normalize(uSunDirection)), 0.0);
  float disk = smoothstep(0.9975, 0.9995, sunAmount);
  float halo = pow(sunAmount, 220.0) * 0.5 + pow(sunAmount, 12.0) * 0.12;
  sky += uSunColor * (disk + halo) * uSunBoost;

  // Krelln, reusing the sun's own disk-plus-halo shape at a cooler colour and
  // gated by the same night visibility as the stars — Finding 4 asked for one
  // moon disk, not a second full lighting model.
  float moonAmount = max(dot(dir, normalize(uMoonDirection)), 0.0);
  float moonDisk = smoothstep(0.998, 0.9995, moonAmount);
  float moonHalo = pow(moonAmount, 220.0) * 0.35 + pow(moonAmount, 12.0) * 0.05;
  sky += uMoonColor * (moonDisk + moonHalo) * uStarVisibility;

  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

// Real atmosphere scatters more of the sun's light into a visible glow the
// lower it sits — a sunset sun reads as a large, hazy blaze; the same sun at
// noon is a small hard point (and one the pitched-down camera barely sees
// anyway — see Lighting.ts's golden-peak comment). Boost peaks right at the
// horizon crossing and decays to a bare 1x by full elevation either way, so
// this reads the same rising or setting.
const HORIZON_GLOW_BOOST = 1.5

export function sunDiskBoostFor(elevation: number): number {
  const e = Math.min(1, Math.abs(elevation))
  return 1 + HORIZON_GLOW_BOOST * (1 - e)
}

// Finding 4: midnight was dead black with "no stars ... no moon". Stars are
// fully out by this far below the horizon and fully gone by this far above
// it — chosen so they clear well before the golden band (sunElevation 0.26,
// see scripts/shoot.mjs), which would otherwise show stars in a lit sky.
const STAR_FADE_LOW = -0.05
const STAR_FADE_HIGH = 0.2

export function starVisibilityFor(sunElevation: number): number {
  const e = Math.max(-1, Math.min(1, sunElevation))
  const t = Math.max(0, Math.min(1, (e - STAR_FADE_LOW) / (STAR_FADE_HIGH - STAR_FADE_LOW)))
  return 1 - t * t * (3 - 2 * t)
}

export interface SkyDome {
  mesh: Mesh
  setPalette(horizon: Color | string, zenith: Color | string, sun: Color | string): void
  setSunDirection(x: number, y: number, z: number): void
  setSunBoost(boost: number): void
  /** Krelln's world direction — see setSunDirection, same idea, cooler light. */
  setMoonDirection(x: number, y: number, z: number): void
  /** Drives star and moon fade — see starVisibilityFor. */
  setSunElevation(elevation: number): void
  dispose(): void
}

export function createSkyDome(radius = 1800): SkyDome {
  const uniforms: Record<string, IUniform> = {
    uHorizon: { value: new Color('#e8a06a') },
    uZenith: { value: new Color('#4a7ac8') },
    uSunColor: { value: new Color('#fff4e0') },
    uSunDirection: { value: new Vector3(0.4, 0.6, 0.7).normalize() },
    uHazeStrength: { value: 0.6 },
    uSunBoost: { value: 1 },
    uMoonDirection: { value: new Vector3(-0.4, 0.5, -0.7).normalize() },
    // Cool grey-blue, per the brief — Krelln has no atmosphere to warm it.
    uMoonColor: { value: new Color('#c9d6e8') },
    uStarVisibility: { value: 0 },
  }

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthWrite: false,
    fog: false,
  })

  const geometry = new SphereGeometry(radius, 32, 20)
  const mesh = new Mesh(geometry, material)
  // Always drawn first, never culled by the camera's far plane logic.
  mesh.renderOrder = -1000
  mesh.frustumCulled = false

  return {
    mesh,
    setPalette(horizon, zenith, sun): void {
      ;(uniforms.uHorizon.value as Color).set(horizon)
      ;(uniforms.uZenith.value as Color).set(zenith)
      ;(uniforms.uSunColor.value as Color).set(sun)
    },
    setSunDirection(x, y, z): void {
      ;(uniforms.uSunDirection.value as Vector3).set(x, y, z).normalize()
    },
    setSunBoost(boost): void {
      uniforms.uSunBoost.value = boost
    },
    setMoonDirection(x, y, z): void {
      ;(uniforms.uMoonDirection.value as Vector3).set(x, y, z).normalize()
    },
    setSunElevation(elevation): void {
      uniforms.uStarVisibility.value = starVisibilityFor(elevation)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
