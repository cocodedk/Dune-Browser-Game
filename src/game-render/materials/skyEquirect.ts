// src/game-render/materials/skyEquirect.ts
// PURE sky-gradient rasterizer. No three.js — produces a plain RGBA byte
// buffer that env/skyEnvironment.ts turns into a texture, plus the
// palette-change test that decides whether a new one is worth baking.
//
// Mirrors SkyDome.ts's own vertical blend (mix(horizon, zenith, pow(h, 0.55))
// plus the horizon haze band) rather than inventing a fresh gradient, so the
// baked environment agrees with the sky the player is actually looking at.
// No sun disc and no stars: PMREMGenerator blurs a source this small heavily
// (see DEFAULT_EQUIRECT_SIZE), so sub-pixel detail would just be discarded —
// the vertical gradient is the part a reflection actually shows.

import type { AtmospherePalette, Rgb } from './Atmosphere'

export interface EquirectSize {
  width: number
  height: number
}

// three's PMREMGenerator.fromEquirectangular documents 64x32 as its minimum
// supported input and 1024x512 as ideal (verified against the installed
// three@0.185.1 source, extras/PMREMGenerator.js). 64x32 is plenty once every
// pixel is about to be GGX-blurred into a handful of roughness levels.
export const DEFAULT_EQUIRECT_SIZE: EquirectSize = { width: 64, height: 32 }

// Matches the constants createSkyDome() passes to its own shader (see
// SkyDome.ts: uHazeStrength default 0.6, and the fragment's `exp(-y * 7.0)`).
const HAZE_FALLOFF = 7
const HAZE_STRENGTH = 0.6
const ZENITH_CURVE = 0.55

function lerpChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerpChannel(a[0], b[0], t), lerpChannel(a[1], b[1], t), lerpChannel(a[2], b[2], t)]
}

/**
 * Sky colour looking in a direction `elevation` radians of "up" component,
 * +1 straight up (zenith) to -1 straight down (nadir).
 *
 * Below the horizon this returns flat horizon colour, on purpose: SkyDome's
 * own shader clamps `h = clamp(dir.y, 0, 1)` before the mix, so a real sample
 * looking down the dome already renders flat horizon rather than fading to
 * black. Reusing that gives the baked environment's lower hemisphere the
 * "sand-lit-by-sky" tone DesertSky's HemisphereLight already assumes (its
 * groundColor is the same palette.horizon), instead of an invented colour.
 */
export function skyColorAt(elevation: number, palette: AtmospherePalette): Rgb {
  const h = Math.max(0, Math.min(1, elevation))
  const sky = lerpRgb(palette.horizon, palette.zenith, Math.pow(h, ZENITH_CURVE))
  const haze = Math.exp(-Math.max(elevation, 0) * HAZE_FALLOFF) * HAZE_STRENGTH
  return lerpRgb(sky, palette.horizon, haze)
}

/** Equirect row -> elevation: +1 at the top (zenith), -1 at the bottom (nadir). */
function elevationForRow(row: number, height: number): number {
  const v = (row + 0.5) / height
  return 1 - 2 * v
}

/**
 * Paint the palette's own gradient into a small RGBA8 equirectangular buffer
 * — PMREMGenerator.fromEquirectangular's expected input shape.
 *
 * Uniform across each row (no azimuth/column dependence): this is a vertical
 * gradient, not a full sky render, so every column of a row is identical.
 */
export function paintSkyEquirect(
  palette: AtmospherePalette,
  size: EquirectSize = DEFAULT_EQUIRECT_SIZE,
): Uint8Array {
  const { width, height } = size
  const data = new Uint8Array(width * height * 4)

  for (let row = 0; row < height; row++) {
    const [r, g, b] = skyColorAt(elevationForRow(row, height), palette)
    const ri = Math.round(Math.max(0, Math.min(1, r)) * 255)
    const gi = Math.round(Math.max(0, Math.min(1, g)) * 255)
    const bi = Math.round(Math.max(0, Math.min(1, b)) * 255)
    const rowStart = row * width * 4
    for (let col = 0; col < width; col++) {
      const i = rowStart + col * 4
      data[i] = ri
      data[i + 1] = gi
      data[i + 2] = bi
      data[i + 3] = 255
    }
  }
  return data
}

// --- Rebake throttle -------------------------------------------------------
//
// PMREM's cost is the GGX prefilter pass across its roughness mips, not the
// tiny source texture, so the constant that matters is how often bake() runs
// — never per frame. Measured from the real Atmosphere.ts keyframes at
// DAY_SECONDS=60 (see skyEquirect.test.ts): the worst-case single-frame
// (1/60s) palette distance across a full day is ~2.5e-6, while a 2.5s window
// (one "hour" at this clock) reaches ~5.7e-2. 0.01 sits nearly 4000x above
// the per-frame figure and comfortably below an hour-scale change, so it
// rebakes only when the sky has actually moved — about 40 times across a
// full day, concentrated at dawn/dusk where the palette moves fastest, not on
// every tick.
export const REBAKE_THRESHOLD = 0.01

const PALETTE_CHANNELS = ['horizon', 'zenith', 'sun', 'ambient'] as const

/** Summed squared channel distance between two palettes — cheap, no sqrt needed. */
export function paletteDistance(a: AtmospherePalette, b: AtmospherePalette): number {
  let total = 0
  for (const key of PALETTE_CHANNELS) {
    const ca = a[key]
    const cb = b[key]
    for (let i = 0; i < 3; i++) {
      const d = ca[i] - cb[i]
      total += d * d
    }
  }
  return total
}

/** Whether the sky has changed enough since the last bake to justify a new one. */
export function shouldRebakeEnvironment(
  previous: AtmospherePalette | null,
  next: AtmospherePalette,
): boolean {
  if (!previous) return true
  return paletteDistance(previous, next) > REBAKE_THRESHOLD
}
