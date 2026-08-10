// scripts/new-shop-templates-src.mjs
// TypeScript templates for `npm run shop:new`. Split from
// ./new-shop-templates.mjs (docs) so both files stay under the 200-line cap.

export function renderContracts(name, Name) {
  return `// vehicle-shop/${name}/src/contracts.ts
// Interfaces the shop's model implements. Owned by the lead; keep this
// small until the shop's real architecture demands more — mirrors the
// harvester and ornithopter shops' contracts.ts.

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

/** The model itself. */
export interface ${Name}Model {
  readonly root: Object3DLike
  /** Advance by dt seconds. */
  update(dt: number): void
  dispose(): void
}
`
}

export function renderSpec(name) {
  return `// vehicle-shop/${name}/src/spec.ts
// The single source of truth for the machine's dimensions. Every builder
// reads this; nobody edits it without a measured or authored reason — see
// provenance.ts for where each number comes from.

export { PROVENANCE } from './provenance'

export const OVERALL = {
  // True meters, one meter per three.js unit. Measure, don't assume:
  // replace this placeholder as soon as there is a reference to measure.
  length: 1,
} as const
`
}

export function renderProvenance(name) {
  return `// vehicle-shop/${name}/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the harvester and ornithopter shops.

export const PROVENANCE = {
  overall: 'PLACEHOLDER — no reference measured yet. Replace this note ' +
    'with a MEASURED or AUTHORED provenance entry once spec.ts has a real ' +
    'source to point at.',
} as const
`
}

export function renderSeamTest(name, Name) {
  return `// vehicle-shop/${name}/src/seam.test.ts
// The seam between the model and the scene — lead-owned. Starts as a bare
// smoke test; grow it into a real seam guard (see the harvester shop's
// seam.test.ts) once this model has axes and motion to pin down.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { create${Name} } from './model/${Name}'

describe('seam: the scaffold model is real geometry', () => {
  it('the root has at least one child', () => {
    const machine = create${Name}()
    const root = machine.root as unknown as Object3D
    expect(root.children.length).toBeGreaterThan(0)
    machine.dispose()
  })

  it('dispose does not throw', () => {
    const machine = create${Name}()
    expect(() => machine.dispose()).not.toThrow()
  })
})
`
}

export function renderMain(name, Name) {
  return `// vehicle-shop/${name}/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, animation loop.
// Not a reference implementation — replace this with the shop's own
// stage/camera modules as the build grows; it exists only so the scaffold
// boots and shows something.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight } from 'three'
import { create${Name} } from './model/${Name}'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(4, 3, 6)
camera.lookAt(0, 0, 0)

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

let last = performance.now()
function frame(now: number): void {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  model.update(dt)
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
`
}

export function renderModel(name, Name) {
  return `// vehicle-shop/${name}/src/model/${Name}.ts
// Placeholder builder: one box mesh, so the scaffold builds and the seam
// test is green immediately. Replace with the real assembly.

import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import type { ${Name}Model } from '../contracts'

export function create${Name}(): ${Name}Model {
  const root = new Group()
  root.name = '${name}'

  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({ color: 0x808080 })
  root.add(new Mesh(geometry, material))

  return {
    root,
    update(dt: number): void {
      void dt // placeholder: nothing animates yet.
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      root.clear()
    },
  }
}
`
}
