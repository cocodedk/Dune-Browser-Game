// src/game-render/planet/PlanetSun.ts
// How the globe is lit. Split from PlanetMode, which had reached the
// repository's file limit.
//
// This is a map the player reads, not a body being simulated, and the two want
// opposite things from a sun. Both compromises here were measured.

import { Color, Vector3, type PerspectiveCamera } from 'three'
import type { LightingRig } from '../env/Lighting'

export type SunPlacer = (elevation: number) => void

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Sun-to-camera angle, around the world Y axis, at three named points in the
// day. At 0 the sun sits almost exactly behind the camera — full front light,
// the "sun over your shoulder" reading noon wants. At TERMINATOR_ANGLE
// (~pi/2) it sits tangent to the sightline, which is what actually draws a
// terminator across the visible disc rather than just dimming it. Past that,
// toward NIGHT_ANGLE, the sun swings round behind the planet and the visible
// face goes dark.
//
// Verified with a standalone script reproducing this exact rotation (three's
// Vector3, no renderer): for a camera near the equatorial start orientation,
// angle 0.15 lights ~96% of the visible disc, 1.57 lights ~50%, and 2.7 lights
// ~6-10%. A camera pitched steeply overhead responds less (the fixed 0.42
// lift dominates more of the sum there) and bottoms out around 40% lit even
// at night — an accepted limit of a camera-relative sun, not a rendered
// measurement.
const NOON_ANGLE = 0.15
const TERMINATOR_ANGLE = 1.57
const NIGHT_ANGLE = 2.7

/**
 * Off-axis angle for {@link placeSun}, driven by sun elevation instead of the
 * fixed 0.62 rad this replaced.
 *
 * @param elevation -1 (midnight) .. 1 (noon), from paletteForTime.
 */
export function sunOffAxisAngle(elevation: number): number {
  const e = Math.max(-1, Math.min(1, elevation))
  return e >= 0
    ? lerp(TERMINATOR_ANGLE, NOON_ANGLE, e)
    : lerp(TERMINATOR_ANGLE, NIGHT_ANGLE, -e)
}

// How far the sun is lifted above the camera's own axis, before renormalising.
//
// This has to fall with elevation or the off-axis angle above cannot do its
// job. The lift was a flat 0.42 applied after the rotation, which is roughly 23
// degrees of vertical offset — so at noon, where the rotation correctly drops
// to 0.15 rad to put the sun behind the camera, the lift still threw it high
// and lit only the top quarter of the disc. Captured at noon the planet was
// mud below a terminator sitting near the pole, which is the "never looks lit
// by a star" complaint the angle work was meant to answer.
//
// Some lift is still wanted away from noon: a sun exactly on the sightline at
// the terminator flattens the modelling that makes the globe read as a sphere.
const NOON_LIFT = 0.08
const TERMINATOR_LIFT = 0.42

/** Vertical offset added to the camera-relative sun direction, by elevation. */
export function sunLift(elevation: number): number {
  const e = Math.max(-1, Math.min(1, elevation))
  return e >= 0 ? lerp(TERMINATOR_LIFT, NOON_LIFT, e) : TERMINATOR_LIFT
}

// Night collapses the fill rather than merely dimming it.
//
// The globe's fill is a HemisphereLight coloured from palette.zenith, which
// after dark is a deep blue. Once the sun swings behind the planet it
// contributes almost nothing, so that fill becomes the only light — and a
// hemisphere light on a sphere paints every upward-facing normal the same
// value. Captured at midnight the planet was a flat saturated periwinkle disc
// with no relief anywhere on it, which reads as a shader fault rather than as
// night. Squaring the daylight term drops the fill away far faster than the
// sun, so the dark side goes genuinely dark and the settlement lights and
// starfield have something to sit against.
export function fillLevelFor(daylight: number): number {
  const d = Math.max(0, Math.min(1.35, daylight))
  return d * d * 0.8
}

// Old floor was 0.95 regardless of hour, so the globe never read as dark even
// at midnight. NIGHT_FLOOR is deliberately still above zero — a strategic map
// with a genuinely black hemisphere reads as broken, not as night — but low
// enough that the terminator sunOffAxisAngle now draws actually matters.
const NIGHT_FLOOR = 0.15
// Down from 1.35. That figure was chosen while the sand shader was throwing
// most of the globe's light away — it classified every non-polar latitude as a
// vertical rock face (see uRadialUp in sandShader.glsl.ts) and painted it dark,
// so the rig was turned up to compensate. With the surface actually responding,
// the same number bleached noon to a featureless cream ball at mean luma 186
// over the disc. Measured back down against the captured frames; golden hour,
// which reads best, sits near 108.
const NOON_LEVEL = 0.82

/**
 * Overall light level for {@link placeSun}, 0..1 mapped from elevation
 * -1..1. Both the sun and fill intensities scale off this.
 */
export function sunDaylightLevel(elevation: number): number {
  const e = Math.max(-1, Math.min(1, elevation))
  return NIGHT_FLOOR + (NOON_LEVEL - NIGHT_FLOOR) * ((e + 1) / 2)
}

export function createSunPlacer(
  lighting: LightingRig,
  camera: PerspectiveCamera,
  radius: number,
): SunPlacer {
  const SUN_AXIS = new Vector3(0, 1, 0)
  const NEUTRAL = new Color(1, 1, 1)
  const sunDirection = new Vector3()

  /**
   * Put the sun behind the player's shoulder.
   *
   * A directional rig aimed by compass bearing and hour is right for standing
   * on a desert and wrong for looking at a ball. Measured, the inhabited band
   * — the only part of Arrakis anyone needs to read — was rendering between
   * [26,6,3] and [9,1,0]. Black. Two causes: the sun sat 55 degrees off the
   * view axis because its elevation is set by the hour and the camera's is
   * not, and the intensities were tuned down for a surface where every
   * surface normal points at the sky.
   *
   * So the globe still places its own sun off the camera rather than by
   * compass and hour — that part of the compromise stays, see
   * sunOffAxisAngle above — but the swing and the brightness now both move
   * with the hour, so noon, dusk and midnight are no longer the same picture
   * with a different colour filter over it.
   */
  function placeSun(elevation: number): void {
    sunDirection.copy(camera.position).normalize()
      .applyAxisAngle(SUN_AXIS, sunOffAxisAngle(elevation))
    sunDirection.y += sunLift(elevation)
    sunDirection.normalize().multiplyScalar(radius * 3)

    lighting.sun.position.copy(sunDirection)
    lighting.sun.target.position.set(0, 0, 0)
    lighting.sun.target.updateMatrixWorld()

    // Night now actually falls in darkness as well as colour — see
    // sunDaylightLevel above for why the floor moved off a flat 0.95.
    const daylight = sunDaylightLevel(elevation)
    lighting.sun.intensity = daylight * 1.9
    lighting.fill.intensity = fillLevelFor(daylight)

    // The night sun colour is a dim blue, and multiplying sand by it darkens
    // everything a second time. Lifted toward neutral after dark so the tint
    // still reads as night without doubling as a dimmer.
    lighting.sun.color.lerp(NEUTRAL, (1 - Math.max(0, elevation)) * 0.62)
  }

  return placeSun
}
