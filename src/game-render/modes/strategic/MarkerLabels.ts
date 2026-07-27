// src/game-render/modes/strategic/MarkerLabels.ts
// Name plates above each marker, drawn as canvas textures on camera-facing
// sprites. A map you cannot read place names off is not a map.
//
// Sprites rather than HTML overlays: they sort correctly against the 3D scene,
// scale with distance for free, and cost one draw call each with no layout
// thrash on the React side.

import { Group, Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'
import type { MarkerPlacement } from './markerLayout'

const FONT = '600 34px system-ui, sans-serif'
const PADDING = 14
// With sizeAttenuation off, sprite scale is screen-relative rather than in
// world units. Constant on-screen size is the right call for a strategic map:
// distance-scaled labels made the far half of the board unreadable.
// Calibrated against the rendered result: with sizeAttenuation off, scale is
// roughly a viewport fraction, so this multiplier maps a texture's pixel width
// to about the same on-screen width. 0.0022 rendered labels half the canvas
// wide and overlapping.
const LABEL_SCALE = 0.0008

export interface MarkerLabels {
  group: Group
  dispose(): void
}

interface LabelSource {
  id: string
  name: string
}

function drawLabel(text: string): { texture: CanvasTexture; width: number; height: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  ctx.font = FONT
  const metrics = ctx.measureText(text)
  const width = Math.ceil(metrics.width) + PADDING * 2
  const height = 56

  canvas.width = width
  canvas.height = height

  // Font resets when the canvas is resized.
  ctx.font = FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Dark plate behind the text so names stay readable over pale crests as
  // well as dark troughs.
  ctx.fillStyle = 'rgba(12, 8, 4, 0.62)'
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 8)
  ctx.fill()

  ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#f0d9a8'
  ctx.fillText(text, width / 2, height / 2 + 1)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  return { texture, width, height }
}

export function createMarkerLabels(
  placements: MarkerPlacement[],
  sources: LabelSource[],
  heightAt: (x: number, z: number) => number,
  verticalOffset: number,
): MarkerLabels {
  const group = new Group()
  group.name = 'marker-labels'

  const textures: CanvasTexture[] = []
  const materials: SpriteMaterial[] = []

  for (const placement of placements) {
    const source = sources.find(s => s.id === placement.id)
    if (!source) continue

    const { texture, width, height } = drawLabel(source.name)
    textures.push(texture)

    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      fog: false,
      sizeAttenuation: false,
    })
    materials.push(material)

    const sprite = new Sprite(material)
    sprite.scale.set(width * LABEL_SCALE, height * LABEL_SCALE, 1)
    sprite.position.set(
      placement.x,
      heightAt(placement.x, placement.z) + verticalOffset,
      placement.z,
    )
    sprite.renderOrder = 30
    group.add(sprite)
  }

  return {
    group,
    dispose(): void {
      for (const t of textures) t.dispose()
      for (const m of materials) m.dispose()
      group.clear()
    },
  }
}
