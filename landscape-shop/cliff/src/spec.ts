// landscape-shop/cliff/src/spec.ts
// The single source of truth for the cliff massif. Lead-authored; builders
// read, never edit. seam.test.ts guards FOOTPRINT on every run; critics
// judge only through CAMERA_RIGS. Numbers justified in provenance.ts.

export { PROVENANCE } from './provenance'

export const FOOTPRINT = {
  // True meters, one meter per three.js unit, Y-up, front (the entrance
  // wall face) toward -Z. The massif must dwarf the flight mode's dunes
  // (amplitude 70 world units) and its 90-unit cruise altitude: from the
  // air the crest reads as a wall, never as another dune.
  widthM: 600,
  depthM: 220,
  heightM: 190,
  // Skirt: authored rock below y = 0 so the adapter can seat the root at
  // heightfield.heightAt(destination) on any seed without a floating base
  // or a buried entrance. Flight terrain varies within roughly +-70 of
  // zero; 40 m of skirt plus the adapter's seating rule covers it.
  skirtDepthM: 40,
} as const

// The carved sietch entrance, centered on the front (-Z) face at y = 0.
// Scaled to the ornithopter that lands before it: tall enough to read as
// a gate for people and cargo, small enough against 190 m of rock that
// the massif keeps its scale.
export const ENTRANCE = {
  widthM: 16,
  heightM: 12,
  // Recess depth into the face — the shadow box that makes it read as an
  // opening rather than a decal, at both rig distances.
  recessM: 10,
} as const

// Critics and the shop harness frame the set ONLY through these rigs —
// the two views the game will actually show. FlightMode flies at altitude
// 90 toward the destination with a 50-degree FOV under FogExp2 0.0009;
// the harness approximates that fog when shooting evidence.
export const CAMERA_RIGS = {
  approach: {
    positionM: [0, 90, -900],
    lookAtM: [0, 80, 0],
    fovDeg: 50,
  },
  landing: {
    // Short final: entrance framing as the craft comes down. Aimed at the
    // FRONT face (z = -depthM), not the massif center — the first rig
    // authored here looked at [0,30,0], which put the aim point on the
    // back plane and framed nothing but wall from 40 m out.
    positionM: [40, 28, -300],
    lookAtM: [0, 10, -220],
    fovDeg: 50,
  },
} as const

// Villeneuve Arrakis rock: warm neutral basalt-sandstone, sun-baked faces
// against deep shadow cores, sand aprons blending toward the game's dunes.
export const PALETTE = {
  rock: 0x7a6852,
  rockShadow: 0x4d3f30,
  rockCrest: 0x9a8668,
  sandApron: 0xc9a06c,
} as const
