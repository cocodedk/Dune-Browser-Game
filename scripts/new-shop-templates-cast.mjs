// scripts/new-shop-templates-cast.mjs
// HUMANOID code templates for `npm run cast:new` (character-shop/):
// contracts.ts, spec.ts, provenance.ts, main.ts. The armature-tree model
// seed and its guarded seam.test.ts live in
// ./new-shop-templates-cast-model.mjs — split so both files stay under the
// 200-line cap. Mirrors the vehicle shops' ./new-shop-templates-src.mjs in
// spirit; the shapes differ because characters are STATIC (user directive,
// 2026-08-05: "I am not interested in animated characters. just they look
// correct.") — no per-frame drive at all, unlike a vehicle input.

export function renderCastContracts(name) {
  return `// character-shop/${name}/src/contracts.ts
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
`
}

export function renderCastSpec(name) {
  return `// character-shop/${name}/src/spec.ts
// The single source of truth for ${name}'s proportions. Every builder reads
// this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from. PROPORTIONS is the shape
// authority character-shop/docs/gauntlet-loop.md requires; seam.test.ts
// guards the figure against it on every run.

export { PROVENANCE } from './provenance'

export const PROPORTIONS = {
  // True meters, one meter per three.js unit, standing height. Replace this
  // placeholder as soon as there is an actor-height reference to measure.
  heightM: 1.8,
  // Head height as a fraction of heightM, kept as a band (real humans run
  // roughly 1/8 to 1/7) so a round can pick a value inside it.
  headHeightFraction: { min: 1 / 8, max: 1 / 7 },
  // Eye line height as a fraction of heightM, measured from the ground.
  eyeLineFraction: 0.93,
  shoulderHalfWidth: 0.22,
  hipHalfWidth: 0.17,
} as const

// Ibad — blue-within-blue Fremen/spice eyes. Per-character line item; flip
// at this character's R0 per character-shop/docs/gauntlet-loop.md's ruling.
export const IBAD = false

// Placeholder costume/skin palette — replace once provenance names a real
// source (film stills, costume references).
export const PALETTE = {
  skin: 0x8a6f56,
  fabric: 0x2b2823,
} as const
`
}

export function renderCastProvenance(name) {
  return `// character-shop/${name}/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the vehicle shops' provenance.ts.

export const PROVENANCE = {
  proportions: 'PLACEHOLDER — no film reference or actor-height source ' +
    'measured yet. Replace this note with a MEASURED (2021/24 Villeneuve ' +
    'film still, actor height) or AUTHORED provenance entry — see ' +
    'character-shop/docs/gauntlet-loop.md\\'s Authority section — once ' +
    'spec.ts has a real source to point at.',
  palette: 'PLACEHOLDER — no costume/skin reference measured yet.',
} as const
`
}

export function renderCastMain(name, Name) {
  return `// character-shop/${name}/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop.
// Not a reference implementation — replace this with the shop's own
// stage/camera modules as the build grows; it exists only so the scaffold
// boots and shows something. The model is static (no update() — see
// contracts.ts); the loop just re-renders the unchanging scene. Any motion
// added to this harness later must stay camera-only.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight } from 'three'
import { create${Name} } from './model/${Name}'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1.4, 3)
camera.lookAt(0, 1, 0)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

scene.add(new AmbientLight(0xffffff, 0.6))
const sun = new DirectionalLight(0xffffff, 0.8)
sun.position.set(5, 8, 5)
scene.add(sun)

const model = create${Name}()
scene.add(model.root as never)

function resize(): void {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
window.addEventListener('resize', resize)

function frame(): void {
  requestAnimationFrame(frame)
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
`
}
