// src/game-render/env/nightKey.ts
// The key light after sunset.
//
// PURE. Takes a sun elevation and returns where the key light should be, how
// bright, and what colour — no three.js, so the whole scheme is unit-testable.
//
// Lighting.ts's own note already says night "suits Arrakis, which has two moons
// overhead to motivate a directional night key". Nothing ever put one there.
// Below the horizon applyPalette clamped the sun to altitude -0.25 — under the
// sand — so N dot L was negative for every up-facing grain, the direct term was
// exactly zero, and the hemisphere fill was the entire night.
//
// Measured on a captured midnight frame, the desert foreground came out at mean
// luma 3.4 with a maximum of 12, and 41% of its pixels at pure black. Its
// colour was (4, 3, 4) — neutral grey, not blue, because a dim cool fill times
// warm sand albedo cancels to no hue at all.
//
// So the moons become a real directional key: above the horizon, cool, dim, and
// on a different bearing from the sun, which also gives the shadow map in
// shadowRig.ts something to cast at night instead of nothing.

import type { Rgb } from '../materials/Atmosphere'

/**
 * How far below the horizon the sun must sink before the moons are the whole
 * key. Deliberately a soft ramp, not a step: at the instant of sunset a hard
 * switch would teleport the key light across the sky and swing every shadow
 * with it.
 */
export const MOON_FULL_DEPTH = 0.18

/**
 * How high the moons ride at full night, in the same -1..1 units as sun
 * elevation. High enough that flat sand takes real light, low enough that dune
 * flanks still differ from dune crests.
 */
export const MOON_ALTITUDE = 0.55

/**
 * Bearing offset from the sun, in radians. The moons are not where the sun
 * went, and putting them elsewhere is what stops night reading as a dimmer
 * switch on the same picture.
 */
export const MOON_AZIMUTH_OFFSET = 2.4

/**
 * Key intensity at full night.
 *
 * Set by measurement, and it overruled the arithmetic. The guess was that the
 * sun's own 0.24 night floor would be far too bright once the light was lifted
 * out of the ground, so this started at 0.10 — and the rendered foreground came
 * back at mean luma 5.0 against dusk's 16.2, still effectively black. Probing
 * the live rig showed why: at dusk the key stands at altitude 0.01, dead
 * grazing, so almost none of dusk's brightness is direct light at all. There
 * was no headroom to protect.
 */
export const MOON_INTENSITY = 0.3

/**
 * Moonlight colour. Strongly cool on purpose: sand albedo is warm, and a
 * merely neutral moon multiplied by warm sand comes back out grey — which is
 * exactly the (4, 3, 4) the captured frame measured.
 */
export const MOON_COLOR: Rgb = [0.38, 0.52, 1.0]

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * How much of the key light is moonlight rather than sunlight.
 *
 * @param elevation Sun elevation, -1 (midnight) .. 1 (noon).
 * @returns 0 while the sun is up, 1 once it is {@link MOON_FULL_DEPTH} down.
 */
export function moonShare(elevation: number): number {
  return smoothstep(0, MOON_FULL_DEPTH, -elevation)
}

/**
 * Altitude of the key light, replacing the old `max(elevation, -0.25)`.
 *
 * Rises rather than falls once the sun sets, because a key light below the
 * ground plane cannot light ground that faces up.
 */
export function keyAltitude(elevation: number): number {
  // Blended from the horizon, not from the sun's own altitude. Once the sun is
  // setting its elevation is on its way to -1, and blending from a falling
  // number meant the moons could not lift the key fast enough to outrun it:
  // measured at elevation -0.01 the old form returned -0.005, dipping the key
  // back under the sand for the first degree after sunset — a small instance of
  // the very bug this module fixes, caught by the monotonicity test below.
  return lerp(Math.max(0, elevation), MOON_ALTITUDE, moonShare(elevation))
}

/** Bearing of the key light, swinging to the moons' as the sun goes down. */
export function keyAzimuth(azimuthRadians: number, elevation: number): number {
  return azimuthRadians + MOON_AZIMUTH_OFFSET * moonShare(elevation)
}

/**
 * Key intensity.
 *
 * @param sunIntensity What {@link import('./Lighting').sunIntensityFor} gives
 *   for this elevation — passed in rather than imported so this module stays
 *   free of a cycle with Lighting.
 *
 * The moon level is well under the sun's night floor because the light is now
 * doing something. At altitude -0.25 the old floor of 0.24 landed on nothing;
 * lifted to {@link MOON_ALTITUDE} the same number would light flat sand harder
 * than dusk does, and night must stay darker than the hour before it.
 */
export function keyIntensity(sunIntensity: number, elevation: number): number {
  return lerp(sunIntensity, MOON_INTENSITY, moonShare(elevation))
}

/** Key colour, crossing from the palette's sun to {@link MOON_COLOR}. */
export function keyColor(sun: Rgb, elevation: number): Rgb {
  const t = moonShare(elevation)
  return [
    lerp(sun[0], MOON_COLOR[0], t),
    lerp(sun[1], MOON_COLOR[1], t),
    lerp(sun[2], MOON_COLOR[2], t),
  ]
}
