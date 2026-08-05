// character-shop/stilgar/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop, plus
// the window.__STILGAR__ capture handle tools/shoot.mjs drives. Not a
// reference implementation — replace this with the shop's own stage/camera
// modules as the build grows. The model is static (no update() — see
// contracts.ts); the loop just re-renders an unchanging scene at whatever
// viewpoint debug.ts last set. Any motion added to this harness later must
// stay camera-only (gauntlet-loop.md: characters are static).

import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, HemisphereLight, DirectionalLight,
  SRGBColorSpace, ACESFilmicToneMapping,
} from 'three'
import { createStilgar } from './model/Stilgar'
import { installCaptureHandle } from './debug'

// Neutral dark-warm backdrop (not pure black) — fabric/hair read against
// pure black lose their edges entirely; debug.ts's silhouette mode swaps
// this for white and restores it afterward.
export const BACKDROP_COLOR = 0x24211d

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
scene.background = new Color(BACKDROP_COLOR)
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100)

const renderer = new WebGLRenderer({ antialias: true })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

// Intensities matched to this three.js version's physically-based light
// scale, not the old 0-1 convention — verified against vehicle-shop/
// harvester/src/stage/scene.ts's SUN_INTENSITY (3.1); a sub-1.0 key light
// here rendered near-black.
scene.add(new HemisphereLight(0xcfc6ab, 0x3a3226, 1.1))
const sun = new DirectionalLight(0xfff3df, 3.0)
sun.position.set(3, 6, 4)
scene.add(sun)
const fill = new DirectionalLight(0xdce8ff, 1.0)
fill.position.set(-4, 2, -3)
scene.add(fill)

const model = createStilgar()
scene.add(model.root as never)

const capture = installCaptureHandle({ camera, model, scene })
window.__STILGAR__ = capture
// Default boot view: a 3/4 front-left, the same framing tools/views.mjs
// uses for 'threequarter' — so opening the dev server by hand shows the
// figure, not an arbitrary camera pose.
capture.viewpoint(-45, 12, 1.5, 0.52)

function resize(): void {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
window.addEventListener('resize', resize)
resize()

function frame(): void {
  requestAnimationFrame(frame)
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
