// src/game-render/modes/flight/geometry/wingGeometry.ts
// Three.js side of the wing SHAPE: a round, tapered leading-edge spar plus a
// pleated membrane aft of it — replacing the flat flattened-cylinder "blade"
// (stage 22 section 2.1: "every component is a bare primitive... the aft
// spars are naked sticks"). Two real, separately-shaded parts instead of one
// flat plank is the single highest-impact change the spec names.
//
// Both parts are built with their ROOT at local x=0 and tip at local
// x=side*span, matching WingRig.ts's hinge contract (see its own header):
// the pivot rotates, never translates, so whatever sits at x=0 stays at the
// hinge no matter how the wing beats. WingRig.ts's per-vertex feather twist
// is a generic function of (local x, local y, local z), so it works
// unmodified on this richer geometry — see its update().

import { PlaneGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import { wingSectionAt, taper, tiltChordSection } from './wingProfile'
import type { WingGeometrySpec, WingSide } from '../wingConfig'

const SPAR_RADIAL_SEGMENTS = 8

// Larger wings get a finer membrane grid; a per-wing span, not pair span
// (each wing's own geometry runs root to ONE tip, not tip to tip — see
// wingConfig.ts). This threshold has already broken twice from staying a
// bare number nobody re-checked against wingConfig.ts's actual spans: once
// when a value of 28 silently dropped the forewing to the coarse grid it
// was never meant to get, and this round, when wingConfig.ts's per-wing
// spans grew to 32 (forewing) and 24.5 (hindwing) — restoring the span
// toward a reference photo — which puts BOTH wings above the threshold that
// used to sit between them (15, then tuned for 17/~13). That is checked and
// intentional here, not a silent drift: both wings are now big enough, and
// the triangle budget has enough headroom (see Ornithopter.test.ts), that
// giving the hindwing the finer grid too reads as more detail rather than
// wasted density. Keep checking this against wingConfig.ts's actual spans
// whenever either changes; do not assume last round's tier assignment still
// holds.
const LARGE_SPAN_THRESHOLD = 15
const LARGE_GRID = { span: 16, chord: 18 }
const SMALL_GRID = { span: 12, chord: 14 }

/**
 * The stiff leading-edge member (section 2.5: "spanwise stiffness exceeds
 * chordwise by one to two orders of magnitude... a stiff leading-edge spar").
 * A plain round taper, smooth-shaded — the rod itself needs no facets to read
 * as a bevelled, built part; a cylinder already has none.
 */
export function buildSparGeometry(spec: WingGeometrySpec, side: WingSide): BufferGeometry {
  const { span, sparRootRadius, sparTipRadius } = spec
  const geometry = side === 'left'
    ? new CylinderGeometry(sparTipRadius, sparRootRadius, span, SPAR_RADIAL_SEGMENTS, 1, false)
    : new CylinderGeometry(sparRootRadius, sparTipRadius, span, SPAR_RADIAL_SEGMENTS, 1, false)
  geometry.rotateZ(Math.PI / 2)
  geometry.translate(side === 'left' ? -span / 2 : span / 2, 0, 0)
  return geometry
}

/**
 * The pleated membrane, aft of the spar. Built by displacing a flat grid
 * rather than hand-authoring a triangle soup, so the topology, winding and
 * UVs all come from `PlaneGeometry` for free; only the position formula
 * (`wingSectionAt`, then `tiltChordSection`) is bespoke. `flatShading` on the
 * consuming material (see Ornithopter.ts) is what turns this into a faceted,
 * corrugated surface rather than a smoothly-blurred wave — see
 * wingProfile.ts's header. `tiltChordSection` is the fix for this round's
 * named gap: it leans the chord toward the axis a chase camera can actually
 * see (wingProfile.ts's own header has the full reasoning).
 *
 * The two sides are spatial mirror images (root at x=0, tip at x=-span for
 * 'left', +span for 'right'), which inverts triangle winding for one side.
 * The consuming material is deliberately double-sided (a real wing's
 * underside is visible across the beat cycle anyway), so that is not
 * corrected here — see Ornithopter.ts's WING_MEMBRANE material.
 */
export function buildMembraneGeometry(spec: WingGeometrySpec, side: WingSide): BufferGeometry {
  const { span, rootRadius, tipRadius, thinness, sparRootRadius, sparTipRadius } = spec
  const rootThickness = rootRadius * thinness
  const grid = span >= LARGE_SPAN_THRESHOLD ? LARGE_GRID : SMALL_GRID

  const geometry = new PlaneGeometry(1, 1, grid.span, grid.chord)
  const position = geometry.attributes.position
  const sign = side === 'left' ? -1 : 1

  for (let i = 0; i < position.count; i++) {
    const s = position.getX(i) + 0.5 // 0 at root, 1 at tip
    const c = position.getY(i) + 0.5 // 0 just aft of the spar, 1 at the trailing edge
    const chordWidth = taper(s, rootRadius, tipRadius)
    const sparRadius = taper(s, sparRootRadius, sparTipRadius)
    const section = tiltChordSection(wingSectionAt(s, c, sparRadius, chordWidth, rootThickness), c)
    position.setXYZ(i, sign * s * span, section.y, section.z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}
