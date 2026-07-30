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

varying vec3 vDirection;

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

  // Sun disk with a wide soft bloom halo around a hard core. uSunBoost (see
  // sunDiskBoostFor) scales both up near the horizon, where a real sunset
  // sun reads larger and hazier than the same sun straight overhead.
  float sunAmount = max(dot(dir, normalize(uSunDirection)), 0.0);
  float disk = smoothstep(0.9975, 0.9995, sunAmount);
  float halo = pow(sunAmount, 220.0) * 0.5 + pow(sunAmount, 12.0) * 0.12;
  sky += uSunColor * (disk + halo) * uSunBoost;

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

export interface SkyDome {
  mesh: Mesh
  setPalette(horizon: Color | string, zenith: Color | string, sun: Color | string): void
  setSunDirection(x: number, y: number, z: number): void
  setSunBoost(boost: number): void
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
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
