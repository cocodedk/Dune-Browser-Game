// src/game-render/modes/flight/geometry/canopyGeometry.ts
// Cockpit canopy: glazing, a frame that breaks the fuselage line, and a
// collar that seats it on the hull rather than letting it sit like a bead on
// top (stage 22 section 1.5: "the canopy is a sphere sitting on top of the
// hull like a bead... rather than a cockpit the crew could see out of").
//
// The frame is what section 2.5 spends budget on ("canopy frame and glazing
// profile — breaks the fuselage line; the one gloss element") and the collar
// is junction geometry (section 2.6: "no AO contact darkening at joints... a
// clean seam" — a raised trim ring at the base hides the glazing/hull seam
// under a part that reads as deliberate, rather than leaving the two
// surfaces to fight along an unblended intersection line).
//
// Round 5: section 2.2's corrected table wants a "multi-pane angular
// greenhouse... not a smooth bubble" (reference: .shots/reference/thopter-
// mr.jpg, thopter-01.jpg — a faceted hexagonal glasshouse, not a dome). Two
// changes get there: fewer sphere segments (bigger, more visible flat panes)
// plus flatShading (set on the glazing material in Ornithopter.ts, the same
// trick the hull and wing membrane use), and MORE ribs — four hoops instead
// of two, plus two fore-aft stringers crossing them — so the frame reads as
// a mullion grid over distinct panes rather than two arches on a bubble.

import {
  Group, Mesh, SphereGeometry, TorusGeometry, type BufferGeometry, type Material,
} from 'three'
import { hullRadiusAt, FUSELAGE_LENGTH_SCALE } from './fuselageGeometry'

/** Where the canopy sits — forward of the forewing attachment, not overlapping it. */
export const CANOPY_Z = -8.2 * FUSELAGE_LENGTH_SCALE
const CANOPY_RADIUS = 1.85
const CANOPY_SCALE: readonly [number, number, number] = [0.92, 0.62, 1.7]

export interface CanopyParts {
  group: Group
  geometries: BufferGeometry[]
}

/**
 * Fore-aft stringer geometry, crossing the hoop ribs over the crown of the
 * dome: `rotateY(PI/2)` swaps the un-rotated arch rib's roles (see the hoop
 * loop below) so the arc that used to run +X -> +Y -> -X instead runs
 * +Z -> +Y -> -Z — a mullion running the LENGTH of the canopy instead of
 * across its width. Same radius as the hoops (matches the dome's own
 * cross-section); placement scales it by (Y, Z) instead of (X, Y) to match.
 */
function buildStringerGeometry(radius: number): BufferGeometry {
  const geometry = new TorusGeometry(radius, 0.05, 5, 12, Math.PI)
  geometry.rotateY(Math.PI / 2)
  return geometry
}

/**
 * @param glazing The one gloss material — low roughness, some metalness, so
 *   it catches the sky at grazing angles (Fresnel does the rest for free).
 * @param frame Painted composite, matching the hull so the frame and collar
 *   read as part of the same built object rather than a second material
 *   dropped on top.
 */
export function buildCanopy(glazing: Material, frame: Material): CanopyParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  // 8x6 instead of 14x10: fewer, bigger facets read as distinct panes once
  // flatShading is on (set in Ornithopter.ts) — a low sphere segment count is
  // exactly how a faceted "geodesic" dome is built, not a low-poly compromise.
  const domeGeometry = new SphereGeometry(CANOPY_RADIUS, 8, 6)
  const dome = new Mesh(domeGeometry, glazing)
  dome.position.set(0, hullRadiusAt(CANOPY_Z) * 0.72, CANOPY_Z)
  dome.scale.set(...CANOPY_SCALE)
  geometries.push(domeGeometry)
  group.add(dome)

  // Four hoop ribs over the top of the glazing (was two) — an actual frame
  // the glass sits inside, rather than one unbroken bubble. TorusGeometry's
  // main ring lies in the XY plane by construction (see three.js source:
  // x/y vary with the main angle, z only varies by the tube radius), and an
  // arc of PI walks that ring from +X, up through +Y, to -X — already the
  // "arch over the top, spanning the width" shape this wants, with no
  // rotation needed.
  const ribGeometry = new TorusGeometry(CANOPY_RADIUS * 1.02, 0.05, 6, 16, Math.PI)
  for (const zOffset of [-0.95, -0.35, 0.3, 0.85]) {
    const rib = new Mesh(ribGeometry, frame)
    rib.position.set(0, dome.position.y, CANOPY_Z + zOffset * CANOPY_SCALE[2])
    rib.scale.set(CANOPY_SCALE[0], CANOPY_SCALE[1], 1)
    group.add(rib)
  }
  geometries.push(ribGeometry)

  // Two fore-aft stringers crossing the hoops, so the frame reads as a grid
  // (the "multi-pane" part) instead of parallel arches.
  const stringerGeometry = buildStringerGeometry(CANOPY_RADIUS * 1.02)
  for (const xOffset of [-0.42 * CANOPY_SCALE[0], 0.42 * CANOPY_SCALE[0]]) {
    const stringer = new Mesh(stringerGeometry, frame)
    stringer.position.set(xOffset, dome.position.y, CANOPY_Z)
    stringer.scale.set(1, CANOPY_SCALE[1], CANOPY_SCALE[2])
    group.add(stringer)
  }
  geometries.push(stringerGeometry)

  // Collar: a flattened ring at the glazing's waist, seating it on the hull
  // instead of leaving a bare intersection line.
  const collarGeometry = new TorusGeometry(CANOPY_RADIUS * 0.98, 0.16, 8, 20)
  const collar = new Mesh(collarGeometry, frame)
  collar.position.set(0, dome.position.y, CANOPY_Z)
  collar.scale.set(CANOPY_SCALE[0], CANOPY_SCALE[1] * 0.55, CANOPY_SCALE[2])
  group.add(collar)
  geometries.push(collarGeometry)

  return { group, geometries }
}
