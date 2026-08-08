// character-shop/chani/src/lighting.ts
// The harness's lighting rigs, as NUMBERS the shoot tool can record.
//
// Two rigs, and the split is the point. `full` is R1's harness lighting,
// preserved exactly, so the seven R1 views keep rendering what they
// rendered. `bust` is the 3-point rig the R2 brief prescribes for bust and
// head framings only: key from camera-left at 45/30, fill from
// camera-right at -60 at a third of key, and a rim from behind and above
// that separates near-black hair from the backdrop. A dark-on-dark read
// was R1's finding on exactly this hair.
//
// Lamp azimuth/elevation use the camera's own convention (tools/views.mjs
// and debug.ts's viewpoint): 0 is the face's -Z side, positive azimuth
// swings toward camera-LEFT of a front view. When a rig FOLLOWS, its lamp
// azimuths are added to the view's azimuth, so "key from camera-left"
// stays true at every framing instead of only at azimuth 0.

import { AmbientLight, Color, DirectionalLight, type Scene } from 'three'

export interface Lamp {
  az: number
  el: number
  intensity: number
}

export interface RigNumbers {
  ambient: number
  background: number
  follow: boolean
  lamps: Lamp[]
}

export const RIGS: Record<string, RigNumbers> = {
  // R1's two lights, restated in azimuth/elevation. They were authored as
  // world positions (-4, 7, -4) and (4, 5, 4); those unit-normalise to
  // exactly these angles, so the seven R1 views are unmoved.
  full: {
    ambient: 0.65,
    background: 0x3a3530,
    follow: false,
    lamps: [
      { az: -45, el: 51.0576, intensity: 0.9 },
      { az: 135, el: 41.4692, intensity: 0.25 },
      { az: 0, el: 0, intensity: 0 },
    ],
  },
  bust: {
    ambient: 0.36,
    background: 0x8a8a8a,
    follow: true,
    lamps: [
      { az: 45, el: 30, intensity: 1.45 }, // key, camera-left
      { az: -60, el: 12, intensity: 0.48 }, // fill, camera-right, ~1/3 key
      { az: 168, el: 40, intensity: 1.95 }, // rim, behind and above
    ],
  },
}

export interface LightRig {
  /** Apply a named rig, oriented for a view at `viewAz` degrees. Returns
   *  the background colour the rig wants, so the silhouette override knows
   *  what to restore to. */
  apply(name: string, viewAz: number): number
}

const RADIUS = 12

export function installLights(scene: Scene): LightRig {
  const ambient = new AmbientLight(0xffffff, RIGS.full.ambient)
  scene.add(ambient)
  const lamps = RIGS.full.lamps.map(() => {
    const light = new DirectionalLight(0xffffff, 0)
    scene.add(light)
    return light
  })

  const rig: LightRig = {
    apply(name, viewAz) {
      const spec = RIGS[name] ?? RIGS.full
      ambient.intensity = spec.ambient
      spec.lamps.forEach((lamp, i) => {
        const az = ((spec.follow ? viewAz + lamp.az : lamp.az) * Math.PI) / 180
        const el = (lamp.el * Math.PI) / 180
        lamps[i].position.set(
          Math.cos(el) * Math.sin(az) * RADIUS,
          Math.sin(el) * RADIUS,
          -Math.cos(el) * Math.cos(az) * RADIUS,
        )
        lamps[i].intensity = lamp.intensity
      })
      scene.background = new Color(spec.background)
      return spec.background
    },
  }
  rig.apply('full', 0)
  return rig
}
