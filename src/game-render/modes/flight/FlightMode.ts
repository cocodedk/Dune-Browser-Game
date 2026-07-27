// src/game-render/modes/flight/FlightMode.ts
// The ornithopter travel cinematic — the signature moment of the Cryo shape.
//
// The engine stays the clock. Progress comes from currentTravelProgress, so
// the cinematic can never disagree with when arrival actually fires; skipping
// is render-only and leaves the simulation untouched.

import {
  Scene, FogExp2, Color, PerspectiveCamera, Vector3,
  Mesh, ConeGeometry, BoxGeometry, MeshStandardMaterial, Group,
  type Material,
} from 'three'
import type { SceneModeId, WorldState } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import type { QualitySettings } from '../../core/Quality'
import { generateHeightfield } from '../../terrain/heightfield'
import { createSandMaterial } from '../../materials/SandMaterial'
import { createSkyDome } from '../../materials/SkyDome'
import { createLighting } from '../../env/Lighting'
import { paletteForTime } from '../../materials/Atmosphere'
import { createTerrainMesh } from '../strategic/TerrainMesh'
import { currentTravelProgress } from '../../../game-engine/TravelSystem'
import { positionAt, chaseCameraAt, yawOf, bankAt } from './FlightPath'
import type { FlightArc } from './FlightPath'

const DAY_SECONDS = 60
const FIELD_SIZE = 2200
const ARC_LENGTH = 1500

function rgb(c: readonly [number, number, number]): Color {
  return new Color(c[0], c[1], c[2])
}

/** Simple stand-in craft — a real GLB lands with the asset pass (Stage 20). */
function buildOrnithopter(): { group: Group; dispose: () => void } {
  const group = new Group()
  // Light enough to catch the sun: at 0x3b3128 the craft rendered as a flat
  // black hole punched in the dunes rather than a machine above them.
  const material = new MeshStandardMaterial({
    color: 0x9c8a6b, roughness: 0.55, metalness: 0.45,
  })

  const bodyGeometry = new ConeGeometry(3.5, 16, 6)
  bodyGeometry.rotateX(Math.PI / 2)
  group.add(new Mesh(bodyGeometry, material))

  const wingGeometry = new BoxGeometry(30, 0.6, 5)
  const wing = new Mesh(wingGeometry, material)
  wing.position.y = 1.5
  group.add(wing)

  return {
    group,
    dispose(): void {
      bodyGeometry.dispose()
      wingGeometry.dispose()
      material.dispose()
    },
  }
}

export function createFlightMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
): SceneMode {
  const scene = new Scene()

  // A treadmill field: the craft flies over fixed terrain along a fixed arc,
  // rather than the world streaming beneath it. No float drift, no clipmap.
  const heightfield = generateHeightfield({
    resolution: quality.tier === 'low' ? 96 : 160,
    worldSize: FIELD_SIZE,
    seed: 7781,
    amplitude: 70,
    frequency: 3.1,
    octaves: quality.tier === 'low' ? 3 : 4,
    warpStrength: 0.9,
    ridgeMix: 0.6,
    stretch: [1, 3.2],
    edgeFalloff: 0.18,
  })

  const sand = createSandMaterial({ glintStrength: quality.tier === 'low' ? 0 : 0.07 })
  const terrain = createTerrainMesh(heightfield, sand.material as Material)
  scene.add(terrain.mesh)

  const sky = createSkyDome(FIELD_SIZE * 1.6)
  scene.add(sky.mesh)
  const lighting = createLighting(scene)

  const fog = new FogExp2(0xe0a070, 0.0009)
  scene.fog = fog

  const craft = buildOrnithopter()
  scene.add(craft.group)

  // Flown across the middle of the field so the edges never enter frame.
  const arc: FlightArc = {
    from: { x: -ARC_LENGTH / 2, y: 90, z: 200 },
    to: { x: ARC_LENGTH / 2, y: 90, z: -200 },
    apex: 70,
  }
  const heading = yawOf(arc)

  camera.near = 1
  camera.far = FIELD_SIZE * 3
  camera.updateProjectionMatrix()

  let elapsedMs = 0

  function applyTime(world: WorldState): void {
    const palette = paletteForTime(world.time, DAY_SECONDS)
    sky.setPalette(rgb(palette.horizon), rgb(palette.zenith), rgb(palette.sun))
    lighting.applyPalette(palette, FIELD_SIZE * 0.5)
    sky.setSunDirection(
      lighting.sun.position.x, lighting.sun.position.y, lighting.sun.position.z,
    )
    fog.color = rgb(palette.fog)

    const shadow = new Color('#7d3a18').lerp(rgb(palette.ambient), 0.3)
    const crest = new Color('#e3b972').lerp(rgb(palette.sun), 0.22)
    sand.setPalette(shadow, crest, shadow.clone().multiplyScalar(0.62))
    // Glint is specular: with no sun on the sand it must disappear, or it
    // reads as white speckle noise over a dark dune field.
    sand.setGlint(Math.max(0, palette.sunElevation) * 0.07)
  }

  return {
    id: 'flight' as SceneModeId,
    scene,
    update(deltaMs: number, world: WorldState): void {
      elapsedMs += deltaMs
      applyTime(world)

      const progress = currentTravelProgress(world)
      const position = positionAt(arc, progress)

      craft.group.position.set(position.x, position.y, position.z)
      craft.group.rotation.set(0, heading, bankAt(progress))
      // Wing flap — cheap, but it is what stops the craft reading as a dart.
      craft.group.children[1].rotation.z = Math.sin(elapsedMs * 0.02) * 0.25

      const view = chaseCameraAt(arc, progress)
      camera.position.set(view.position.x, view.position.y, view.position.z)
      camera.lookAt(new Vector3(view.lookAt.x, view.lookAt.y, view.lookAt.z))
    },
    dispose(): void {
      scene.remove(terrain.mesh)
      scene.remove(sky.mesh)
      scene.remove(craft.group)
      lighting.dispose()
      terrain.dispose()
      craft.dispose()
      sand.dispose()
      sky.dispose()
      scene.fog = null
    },
  }
}
