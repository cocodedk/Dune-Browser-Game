// src/game-render/planet/PlanetSun.ts
// How the globe is lit. Split from PlanetMode, which had reached the
// repository's file limit.
//
// This is a map the player reads, not a body being simulated, and the two want
// opposite things from a sun. Both compromises here were measured.

import { Color, Vector3, type PerspectiveCamera } from 'three'
import type { LightingRig } from '../env/Lighting'

export type SunPlacer = (elevation: number) => void

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
   * So the globe places its own sun: swung a little off the camera for
   * modelling, lifted a little for a top light, and brighter. The hour still
   * drives colour and still dims the whole planet toward night.
   */
  function placeSun(elevation: number): void {
    sunDirection.copy(camera.position).normalize()
      .applyAxisAngle(SUN_AXIS, 0.62)
    sunDirection.y += 0.42
    sunDirection.normalize().multiplyScalar(radius * 3)

    lighting.sun.position.copy(sunDirection)
    lighting.sun.target.position.set(0, 0, 0)
    lighting.sun.target.updateMatrixWorld()

    // Night falls in colour, not in darkness.
    //
    // Measured across a full day, the globe ran from luma 67 at noon to 4 at
    // midnight — black. And because the sun here follows the camera there is
    // no terminator to explain it: the *entire* planet went dark at once,
    // every sixty seconds. That is not night, it is the map switching itself
    // off, and a strategic map that is unreadable half the time is not one.
    //
    // So the hour drives hue and a gentle swing in level, and the floor stays
    // high enough to read. Real night belongs to the surface view, where the
    // player is standing in it and it means something.
    const daylight = 0.95 + Math.max(0, elevation) * 0.38
    lighting.sun.intensity = daylight * 1.9
    lighting.fill.intensity = Math.max(0.9, daylight * 0.8)

    // The night sun colour is a dim blue, and multiplying sand by it darkens
    // everything a second time. Lifted toward neutral after dark so the tint
    // still reads as night without doubling as a dimmer.
    lighting.sun.color.lerp(NEUTRAL, (1 - Math.max(0, elevation)) * 0.62)
  }

  return placeSun
}
