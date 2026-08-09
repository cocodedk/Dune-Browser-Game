// landscape-shop/cliff/src/contracts.ts
// Interfaces the shop's model implements. Owned by the lead; builders
// import from here and must not edit it. Mirrors the other shops'
// contracts.ts (docs/PRD/dune92/04-asset-pipeline.md); landscape assets
// are STATIC scenery — no per-frame drive, no update() — see
// landscape-shop/docs/gauntlet-loop.md.

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

/** The set itself: static scenery, no update method. The model never
 *  writes its own root transform — placement (seating into the procedural
 *  terrain) is the adapter's job. */
export interface LandscapeModel {
  readonly root: Object3DLike
  dispose(): void
}
