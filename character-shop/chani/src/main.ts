// character-shop/chani/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop.
// Not a reference implementation — replace this with the shop's own
// stage/camera modules as the build grows; it exists only so the scaffold
// boots and shows something. The model is static (no update() — see
// contracts.ts); the loop just re-renders the unchanging scene. Any motion
// added to this harness later must stay camera-only.

import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, Color } from 'three'
import { createChani } from './model/Chani'
import { installDebugHandle } from './debug'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
// Dark but not pure black: PALETTE.hair (spec.ts) is near-black, and reads
// as invisible against a default WebGL clear — a lighter dark neutral keeps
// the harness moody while every material stays legible.
scene.background = new Color(0x3a3530)
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
// -Z is the face-forward side (seam.test.ts, character-shop/docs/
// gauntlet-loop.md), so the default preview looks from -Z back at the
// figure to show the front, not the back.
camera.position.set(0, 1.0, -2.6)
camera.lookAt(0, 0.9, 0)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

scene.add(new AmbientLight(0xffffff, 0.65))
// Key light on the figure's front-left (vehicle-shop/harvester/tools/
// views.mjs' "negative azimuth is the lit side" convention, mirrored here),
// plus a low fill from the back-right so no view renders flat-black.
const sun = new DirectionalLight(0xffffff, 0.9)
sun.position.set(-4, 7, -4)
scene.add(sun)
const fill = new DirectionalLight(0xffffff, 0.25)
fill.position.set(4, 5, 4)
scene.add(fill)

const model = createChani()
scene.add(model.root as never)
installDebugHandle({ camera, scene, model })

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
