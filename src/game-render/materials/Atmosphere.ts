// src/game-render/materials/Atmosphere.ts
// PURE day/night palette. No three.js — returns plain colour triples the
// renderer feeds into materials, fog and lights.
//
// This is the cheapest large win in the whole look: driving the palette from
// world.time means the desert visibly changes hour to hour, and the player can
// read the passage of days off the sky instead of off a number in the HUD.

/** Linear RGB triple, each channel 0..1. */
export type Rgb = readonly [number, number, number]

export interface AtmospherePalette {
  /** Low sky, at the horizon. */
  horizon: Rgb
  /** High sky, at the zenith. */
  zenith: Rgb
  /** Direct sun colour. */
  sun: Rgb
  /** Ambient bounce filling the shadows. */
  ambient: Rgb
  /** Distance fog, matched to the horizon so far dunes dissolve into haze. */
  fog: Rgb
  /** Sun elevation, -1 (midnight) .. 1 (noon). */
  sunElevation: number
  /** Tone-mapping exposure for this hour. */
  exposure: number
}

interface Keyframe {
  /** Fraction of a day, 0 = midnight, 0.5 = noon. */
  t: number
  horizon: Rgb
  zenith: Rgb
  sun: Rgb
  ambient: Rgb
  exposure: number
}

// Apricot and amber by day, blue-violet by night. Shadows stay chromatic —
// neutral grey shadows are what make cheap 3D read as cheap.
const KEYFRAMES: Keyframe[] = [
  {
    t: 0.0, // midnight
    horizon: [0.05, 0.06, 0.13], zenith: [0.02, 0.02, 0.06],
    sun: [0.28, 0.32, 0.55], ambient: [0.07, 0.08, 0.16], exposure: 0.75,
  },
  {
    t: 0.25, // dawn
    horizon: [0.95, 0.48, 0.28], zenith: [0.24, 0.26, 0.48],
    sun: [1.0, 0.62, 0.36], ambient: [0.32, 0.26, 0.34], exposure: 0.95,
  },
  {
    t: 0.5, // noon — bleached, low saturation, brutal
    horizon: [0.93, 0.79, 0.58], zenith: [0.42, 0.56, 0.82],
    sun: [1.0, 0.96, 0.87], ambient: [0.55, 0.52, 0.48], exposure: 1.15,
  },
  {
    t: 0.75, // dusk
    horizon: [0.98, 0.42, 0.22], zenith: [0.30, 0.20, 0.42],
    sun: [1.0, 0.55, 0.28], ambient: [0.34, 0.24, 0.30], exposure: 0.95,
  },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/**
 * Fraction of the current day for a game time in seconds.
 * Always in [0, 1), including for negative times.
 */
export function dayFraction(timeSeconds: number, daySeconds: number): number {
  if (daySeconds <= 0) return 0
  const f = (timeSeconds % daySeconds) / daySeconds
  return f < 0 ? f + 1 : f
}

/**
 * Palette for a point in the day. Wraps continuously across midnight, so a
 * long run never shows a hard colour pop at the day boundary.
 */
export function paletteAt(fraction: number): AtmospherePalette {
  const f = ((fraction % 1) + 1) % 1

  let i = 0
  for (let k = 0; k < KEYFRAMES.length; k++) {
    if (f >= KEYFRAMES[k].t) i = k
  }
  const from = KEYFRAMES[i]
  const to = KEYFRAMES[(i + 1) % KEYFRAMES.length]

  // The last segment wraps past 1.0 back to the first keyframe.
  const span = (to.t > from.t ? to.t : to.t + 1) - from.t
  const local = span === 0 ? 0 : (f - from.t) / span

  return {
    horizon: lerpRgb(from.horizon, to.horizon, local),
    zenith: lerpRgb(from.zenith, to.zenith, local),
    sun: lerpRgb(from.sun, to.sun, local),
    ambient: lerpRgb(from.ambient, to.ambient, local),
    fog: lerpRgb(from.horizon, to.horizon, local),
    // Peaks at noon (f = 0.5), bottoms at midnight.
    sunElevation: -Math.cos(f * Math.PI * 2),
    exposure: lerp(from.exposure, to.exposure, local),
  }
}

/** Convenience: palette straight from engine time. */
export function paletteForTime(timeSeconds: number, daySeconds: number): AtmospherePalette {
  return paletteAt(dayFraction(timeSeconds, daySeconds))
}
