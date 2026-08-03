// vehicle-shop/ornihopter/src/hud/symbology.test.ts
// BAR B5, the user's own finding: "I have no clue about the pitch and the
// altitude. and no compass and those sort of nav things." "also no indication
// of speed."
//
// WHAT THIS GUARDS, and why each assertion is the one that would have caught
// the failure it names:
//
//   (a) the symbology exists AND is camera-side. A HUD parented to the craft
//       root would look correct in one capture and swing out of frame the
//       moment the pilot turned his head, so the parent is asserted, not just
//       the existence of the group.
//   (b) two different FlightStates render DIFFERENTLY. A HUD painted once at
//       boot passes every "is it there" check ever written and is a picture,
//       not an instrument. Both halves are asserted: the attitude group's
//       transform (the ladder is a static face that rolls and slides, like a
//       real combiner) and the painted texels of every repainted face.
//   (c) heading 0 and heading 90 paint different pixels — the tape actually
//       carries the compass, rather than a fixed N that never moves.
//
// NO DOM ANYWHERE. Every face is a DataTexture written from a Uint8Array, the
// same house rule as interior/faceBaker.ts. `document` does not exist in this
// suite and a CanvasTexture would take the whole file down on import.
//
// The palette assertion is B3's "luminance > 215 forms exactly ONE connected
// region" enforced at the source: symbology is drawn over desert and sky, so a
// 255-white line would open a second region in every frame it touched. Held at
// the same Rec.709 luma the capture is measured with.

import { describe, it, expect } from 'vitest'
import { PerspectiveCamera, Object3D, type DataTexture } from 'three'
import { createHudSymbology } from './symbology'
import { HUD_INK } from './palette'
import { readFlight } from './reading'
import { createLivePages } from '../interior/mfdLive'
import type { FlightState, Quat } from '../contracts'
import { IDENTITY_QUAT, quatFromAxisAngle, quatMultiply } from '../flight/quatMath'

const BASE: FlightState = {
  position: { x: 0, y: 120, z: 0 },
  velocity: { x: 0, y: 0, z: -34 },
  orientation: IDENTITY_QUAT,
  throttle: 0.5,
  speed: 34,
  altitude: 96,
  beatPhase: 0,
  beatHz: 2.1,
}

const RAD = Math.PI / 180
const about = (x: number, y: number, z: number, deg: number): Quat =>
  quatFromAxisAngle({ x, y, z }, deg * RAD)

/**
 * A craft attitude, composed yaw-pitch-roll (intrinsic Y-X-Z). The yaw and roll
 * signs are negated so the ARGUMENTS read in the pilot's own terms — heading
 * clockwise from north, roll positive to starboard — and reading.ts is then
 * asserted to hand those same numbers back. Getting this backwards is exactly
 * how a ladder ends up rolling the wrong way, so it is written down once here.
 */
function attitude(headingDeg: number, pitchDeg = 0, rollDeg = 0): Quat {
  return quatMultiply(
    quatMultiply(about(0, 1, 0, -headingDeg), about(1, 0, 0, pitchDeg)),
    about(0, 0, 1, -rollDeg)
  )
}

function heading(deg: number): FlightState {
  return { ...BASE, orientation: attitude(deg) }
}

function named(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name)
}

/** The bytes actually behind a face. three.js types image.data as possibly
 *  null, but a DataTexture built from a Uint8Array never has a null one, and a
 *  test that quietly skipped a null buffer would assert nothing. */
function texels(texture: DataTexture): Uint8Array {
  const data = texture.image.data
  if (!data) throw new Error('face has no buffer')
  return data as Uint8Array
}

function differingBytes(a: Uint8Array, b: Uint8Array): number {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

function luma([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('B5 — the pilot can fly on instruments', () => {
  it('(a) hangs a named symbology group off the camera itself', () => {
    const camera = new PerspectiveCamera(68, 1.6, 0.25, 6000)
    const hud = createHudSymbology(camera)

    expect(camera.children).toContain(hud.group as unknown as Object3D)
    expect(hud.group.name).toBe('hud-symbology')
    for (const part of ['hud-pitch-ladder', 'hud-heading', 'hud-altitude', 'hud-speed']) {
      expect(named(hud.group as unknown as Object3D, part), part).toBeDefined()
    }
    hud.dispose()
  })

  it('(b) renders two different FlightStates differently', () => {
    const camera = new PerspectiveCamera(68, 1.6, 0.25, 6000)
    const hud = createHudSymbology(camera)
    const root = hud.group as unknown as Object3D

    hud.update(BASE)
    const frame = named(root, 'hud-attitude')
    const ladder = named(root, 'hud-pitch-ladder')
    if (!frame || !ladder) throw new Error('attitude parts missing')
    const levelRoll = frame.rotation.z
    const levelSlide = ladder.position.y
    const faces = ['hud-heading', 'hud-altitude', 'hud-speed'] as const
    const before = faces.map((n) => Uint8Array.from(texels(hud.face(n))))
    const versions = faces.map((n) => hud.face(n).version)

    // Turned onto 040, nose up 14, banked 22 to starboard, faster and higher.
    const flown = { ...BASE, orientation: attitude(40, 14, 22), altitude: 341, speed: 71, throttle: 0.86 }
    const read = readFlight(flown)
    expect(read.headingDeg).toBeCloseTo(40, 2)
    expect(read.pitchDeg).toBeCloseTo(14, 2)
    expect(read.rollDeg).toBeCloseTo(22, 2)
    hud.update(flown)

    expect(Math.abs(frame.rotation.z - levelRoll)).toBeGreaterThan(0.2)
    expect(Math.abs(ladder.position.y - levelSlide)).toBeGreaterThan(0.05)
    faces.forEach((n, i) => {
      expect(differingBytes(before[i], texels(hud.face(n))), `${n} texels`).toBeGreaterThan(40)
      expect(hud.face(n).version, `${n} version`).toBeGreaterThan(versions[i])
    })
    hud.dispose()
  })

  it('(c) paints a different compass at heading 0 and heading 90', () => {
    const camera = new PerspectiveCamera(68, 1.6, 0.25, 6000)
    const hud = createHudSymbology(camera)

    hud.update(heading(0))
    expect(readFlight(heading(0)).headingDeg).toBeCloseTo(0, 3)
    const north = Uint8Array.from(texels(hud.face('hud-heading')))

    hud.update(heading(90))
    expect(readFlight(heading(90)).headingDeg).toBeCloseTo(90, 3)
    expect(differingBytes(north, texels(hud.face('hud-heading')))).toBeGreaterThan(200)
    hud.dispose()
  })

  it('(4) repaints the MFD nav and systems pages from FlightState', () => {
    const pages = createLivePages()

    pages.update(heading(0))
    const nav0 = Uint8Array.from(texels(pages.map))
    const sys0 = Uint8Array.from(texels(pages.systems))
    const navVersion = pages.map.version
    const sysVersion = pages.systems.version

    pages.update({ ...heading(90), altitude: 260, throttle: 0.93, speed: 62 })
    expect(differingBytes(nav0, texels(pages.map)), 'nav page').toBeGreaterThan(200)
    expect(differingBytes(sys0, texels(pages.systems)), 'systems page').toBeGreaterThan(200)
    expect(pages.map.version).toBeGreaterThan(navVersion)
    expect(pages.systems.version).toBeGreaterThan(sysVersion)
    pages.dispose()
  })

  it('keeps every symbology ink under B3s luminance ceiling', () => {
    for (const [name, rgb] of Object.entries(HUD_INK)) {
      expect(luma(rgb), name).toBeLessThan(205)
    }
  })
})
