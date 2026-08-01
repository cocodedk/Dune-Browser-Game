// src/game-render/modes/flight/wingCycle.ts
// PURE wing-beat maths. No three.js — unit-testable without a GL context,
// the same split FlightPath.ts already uses for the flight path itself.
//
// See docs/PRD/dune92/stages/22-ornithopter.md section 2.3. Angle of attack
// ("feather") is a plateaued trapezoid, not a phase-shifted sine: real
// dragonfly AoA is "relatively constant after pronation and supination"
// (Wang 2005), held flat through most of each half-stroke with a brisk
// corner at each reversal — a sine would put the wing at high AoA for only
// an instant per beat, which is the opposite of what makes flight visible.

export interface WingAngles {
  /** Stroke, about the craft's forward axis. Radians. */
  flap: number
  /** Fore-and-aft, about the craft's vertical axis. Radians. */
  sweep: number
  /** Angle of attack, about the wing's own span axis. Radians. */
  feather: number
}

/** Small, deterministic per-wing offset that breaks mirror symmetry. */
export interface WingAsymmetry {
  phase: number
  amplitudeScale: number
}

export interface WingCycleOptions {
  flapAmplitude: number
  /** Held angle of attack through the downstroke. ~50 deg. */
  aoaDownstroke: number
  /** Held angle of attack through the upstroke. ~20 deg. */
  aoaUpstroke: number
  /** Width of the pitch reversal, in radians of cycle. Short. */
  flipWindow: number
  /**
   * Radians by which the flip PRECEDES stroke reversal. Positive = advanced.
   * Advanced increases lift; delayed produces downward force (Dickinson,
   * Lehmann & Sane 1999). Named for the sign so a later edit cannot quietly
   * reintroduce a lag.
   */
  flipAdvance: number
  /** Deviation amplitude, applied at twice the beat. ~10-20 deg. */
  deviationAmplitude: number
  /** Radians this pair leads the forewing. 0 for the forewing itself. */
  pairPhase: number
  /** Per-wing offsets that break mirror symmetry. Small, deterministic. */
  asymmetry?: WingAsymmetry
}

const TWO_PI = Math.PI * 2
// Stroke reversals sit at PI/2 (top, upstroke -> downstroke) and 3*PI/2
// (bottom, downstroke -> upstroke) for a flap of sin(phase).
const TOP_REVERSAL = Math.PI / 2

function wrapTo2Pi(x: number): number {
  const m = x % TWO_PI
  return m < 0 ? m + TWO_PI : m
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Phase actually driving this wing, after its pair lag and asymmetry. */
function effectivePhase(phase: number, options: WingCycleOptions): number {
  return phase + options.pairPhase + (options.asymmetry?.phase ?? 0)
}

/**
 * The trapezoid itself: held at aoaUpstroke, a short linear ramp, held at
 * aoaDownstroke, a short linear ramp, repeat. Both ramps are exactly
 * flipWindow wide and END flipAdvance radians before their reversal — never
 * after (see WingCycleOptions.flipAdvance).
 */
function trapezoidFeather(phase: number, options: WingCycleOptions): number {
  const { aoaDownstroke, aoaUpstroke, flipWindow, flipAdvance } = options
  const topWindowStart = TOP_REVERSAL - flipAdvance - flipWindow
  const relative = wrapTo2Pi(phase - topWindowStart)

  if (relative < flipWindow) {
    return lerp(aoaUpstroke, aoaDownstroke, flipWindow === 0 ? 1 : relative / flipWindow)
  }
  if (relative < Math.PI) {
    return aoaDownstroke
  }
  if (relative < Math.PI + flipWindow) {
    return lerp(aoaDownstroke, aoaUpstroke, flipWindow === 0 ? 1 : (relative - Math.PI) / flipWindow)
  }
  return aoaUpstroke
}

/** @param phase Cycle position in radians; the caller owns the clock. */
export function wingAngles(phase: number, options: WingCycleOptions): WingAngles {
  const p = effectivePhase(phase, options)
  const ampScale = options.asymmetry?.amplitudeScale ?? 1
  return {
    flap: options.flapAmplitude * ampScale * Math.sin(p),
    // Deviation at 2x the beat frequency: combined with flap this traces
    // the figure-eight real dragonfly wingtips draw (four zero crossings
    // per cycle, not two — see wingCycle.test.ts).
    sweep: options.deviationAmplitude * ampScale * Math.sin(2 * p),
    feather: trapezoidFeather(p, options),
  }
}

/**
 * Feather angle at a point partway along the span (0 = root, 1 = tip).
 *
 * The pitch reversal is not a rigid-block rotation: in real dragonflies it
 * is a passive torsional wave that reaches the tip before the root
 * (Bergou, Xu & Wang 2007). Modelled here as advancing the effective phase
 * in proportion to span position, so the tip's flip leads the root's by up
 * to spanLeadFraction of one flipWindow.
 */
export function featherAtSpan(
  phase: number,
  spanFraction: number,
  options: WingCycleOptions,
  spanLeadFraction = 0.8,
): number {
  const lead = spanFraction * options.flipWindow * spanLeadFraction
  return trapezoidFeather(effectivePhase(phase, options) + lead, options)
}
