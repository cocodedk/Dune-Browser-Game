// vehicle-shop/ornihopter/src/stage/scene.ts
// Renderer, scene, sky and lighting for the test area.
//
// Imports from three are narrow by name, never `import * as THREE` — the game
// build splits three into budgeted chunks and a namespace import defeats tree
// shaking (see CODEX.md).

import {
  Scene, WebGLRenderer, Color, Fog, DirectionalLight, HemisphereLight,
  ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace,
} from 'three'

export interface Stage {
  scene: Scene
  renderer: WebGLRenderer
  sun: DirectionalLight
  resize(width: number, height: number): void
  dispose(): void
}

const SKY_COLOR = 0xd9b98a
const SUN_COLOR = 0xffe8c4
const GROUND_BOUNCE = 0xa07845
const FOG_NEAR = 400
const FOG_FAR = 3400

export function createStage(container: HTMLElement): Stage {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = new Color(SKY_COLOR)
  scene.fog = new Fog(SKY_COLOR, FOG_NEAR, FOG_FAR)

  // A low sun: relief on the dunes and a grazing angle across the wings is
  // what makes a flapping craft legible against sand. Overhead light flattens
  // both, which is why this is not simply straight down.
  const sun = new DirectionalLight(SUN_COLOR, 3.1)
  sun.position.set(-520, 340, 420)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 10
  sun.shadow.camera.far = 1800
  sun.shadow.camera.left = -220
  sun.shadow.camera.right = 220
  sun.shadow.camera.top = 220
  sun.shadow.camera.bottom = -220
  sun.shadow.bias = -0.0006
  scene.add(sun)
  scene.add(sun.target)

  // Sky above, warm sand bounce below. Cheap, and it keeps the craft's shadowed
  // flank from going to flat black the way a single directional light would.
  scene.add(new HemisphereLight(SKY_COLOR, GROUND_BOUNCE, 1.15))

  return {
    scene,
    renderer,
    sun,
    resize(width, height) {
      renderer.setSize(width, height, false)
    },
    dispose() {
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
