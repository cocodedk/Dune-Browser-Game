// src/game-render/modes/flight/geometry/wingMarkings.ts
// Two authentic dragonfly markings, both cheap and highly legible on the
// outline (stage 22 section 2.5): the pterostigma, a small dark mass near
// the leading edge at ~85% of span, and the nodus, a hinge mark on the
// leading edge at ~55% of span. Positioned via the same wingSectionAt /
// tiltChordSection pipeline the membrane itself uses (wingProfile.ts), so
// both sit flush with the actual (tilted) membrane surface instead of
// floating off it. Both are ordinary WingParts to WingRig.ts, so they beat
// and pitch with the wing rather than staying rigid against the fuselage.
//
// Round 5 adds a third kind, `buildSegmentRibGeometry`: mechanical panel
// seams across the chord at several span fractions, distinct from the two
// biological markings above — section 2.2's "wings as panel-lined blades...
// with segment joints along their length" (reference:
// .shots/reference/mr-O8.jpg shows straight cross-ribs at intervals along
// each blade). Same positioning pipeline, so the ribs also stay flush with
// the tilted membrane and beat/pitch with the wing.

import { BoxGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import {
  taper, wingSectionAt, tiltChordSection, WING_CHORD_TILT,
} from './wingProfile'
import type { WingGeometrySpec, WingSide } from '../wingConfig'

/** Span fraction of the pterostigma, per section 2.5. */
export const PTEROSTIGMA_SPAN_FRACTION = 0.85
/** Span fraction of the nodus, per section 2.5. */
export const NODUS_SPAN_FRACTION = 0.55

/** Near the leading edge, not at it — a decal sitting ON the spar reads as buried in it. */
const PTEROSTIGMA_CHORD_FRACTION = 0.22

/**
 * A small dark mass just aft of the spar near the tip. Real function is
 * raising flutter speed; here it is scale-cue geometry, not aerodynamics —
 * "the sort of small element that gives the eye a scale cue on the outline."
 */
export function buildPterostigmaGeometry(spec: WingGeometrySpec, side: WingSide): BufferGeometry {
  const {
    span, rootRadius, tipRadius, thinness, sparRootRadius, sparTipRadius,
  } = spec
  const s = PTEROSTIGMA_SPAN_FRACTION
  const c = PTEROSTIGMA_CHORD_FRACTION
  const chordWidth = taper(s, rootRadius, tipRadius)
  const sparRadiusHere = taper(s, sparRootRadius, sparTipRadius)
  const section = tiltChordSection(
    wingSectionAt(s, c, sparRadiusHere, chordWidth, rootRadius * thinness), c,
  )

  const chordSize = Math.max(0.18, chordWidth * 0.34)
  const geometry = new BoxGeometry(span * 0.045, chordSize, chordSize * 0.6)
  // Sits flush with the tilted membrane surface at this chord fraction
  // rather than staying axis-aligned regardless of it.
  geometry.rotateX(WING_CHORD_TILT * c)
  const sign = side === 'left' ? -1 : 1
  geometry.translate(sign * s * span, section.y, section.z)
  return geometry
}

/**
 * A raised collar around the spar — the visible joint the leading edge
 * hinges at. Encircling the spar (rather than a flat decal on one face)
 * means it reads correctly from any angle, including edge-on.
 */
export function buildNodusGeometry(spec: WingGeometrySpec, side: WingSide): BufferGeometry {
  const { span, sparRootRadius, sparTipRadius } = spec
  const s = NODUS_SPAN_FRACTION
  const sparRadiusHere = taper(s, sparRootRadius, sparTipRadius)

  const geometry = new CylinderGeometry(sparRadiusHere * 1.55, sparRadiusHere * 1.55, span * 0.03, 8, 1, false)
  geometry.rotateZ(Math.PI / 2) // lay the short cylinder's axis along X, same trick as the spar itself
  const sign = side === 'left' ? -1 : 1
  geometry.translate(sign * s * span, 0, 0)
  return geometry
}

/** Span fractions of the mechanical segment-joint ribs, clear of the nodus (0.55) and pterostigma (0.85). */
export const SEGMENT_RIB_SPAN_FRACTIONS: readonly number[] = [0.22, 0.4, 0.7]

/** Mid-chord placement — deep enough into the membrane that the rib reads as crossing it, not edging it. */
const SEGMENT_RIB_CHORD_FRACTION = 0.55

/**
 * A thin raised band crossing most of the chord at a fixed span fraction —
 * the mechanical "segment joint" the reference's wings show at intervals,
 * distinct from the pterostigma/nodus's small biological markings above.
 */
export function buildSegmentRibGeometry(spec: WingGeometrySpec, side: WingSide, spanFraction: number): BufferGeometry {
  const {
    span, rootRadius, tipRadius, thinness, sparRootRadius, sparTipRadius,
  } = spec
  const s = spanFraction
  const c = SEGMENT_RIB_CHORD_FRACTION
  const chordWidth = taper(s, rootRadius, tipRadius)
  const sparRadiusHere = taper(s, sparRootRadius, sparTipRadius)
  const section = tiltChordSection(
    wingSectionAt(s, c, sparRadiusHere, chordWidth, rootRadius * thinness), c,
  )

  const geometry = new BoxGeometry(span * 0.018, chordWidth * 0.85, Math.max(0.1, chordWidth * 0.08))
  geometry.rotateX(WING_CHORD_TILT * c)
  const sign = side === 'left' ? -1 : 1
  geometry.translate(sign * s * span, section.y, section.z)
  return geometry
}
