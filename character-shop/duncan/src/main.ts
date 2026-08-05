// character-shop/duncan/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop, and
// the debug handle tools/shoot.mjs drives (debug.ts). Not a reference
// implementation — replace this with the shop's own stage/camera modules
// as the build grows; it exists only so the scaffold boots and shows
// something. The model is static (no update() — see contracts.ts); the
// loop just re-renders the unchanging scene. Any motion added to this
// harness later must stay camera-only.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, Color } from 'three'
import { createDuncan } from './model/Duncan'
import { installDebugHandle } from './debug'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
// Dark but not pure black: PALETTE.fabric/accent (spec.ts) are near-black,
// and read as invisible against a default WebGL clear — a lighter dark
// neutral (the chani shop's landed fix, adopted here for the same reason)
// keeps the harness moody while every material stays legible.
scene.background = new Color(0x3a3530)
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1.4, 3)
camera.lookAt(0, 1, 0)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

scene.add(new AmbientLight(0xffffff, 0.65))
// Key light on the figure's front-left ("negative azimuth is the lit side",
// vehicle-shop/harvester/tools/views.mjs, mirrored by chani's own debug
// harness), plus a low fill from the back-right so no view renders flat black.
const sun = new DirectionalLight(0xffffff, 0.9)
sun.position.set(-4, 7, -4)
scene.add(sun)
const fill = new DirectionalLight(0xffffff, 0.25)
fill.position.set(4, 5, 4)
scene.add(fill)

const model = createDuncan()
scene.add(model.root as never)

installDebugHandle(scene, camera, model)

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
