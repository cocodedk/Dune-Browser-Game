// character-shop/stilgar/src/contracts.ts
// Interfaces the shop's model implements. Owned by the lead; builders
// import from here and must not edit it. Mirrors the vehicle shops'
// contracts.ts (docs/PRD/dune92/04-asset-pipeline.md); characters are
// STATIC — no per-frame drive, no update() — see
// character-shop/docs/gauntlet-loop.md.

/** Plain vector, deliberately not three.js. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Structural stand-in for THREE.Object3D — no three.js import here, so a
 *  pure core (if this shop grows one) stays unit-testable without a DOM. */
export interface Object3DLike {
  add(...objects: never[]): unknown
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): unknown }
  rotation: { x: number; y: number; z: number; order: string }
}

/** The figure itself: full body, armature-named group tree. Static — built
 *  once, no update method; any motion in an evidence render is CAMERA-only
 *  (character-shop/docs/gauntlet-loop.md). */
export interface CharacterModel {
  /** Root object. The caller places it (main.ts here, the game's
   *  conversation adapter in release); the model must never write to its
   *  own position/rotation. */
  readonly root: Object3DLike
  dispose(): void
}
