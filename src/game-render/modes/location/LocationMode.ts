// src/game-render/modes/location/LocationMode.ts
// Arriving somewhere means seeing it.
//
// A 2.5D diorama: a gradient backdrop, foreground massing that frames the
// view, and a slow camera drift for parallax. Both the cheapest option and the
// most faithful one — the original was static painted scenes, and a set of
// well-differentiated moods beats a dozen half-built 3D interiors.

import {
  Scene, OrthographicCamera, Mesh, PlaneGeometry,
  MeshBasicMaterial, CanvasTexture, LinearFilter, SRGBColorSpace, Group, Color,
} from 'three'
import type { SceneModeId, WorldState, LocationKind } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import { dioramaFor } from './locationDefs'
import { paletteForTime } from '../../materials/Atmosphere'

const FRAME_WIDTH = 1600
const FRAME_HEIGHT = 1000
const DAY_SECONDS = 60

/**
 * Paint the diorama to a canvas.
 *
 * Canvas rather than geometry because the whole point is a painted backdrop;
 * building it from meshes would cost more and look worse.
 */
function paintDiorama(kind: LocationKind, name: string, tint: Color): CanvasTexture {
  const def = dioramaFor(kind)
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_WIDTH
  canvas.height = FRAME_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Sky, warmed toward the hour so the diorama shares the map's clock.
  const sky = ctx.createLinearGradient(0, 0, 0, FRAME_HEIGHT)
  sky.addColorStop(0, def.skyTop)
  sky.addColorStop(1, def.skyBottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)

  ctx.globalAlpha = 0.28
  ctx.fillStyle = `rgb(${Math.round(tint.r * 255)}, ${Math.round(tint.g * 255)}, ${Math.round(tint.b * 255)})`
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)
  ctx.globalAlpha = 1

  // Hearth glow behind the massing — what makes an interior feel inhabited.
  if (def.hearth > 0) {
    const glow = ctx.createRadialGradient(
      FRAME_WIDTH / 2, FRAME_HEIGHT * 0.62, 20,
      FRAME_WIDTH / 2, FRAME_HEIGHT * 0.62, FRAME_WIDTH * 0.45,
    )
    glow.addColorStop(0, `rgba(255, 176, 92, ${0.5 * def.hearth})`)
    glow.addColorStop(1, 'rgba(255, 176, 92, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)
  }

  // Foreground massing: an irregular silhouette framing the view. Drawn as one
  // path so the horizon reads as rock rather than as a rectangle.
  const baseY = FRAME_HEIGHT * (1 - def.enclosure * 0.55)
  ctx.fillStyle = def.massing
  ctx.beginPath()
  ctx.moveTo(0, FRAME_HEIGHT)
  ctx.lineTo(0, baseY)
  for (let x = 0; x <= FRAME_WIDTH; x += FRAME_WIDTH / 12) {
    const jag = Math.sin(x * 0.004) * 46 + Math.sin(x * 0.011) * 22
    ctx.lineTo(x, baseY + jag)
  }
  ctx.lineTo(FRAME_WIDTH, FRAME_HEIGHT)
  ctx.closePath()
  ctx.fill()

  // Side pillars deepen the enclosure without another texture.
  const pillar = FRAME_WIDTH * 0.09 * def.enclosure
  if (pillar > 4) {
    ctx.fillStyle = def.massing
    ctx.fillRect(0, 0, pillar, FRAME_HEIGHT)
    ctx.fillRect(FRAME_WIDTH - pillar, 0, pillar, FRAME_HEIGHT)
  }

  ctx.fillStyle = 'rgba(240, 224, 190, 0.92)'
  ctx.font = '600 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, FRAME_WIDTH / 2, 74)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createLocationMode(): SceneMode {
  const scene = new Scene()

  const view = new OrthographicCamera(
    -FRAME_WIDTH / 2, FRAME_WIDTH / 2,
    FRAME_HEIGHT / 2, -FRAME_HEIGHT / 2,
    -1000, 1000,
  )
  view.position.z = 10

  const root = new Group()
  scene.add(root)

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
  }

  return {
    id: 'location' as SceneModeId,
    scene,
    camera: view,
    update(deltaMs: number, world: WorldState): void {
      elapsedMs += deltaMs
      ensurePainting(world)
      // Slow drift gives the flat backdrop a suggestion of depth.
      root.position.x = Math.sin(elapsedMs * 0.00016) * 26
      root.position.y = Math.cos(elapsedMs * 0.00012) * 14
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture?.dispose()
      scene.remove(root)
    },
  }
}
