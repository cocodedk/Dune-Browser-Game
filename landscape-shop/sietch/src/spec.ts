// landscape-shop/sietch/src/spec.ts
// The single source of truth for the sietch interior set. Lead-authored;
// builders read, never edit. seam.test.ts guards FOOTPRINT on every run;
// critics judge only through CAMERA_RIG. Numbers justified in
// provenance.ts.

export { PROVENANCE } from './provenance'

export const FOOTPRINT = {
  // True meters, one meter per three.js unit, Y-up. The hall opens toward
  // -Z (the mouth is the front face); the interior recedes toward z = 0.
  // A great communal cavern, not a corridor: wide enough that the walls
  // frame the view at the rig, tall enough to vault out of frame.
  widthM: 36,
  depthM: 48,
  heightM: 16,
  // Interior set: the floor IS the base surface at y = 0; a thin slab
  // below keeps the seam guard meaningful without a seating skirt.
  skirtDepthM: 1,
} as const

// The one framing the game will show: LocationMode mounts the set behind
// a perspective camera standing just inside the mouth, looking into the
// hall. The adapter adds the existing slow drift (+-26 x, +-14 y in
// ortho units today) as CAMERA motion; the set itself never moves.
export const CAMERA_RIG = {
  positionM: [0, 2.4, -40],
  lookAtM: [0, 6, -6],
  fovDeg: 50,
} as const

// What must be in frame at the rig (R1 massing composition, R3 dressing):
// hearth center-left at mid-depth, water basin with palmary right-rear,
// carved galleries on the back wall, worn floor paths converging on the
// hearth. The location name label is NOT part of the set — it moves to
// the release adapter's own layer.
export const DRESSING = {
  hearthAtM: [-6, 0, -20],
  basinAtM: [10, 0, -12],
  // Hearth glow is an authored light with a source, never ambient wash.
  hearthColor: 0xffb05c,
} as const

// Carved warm rock under firelight — continuous with the painted
// diorama's palette (locationDefs.ts sietch entry) so the released set
// reads as the same place, sharper.
export const PALETTE = {
  rock: 0x6b5138,
  rockShadow: 0x3a2a1a,
  rockGlowlit: 0x8a6a48,
  water: 0x1e3a38,
  palmFrond: 0x5a6b3a,
} as const
