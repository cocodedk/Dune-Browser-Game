// src/game-render/modes/location/LocationMode.ts
// Arriving somewhere means seeing it.
//
// A 2.5D diorama: a gradient backdrop, foreground massing that frames the
// view, and a slow camera drift for parallax. Both the cheapest option and the
// most faithful one — the original was static painted scenes, and a set of
// well-differentiated moods beats a dozen half-built 3D interiors.

import {
  Scene, OrthographicCamera, Mesh, PlaneGeometry,
  MeshBasicMaterial, CanvasTexture, Group, Color,
} from 'three'
import type { SceneModeId, WorldState, LocationKind } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import { pickHotspot } from './hotspotPick'
import { createHotspotLayer } from './HotspotLayer'
import type { HotspotLayer } from './HotspotLayer'
import { hotspotsFor } from './locationDefs'
import type { Hotspot } from './locationDefs'
import { paintDiorama, FRAME_WIDTH, FRAME_HEIGHT } from './paintDiorama'
import { INITIAL_CHARACTERS } from '../../../data/characters'
import { paletteForTime } from '../../materials/Atmosphere'

const DAY_SECONDS = 60

export function createLocationMode(
  canvas?: HTMLElement,
  /** Called when the player asks to step back out to the desert. */
  onLeave?: () => void,
  /** Called with a hotspot id when the player clicks something in the scene. */
  onSpot?: (id: string) => void,
): SceneMode {
  const scene = new Scene()

  const view = new OrthographicCamera(
    -FRAME_WIDTH / 2, FRAME_WIDTH / 2,
    FRAME_HEIGHT / 2, -FRAME_HEIGHT / 2,
    -1000, 1000,
  )
  view.position.z = 10

  const root = new Group()
  scene.add(root)

  // Scrolling out is the same gesture that leaves every other view, so it
  // should work here too rather than being the one place it does nothing.
  function onWheel(e: WheelEvent): void {
    if (e.deltaY > 0) onLeave?.()
  }
  canvas?.addEventListener('wheel', onWheel, { passive: true })

  // Clickable spots. hotspotsFor has existed, fully specced and tested, since
  // the diorama was written — it was simply never wired to anything, so
  // arriving somewhere was a picture with nothing to do in it.
  let spots: Hotspot[] = []
  let hotspots: HotspotLayer | null = null

  /**
   * Pointer handling lives here rather than in a pickAt() implementation.
   *
   * ThreeContainer raycasts the shared *perspective* camera onto the y=0
   * plane; this mode renders through its own orthographic camera looking down
   * -z, so that ray runs parallel to the plane and its hit coordinates mean
   * nothing here. A pickAt() would compile, look right, and never fire.
   */
  function normalised(e: PointerEvent): { nx: number; ny: number } | null {
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
    }
  }

  function onPointerMove(e: PointerEvent): void {
    const p = normalised(e)
    if (!p || !hotspots) return
    const hit = pickHotspot(spots, p.nx, p.ny)
    hotspots.setHover(hit?.id ?? null)
    if (canvas instanceof HTMLElement) {
      canvas.style.cursor = hit ? 'pointer' : ''
    }
  }

  function onPointerDown(e: PointerEvent): void {
    const p = normalised(e)
    if (!p) return
    const hit = pickHotspot(spots, p.nx, p.ny)
    if (!hit) return
    if (hit.id === 'leave') onLeave?.()
    else onSpot?.(hit.id)
  }

  canvas?.addEventListener('pointermove', onPointerMove)
  canvas?.addEventListener('pointerdown', onPointerDown)

  const geometry = new PlaneGeometry(FRAME_WIDTH * 1.08, FRAME_HEIGHT * 1.08)
  let texture: CanvasTexture | null = null
  const material = new MeshBasicMaterial({
    transparent: false,
    depthTest: false,
    fog: false,
    // Painted art, not a lit surface — ACES would crush its midtones.
    toneMapped: false,
  })
  const mesh = new Mesh(geometry, material)
  root.add(mesh)

  let currentKey = ''
  let hotspotKey = ''
  let elapsedMs = 0

  function ensurePainting(world: WorldState): void {
    const place = world.villages.find(v => v.id === world.player.location)
    if (!place) return

    const palette = paletteForTime(world.time, DAY_SECONDS)
    // Repaint per hour-band rather than per frame; a canvas upload every frame
    // would be pure waste for art that barely changes.
    const band = Math.floor((world.time % DAY_SECONDS) / (DAY_SECONDS / 6))
    const key = `${place.id}:${band}`
    if (key === currentKey) return

    texture?.dispose()
    texture = paintDiorama(
      place.kind,
      place.name,
      new Color(palette.horizon[0], palette.horizon[1], palette.horizon[2]),
    )
    material.map = texture
    material.needsUpdate = true
    currentKey = key

    ensureHotspots(world, place.kind)
  }

  /**
   * Rebuild the clickable spots for wherever the player is standing.
   *
   * The layer is a sibling of the backdrop, not a child: the backdrop is
   * scaled 8% larger and drifts for parallax, and labels riding that plane
   * would slowly stop agreeing with their own hit targets.
   */
  function ensureHotspots(world: WorldState, kind: LocationKind): void {
    const hasSpeaker = INITIAL_CHARACTERS.some(
      c => c.locationId === world.player.location,
    )
    const next = hotspotsFor(kind, hasSpeaker)
    const signature = next.map(s => s.id).join(',')
    if (signature === hotspotKey) return

    hotspotKey = signature
    spots = next
    if (hotspots) {
      scene.remove(hotspots.mesh)
      hotspots.dispose()
    }
    hotspots = createHotspotLayer(spots, FRAME_WIDTH, FRAME_HEIGHT)
    scene.add(hotspots.mesh)
  }

  return {
    id: 'location' as SceneModeId,
    scene,
    camera: view,
    update(deltaMs: number, world: WorldState): void {
      elapsedMs += deltaMs
      ensurePainting(world)
      hotspots?.update(elapsedMs)
      // Slow drift gives the flat backdrop a suggestion of depth.
      root.position.x = Math.sin(elapsedMs * 0.00016) * 26
      root.position.y = Math.cos(elapsedMs * 0.00012) * 14
    },
    dispose(): void {
      canvas?.removeEventListener('wheel', onWheel)
      canvas?.removeEventListener('pointermove', onPointerMove)
      canvas?.removeEventListener('pointerdown', onPointerDown)
      if (hotspots) {
        scene.remove(hotspots.mesh)
        hotspots.dispose()
      }
      geometry.dispose()
      material.dispose()
      texture?.dispose()
      scene.remove(root)
    },
  }
}
