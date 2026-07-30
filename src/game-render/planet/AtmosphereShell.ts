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
  float grazing = clamp(1.0 - abs(vNormalView.z), 0.0, 1.0);

  // Two bands, not one: a tight, high-power core that reads as the crisp edge
  // of the air, plus a softer, wider skirt underneath it. A single pow(5)
  // term is a hairline with nothing behind it — real air has depth, and the
  // skirt is what sells "the sightline is passing through several hundred
  // kilometres of atmosphere" rather than "there is a bright line here".
  float core = pow(grazing, 5.0);
  float skirt = pow(grazing, 2.2) * 0.35;
  float rim = core + skirt;

  // Forward scattering: the rim on the sunlit side is far brighter than the
  // one on the night side, which is what stops the halo reading as a decal.
  //
  // The old (-0.55, 0.65) band kept "day" well above zero deep into the night
  // hemisphere, so the base rim below never actually died on the anti-sun
  // limb — it just dimmed to its 0.18 floor and stayed a full 360-degree
  // ring. Narrowed so day reaches 0 close to the terminator instead of a
  // third of the way round the back.
  float lit = dot(normalize(vWorldNormal), normalize(uSun));
  float day = smoothstep(-0.15, 0.55, lit);

  // The day-side limb gets an extra hot edge on top of the base rim — real
  // scattering peaks exactly where the sightline first grazes lit air, which
  // is the cue that light is passing *through* something instead of the
  // planet just having a bright outline. Built from the tight core only, so
  // it stays a thin arc rather than washing out the whole terminator.
  float hotEdge = core * smoothstep(0.15, 0.85, day) * 0.6;

  // Night floor down from 0.18: that alone was enough, on a dark disc, for
  // the rim to read as several stops brighter than the surface it wraps.
  float strength = (rim * (0.05 + 0.95 * day) + hotEdge) * uIntensity;
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
      // Was 1.0, tuned back when the disc it wraps was several stops darker
      // than it should have been (see PlanetMode's shadow/crest anchors). A
      // now-brighter disc needs a dimmer rim to keep reading as the world's
      // edge rather than reclaiming the contrast the surface fix just
      // restored. Picked by arithmetic against that ratio, not re-measured
      // against a render.
      uIntensity: { value: 0.6 },
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
