// character-shop/duncan/src/lighting.ts
// Two rigs, because the harness is asked two different questions.
//
// SURVEY (the six full-body views and the silhouette): unchanged from R1 —
// a broad ambient, one key from the figure's front-left, a low back-right
// fill, and the dark neutral backdrop main.ts already argued for. Its job is
// legibility of a whole figure against a background that does not eat
// near-black fatigues.
//
// PORTRAIT (bust and the two head framings): a real three-point rig, and it
// is the LEAD's prescription, recorded here as numbers so the shot manifest
// can carry them. Key from camera-LEFT at 45 degrees azimuth and 30 up; fill
// from camera-right at -60 and a third of the key's intensity; rim from
// behind and above to peel dark hair and the topknot off the backdrop. All
// three are placed RELATIVE TO THE CAMERA, so every portrait framing gets
// the same light on the face regardless of where the camera stands.
//
// The backdrop for portrait framings is mid-grey 0x8a8a8a, and that is not a
// taste call either: this shop's R1 pass-1 evidence was thrown out entirely
// for being near-black on near-black. Dark hair against a mid-grey card is
// the one combination that cannot repeat that.
//
// Azimuth/elevation follow debug.ts's viewpoint() convention exactly —
// azimuth 0 ahead of the face at -Z, positive toward the figure's own right.

import { AmbientLight, DirectionalLight, Color } from 'three'
import type { Scene } from 'three'

export interface Beam {
  az: number
  el: number
  intensity: number
}

export const PORTRAIT = {
  key: { az: 45, el: 30, intensity: 1.15 },
  fill: { az: -60, el: 12, intensity: 0.38 },
  rim: { az: 180, el: 42, intensity: 1.05 },
  ambient: 0.24,
  backdrop: 0x8a8a8a,
} as const

// R1's own three numbers, re-expressed as azimuth/elevation so both rigs
// speak one language: its sun sat at (-4, 7, -4) and its fill at (4, 5, 4)
// aimed at the origin, which is az -45/el 51.1 and az 135/el 41.5. Direction
// is all a DirectionalLight uses, so the six survey framings light exactly
// as they did in R1 and their evidence stays comparable across rounds.
export const SURVEY = {
  key: { az: -45, el: 51.06, intensity: 0.9 },
  fill: { az: 135, el: 41.47, intensity: 0.25 },
  rim: { az: 0, el: 90, intensity: 0 },
  ambient: 0.65,
  backdrop: 0x3a3530,
} as const

export interface LightRig {
  /** Point the three beams for one framing. `azimuthDeg` is the CAMERA's
   *  azimuth: portrait beams are offsets from it, survey beams are absolute
   *  (they are the figure's own lighting, not the shot's). */
  apply(portrait: boolean, azimuthDeg: number, targetY: number): void
  backdrop(portrait: boolean): Color
}

const DISTANCE = 6

export function installLights(scene: Scene): LightRig {
  const ambient = new AmbientLight(0xffffff, SURVEY.ambient)
  scene.add(ambient)
  const beams = [new DirectionalLight(), new DirectionalLight(), new DirectionalLight()]
  for (const beam of beams) {
    scene.add(beam)
    scene.add(beam.target)
  }

  const place = (beam: DirectionalLight, spec: Beam, base: number, targetY: number): void => {
    const az = ((base + spec.az) * Math.PI) / 180
    const el = (spec.el * Math.PI) / 180
    beam.position.set(
      Math.cos(el) * Math.sin(az) * DISTANCE,
      targetY + Math.sin(el) * DISTANCE,
      -Math.cos(el) * Math.cos(az) * DISTANCE,
    )
    beam.target.position.set(0, targetY, 0)
    beam.intensity = spec.intensity
  }

  return {
    apply(portrait, azimuthDeg, targetY) {
      const rig = portrait ? PORTRAIT : SURVEY
      // Survey beams are absolute and aim at the origin, exactly as R1's
      // did; portrait beams are offsets from the camera and aim at the head.
      const base = portrait ? azimuthDeg : 0
      const aim = portrait ? targetY : 0
      ambient.intensity = rig.ambient
      place(beams[0], rig.key, base, aim)
      place(beams[1], rig.fill, base, aim)
      place(beams[2], rig.rim, base, aim)
    },
    backdrop(portrait) {
      return new Color(portrait ? PORTRAIT.backdrop : SURVEY.backdrop)
    },
  }
}
