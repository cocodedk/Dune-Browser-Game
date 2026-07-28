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
import { createHotspotLayer } from './HotspotLayer'
import type { HotspotLayer } from './HotspotLayer'
import { hotspotsFor } from './locationDefs'
import type { Hotspot } from './locationDefs'
import { paintDiorama, FRAME_WIDTH, FRAME_HEIGHT } from './paintDiorama'
import { createFraming } from './framing'
import { createPointerRouter } from './pointerRouter'
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

  const pointer = createPointerRouter(canvas, {
    spots: () => spots,
    hover: id => hotspots?.setHover(id),
    activate: id => { if (id === 'leave') onLeave?.(); else onSpot?.(id) },
  })

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

  const framing = createFraming(view, canvas, () => ({ backdrop: mesh }))
  let elapsedMs = 0

  function ensurePainting(world: WorldState): void {
    const place = world.villages.find(v => v.id === world.player.location)
    if (!place) return

    const palette = paletteForTime(world.time, DAY_SECONDS)
    // Repaint per hour-band rather than per frame; a canvas upload every frame
    // would be pure waste for art that barely changes.
    const band = Math.floor((world.time % DAY_SECONDS) / (DAY_SECONDS / 6))
    // Keyed on the window shape too: the painting is now composed for the
    // screen it is shown on rather than cropped to fit it.
    const key = `${place.id}:${band}:${framing.key}`
    if (key === currentKey) return

    texture?.dispose()
    const { viewWidth, viewHeight } = framing.fit
    // Capped so a very wide window does not allocate an enormous canvas.
    const pixelHeight = 1000
    const pixelWidth = Math.min(
      3000, Math.round(pixelHeight * (viewWidth / viewHeight)),
    )
    texture = paintDiorama(
      place.kind,
      place.name,
      new Color(palette.horizon[0], palette.horizon[1], palette.horizon[2]),
      pixelWidth,
      pixelHeight,
    )
    // Sized to the visible frustum, so nothing is cropped and nothing stretched.
    mesh.geometry.dispose()
    mesh.geometry = new PlaneGeometry(viewWidth, viewHeight)
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
    // Keyed on the window shape too: the label plane spans the visible
    // frustum, so it has to be rebuilt when that changes.
    const signature = `${next.map(s => s.id).join(',')}@${framing.key}`
    if (signature === hotspotKey) return

    hotspotKey = signature
    spots = next
    if (hotspots) {
      scene.remove(hotspots.mesh)
      hotspots.dispose()
    }
    hotspots = createHotspotLayer(
      spots, framing.fit.viewWidth, framing.fit.viewHeight,
    )
    scene.add(hotspots.mesh)
  }

  return {
    id: 'location' as SceneModeId,
    scene,
    camera: view,
    update(deltaMs: number, world: WorldState): void {
      elapsedMs += deltaMs
      framing.refit()
      ensurePainting(world)
      hotspots?.update(elapsedMs)
      // Slow drift gives the flat backdrop a suggestion of depth.
      root.position.x = Math.sin(elapsedMs * 0.00016) * 26
      root.position.y = Math.cos(elapsedMs * 0.00012) * 14
    },
    dispose(): void {
      canvas?.removeEventListener('wheel', onWheel)
      pointer.dispose()
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
