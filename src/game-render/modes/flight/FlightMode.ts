// src/game-render/modes/flight/FlightMode.ts
// The ornithopter travel cinematic — the signature moment of the Cryo shape.
//
// The engine stays the clock. Progress comes from currentTravelProgress, so
// the cinematic can never disagree with when arrival actually fires; skipping
// is render-only and leaves the simulation untouched.

import {
  Scene, FogExp2, Color, PerspectiveCamera, Vector3,
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
import { fogColorFor } from '../strategic/DesertSky'
import { currentTravelProgress } from '../../../game-engine/TravelSystem'
import { positionAt, chaseCameraAt, yawOf, bankAt, pitchAt } from './FlightPath'
import { createOrnithopter } from './Ornithopter'
import type { FlightArc } from './FlightPath'

const DAY_SECONDS = 60
const FIELD_SIZE = 2200
const ARC_LENGTH = 1500
/** How far the skids sit above the sand at touchdown. */
const SKID_CLEARANCE = 6

function rgb(c: readonly [number, number, number]): Color {
  return new Color(c[0], c[1], c[2])
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

  const craft = createOrnithopter()
  scene.add(craft.group)

  // Flown across the middle of the field so the edges never enter frame.
  // Where the ground actually is under the destination, so the craft lands on
  // the dunes rather than at a guessed altitude. Sampled once — the field is a
  // fixed treadmill, so this cannot drift.
  const destination = { x: ARC_LENGTH / 2, z: -200 }
  const groundY = heightfield.heightAt(destination.x, destination.z)

  const arc: FlightArc = {
    from: { x: -ARC_LENGTH / 2, y: 90, z: 200 },
    to: { x: destination.x, y: 90, z: destination.z },
    apex: 70,
    // Skid clearance above the sand. Without this the arc ended in level
    // flight at altitude 90 and the mode switched under a craft that had never
    // come down — the cinematic could only ever look interrupted.
    touchdownY: groundY + SKID_CLEARANCE,
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
    // Leaned toward the zenith, exactly as the surface view does. palette.fog
    // resolves to the same triple the sky dome paints its horizon band with, so
    // using it directly fades the ground into the sky at the identical RGB and
    // erases the horizon — a dust storm rather than a desert. The flight view
    // kept doing that after the surface view stopped, which left the two
    // disagreeing about what haze is for.
    fog.color = rgb(fogColorFor(palette.horizon, palette.zenith))

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
      craft.group.rotation.set(pitchAt(progress), heading, bankAt(progress))
      craft.update(elapsedMs)

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
