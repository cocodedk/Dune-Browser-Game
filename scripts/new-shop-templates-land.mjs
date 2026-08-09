// scripts/new-shop-templates-land.mjs
// LANDSCAPE code templates for `npm run land:new` (landscape-shop/):
// contracts.ts, spec.ts, provenance.ts, main.ts. The massing model seed and
// its guarded seam.test.ts live in ./new-shop-templates-land-model.mjs —
// split so both files stay under the 200-line cap. Mirrors the character
// shops' ./new-shop-templates-cast.mjs in spirit; the shapes differ because
// landscape assets are STATIC SCENERY (landscape-shop/docs/gauntlet-loop.md)
// — no update() at all, and the shape authority is a footprint, not a
// height/proportion spec.

export function renderLandContracts(name) {
  return `// landscape-shop/${name}/src/contracts.ts
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
`
}

export function renderLandSpec(name) {
  return `// landscape-shop/${name}/src/spec.ts
// The single source of truth for ${name}'s footprint. Every builder reads
// this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from. FOOTPRINT is the shape
// authority landscape-shop/docs/gauntlet-loop.md requires; seam.test.ts
// guards the set against it on every run.

export { PROVENANCE } from './provenance'

export const FOOTPRINT = {
  // True meters, one meter per three.js unit, Y-up, front (entrance, open
  // face) toward -Z. Replace these placeholders as soon as there is a
  // reference to measure.
  widthM: 4,
  depthM: 4,
  heightM: 2,
  // Skirt: authored geometry below y = 0 for seating into procedural
  // terrain. The walkable/base surface sits at y = 0; the skirt is what
  // keeps the base from ever floating above it.
  skirtDepthM: 0.5,
} as const

// Placeholder rock/scenery palette — replace once provenance names a real
// source (film stills, kit references).
export const PALETTE = {
  rock: 0x8a7358,
} as const
`
}

export function renderLandProvenance(name) {
  return `// landscape-shop/${name}/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the other shops' provenance.ts.

export const PROVENANCE = {
  footprint: 'PLACEHOLDER — no film reference measured yet. Replace this ' +
    'note with a MEASURED (2021/24 Villeneuve film still) or AUTHORED ' +
    'provenance entry — see landscape-shop/docs/gauntlet-loop.md\\'s ' +
    'Authority section — once spec.ts has a real source to point at.',
  palette: 'PLACEHOLDER — no rock/scenery reference measured yet.',
} as const
`
}

export function renderLandMain(name, Name) {
  return `// landscape-shop/${name}/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop.
// Not a reference implementation — replace this with the shop's own
// stage/camera modules (including the spec'd camera rig, once R0 authors
// it — landscape-shop/docs/gauntlet-loop.md) as the build grows; it
// exists only so the scaffold boots and shows something. The model is
// static (no update() — see contracts.ts); the loop just re-renders the
// unchanging scene.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight } from 'three'
import { create${Name} } from './model/${Name}'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 2, 6)
camera.lookAt(0, 1, -2)

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
