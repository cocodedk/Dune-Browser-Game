// vehicle-shop/ornihopter/src/model/geometry/hullGeometry.ts
// The hull as one lofted revolve, matching hullProfile.ts's half-width curve
// exactly at every station — so the wing-clearance tests and the rendered
// surface can never disagree. A circular Lathe scaled non-uniformly in Y to
// the craft's bodyHeight/bodyWidth ratio is the simplest way to get an
// elliptical cross-section without a second authored curve (see
// hullProfile.ts's header).

import { LatheGeometry, Vector2, type BufferGeometry } from 'three'
import { OVERALL } from '../../spec'
import { HULL_PROFILE_Z, hullHalfWidthAt } from './hullProfile'

const RADIAL_SEGMENTS = 14

/**
 * Revolves hullProfile.ts's half-width curve around Y (three.js Lathe
 * convention: points are (radius, height)), then rotateX(PI/2) maps that
 * height axis onto world Z — the same "nose along -Z" technique used
 * throughout this codebase's other craft (see
 * src/game-render/modes/flight/geometry/fuselageGeometry.ts) — so the
 * profile's own z values land exactly where hullProfile.ts authored them.
 * Scaling Y by bodyHeight/bodyWidth afterwards turns the circular revolve
 * into the elliptical cross-section hullProfile.ts's hullHalfHeightAt
 * assumes.
 */
export function buildHullGeometry(): BufferGeometry {
  const points = HULL_PROFILE_Z.map((z) => new Vector2(hullHalfWidthAt(z), z))
  const geometry = new LatheGeometry(points, RADIAL_SEGMENTS)
  geometry.rotateX(Math.PI / 2)
  geometry.scale(1, OVERALL.bodyHeight / OVERALL.bodyWidth, 1)
  return geometry
}
