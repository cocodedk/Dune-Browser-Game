// vehicle-shop/harvester/src/model/materials/materialSet.test.ts
// The set itself: the sixth material exists and is the colour spec.ts says,
// the mapped materials keep the tones the flat ones had, and nothing leaks.

import { describe, it, expect } from 'vitest'
import { TRIM_COLOR } from '../../spec'
import { createHarvesterMaterials } from './index'
import { BELT_LINK_TINTS, BODY_COLOR, WHEEL_COLOR, luminance, rgbOf } from './palette'
import { asReadable, sampleAlbedo } from './dataTexture'

function required<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing ${what}`)
  return value
}

describe('the sixth material', () => {
  it('exists, is spec.TRIM_COLOR, and carries no map of its own', () => {
    const m = createHarvesterMaterials()
    expect(m.trim.color.getHex()).toBe(TRIM_COLOR)
    expect(TRIM_COLOR).toBe(0xd4c8a0)
    // Trim lands on 0.36 m strips; a per-face map would darken the whole
    // strip rather than draw a line on it.
    expect(m.trim.map).toBeNull()
    m.dispose()
  })

  it('is LIGHTER than the body it has to read against', () => {
    expect(luminance(rgbOf(TRIM_COLOR))).toBeGreaterThan(luminance(rgbOf(BODY_COLOR)))
  })
})

describe('the mapped materials', () => {
  it('bake the old tone into the map and carry white on the material', () => {
    const m = createHarvesterMaterials()
    for (const material of [m.body, m.bodyLow, m.dark, m.accent]) {
      expect(material.color.getHex()).toBe(0xffffff)
      expect(material.map).not.toBeNull()
      // roughness must stay 1 or the map's authored range gets scaled down.
      expect(material.roughness).toBe(1)
      expect(material.roughnessMap).not.toBeNull()
    }
    // A clean texel at the centre of a body face is still the sand tone.
    const clean = sampleAlbedo(asReadable(m.body.map), 0.3, 0.5)
    const sand = rgbOf(BODY_COLOR)
    expect(luminance(clean)).toBeGreaterThan(luminance(sand) * 0.9)
    expect(luminance(clean)).toBeLessThanOrEqual(luminance(sand))
    m.dispose()
  })

  it('keeps the tire dirt off the steel the housings and sprockets use', () => {
    const m = createHarvesterMaterials()
    expect(m.wheel.map).toBeNull()
    expect(m.wheel.color.getHex()).toBe(WHEEL_COLOR)
    expect(m.tire.map).not.toBeNull()
    expect(m.tire).not.toBe(m.wheel)
    m.dispose()
  })

  it('gives the belt one wear map and a tint per link variant', () => {
    const m = createHarvesterMaterials()
    expect(m.belt).toHaveLength(BELT_LINK_TINTS.length)
    const maps = new Set(m.belt.map((b) => b.map))
    expect(maps.size).toBe(1)
    const greys = m.belt.map((b) => b.color.r)
    expect(new Set(greys).size).toBe(BELT_LINK_TINTS.length)
    expect(Math.min(...greys)).toBeLessThan(0.85)
    m.dispose()
  })
})

describe('disposal', () => {
  it('releases the textures too — a material dispose() does not', () => {
    const m = createHarvesterMaterials()
    const textures = [
      required(m.body.map, 'body map'),
      required(m.body.roughnessMap, 'body roughness map'),
      required(m.tire.map, 'tire map'),
      required(m.belt[0].map, 'belt map'),
    ]
    let disposed = 0
    for (const texture of textures) texture.addEventListener('dispose', () => { disposed += 1 })
    m.dispose()
    expect(disposed).toBe(textures.length)
  })
})
