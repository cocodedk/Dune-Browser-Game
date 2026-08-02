// vehicle-shop/ornihopter/src/hud/palette.ts
// The symbology's ink, and the one rule it lives under.
//
// B3 asks that luminance > 215 form exactly ONE connected region in the pilot
// frame — the cockpit's dome light. HUD symbology is drawn OVER the brightest
// thing in the frame (desert and sky through the glazing), so it is the single
// easiest way to break that line: one 255-white line across the horizon opens
// a second region in every capture forever. Every ink here is held under
// Rec.709 luma 205 by symbology.test.ts, measured the same way the capture is.
//
// The hues are the AH-64E monocle's, not a designer's: a single bright green
// for attitude and the tapes, amber for the one thing a pilot is allowed to be
// drawn to (the numeric boxes' own frames), and nothing else. Two colours is
// not a limitation here — a HUD that uses four is a dashboard.

export type Ink = readonly [number, number, number]

export const HUD_INK = {
  /** Primary line-work: horizon bar, ladder rungs, tape ticks, digits. */
  green: [96, 214, 126] as Ink,
  /** The dimmer green the ladder's minor detail and the tape's fine ticks use,
   *  so the horizon bar and the numbers stay the loudest things on the glass. */
  greenDim: [62, 142, 84] as Ink,
  /** Amber: the numeric box frames and the heading lubber index — the three
   *  places the eye is meant to land first. */
  amber: [222, 176, 72] as Ink,
} as const

/** Rec.709 luma, the measure docs/apache-gauntlet.md's B3 line is read with. */
export function luma(ink: Ink): number {
  return 0.2126 * ink[0] + 0.7152 * ink[1] + 0.0722 * ink[2]
}
