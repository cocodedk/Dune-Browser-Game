// src/game-render/modes/location/HotspotLayer.ts
// The clickable labels painted over a location.
//
// Drawn on its own plane, sized to the frame exactly and with no parallax
// drift. The backdrop behind it is scaled slightly larger and drifts for
// depth, and putting labels on that plane would mean the painted position and
// the hit-test position slowly disagree — targets that miss themselves.

import {
  Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, LinearFilter,
  SRGBColorSpace,
} from 'three'
import type { Hotspot } from './locationDefs'

export interface HotspotLayer {
  mesh: Mesh
  /** Highlight the spot under the pointer, or none. */
  setHover(id: string | null): void
  update(elapsedMs: number): void
  dispose(): void
}

const PAD = 14

function paint(
  spots: readonly Hotspot[],
  width: number,
  height: number,
  hovered: string | null,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  for (const spot of spots) {
    const x = spot.x * width
    // Hotspots are normalised from the bottom; the canvas draws from the top.
    const y = (1 - spot.y) * height
    const on = spot.id === hovered

    ctx.font = `600 ${on ? 21 : 19}px system-ui, sans-serif`
    const textWidth = ctx.measureText(spot.label).width
    const w = textWidth + PAD * 2
    const h = 34

    ctx.fillStyle = on ? 'rgba(24, 16, 6, 0.92)' : 'rgba(16, 11, 5, 0.72)'
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 6)
    ctx.fill()

    ctx.strokeStyle = on ? 'rgba(240, 200, 110, 0.95)' : 'rgba(200, 160, 70, 0.55)'
    ctx.lineWidth = on ? 2 : 1.2
    ctx.stroke()

    ctx.fillStyle = on ? '#f4dca4' : '#d8b878'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spot.label, x, y + 1)
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createHotspotLayer(
  spots: readonly Hotspot[],
  frameWidth: number,
  frameHeight: number,
): HotspotLayer {
  const geometry = new PlaneGeometry(frameWidth, frameHeight)
  const material = new MeshBasicMaterial({
    transparent: true,
    depthTest: false,
    fog: false,
    // Labels are interface, not a lit surface — tone mapping would crush them.
    toneMapped: false,
  })

  let texture = paint(spots, 1024, 768, null)
  material.map = texture

  const mesh = new Mesh(geometry, material)
  mesh.name = 'location-hotspots'
  mesh.renderOrder = 60

  let hovered: string | null = null

  return {
    mesh,
    setHover(id: string | null): void {
      if (id === hovered) return
      hovered = id
      texture.dispose()
      texture = paint(spots, 1024, 768, hovered)
      material.map = texture
      material.needsUpdate = true
    },
    update(elapsedMs: number): void {
      // A slow pulse, so the labels read as live rather than as printed on
      // the backdrop.
      material.opacity = 0.82 + Math.sin(elapsedMs * 0.0016) * 0.12
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

/** Group holding a layer, for callers that add a whole subtree. */
export function hotspotGroup(layer: HotspotLayer): Group {
  const group = new Group()
  group.add(layer.mesh)
  return group
}
