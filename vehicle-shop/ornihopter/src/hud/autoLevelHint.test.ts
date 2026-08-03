// vehicle-shop/ornihopter/src/hud/autoLevelHint.test.ts
// BAR B5, same user finding as flight/autoLevel.test.ts: the recovery must be
// visible, not just real. Goes through the same FlightState/contract path
// symbology.ts's other faces use (round 9f), and the same no-DOM, DataTexture,
// measure-the-texels house rule as symbology.test.ts -- see that file for why
// there is no canvas anywhere in this suite.

import { describe, it, expect } from 'vitest'
import { PerspectiveCamera, type DataTexture } from 'three'
import { createHudSymbology } from './symbology'
import { HUD_INK } from './palette'
import type { FlightState } from '../contracts'
import { IDENTITY_QUAT } from '../flight/quatMath'

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

function texels(texture: DataTexture): Uint8Array {
  const data = texture.image.data
  if (!data) throw new Error('face has no buffer')
  return data as Uint8Array
}

/** Count of texels with any ink at all (alpha > 0). Zero means the face is
 *  fully transparent -- invisible on the glass, whatever the mesh's own
 *  .visible flag says. */
function litTexelCount(bytes: Uint8Array): number {
  let n = 0
  for (let i = 3; i < bytes.length; i += 4) if (bytes[i] > 0) n++
  return n
}

describe('B5 -- the AUTO hint mirrors FlightState.autoLevel', () => {
  it('(e) is unpainted when autoLevel is off, and paints the glyph when it is on', () => {
    const camera = new PerspectiveCamera(68, 1.6, 0.25, 6000)
    const hud = createHudSymbology(camera)

    hud.update({ ...BASE, autoLevel: false })
    expect(litTexelCount(texels(hud.face('hud-autolevel')))).toBe(0)

    hud.update({ ...BASE, autoLevel: true })
    expect(litTexelCount(texels(hud.face('hud-autolevel')))).toBeGreaterThan(20)

    // And goes dark again the same frame it is released -- no held/latched state.
    hud.update({ ...BASE, autoLevel: false })
    expect(litTexelCount(texels(hud.face('hud-autolevel')))).toBe(0)

    hud.dispose()
  })

  it('paints the glyph in amber, under B3s luminance ceiling', () => {
    const camera = new PerspectiveCamera(68, 1.6, 0.25, 6000)
    const hud = createHudSymbology(camera)
    hud.update({ ...BASE, autoLevel: true })
    const bytes = texels(hud.face('hud-autolevel'))

    let sawAmber = false
    for (let i = 0; i < bytes.length; i += 4) {
      if (bytes[i + 3] === 0) continue
      const luma = 0.2126 * bytes[i] + 0.7152 * bytes[i + 1] + 0.0722 * bytes[i + 2]
      expect(luma).toBeLessThan(205)
      if (bytes[i] === HUD_INK.amber[0] && bytes[i + 1] === HUD_INK.amber[1] && bytes[i + 2] === HUD_INK.amber[2]) {
        sawAmber = true
      }
    }
    expect(sawAmber).toBe(true)
    hud.dispose()
  })
})
