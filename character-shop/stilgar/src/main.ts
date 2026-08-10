// character-shop/stilgar/src/main.ts
// Minimal dev harness: scene, camera, renderer, resize, render loop, plus
// the window.__STILGAR__ capture handle tools/shoot.mjs drives. The model is
// static (no update() — see contracts.ts); the loop just re-renders an
// unchanging scene at whatever viewpoint debug.ts last set. Any motion added
// to this harness later must stay camera-only (gauntlet-loop.md: characters
// are static).
//
// Lights and backdrops moved to lighting.ts in R2 — the bust and head
// framings need a portrait rig the five full-body views must NOT get, so the
// numbers belong somewhere tools/shoot.mjs can read them back for the
// manifest rather than buried in this file's setup.

import {
  Scene, PerspectiveCamera, WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping,
} from 'three'
import { createStilgar } from './model/Stilgar'
import { installCaptureHandle } from './debug'
import { installLighting, RIGS } from './lighting'

/** Kept exported: the default rig's backdrop under its old name, so anything
 *  that imported it from here still resolves to the same colour. */
export const BACKDROP_COLOR = RIGS.default.backdrop

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100)

const renderer = new WebGLRenderer({ antialias: true })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

const lighting = installLighting(scene)
const model = createStilgar()
scene.add(model.root as never)

const capture = installCaptureHandle({ camera, model, scene, lighting })
window.__STILGAR__ = capture
// Default boot view: a 3/4 front-left, the same framing tools/views.mjs uses
// for 'threequarter' — so opening the dev server by hand shows the figure,
// not an arbitrary camera pose.
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
