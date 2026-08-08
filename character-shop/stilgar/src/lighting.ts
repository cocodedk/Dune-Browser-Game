// character-shop/stilgar/src/lighting.ts
// The harness's LIGHT RIGS, and the one place their numbers live so
// tools/shoot.mjs can copy them into .shots/manifest.json verbatim.
//
// R2 added the second rig. R1 shot everything under one soft pair whose key
// light sat BEHIND the figure (position +Z, and the face looks toward -Z):
// every full-body view was legible, but the face was lit by fill and
// hemisphere only. That is why R1 measured a 12.2 mm brow ridge that
// rendered as a smudge — relief reads by the SHADOW it throws, and a
// wrap-around ambient throws none. So the bust and head framings now get a
// real 3-point portrait rig against a mid-grey backdrop, while the five
// full-body views and the silhouette keep R1's rig with its numbers
// untouched, so their PNGs stay comparable with R1's own evidence.

import { Color, DirectionalLight, HemisphereLight, Group, Object3D } from 'three'
import type { Scene } from 'three'
import { PROPORTIONS } from './spec'

/** Every portrait lamp aims HERE — the spec's own eye line. A
 *  DirectionalLight's direction is (position - target) and three.js defaults
 *  that target to the world origin, i.e. the ground between the feet: a lamp
 *  authored as "45 degrees round, 30 degrees up" would otherwise rake the
 *  head from a far shallower angle than its own numbers claim. */
const AIM_Y = PROPORTIONS.eyeLineFraction * PROPORTIONS.heightM

export type RigName = 'default' | 'portrait'

export interface Lamp {
  name: string
  color: number
  intensity: number
  position: readonly [number, number, number]
  /** World Y this lamp points at. */
  aimY: number
  /** Authored pose, kept for the manifest. Azimuth 0 sits ahead of the face
   *  (the -Z convention tools/views.mjs uses); POSITIVE azimuth is the
   *  figure's own right, which is CAMERA-LEFT in any front-ish view. */
  pose?: { azimuthDeg: number; elevationDeg: number; distanceM: number }
}

export interface RigSpec {
  backdrop: number
  ambient: { sky: number; ground: number; intensity: number }
  lamps: Lamp[]
}

function spherical(azimuthDeg: number, elevationDeg: number, distanceM: number): Lamp['position'] {
  const az = (azimuthDeg * Math.PI) / 180
  const el = (elevationDeg * Math.PI) / 180
  return [
    Math.cos(el) * Math.sin(az) * distanceM,
    AIM_Y + Math.sin(el) * distanceM,
    -Math.cos(el) * Math.cos(az) * distanceM,
  ]
}

function portraitLamp(
  name: string, color: number, intensity: number,
  azimuthDeg: number, elevationDeg: number, distanceM: number,
): Lamp {
  return {
    name, color, intensity,
    position: spherical(azimuthDeg, elevationDeg, distanceM),
    aimY: AIM_Y,
    pose: { azimuthDeg, elevationDeg, distanceM },
  }
}

export const RIGS: Record<RigName, RigSpec> = {
  // R1's pair, byte-for-byte. Do not retune: five views and the silhouette
  // are judged against R1's captures under exactly these numbers.
  default: {
    backdrop: 0x24211d,
    ambient: { sky: 0xcfc6ab, ground: 0x3a3226, intensity: 1.1 },
    lamps: [
      { name: 'sun', color: 0xfff3df, intensity: 3.0, position: [3, 6, 4], aimY: 0 },
      { name: 'fill', color: 0xdce8ff, intensity: 1.0, position: [-4, 2, -3], aimY: 0 },
    ],
  },
  // Bust and head framings only. Hemisphere is deliberately LOW (0.40 against
  // the default's 1.1): ambient that wraps the whole head is what flattened
  // R1's face, and a portrait rig's job here is to make brow, socket, nose
  // and beard read as separate values.
  portrait: {
    backdrop: 0x8a8a8a,
    ambient: { sky: 0xb9bcc4, ground: 0x4a463f, intensity: 0.4 },
    lamps: [
      portraitLamp('key', 0xfff1dc, 3.6, 45, 30, 3),
      portraitLamp('fill', 0xd6e3ff, 1.2, -60, 12, 3),
      portraitLamp('rim', 0xf2f6ff, 2.8, 172, 52, 3),
    ],
  },
}

export interface LightingControl {
  setRig(name: RigName): void
  currentRig(): RigName
  /** The active rig's backdrop — debug.ts's silhouette mode restores THIS
   *  rather than a colour it cached, so switching rigs mid-shoot cannot
   *  leave a stale background behind. */
  backdrop(): number
}

function buildRig(spec: RigSpec): Group {
  const group = new Group()
  const { sky, ground, intensity } = spec.ambient
  group.add(new HemisphereLight(sky, ground, intensity))
  for (const l of spec.lamps) {
    const light = new DirectionalLight(l.color, l.intensity)
    light.position.set(l.position[0], l.position[1], l.position[2])
    const target = new Object3D()
    target.position.set(0, l.aimY, 0)
    group.add(target)
    light.target = target
    group.add(light)
  }
  return group
}

/** Add every rig to the scene once and switch by visibility — an invisible
 *  subtree is skipped whole by the renderer, so a hidden rig contributes
 *  nothing and no light is ever built twice. */
export function installLighting(scene: Scene): LightingControl {
  const groups = {} as Record<RigName, Group>
  for (const name of Object.keys(RIGS) as RigName[]) {
    const group = buildRig(RIGS[name])
    group.name = `rig-${name}`
    scene.add(group)
    groups[name] = group
  }
  let active: RigName = 'default'

  const apply = (name: RigName): void => {
    active = name
    for (const key of Object.keys(groups) as RigName[]) groups[key].visible = key === name
    scene.background = new Color(RIGS[name].backdrop)
  }
  apply('default')

  return {
    setRig: apply,
    currentRig: () => active,
    backdrop: () => RIGS[active].backdrop,
  }
}
