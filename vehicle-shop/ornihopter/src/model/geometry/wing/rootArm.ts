// vehicle-shop/ornihopter/src/model/geometry/wing/rootArm.ts
// The wing's inner 21% of span, at the resolution it was actually measured.
//
// spec.ts's WING.chordProfile is 20 stations RESAMPLED from the 88 that
// tools/plate-to-outline.mjs read off Wing_Fullscale_left.stl. Over the blade
// that loses nothing — the chord is constant there. Over the ARM it loses the
// whole part: the resample turns
//
//   0.446 0.457 0.466 0.414 0.425 0.351 0.336 0.263   (measured, span .056-.135)
//
// into a smooth 0.46 -> 0.327 ramp. That ripple is not noise. It is the
// "~16-18 regular scallops along both edges — a literal screw-thread/ridge
// texture" that docs/profiles/kit-dossier.md section f describes, sampled at
// 2.2mm intervals; and the 0.263 minimum is the dossier's 2.48mm root waist,
// 26% of blade chord. Losing it is why the rendered wing left the ball as a
// flat strap at near-full chord, with no rod and no sleeve.
//
// So the arm reads its widths straight from docs/profiles/wing-planform.json's
// own rows (below), and the blade keeps reading spec.ts. They meet at span
// 0.21348, where the file says 0.98707 and WING.chordProfile says 0.987 — the
// same station of the same plate, so the join has no step. NOTHING here
// changes the measured planform; it restores the resolution the resample threw
// away, over the span the spec's own WING.rootArmFraction has always claimed.

import { WING_MAX_CHORD } from '../../../spec'
import { chordWidthAt } from '../chordProfile'

/** Span fraction where the fine arm table hands over to WING.chordProfile. */
export const ARM_JOIN = 0.21348

/** docs/profiles/wing-planform.json stations 1..19: [span, chord/maxChord]. */
const FINE: readonly (readonly [number, number])[] = [
  [0.00000, 0.72000], // extrapolated: the pin bore at the very centre of the eye
  [0.01124, 0.84483],
  [0.02247, 1.00000], // widest point on the entire plate — the hinge eye
  [0.03371, 0.92241],
  [0.04494, 0.52586], // eye ends, rod begins
  [0.05618, 0.44612],
  [0.06742, 0.45690],
  [0.07865, 0.46552],
  [0.08989, 0.41379],
  [0.10112, 0.42457],
  [0.11236, 0.35129],
  [0.12360, 0.33621],
  [0.13483, 0.26293], // the 2.48mm waist
  [0.14607, 0.38362],
  [0.15730, 0.51940],
  [0.16854, 0.63147],
  [0.17978, 0.74569],
  [0.19101, 0.85991],
  [0.20225, 0.97198],
  [0.21348, 0.98707], // full blade chord; hands over to WING.chordProfile
]

/**
 * The eye is CLIPPED to 48% of max chord, not scaled: it is an annular loop
 * around the pivot PIN, and in this model that pin is the centre of
 * rootPod.ts's ball housing — 0.68 of max chord across. Drawing the eye at its
 * plate width would wrap a 1.12m boss around a 0.76m ball, which is precisely
 * the "flat strap leaving the ball at near-full chord" two critics named. At
 * 0.48 it is a stub collar the ball half-swallows, and it clears the hull: the
 * ball centre stands POST_HEIGHT (0.324m) off the skin against the collar's
 * 0.269m radius.
 *
 * Clipping rather than scaling because the measured curve crosses 0.48 on its
 * own at span 0.0514 — which is also where the dossier puts the start of the
 * rod (x=10mm of 197.62mm = 0.0506). So the collar ends exactly where the real
 * part's rod begins, with no step to blend away.
 */
const EYE_MAX = 0.48
const EYE_END = 0.0514

/** Dossier section f: rod/ridged sleeve x = 10-27mm, i.e. span 0.051-0.137. */
const SLEEVE_START = EYE_END
const SLEEVE_END = 0.1357
/**
 * Five rings, not seventeen. The plate has ~16-18 scallops over 17mm; at this
 * craft's scale that is a ring every 0.12m on a 0.25m rod, which at any camera
 * distance the bar shoots from resolves to noise, and costs 68 span stations to
 * sample. Five rings over the same run read as a threaded sleeve and cost 21.
 * Amplitude 0.18 of the local radius rather than the ~0.06 the 2.2mm-interval
 * scan reports, because that scan aliases: sampling a ~1mm scallop every 2.2mm
 * attenuates its amplitude, so 0.06 is a floor on the real depth, not a value.
 */
const RIDGE_COUNT = 5
const RIDGE_AMPLITUDE = 0.18

function interpolate(table: readonly (readonly [number, number])[], span: number): number {
  if (span <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (span >= last[0]) return last[1]
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]
    if (span > x1) continue
    const [x0, y0] = table[i - 1]
    return y0 + ((y1 - y0) * (span - x0)) / (x1 - x0)
  }
  return last[1]
}

/**
 * Arm width at `span`, as a fraction of max chord. Only valid to ARM_JOIN.
 *
 * Inside the sleeve the measured curve is REPLACED by its own straight taper
 * between its endpoints, and the rings are put back at a size that resolves.
 * That is not a licence to invent: the raw curve's ripple IS the scallops,
 * aliased by a 2.2mm scan of a ~1mm feature, so keeping it AND adding rings
 * would draw the same physical thread twice. The dossier describes the
 * underlying rod as a monotonic taper ("chord tapers 4.4mm -> 2.48mm") with
 * the scallops riding on it, which is exactly what this builds. The ring
 * amplitude is windowed to zero at both ends so the thread starts and stops
 * where the real one does instead of stepping.
 */
export function armWidthFractionAt(span: number): number {
  if (span > SLEEVE_START && span < SLEEVE_END) {
    const t = (span - SLEEVE_START) / (SLEEVE_END - SLEEVE_START)
    const taper = interpolate(FINE, SLEEVE_START) * (1 - t) + interpolate(FINE, SLEEVE_END) * t
    const envelope = Math.sin(Math.PI * t)
    return taper * (1 + RIDGE_AMPLITUDE * envelope * Math.sin(2 * Math.PI * RIDGE_COUNT * t))
  }
  const measured = interpolate(FINE, span)
  return span < EYE_END ? Math.min(measured, EYE_MAX) : measured
}

/** Full section width in metres at any span — arm table, then the spec's own
 *  planform past the join, which is the same plate measured the same way. */
export function wingWidthAt(span: number): number {
  return span < ARM_JOIN ? armWidthFractionAt(span) * WING_MAX_CHORD : chordWidthAt(span)
}

/** Every span station the blade loft emits, root to tip.
 *
 *  Dense where the measured shape actually moves — the eye, each sleeve ring
 *  (four samples per ring, the minimum that resolves one), the flare and the
 *  tip taper — and sparse across the constant-chord midspan, where the old
 *  uniform 40 stations spent most of their budget describing a straight line. */
function buildStations(): number[] {
  const spans = [0, 0.026] // the collar is a straight cylinder; two rings do it
  const rings = RIDGE_COUNT * 4 // four samples per ring is the fewest that resolves one
  for (let i = 0; i <= rings; i++) {
    spans.push(SLEEVE_START + ((SLEEVE_END - SLEEVE_START) * i) / rings)
  }
  spans.push(0.14607, 0.1573, 0.16854, 0.17978, 0.19101, 0.20225, ARM_JOIN)
  spans.push(0.3, 0.45, 0.6, 0.75, 0.85, 0.88, 0.91, 0.935, 0.955, 0.972, 0.987, 1)
  return spans
}

export const SPAN_STATIONS: readonly number[] = buildStations()
