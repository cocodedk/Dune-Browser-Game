// src/game-render/planet/NamedStars.ts
// The worlds you can see from Arrakis but cannot reach.
//
// Giedi Prime and Lankiveil are in other star systems, so they cannot be put
// in orbit here however much one might want them on screen. What they can be
// is points of light with names — and once the Harkonnen home has a direction
// in the sky, "reinforcements are coming" has a place to come from.
//
// Facts, so the labels are not invented:
//   Giedi Prime  Harkonnen capital, heavily industrialised, their homeworld
//                for generations. Renamed Gammu long after this story.
//   Lankiveil    Frozen. Whale-fur trade. Where the Harkonnens were exiled
//                before their rise, and a holding they never gave up.
//   Kaitain      The Padishah Emperor's throne world.
//   Caladan      Ocean world, and House Atreides' home before Arrakis.

import {
  Group, Sprite, SpriteMaterial, CanvasTexture, LinearFilter, Vector3,
  AdditiveBlending,
} from 'three'

export interface NamedStar {
  name: string
  note: string
  /** Direction in the sky, as a unit-ish vector. Normalised on use. */
  direction: [number, number, number]
  /** Tint of the point of light. */
  color: string
}

// Directions are kept low. The camera starts at a 10-degree pitch and players
// mostly yaw rather than tilt; measured by sweeping a full turn, worlds placed
// at 21 and 38 degrees of elevation never entered the frame at all.
export const NAMED_STARS: NamedStar[] = [
  {
    name: 'Giedi Prime',
    note: 'House Harkonnen',
    direction: [-0.76, 0.11, -0.64],
    // Industrial, sunless, and the only sickly green in the sky.
    color: '#9fd07a',
  },
  {
    name: 'Lankiveil',
    note: 'Harkonnen holding',
    direction: [-0.51, -0.28, -0.81],
    color: '#a8c8e8',
  },
  {
    name: 'Kaitain',
    note: 'the Imperial throne',
    direction: [0.42, 0.20, -0.88],
    color: '#f0dca0',
  },
  {
    name: 'Caladan',
    note: 'House Atreides',
    direction: [0.66, 0.18, 0.73],
    color: '#7fb8d8',
  },
]

function drawStar(star: NamedStar): CanvasTexture {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 26px system-ui, sans-serif'
  const width = Math.max(
    Math.ceil(ctx.measureText(star.name).width),
    Math.ceil(ctx.measureText(star.note).width),
  ) + 40
  canvas.width = width
  canvas.height = 92

  // The point of light itself, with a soft bloom around it.
  const cx = width / 2
  const glow = ctx.createRadialGradient(cx, 20, 0, cx, 20, 18)
  glow.addColorStop(0, star.color)
  glow.addColorStop(0.25, `${star.color}80`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, 20, 18, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, 20, 2.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '600 22px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(222, 214, 198, 0.80)'
  ctx.fillText(star.name, cx, 62)

  ctx.font = 'italic 16px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(160, 172, 190, 0.62)'
  ctx.fillText(star.note, cx, 82)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  return texture
}

export interface NamedStarField {
  group: Group
  dispose(): void
}

/**
 * @param distance How far out to place them. Well beyond the moons, so they
 *   never sort in front of anything in the system.
 */
export function createNamedStars(distance: number): NamedStarField {
  const group = new Group()
  group.name = 'named-stars'

  const textures: CanvasTexture[] = []
  const materials: SpriteMaterial[] = []

  for (const star of NAMED_STARS) {
    const texture = drawStar(star)
    textures.push(texture)

    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      fog: false,
      sizeAttenuation: false,
      // Additive so the point reads as light rather than as a pasted decal.
      blending: AdditiveBlending,
      opacity: 0.9,
    })
    materials.push(material)

    const sprite = new Sprite(material)
    sprite.scale.set(texture.image.width * 0.00035, 92 * 0.00035, 1)
    const dir = new Vector3(...star.direction).normalize()
    sprite.position.copy(dir.multiplyScalar(distance))
    sprite.renderOrder = 2
    sprite.name = `star:${star.name}`
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
