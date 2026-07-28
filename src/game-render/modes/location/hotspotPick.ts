// src/game-render/modes/location/hotspotPick.ts
// PURE hit test for the clickable spots in a location.
//
// Two things here are easy to get wrong and are therefore pinned by tests.
//
// First, the y-flip. Hotspot coordinates are normalised from the *bottom* of
// the frame, because that is how the diorama is authored; pointer events are
// normalised from the *top*. Getting that backwards puts every target in the
// mirror image of where it is painted, which looks like "clicking does
// nothing" rather than like an inverted axis.
//
// Second, this deliberately does not go through the renderer's raycaster.
// ThreeContainer raycasts the shared *perspective* camera onto the y=0 ground
// plane; a location renders through its own orthographic camera looking down
// -z, so that ray is parallel to the plane and its hit coordinates are
// meaningless here. A pickAt() implementation on this mode would compile,
// look correct, and never once fire.

import type { Hotspot } from './locationDefs'

/** Half-width of a spot's target, in normalised frame units. */
export const DEFAULT_RADIUS = 0.085

/**
 * The hotspot under a pointer, or null.
 *
 * @param nx Pointer x, 0..1 from the left of the canvas.
 * @param ny Pointer y, 0..1 from the *top* of the canvas — as pointer events
 *   report it, not as hotspots store it.
 *
 * Nearest wins when targets overlap, so a crowded row of people still picks
 * the one actually pointed at.
 */
export function pickHotspot(
  spots: readonly Hotspot[],
  nx: number,
  ny: number,
  radius: number = DEFAULT_RADIUS,
): Hotspot | null {
  const fromBottom = 1 - ny

  let best: Hotspot | null = null
  let bestDistance = Infinity

  for (const spot of spots) {
    const d = Math.hypot(spot.x - nx, spot.y - fromBottom)
    if (d > radius || d >= bestDistance) continue
    best = spot
    bestDistance = d
  }
  return best
}
