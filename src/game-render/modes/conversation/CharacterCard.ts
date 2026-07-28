// src/game-render/modes/conversation/CharacterCard.ts
// The character card — a portrait plane with a rim light and a slow breathing
// drift.
//
// Deliberately NOT a 3D character. Rigged humans are where small projects die:
// they need modelling, rigging, skinning and animation before they stop
// looking worse than a still image. A well-lit card with subtle motion reads
// as deliberate art direction instead of failed realism.

import {
  Group, Mesh, PlaneGeometry, MeshBasicMaterial,
  CanvasTexture, LinearFilter, Color, SRGBColorSpace,
} from 'three'

export interface CharacterCard {
  group: Group
  /** Slow drift, called per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

const CARD_WIDTH = 300
const CARD_HEIGHT = 420

/**
 * Draw a placeholder portrait: a silhouette over a warm gradient, with the
 * character's name and role. Real portraits arrive in the Stage 20 asset pass;
 * until then this must still look composed rather than broken.
 */
function drawPortrait(name: string, role: string, accent: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')!

  const backdrop = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  backdrop.addColorStop(0, '#a8763f')
  backdrop.addColorStop(0.55, '#7a512a')
  backdrop.addColorStop(1, '#3d2a15')
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Warm glow behind the figure. The diorama gets its readability from a
  // tint overlay plus a hearth glow, not from its base gradient — which is
  // in fact darker than this card's was. Without an equivalent the card
  // faithfully rendered colours that were simply authored too dark.
  const glow = ctx.createRadialGradient(
    CARD_WIDTH / 2, 210, 20, CARD_WIDTH / 2, 210, CARD_WIDTH * 0.75,
  )
  glow.addColorStop(0, 'rgba(255, 196, 120, 0.42)')
  glow.addColorStop(1, 'rgba(255, 196, 120, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Head-and-shoulders silhouette — reads as a person at a glance.
  // Kept small and only semi-opaque. At r=62 plus a 105x108 torso at 92%
  // opacity the figure covered most of a 300x420 canvas, so the card read
  // as black — the backdrop was rendering correctly all along, there was
  // simply almost none of it visible.
  ctx.fillStyle = 'rgba(38, 22, 10, 0.72)'
  ctx.beginPath()
  ctx.arc(CARD_WIDTH / 2, 175, 46, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(CARD_WIDTH / 2, 352, 74, 76, 0, Math.PI, 0)
  ctx.fill()

  // Rim light from the upper left, matching the scene's sun direction.
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.globalAlpha = 0.95
  ctx.beginPath()
  ctx.arc(CARD_WIDTH / 2, 175, 46, Math.PI * 0.75, Math.PI * 1.65)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.fillStyle = accent
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, CARD_WIDTH / 2, 396)

  ctx.fillStyle = 'rgba(240, 224, 190, 0.9)'
  ctx.font = 'italic 14px system-ui, sans-serif'
  // Long roles are trimmed rather than overflowing the card.
  const trimmed = role.length > 42 ? `${role.slice(0, 40)}…` : role
  ctx.fillText(trimmed, CARD_WIDTH / 2, 415)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  // The canvas is authored in sRGB. Without saying so, three treats it as
  // linear and converts a second time, darkening the whole card.
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createCharacterCard(
  name: string,
  role: string,
  accent = '#d4a017',
): CharacterCard {
  const group = new Group()

  const texture = drawPortrait(name, role, accent)
  const geometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    fog: false,
    // The card is UI, not a lit surface: ACES tone mapping was crushing its
    // midtones and rendering it near-black.
    toneMapped: false,
  })
  material.color = new Color(0xffffff)

  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 100
  // The GROUP's renderOrder participates in transparent sorting too. Left at
  // the default 0 it sorted below the scrim, so the scrim drew over the card
  // and dimmed it by exactly the scrim's opacity.
  group.renderOrder = 100
  group.add(mesh)

  return {
    group,
    update(elapsedMs: number): void {
      // Breathing drift: barely perceptible, but a perfectly still card reads
      // as a paused game rather than a person listening.
      group.position.y = Math.sin(elapsedMs * 0.0011) * 5
      group.rotation.z = Math.sin(elapsedMs * 0.0007) * 0.004
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
