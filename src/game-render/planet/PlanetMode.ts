// src/game-render/planet/PlanetMode.ts
// Arrakis as a world.
//
// Replaces the flat dune field as the strategic view. The player looks at a
// globe hanging in space and zooms down toward the surface; the sietch markers
// stand on it, and the same day/night palette drives the light.

import {
  Scene, PerspectiveCamera, Vector3, Color, Group, type Material,
} from 'three'
import type { SceneModeId, WorldState } from '../../types'
import type { SceneMode } from '../core/ModeManager'
import type { QualitySettings } from '../core/Quality'
import { createSandMaterial } from '../materials/SandMaterial'
import { createLighting } from '../env/Lighting'
import { paletteForTime } from '../materials/Atmosphere'
import { createPlanetMesh } from './PlanetMesh'
import { createStarfield } from './Starfield'
import { createSietchMarkers } from '../modes/strategic/SietchMarkers'
import { createMarkerLabels } from '../modes/strategic/MarkerLabels'
import {
  latLonToVec3, canvasToLatLon, zoomToDistance, vec3ToLatLon,
} from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

const DAY_SECONDS = 60
const RADIUS = 1000
const RELIEF = 0.055

function rgb(c: readonly [number, number, number]): Color {
  return new Color(c[0], c[1], c[2])
}

export function createPlanetMode(
  camera: PerspectiveCamera,
  quality: QualitySettings,
  world: WorldState,
  canvas: HTMLElement,
  /** Called once the player has zoomed all the way down to the surface. */
  onDescend?: () => void,
): SceneMode {
  const scene = new Scene()

  const sand = createSandMaterial({ glintStrength: quality.tier === 'low' ? 0 : 0.06 })
  const planet = createPlanetMesh(
    {
      radius: RADIUS,
      seed: 20250727,
      relief: RELIEF,
      segments: quality.tier === 'low' ? 96 : 192,
    },
    sand.material as Material,
  )
  scene.add(planet.mesh)

  const stars = createStarfield(RADIUS * 40)
  scene.add(stars.points)

  const lighting = createLighting(scene)

  // Markers ride on a group rotated with the planet, so they stay put on the
  // surface as it turns.
  const surface = new Group()
  scene.add(surface)

  // Place each location on the globe, standing on its actual displaced height.
  const anchors = new Map<string, Vector3>()
  for (const village of world.villages) {
    const ll = canvasToLatLon(village.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    const dir = latLonToVec3(ll, 1)
    const v = new Vector3(dir.x, dir.y, dir.z)
    anchors.set(village.id, v.clone().multiplyScalar(planet.radiusAt(v)))
  }

  // Reuse the flat-map marker and label builders by feeding them the planet
  // anchors: they only need positions and a height lookup.
  const markerSpread = RADIUS * 2
  const markers = createSietchMarkers(world, markerSpread, () => 0)
  const labels = createMarkerLabels(
    markers.placements,
    world.villages.map(v => ({ id: v.id, name: v.name })),
    () => 0,
    0,
  )
  surface.add(markers.group)
  surface.add(labels.group)

  // Stand each marker on its anchor, pointing away from the planet centre.
  //
  // lookAt aims an object's -Z at a target, but the marker pillars are built
  // along +Y, so lookAt lays them flat. A quaternion from +Y to the outward
  // normal is what actually stands them up.
  const UP = new Vector3(0, 1, 0)

  function seat(group: Group, idFor: (index: number) => string | undefined, lift: number): void {
    group.children.forEach((child, index) => {
      const id = idFor(index)
      const anchor = id ? anchors.get(id) : undefined
      if (!anchor) return
      const out = anchor.clone().normalize()
      child.position.copy(anchor).addScaledVector(out, lift)
      child.quaternion.setFromUnitVectors(UP, out)
    })
  }

  // Markers emit a pillar and a ring per location, in placement order.
  seat(markers.group, i => markers.placements[Math.floor(i / 2)]?.id, 0)
  // Labels are one sprite per location and always face the camera, so they
  // need position only — rotating a sprite does nothing.
  labels.group.children.forEach((child, index) => {
    const id = markers.placements[index]?.id
    const anchor = id ? anchors.get(id) : undefined
    if (!anchor) return
    const out = anchor.clone().normalize()
    child.position.copy(anchor).addScaledVector(out, 70)
  })

  // --- Camera ---------------------------------------------------------------

  // Near limit stops well above the surface. At 1.09 the camera sat 90 units
  // over terrain with 35 units of relief and the sphere's tessellation could
  // not carry it — the view became a flat brown wall. 1.32 keeps the closest
  // zoom reading as terrain seen from altitude, which is what a strategic
  // map wants anyway.
  const range = { far: RADIUS * 4.2, near: RADIUS * 1.32 }
  let zoom = 0.18          // Start pulled back: the first sight is a world.
  // The inhabited band centres on +X (lat 0, lon 0 maps there), so the
  // camera must start a quarter turn round or every sietch sits on the limb.
  let yaw = Math.PI / 2
  let pitch = 0.18
  const target = new Vector3(0, 0, 0)

  camera.near = 1
  camera.far = RADIUS * 80
  camera.updateProjectionMatrix()

  function applyCamera(): void {
    const distance = zoomToDistance(zoom, range)
    const cp = Math.cos(pitch)
    camera.position.set(
      target.x + Math.sin(yaw) * cp * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * cp * distance,
    )
    camera.lookAt(target)
  }
  applyCamera()

  let dragging = false
  let lastX = 0
  let lastY = 0

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    // Fraction of remaining distance per notch, so it never feels glacial far
    // out nor violent up close.
    zoom = Math.max(0, Math.min(1, zoom - e.deltaY * 0.00075))
    applyCamera()

    // Bottoming out the zoom is the player asking to land. Handing off to the
    // surface view beats letting them press against a sphere whose
    // tessellation cannot carry a close look.
    if (zoom >= 0.999 && onDescend) onDescend()
  }
  function onDown(e: PointerEvent): void {
    if (e.button !== 0) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  function onMove(e: PointerEvent): void {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    // Rotation slows as you descend, or the surface tears past unreadably.
    const rate = 0.005 * (1 - zoom * 0.72)
    yaw -= dx * rate
    pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * rate))
    applyCamera()
  }
  function onUp(): void { dragging = false }

  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)

  function applyTime(state: WorldState): void {
    const palette = paletteForTime(state.time, DAY_SECONDS)
    lighting.applyPalette(palette, RADIUS * 3)

    const shadow = new Color('#6e3113').lerp(rgb(palette.ambient), 0.18)
    const crest = new Color('#e3b972').lerp(rgb(palette.sun), 0.22)
    sand.setPalette(shadow, crest, shadow.clone().multiplyScalar(0.62))
    sand.setGlint(Math.max(0, palette.sunElevation) * 0.06)
  }

  return {
    id: 'strategic' as SceneModeId,
    scene,
    /** Raycast hit on the globe resolves to the nearest sietch. */
    pickAt(x: number, z: number): string | null {
      const hit = new Vector3(x, 0, z)
      if (hit.lengthSq() === 0) return null
      const ll = vec3ToLatLon(hit)
      void ll
      let best: string | null = null
      let bestDist = Infinity
      for (const [id, anchor] of anchors) {
        const d = anchor.distanceTo(hit)
        if (d < bestDist) { bestDist = d; best = id }
      }
      return bestDist < RADIUS * 0.22 ? best : null
    },
    update(_deltaMs: number, state: WorldState): void {
      applyTime(state)
      markers.refresh(state)
    },
    dispose(): void {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      scene.remove(planet.mesh)
      scene.remove(stars.points)
      scene.remove(surface)
      lighting.dispose()
      planet.dispose()
      stars.dispose()
      markers.dispose()
      labels.dispose()
      sand.dispose()
    },
  }
}
