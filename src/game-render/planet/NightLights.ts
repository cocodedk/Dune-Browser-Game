// src/game-render/planet/NightLights.ts
// What night looks like on the globe: a cool wash over the dark hemisphere,
// and settlement lights that switch on once a place has genuinely crossed
// into it.
//
// The globe's sun tracks the camera (see PlanetSun), so the terminator this
// module keys off is always near the visible limb, not a rotating day/night
// line — that is a deliberate compromise for a strategic map, kept intact
// here. What was missing was colour: the unlit side fell back to the sand
// palette dimmed by ambient light, which reads as a render with the sun
// switched off rather than as night.

import {
  BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, ShaderMaterial,
  SphereGeometry, Vector3, AdditiveBlending, type PerspectiveCamera,
} from 'three'
import type { WorldState } from '../../types'
import { nightTint } from './biomes'

export interface NightLights {
  group: Group
  /** Cheap — a handful of dot products and one uniform upload. Call per frame. */
  update(state: WorldState, sunDirection: Vector3, camera: PerspectiveCamera): void
  dispose(): void
}

const VERTEX = /* glsl */ `
varying vec3 vWorldNormal;
void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 uNightColor;
uniform vec3 uSun;
varying vec3 vWorldNormal;

void main() {
  float lit = dot(normalize(vWorldNormal), normalize(uSun));
  // nightAmount(lit) below, inlined rather than called — kept in step with
  // the exported JS copy of this formula so the settlement lights switch on
  // across exactly the band the wash uses.
  float night = clamp((0.22 - lit) / 0.34, 0.0, 1.0);
  night = night * night * (3.0 - 2.0 * night);
  // Held under 1 so terrain shading still shows through the wash at full
  // night instead of flattening every biome into one silhouette.
  gl_FragColor = vec4(uNightColor, night * 0.78);
}
`

/**
 * Night amount (0 lit .. 1 full night) from a sun-facing dot product.
 *
 * The exact formula the fragment shader above inlines — kept here too so it
 * is testable, and so the settlement lights below switch on across the same
 * band the wash uses rather than an independently-tuned one.
 */
export function nightAmount(lit: number): number {
  const t = Math.min(1, Math.max(0, (0.22 - lit) / 0.34))
  return t * t * (3 - 2 * t)
}

/** True once a point has crossed far enough into night for a light to read. */
export function isNightSide(
  outward: Vector3, sunDirection: Vector3, threshold = -0.05,
): boolean {
  return outward.dot(sunDirection) < threshold
}

const LIGHT_COLOR = 0xffdfa0

interface Light {
  id: string
  mesh: Mesh
  outward: Vector3
}

export function createNightLights(
  world: WorldState,
  anchors: Map<string, Vector3>,
  /** The planet's own displaced geometry — shared, never disposed here. */
  planetGeometry: BufferGeometry,
  planetRadius: number,
): NightLights {
  const group = new Group()
  group.name = 'planet-night'

  // Fixed rather than palette-driven: the point is to always read as *night*
  // once past the terminator, regardless of whatever warm/cool bias the
  // hour's own daytime palette is running.
  const nightColor = new Color(...nightTint([1, 1, 1], 1))

  // Shares the planet's own vertex buffer so the wash conforms to every dune
  // and massif exactly, rather than an undisplaced shell that would either
  // float above the terrain or bury itself inside the taller rock.
  const washMaterial = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uNightColor: { value: nightColor },
      uSun: { value: new Vector3(0, 1, 0) },
    },
    transparent: true,
    depthWrite: false,
    // Identical geometry to the opaque planet at identical depth is exactly
    // the z-fighting case polygon offset exists for; pushed toward the camera
    // just enough to win the tie every time.
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    fog: false,
  })
  const wash = new Mesh(planetGeometry, washMaterial)
  wash.name = 'planet-night-wash'
  wash.renderOrder = 1
  group.add(wash)

  const lightGeometry = new SphereGeometry(planetRadius * 0.006, 6, 6)
  const lightMaterial = new MeshBasicMaterial({
    color: LIGHT_COLOR,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    // Same convention as the sietch markers and the player beacon: gameplay
    // furniture standing on the globe is hidden by hand (the horizon test
    // below), never by the depth buffer, which a displaced sphere cannot be
    // trusted to sort correctly at grazing angles.
    depthTest: false,
    depthWrite: false,
    fog: false,
  })

  const lights: Light[] = []
  for (const village of world.villages) {
    const anchor = anchors.get(village.id)
    if (!anchor) continue
    const outward = anchor.clone().normalize()
    const mesh = new Mesh(lightGeometry, lightMaterial)
    mesh.name = `night-light:${village.id}`
    mesh.position.copy(anchor).addScaledVector(outward, planetRadius * 0.004)
    mesh.visible = false
    group.add(mesh)
    lights.push({ id: village.id, mesh, outward })
  }

  const sun = new Vector3()
  const toCamera = new Vector3()

  return {
    group,
    update(state, sunDirection, camera): void {
      sun.copy(sunDirection).normalize()
      ;(washMaterial.uniforms.uSun.value as Vector3).copy(sun)

      const distance = camera.position.length()
      const horizon = distance > 0 ? planetRadius / distance : 1
      toCamera.copy(camera.position).normalize()

      const discovered = new Set(
        state.villages.filter(v => v.discovered).map(v => v.id),
      )
      for (const light of lights) {
        light.mesh.visible = discovered.has(light.id)
          && isNightSide(light.outward, sun)
          && light.outward.dot(toCamera) > horizon
      }
    },
    dispose(): void {
      washMaterial.dispose()
      lightGeometry.dispose()
      lightMaterial.dispose()
      group.clear()
      // planetGeometry is owned by PlanetMesh and disposed there.
    },
  }
}
