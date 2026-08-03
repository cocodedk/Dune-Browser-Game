// vehicle-shop/harvester/src/model/materials/maps.ts
// The map builders: which authored picture goes onto which surface, and at
// what resolution. Sizes are chosen per surface, not uniformly — a 19 m x
// 9.6 m deck plate and a 1.1 m belt link do not need the same buffer.

import { buildMaps, type WeatheringMaps } from './dataTexture'
import { clamp01, dustField, smoothstep } from './field'
import { plateTexel, type PlateStyle, type Texel } from './plateTexel'
import { BELT_COLOR, DUST_COLOR, WHEEL_COLOR, mixRgb, rgbOf, scaleRgb } from './palette'

/** Big tan masses: five deck plates, nose tiers, tail tower, underframe. At
 *  512 across a 9.6 m plate a texel is under 2 cm, so the scribed line is a
 *  line and not a stair. */
export const PLATE_SIZE_LARGE = 512
/** Housings, louvres, rust hardware — smaller faces, half the buffer. */
export const PLATE_SIZE_SMALL = 256

export function buildPlateMaps(style: PlateStyle, size: number): WeatheringMaps {
  return buildMaps(size, (u, v) => plateTexel(u, v, style))
}

// ---------------------------------------------------------------------------
// THE TIRE'S DIRT RING
//
// wheel.ts revolves a 7-point profile, and three.js gives a LatheGeometry
// v = j / (points.length - 1): so v = 0 and v = 1 are the rim seats behind
// the face discs, and v = 1/3 .. 2/3 is the CROWN — the full-radius band that
// actually rides the belt. Darkening that band and nothing else puts the dirt
// exactly at the contact radius, all the way round (u is the circumference, so
// the term is deliberately u-independent: a contact ring is a ring, not a
// smear). One texture serves every wheel on the machine, road wheels and
// return rollers alike, because they are all one component at their own radius.
const TIRE_BASE = rgbOf(WHEEL_COLOR)
const TIRE_DIRT = mixRgb(TIRE_BASE, [38, 33, 27], 0.72)
/** Half-width of the fully-dirty band, in profile-v. 0.19 covers the crown
 *  (|v - 0.5| <= 1/6) and the shoulders it rolls onto under load. */
const RING_CORE = 0.19
const RING_FADE = 0.31

export function tireTexel(u: number, v: number): Texel {
  const ring = 1 - smoothstep(RING_CORE, RING_FADE, Math.abs(v - 0.5))
  let rgb = mixRgb(TIRE_BASE, TIRE_DIRT, ring)
  rgb = scaleRgb(rgb, 1 - 0.08 * dustField(u * 0.7, v * 3))
  return { rgb, rough: clamp01(0.6 + 0.35 * ring) }
}

export const TIRE_SIZE = 64

export function buildTireMap(): WeatheringMaps {
  return buildMaps(TIRE_SIZE, tireTexel, false)
}

// ---------------------------------------------------------------------------
// THE BELT'S WEAR
//
// One map for all 148 links on the machine; the per-link differences come
// from the neutral tints in palette.BELT_LINK_TINTS, because the chain CYCLES
// (see the note there). This is the wear a plate carries with it: a darkened,
// dust-loaded red, chewed dark at every border where plates knock together,
// and unevenly soiled across the face.
const BELT_BASE = scaleRgb(mixRgb(rgbOf(BELT_COLOR), DUST_COLOR, 0.22), 0.8)
const BELT_CHEW = mixRgb(BELT_BASE, [40, 26, 22], 0.75)

export function beltTexel(u: number, v: number): Texel {
  const d = Math.min(u, 1 - u, v, 1 - v)
  const border = 1 - smoothstep(0, 0.16, d)
  let rgb = mixRgb(BELT_BASE, BELT_CHEW, border * 0.8)
  rgb = scaleRgb(rgb, 1 - 0.18 * dustField(u * 1.4, v * 1.4))
  return { rgb, rough: 0.9 }
}

export const BELT_SIZE = 48

export function buildBeltWearMap(): WeatheringMaps {
  return buildMaps(BELT_SIZE, beltTexel, false)
}
