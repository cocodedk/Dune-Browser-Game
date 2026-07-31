// src/game-render/planet/Starfield.ts
// The sky beyond the planet.
//
// Once the camera can pull back far enough to see a globe, the background can
// no longer be a fog colour — it has to be space, or the planet reads as a
// ball sitting on a beige card.

import {
  Points, BufferGeometry, BufferAttribute, PointsMaterial, Color,
} from 'three'
import { mulberry32 } from '../terrain/noise'

export interface Starfield {
  points: Points
  dispose(): void
}

export function createStarfield(radius: number, count = 1400, seed = 90210): Starfield {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const warm = new Color('#ffd9b0')
  const cool = new Color('#bcd4ff')

  for (let i = 0; i < count; i++) {
    // Uniform on the sphere: acos of a uniform variable, not a uniform angle,
    // which would clump every star at the poles.
    const u = rand() * 2 - 1
    const theta = rand() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)

    positions[i * 3] = radius * s * Math.cos(theta)
    positions[i * 3 + 1] = radius * u
    positions[i * 3 + 2] = radius * s * Math.sin(theta)

    // Most stars are faint; a handful are bright. A uniform field looks like
    // static rather than a sky.
    const brightness = Math.pow(rand(), 2.4) * 0.9 + 0.1
    const tint = warm.clone().lerp(cool, rand())
    colors[i * 3] = tint.r * brightness
    colors[i * 3 + 1] = tint.g * brightness
    colors[i * 3 + 2] = tint.b * brightness
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  const material = new PointsMaterial({
    size: radius * 0.0022,
    vertexColors: true,
    sizeAttenuation: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = -2000

  return {
    points,
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
