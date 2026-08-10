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
  // depthM includes 4 m of gallery-recess allowance beyond the ~48 m hall
  // shell: R1.1 proved that reveals thin enough to fit a 48 m box are
  // invisible at the rig's 35 m viewing distance — carved must be DEEP.
  // heightM raised 16 -> 22 after four critic passes: with 4.4 m gallery
  // doors, a 16 m apex yields a ~3.6x door-to-vault ratio that reads as a
  // modest chamber; ~5x is where "vast hall" starts. The rig's enclosure
  // margins only improve with height.
  widthM: 36,
  depthM: 52,
  heightM: 22,
  // Interior set: the floor IS the base surface at y = 0; a thin slab
  // below keeps the seam guard meaningful without a seating skirt.
  skirtDepthM: 1,
} as const

// Gallery openings on the back wall. Numbers chosen against the CAMERA_RIG
// viewing distance (~35 m to the back wall): anything shallower than ~2 m
// of reveal subtends too few pixels to read as a cut. Interiors stay
// UNLIT — depth reads as darkness falling off inside the socket.
// Placement is deliberately UNEVEN: hand-hewn galleries are not a metered
// colonnade. Same rule for the vault itself: springline heights and the
// crown line must differ left-to-right along the depth — a symmetric
// ellipsoid extrusion reads as architecture, not carved rock (both R1
// critics failed it on exactly this).
export const GALLERIES = {
  count: 3,
  widthM: 3.6,
  heightM: 4.4,
  recessM: 2.5,
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

// The authored lighting the game adapter must recreate — the fence only
// admits the public surface, so the harness's ratified numbers live here.
// One hearth PointLight (castShadow OFF: cube-shadow artifact, see
// main.ts) at DRESSING.hearthAtM with its y raised to heightM below,
// plus a near-black warm ambient. The renderer is expected to run
// ACESFilmicToneMapping at exposure 1.0 (the game's Renderer already
// does). Camera drift for parallax is CAMERA motion only, within the
// tested +-driftM envelope (enclosure is raycast-guarded to hold there).
export const LIGHTING = {
  hearth: {
    intensity: 340,
    rangeM: 60,
    decay: 1.4,
    heightM: 2,
  },
  ambient: { color: 0x201812, intensity: 0.18 },
  driftM: { x: 3, y: 1.2 },
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
