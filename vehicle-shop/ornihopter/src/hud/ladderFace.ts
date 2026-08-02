// vehicle-shop/ornihopter/src/hud/ladderFace.ts
// The pitch ladder and the boresight, both painted ONCE at boot.
//
// A pitch ladder is the one part of a HUD that must not be repainted per frame,
// and that is a design statement rather than an optimisation: in ladder space
// the rungs never move. Attitude is applied to the MESH — the group rolls, the
// ladder slides — exactly as a real combiner projects a fixed reticle through
// a moving mirror. Repainting it would cost a 768x768 surface every frame to
// reproduce a rotation the GPU does for free, and would sample the line-work
// on a new pixel grid each time, so the rungs would crawl.
//
// WHY +/-30 DEGREES. The ladder is conformal — one degree of pitch is one
// degree of the pilot's field of view — so its height is dictated by the range
// it covers, and 60 degrees of it is already 1.76 screen-heights of texture.
// This craft's flight model does not fly past 30 degrees in normal handling
// (flight/pitchAltitude.test.ts), and a ladder that covers attitudes nobody
// reaches spends resolution where nothing happens.
//
// CLIMB RUNGS ARE SOLID AND DIVE RUNGS ARE DASHED, with the end ticks always
// pointing back toward the horizon. That is the standard, and it is what lets a
// disoriented pilot tell up from down from a single rung with the numbers
// unread — which is precisely the user's complaint this round answers.

import { createSurface, surfaceTexture, type Surface } from './surface'
import { HUD_INK } from './palette'
import { drawCentred } from './glyphs'
import type { DataTexture } from 'three'

export const LADDER_RANGE_DEG = 30
/** Rungs stop short of the ladder's own range. MEASURED on the first 9f
 *  capture: at level flight the field of view is +/-34 degrees, so a rung at 30
 *  lands in the top eighth of the frame and its label collided with the heading
 *  tape's own labels — two instruments occupying one row of pixels, which is
 *  worse than either alone. The band above +25 is the tape's. */
const RUNG_LIMIT_DEG = 25
const SIZE = 768
const PX_PER_DEG = SIZE / (LADDER_RANGE_DEG * 2)
const MID = SIZE / 2

const GAP = 58
const REACH = 208
const TICK = 15
const LABEL_SCALE = 3

const rowFor = (deg: number): number => Math.round(MID - deg * PX_PER_DEG)

/** The horizon bar: the longest, heaviest line on the glass, with a gap at the
 *  centre so it never hides the boresight it is being read against. */
function horizon(surface: Surface): void {
  const y = rowFor(0)
  for (const side of [-1, 1] as const) {
    const inner = MID + side * GAP
    const outer = MID + side * (REACH + 110)
    surface.hLine(inner, outer, y, HUD_INK.green, 3)
    // End caps hang DOWN off both ends — the ground side, so the bar reads as
    // a horizon rather than as a rule even when it is the only thing in frame.
    surface.vLine(outer, y, y + 13, HUD_INK.green, 3)
  }
}

function rung(surface: Surface, deg: number): void {
  const y = rowFor(deg)
  const climbing = deg > 0
  const ink = climbing ? HUD_INK.green : HUD_INK.greenDim
  const label = Math.abs(deg).toString()

  for (const side of [-1, 1] as const) {
    const inner = MID + side * GAP
    const outer = MID + side * REACH
    if (climbing) {
      surface.hLine(inner, outer, y, ink, 2)
    } else {
      // Four dashes across the same reach, so a dive rung reads as broken from
      // any distance rather than only where a gap happens to fall.
      for (let d = 0; d < 4; d++) {
        const a = inner + side * d * 38
        surface.hLine(a, a + side * 26, y, ink, 2)
      }
    }
    // Ticks point toward the horizon: down off a climb rung, up off a dive one.
    surface.vLine(outer, climbing ? y : y - TICK, climbing ? y + TICK : y, ink, 2)
    drawCentred(
      surface, label, outer + side * 26, y - 7, HUD_INK.green, LABEL_SCALE
    )
  }
}

export function ladderTexture(): DataTexture {
  const surface = createSurface(SIZE, SIZE)
  horizon(surface)
  for (let deg = 5; deg <= RUNG_LIMIT_DEG; deg += 5) {
    rung(surface, deg)
    rung(surface, -deg)
  }
  return surfaceTexture(surface)
}

/**
 * The boresight — the aircraft reference symbol the ladder is read AGAINST.
 * Without it a rolling ladder has nothing to be rolled relative to, and the
 * horizon bar becomes a line in space rather than an attitude. Fixed to the
 * airframe, so it never rolls: that is the whole point of it.
 */
export function boresightTexture(): DataTexture {
  const w = 256
  const h = 48
  const surface = createSurface(w, h)
  const cy = 22
  for (const side of [-1, 1] as const) {
    const inner = w / 2 + side * 26
    const outer = w / 2 + side * 92
    surface.hLine(inner, outer, cy, HUD_INK.green, 3)
    surface.vLine(inner, cy, cy + 14, HUD_INK.green, 3)
  }
  surface.fill(w / 2 - 3, cy - 1, 6, 5, HUD_INK.amber)
  return surfaceTexture(surface)
}
