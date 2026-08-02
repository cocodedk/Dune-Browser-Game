// vehicle-shop/ornihopter/src/hud/glyphs.ts
// A 3x5 bitmap alphabet, and the reason there is a font in this repo at all.
//
// The numbers ARE the instrument. "Altitude and speed readouts, legible at a
// glance" cannot be met with bars and ticks; the user's finding was that he
// could not read the values, and a tape without digits is still unreadable.
// The house rule forbids a canvas (interior/faceBaker.ts explains why), so
// there is no fillText to call and the glyphs are drawn.
//
// 3x5 because that is the smallest cell in which every digit stays distinct at
// one texel per stroke — 3x5 is the classic seven-segment-equivalent grid, and
// 6 and 8, 3 and 9 survive it. Each glyph is five octal digits, one per row,
// bit 2 = left column. Scaled up at draw time, so one table serves the ladder's
// small rung labels and the altitude box's large ones.

import type { Surface } from './surface'
import type { Ink } from './palette'

const GLYPHS: Record<string, string> = {
  '0': '75557', '1': '26227', '2': '71747', '3': '71717', '4': '55711',
  '5': '74717', '6': '74757', '7': '71222', '8': '75757', '9': '75717',
  A: '75755', D: '65556', E: '74747', H: '55755', K: '55655', L: '44447',
  M: '57755', N: '57755', O: '75557', P: '75744', R: '75765', S: '74717',
  T: '72222', U: '55557', W: '55575', '-': '00700', '.': '00002', ' ': '00000',
  '/': '01247',
}

export const GLYPH_W = 3
export const GLYPH_H = 5

/** Cell advance in glyph units: three columns plus one of air. */
export const ADVANCE = 4

/** Width in texels of `text` drawn at `scale`. */
export function textWidth(text: string, scale: number): number {
  return text.length > 0 ? (text.length * ADVANCE - 1) * scale : 0
}

/** Draw `text` with its top-left at (x, y), one bitmap cell per glyph. */
export function drawText(
  surface: Surface, text: string, x: number, y: number, ink: Ink, scale = 1
): void {
  let penX = x
  for (const char of text.toUpperCase()) {
    const rows = GLYPHS[char] ?? GLYPHS[' ']
    for (let row = 0; row < GLYPH_H; row++) {
      const bits = Number.parseInt(rows[row], 8)
      for (let col = 0; col < GLYPH_W; col++) {
        if ((bits & (1 << (GLYPH_W - 1 - col))) === 0) continue
        surface.fill(penX + col * scale, y + row * scale, scale, scale, ink)
      }
    }
    penX += ADVANCE * scale
  }
}

/** Draw `text` centred on `cx`. Every readout in this folder is centred on its
 *  own box, so the box does not jump when a value goes from 99 to 100. */
export function drawCentred(
  surface: Surface, text: string, cx: number, y: number, ink: Ink, scale = 1
): void {
  drawText(surface, text, Math.round(cx - textWidth(text, scale) / 2), y, ink, scale)
}

/** Zero-padded integer, the aviation convention for a heading: 007, 090, 359. */
export function pad(value: number, digits: number): string {
  return Math.abs(Math.round(value)).toString().padStart(digits, '0')
}
