// landscape-shop/cliff/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop.
// Not a reference implementation — replace this with the shop's own
// stage/camera modules (including the spec'd camera rig, once R0 authors
// it — landscape-shop/docs/gauntlet-loop.md) as the build grows; it
// exists only so the scaffold boots and shows something. The model is
// static (no update() — see contracts.ts); the loop just re-renders the
// unchanging scene.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight } from 'three'
import { createCliff } from './model/Cliff'

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

const model = createCliff()
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
