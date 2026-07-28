// src/game-render/planet/AtmosphereShell.ts
// The haze around the limb of Arrakis.
//
// This is the single cheapest thing that makes a sphere read as a *world*
// rather than a lit ball. Real planets are ringed by a bright rim where the
// line of sight grazes the atmosphere and passes through far more of it; the
// eye knows that silhouette even when it cannot name it.
//
// Drawn as a back-face shell slightly larger than the planet, additively
// blended, with brightness driven by a Fresnel term so it vanishes over the
// disc and blazes at the edge. The sun direction biases it so the day side's
// rim is hot and the night side keeps only a thin cold trace.

import {
  BackSide, AdditiveBlending, Mesh, ShaderMaterial, SphereGeometry, Color,
  Vector3,
} from 'three'

export interface AtmosphereShell {
  mesh: Mesh
  /** Retint for the hour. Cheap — safe to call every frame. */
  setPalette(rim: Color, sunDirection: Vector3): void
  dispose(): void
}

const VERTEX = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vWorldNormal;

void main() {
  // The shell is a plain sphere, so the object-space position doubles as the
  // outward normal — no need to trust an attribute through the scaling.
  vec3 outward = normalize(position);
  vWorldNormal = normalize(mat3(modelMatrix) * outward);
  vNormalView = normalize(normalMatrix * outward);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 uRim;
uniform vec3 uSun;
uniform float uIntensity;

varying vec3 vNormalView;
varying vec3 vWorldNormal;

void main() {
  // Back faces, so the view normal points away; the grazing angle is where
  // its z component approaches zero.
  float grazing = 1.0 - abs(vNormalView.z);

  // Raised to a high power so the band hugs the silhouette instead of
  // fogging the whole disc into milk.
  float rim = pow(clamp(grazing, 0.0, 1.0), 5.0);

  // Forward scattering: the rim on the sunlit side is far brighter than the
  // one on the night side, which is what stops the halo reading as a decal.
  float lit = dot(normalize(vWorldNormal), normalize(uSun));
  float day = smoothstep(-0.55, 0.65, lit);

  float strength = rim * uIntensity * (0.18 + 0.82 * day);
  gl_FragColor = vec4(uRim * strength, strength);
}
`

/**
 * @param radius Planet radius. The shell is sized off this.
 * @param scale  Shell radius as a multiple of the planet's. Small on purpose:
 *               a thick shell looks like fog, not air.
 */
export function createAtmosphereShell(radius: number, scale = 1.075): AtmosphereShell {
  const geometry = new SphereGeometry(radius * scale, 64, 32)

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uRim: { value: new Color('#e9a765') },
      uSun: { value: new Vector3(1, 0.4, 0.2) },
      uIntensity: { value: 1.0 },
    },
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    // Additive haze must not occlude the markers standing on the surface, and
    // it has no depth of its own worth writing.
    depthWrite: false,
    fog: false,
  })

  const mesh = new Mesh(geometry, material)
  mesh.name = 'atmosphere'
  // Behind the markers, in front of the stars.
  mesh.renderOrder = 1

  return {
    mesh,
    setPalette(rim: Color, sunDirection: Vector3): void {
      ;(material.uniforms.uRim.value as Color).copy(rim)
      ;(material.uniforms.uSun.value as Vector3).copy(sunDirection).normalize()
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
