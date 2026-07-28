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
import { portraitFor } from '../../../data/portraits'
import type { PortraitDef } from '../../../data/portraits'
import { drawFigure } from './drawFigure'

export interface CharacterCard {
  group: Group
  /** Slow drift, called per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

// Authored space. The canvas is rendered at SUPERSAMPLE times this and the
// drawing scaled to match, so the portrait stays crisp when the plane is
// bigger on screen than the texture would otherwise allow.
const CARD_WIDTH = 300
const CARD_HEIGHT = 420
const SUPERSAMPLE = 2
/** Plane size relative to the authored card. The figure was too small to read. */
const CARD_ZOOM = 1.34

/**
 * Compose the portrait: backdrop, key light, figure, rim light, name plate.
 *
 * The figure itself is drawn by drawFigure; everything here is the lighting
 * and framing around it, which is what makes fourteen characters drawn by one
 * function still look like fourteen different people.
 */
function drawPortrait(name: string, role: string, def: PortraitDef): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH * SUPERSAMPLE
  canvas.height = CARD_HEIGHT * SUPERSAMPLE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SUPERSAMPLE, SUPERSAMPLE)

  const backdrop = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  backdrop.addColorStop(0, def.backTop)
  backdrop.addColorStop(1, def.backBottom)
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Flat warm lift across the whole card. The diorama gets its readability
  // from exactly this step — a 28% apricot tint over its gradient — and the
  // card had only a radial glow. This was the one compositing difference
  // between the two, and the card is the one that read as black.
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#e8a86a'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.globalAlpha = 1

  // Key light. Hardness controls how tightly the glow falls off, which is what
  // separates a soldier from a scientist without changing the drawing at all.
  const spread = CARD_WIDTH * (1.05 - def.keyHardness * 0.62)
  const glow = ctx.createRadialGradient(
    CARD_WIDTH * 0.38, 190, 12, CARD_WIDTH * 0.38, 190, spread,
  )
  glow.addColorStop(0, `rgba(255, 214, 156, ${0.2 + def.keyHardness * 0.32})`)
  glow.addColorStop(1, 'rgba(255, 214, 156, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const { headX, headY, headR } = drawFigure(ctx, def, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  })

  // Rim light from the upper left, matching the scene's sun direction. Its
  // colour is the character's single identifying accent, and it traces the
  // hood rather than the skull — the hood is the silhouette you actually see.
  ctx.strokeStyle = def.rim
  ctx.lineWidth = 2.5 + def.keyHardness * 3.5
  ctx.globalAlpha = 0.92
  ctx.beginPath()
  ctx.ellipse(
    headX, headY - headR * 0.06, headR * 1.16, headR * 1.28, 0,
    Math.PI * 0.72, Math.PI * 1.58,
  )
  ctx.stroke()
  ctx.globalAlpha = 1

  // The robe reaches the bottom edge, so the name needs its own ground or it
  // competes with the folds behind it. Sits above the card's lower edge, not on it: the dialogue box overlaps
  // the bottom of the card, and a name printed there is a name nobody reads.
  const plate = ctx.createLinearGradient(0, 300, 0, 392)
  plate.addColorStop(0, 'rgba(10, 7, 3, 0)')
  plate.addColorStop(0.45, 'rgba(10, 7, 3, 0.78)')
  plate.addColorStop(1, 'rgba(10, 7, 3, 0)')
  ctx.fillStyle = plate
  ctx.fillRect(0, 300, CARD_WIDTH, 92)

  ctx.fillStyle = def.rim
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, CARD_WIDTH / 2, 352)

  ctx.fillStyle = 'rgba(240, 224, 190, 0.9)'
  ctx.font = 'italic 14px system-ui, sans-serif'
  // Long roles are trimmed rather than overflowing the card.
  const trimmed = role.length > 42 ? `${role.slice(0, 40)}…` : role
  ctx.fillText(trimmed, CARD_WIDTH / 2, 373)

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
  characterId = '',
  /**
   * Height of the card's centre in view units. The dialogue box occupies the
   * lower third of the frame, and at 0 it covered the figure's chest and the
   * name plate entirely.
   */
  baseY = 0,
): CharacterCard {
  const group = new Group()

  const texture = drawPortrait(name, role, portraitFor(characterId))
  const geometry = new PlaneGeometry(CARD_WIDTH * CARD_ZOOM, CARD_HEIGHT * CARD_ZOOM)
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
      group.position.y = baseY + Math.sin(elapsedMs * 0.0011) * 5
      group.rotation.z = Math.sin(elapsedMs * 0.0007) * 0.004
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
