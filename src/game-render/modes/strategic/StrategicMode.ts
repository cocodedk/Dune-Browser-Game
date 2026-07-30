// src/game-render/modes/strategic/StrategicMode.ts
// The surface view: standing on the erg, looking across it to the horizon.
//
// Assembly only. Terrain lives in DesertTerrain, sky and light in DesertSky,
// the camera in CameraRig, and the sietch furniture in the marker modules.

import { Scene, PerspectiveCamera, type Material } from 'three'
import type { SceneModeId, WorldState } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import type { QualitySettings } from '../../core/Quality'
import { createSandMaterial } from '../../materials/SandMaterial'
import { createDesertTerrain, WORLD_SIZE } from './DesertTerrain'
import { createDesertSky } from './DesertSky'
import { createCameraRig } from '../../core/CameraRig'
import { createSietchMarkers } from './SietchMarkers'
import { localPlacements } from './localMap'
import { createPlayerToken } from './PlayerToken'
import { createMarkerLabels } from './MarkerLabels'
import { shadowSettingsFor } from '../../env/shadowRig'

export function createStrategicMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
  /** The point on the globe the player came down at. */
  centre: { lat: number; lon: number },
  /** Called when the player zooms back out past the surface view. */
  onAscend?: () => void,
): SceneMode {
  const scene = new Scene()

  const sand = createSandMaterial({
    glintStrength: quality.tier === 'low' ? 0 : 0.07,
  })
  // Villages occupy the readable middle of the map, not the fogged distance.
  const MARKER_SPREAD = WORLD_SIZE * 0.42

  // Shadows are fitted to MARKER_SPREAD, not WORLD_SIZE. The full 4400 spread
  // across even a 2048 map is over two world units per texel, which reads as a
  // blocky stair-stepped edge; MARKER_SPREAD is where the sietches, the player
  // token and the camera's whole pan range actually live, and fitting to it
  // keeps a shadow texel under one world unit. Null on the 'low' tier.
  const shadowSettings = shadowSettingsFor(quality)
  const terrain = createDesertTerrain(
    scene, quality, sand.material as Material, centre, shadowSettings !== null,
  )
  const sky = createDesertSky(
    scene, sand, WORLD_SIZE,
    shadowSettings ? { settings: shadowSettings, extent: MARKER_SPREAD } : null,
  )

  // The surface view is one dune field, and it now knows which one. Markers
  // are laid out by bearing and distance from where the player came down, so
  // descending over the far side of the planet shows the sietches that are
  // actually there rather than the same central cluster every time.
  const LOCAL_DEGREES = 20
  const placements = localPlacements(
    world.villages, centre, MARKER_SPREAD * 0.8, LOCAL_DEGREES,
  )
  const nearby = new Set(placements.map(p => p.id))
  const localWorld = {
    ...world,
    villages: world.villages.filter(v => nearby.has(v.id)),
  }

  const markers = createSietchMarkers(
    localWorld, MARKER_SPREAD, terrain.heightAt, placements,
  )
  scene.add(markers.group)

  const playerToken = createPlayerToken(
    MARKER_SPREAD * 0.8, terrain.heightAt, centre, LOCAL_DEGREES,
  )
  scene.add(playerToken.group)

  const labels = createMarkerLabels(
    markers.placements,
    localWorld.villages.map(v => ({ id: v.id, name: v.name })),
    terrain.heightAt,
    96,
  )
  scene.add(labels.group)

  camera.near = 1
  camera.far = WORLD_SIZE * 4
  camera.updateProjectionMatrix()

  // Pan is bounded to the marker area so the player cannot wander off the map.
  const rig = createCameraRig(camera, canvas, {
    minDistance: WORLD_SIZE * 0.22,
    maxDistance: WORLD_SIZE * 0.62,
    panExtent: MARKER_SPREAD * 0.5,
    // Pitched down to 42 for the full-screen board, on the reasoning that a
    // taller frame at a shallow angle fills its top quarter with haze. That
    // was true of the old fog, which was three times too thick; with the haze
    // corrected the top of the frame is horizon and sky instead, and that
    // vista is the whole reason to stand on a desert rather than look down at
    // one. Back to a low angle.
    pitchRadians: (27 * Math.PI) / 180,
  })

  // Zooming out past the rig's far limit returns the player to orbit.
  function onSurfaceWheel(e: WheelEvent): void {
    if (e.deltaY <= 0 || !onAscend) return
    if (rig.atMaxDistance()) onAscend()
  }
  canvas.addEventListener('wheel', onSurfaceWheel, { passive: true })

  let elapsedMs = 0

  return {
    id: 'surface' as SceneModeId,
    scene,
    /** World-XZ hit test for a click, delegated to the marker layer. */
    pickAt(x: number, z: number): string | null {
      return markers.pickAt(x, z, MARKER_SPREAD * 0.09)
    },
    update(deltaMs: number, state: WorldState): void {
      elapsedMs += deltaMs
      terrain.setGroundColor(sky.applyTime(state.time))
      markers.refresh(state)
      playerToken.update(state, elapsedMs)
    },
    dispose(): void {
      scene.remove(markers.group)
      scene.remove(playerToken.group)
      scene.remove(labels.group)
      canvas.removeEventListener('wheel', onSurfaceWheel)
      rig.dispose()
      labels.dispose()
      markers.dispose()
      playerToken.dispose()
      terrain.dispose()
      sky.dispose()
      sand.dispose()
    },
  }
}
