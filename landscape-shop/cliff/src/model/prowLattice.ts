// landscape-shop/cliff/src/model/prowLattice.ts
// Breaks the gate prow's lattice out of its rectangle. Positions only — the
// surface (model/prowRelief.ts) and the paint (model/paintRock.ts) are
// untouched; this file moves WHERE the prow is sampled, not what it is.
//
// WHY. The R3 panel read "an alternating light/dark diamond grid ... a
// UV-tiling bug" on the wall at both rigs. Measured, not guessed:
//
//   * The clay pass (uniform grey albedo, no paint at all) shows the SAME
//     plaid, so the paint is not making it.
//   * Per-quad numbers over the cited flank: adjacent-quad ALBEDO differs by
//     6% across columns and 14% down rows, and its sequence is monotone.
//     Adjacent-quad SHADING differs by 31% and 22%, with single-column
//     spikes. The pattern is five times more facet-tilt than colour.
//   * Both cited zones are the same object. The prow projects to x 627..973
//     at the approach rig — the "rock base rubble" the panel measured at
//     x 650..950 — and fills the near wall at the landing rig.
//
// So the defect is a REGULAR GRID sampling a relief field that swings hard
// from cell to cell: 73 x 34 identical 3.28 x 3.15 m facets, every edge in
// the panel lying on one of two straight rulings. Wind flutes on a 24 m
// wavelength are seven columns to a scoop and the bed sawtooth resets every
// three rows, so neighbouring facets genuinely do tilt in opposite
// directions — which is rock. Ruled into a perfect grid, it is a texture bug.
//
// The cure is to stop the lattice being a grid. Each node is pushed off its
// ruling by up to a third of a cell, deterministically, so no two facets are
// the same size or shape and no edge continues into its neighbour's. The
// surface, its relief and its bands are sampled at the moved point and are
// otherwise exactly what they were.

/** How far a node may leave its ruling, as a fraction of the cell pitch.
 *
 *  0.34, bounded at both ends by things that break. Under about 0.2 the
 *  rulings are still legible as lines across the panel — the eye completes
 *  a nearly-straight edge and the grid comes back. Past 0.5 two nodes can
 *  swap order along a row and the quad inverts into a bow-tie; 0.34 keeps
 *  the worst pair 32% of a cell apart, so every quad stays convex. */
const JITTER = 0.34

/** Deterministic integer hash, 0..1. No Math.random anywhere in the set: the
 *  built geometry has to be identical run to run or the bake seam guards and
 *  the shot-to-shot comparison both stop meaning anything. */
function hashUnit(c: number, r: number, salt: number): number {
  let h = Math.imul(c + 0x9e37, 0x27d4eb2d) ^ Math.imul(r + 0x85eb, 0x165667b1) ^ Math.imul(salt, 0x2545f491)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

export interface Pitch {
  x: number
  y: number
}

/** Where lattice node (c, r) actually sits. `hold` is 1 where the node is
 *  free to move and 0 where it is pinned — gateWall.ts pins the mouth's
 *  surround (model/gateLip.ts lies on this surface and must still meet it),
 *  the outer rim where the prow sinks into the baked rock, and the foot
 *  where the skirt seats. */
export function latticeNode(c: number, r: number, x: number, y: number, pitch: Pitch, hold: number): {
  x: number
  y: number
} {
  if (hold <= 0) return { x, y }
  const amount = JITTER * Math.min(1, hold)
  return {
    x: x + (hashUnit(c, r, 1) * 2 - 1) * amount * pitch.x,
    y: y + (hashUnit(c, r, 2) * 2 - 1) * amount * pitch.y,
  }
}
