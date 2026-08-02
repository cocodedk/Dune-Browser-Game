// vehicle-shop/ornihopter/src/hud/tapeFaces.ts
// The repainted faces: heading tape, altitude box, speed box, and the small
// AUTO hint (B5's auto-level finding) that joins them below.
//
// THESE are what repaint, and only these. Each is a small surface — the three
// together are 42k texels against the ladder's 590k — because a scrolling tape
// is the one thing that genuinely cannot be a transform: the LABELS have to
// change, and no amount of sliding a fixed strip turns 350 into 010.
//
// Repaint is VALUE-DRIVEN, not clock-driven (symbology.ts holds the gate). A
// frame-rate cadence either repaints faces whose reading has not moved or lags
// one that has; quantising the reading and repainting on change does neither,
// costs nothing in the cruise, and is deterministic enough to unit test — a
// clock-gated repaint cannot be asserted without also asserting a clock.
//
// EVERY FACE IS A BOX PLUS A TAPE, and that pairing is deliberate: the box
// answers "what is it" at a glance, which is the user's actual complaint, and
// the tape answers "which way is it going", which digits alone never do.

import type { Surface } from './surface'
import { HUD_INK, type Ink } from './palette'
import { drawCentred, pad } from './glyphs'
import { angleDelta, type HudReading } from './reading'

export const HEADING_FACE = { w: 512, h: 88 } as const
export const SIDE_FACE = { w: 144, h: 208 } as const
export const AUTO_FACE = { w: 128, h: 32 } as const

const HDG_PX_PER_DEG = 5.2
const CARDINALS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

/** Downward caret: the index the tape is read under, drawn as a solid wedge so
 *  it survives being one of the smallest marks on the glass. */
function caret(surface: Surface, cx: number, top: number, ink: Ink): void {
  for (let i = 0; i < 7; i++) surface.fill(cx - 6 + i, top + i, 13 - i * 2, 1, ink)
}

export function paintHeading(surface: Surface, r: HudReading): void {
  surface.clear()
  const cx = surface.w / 2
  const base = 52

  // The numeric box, over the index. Three digits, zero-padded: 007, not 7.
  surface.frame(cx - 34, 0, 68, 30, HUD_INK.amber)
  drawCentred(surface, pad(r.headingDeg % 360, 3), cx, 5, HUD_INK.green, 4)
  caret(surface, cx, 33, HUD_INK.amber)

  surface.hLine(6, surface.w - 7, base, HUD_INK.greenDim, 2)
  const centre = Math.round(r.headingDeg / 5) * 5
  for (let step = -12; step <= 12; step++) {
    const mark = ((centre + step * 5) % 360 + 360) % 360
    const x = Math.round(cx + angleDelta(mark, r.headingDeg) * HDG_PX_PER_DEG)
    if (x < 8 || x > surface.w - 9) continue
    const major = mark % 10 === 0
    surface.vLine(x, base - (major ? 14 : 7), base, major ? HUD_INK.green : HUD_INK.greenDim, 2)
    if (mark % 30 !== 0) continue
    // Cardinal letters where there is one, the aviation two-digit form (33 for
    // 330) where there is not — the same tape a pilot has already learnt.
    drawCentred(surface, CARDINALS[mark] ?? pad(mark / 10, 2), x, base + 8, HUD_INK.green, 3)
  }
}

/** Shared body of the two side readouts: a title, a framed value, and a tick
 *  tape running up the inboard edge with a caret at the current value. */
function sideFace(
  surface: Surface, title: string, value: string,
  perUnit: number, minor: number, major: number, current: number, mirrored: boolean
): void {
  surface.clear()
  // The rail sits on the face's OUTBOARD edge and its ticks grow further
  // outboard, so the box never has to share a column with the tape.
  const rail = mirrored ? 18 : surface.w - 19
  const out = mirrored ? -1 : 1
  const boxCx = mirrored ? 88 : 56
  const midY = 112
  const span = 40 / perUnit

  drawCentred(surface, title, boxCx, 4, HUD_INK.greenDim, 3)
  surface.frame(boxCx - 50, midY - 21, 100, 42, HUD_INK.amber)
  drawCentred(surface, value, boxCx, midY - 13, HUD_INK.green, 5)

  surface.vLine(rail, 34, 196, HUD_INK.greenDim, 2)
  for (let v = Math.ceil((current - span) / minor) * minor; v < current + span; v += minor) {
    if (v < 0) continue
    const y = Math.round(midY - (v - current) * perUnit)
    if (y < 34 || y > 196) continue
    const big = Math.abs(v % major) < minor / 2
    surface.hLine(rail, rail + out * (big ? 13 : 7), y, big ? HUD_INK.green : HUD_INK.greenDim, 2)
  }
  // The index: a bar from the rail back toward the box, at the current value.
  surface.hLine(rail, rail - out * 13, midY, HUD_INK.amber, 3)
}

export function paintAltitude(surface: Surface, r: HudReading): void {
  const shown = Math.max(0, Math.round(r.altitude))
  sideFace(surface, 'ALT', shown.toString(), 1.9, 5, 25, r.altitude, false)
}

export function paintSpeed(surface: Surface, r: HudReading): void {
  const shown = Math.max(0, Math.round(r.speed))
  sideFace(surface, 'SPD', shown.toString(), 3.6, 2, 10, r.speed, true)
}

/** The auto-level hint: nothing at all when it is off (a cleared surface is
 *  fully transparent — invisible on the glass with no mesh-visibility flag
 *  needed), the word AUTO in amber when it is on. Amber, not a third colour:
 *  palette.ts already uses it for the three things the eye should land on
 *  first, and an active override belongs on that list. */
export function paintAutoLevel(surface: Surface, r: HudReading): void {
  surface.clear()
  if (!r.autoLevel) return
  drawCentred(surface, 'AUTO', surface.w / 2, 6, HUD_INK.amber, 4)
}
