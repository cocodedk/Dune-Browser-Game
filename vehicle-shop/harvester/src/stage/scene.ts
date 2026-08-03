// vehicle-shop/harvester/src/stage/scene.ts
// Renderer, scene, sky and lighting for the test area. Imports from three
// are narrow by name, never `import * as THREE` (CODEX.md's tree-shaking
// rule for the game build).
//
// I7 (immediate-improvements §8 + gauntlet-loop.md's art-director delta):
// sun height 560 -> 300 (longer shadows so I6's panel lines and weathering
// finally read in relief) and fog 400/3400 -> 200/1500 (a hazier desert
// read at the shot list's ~90m capture distances). A second, low-intensity
// warm FILL light now comes from STARBOARD (+X) so the flank and backlit
// forms (the cutter's front, the rams under the deck overhang, the drum
// core) read as dim form instead of flat black. RESTRAINT: the fill never
// casts a shadow, so every shadow in every render stays port-driven — the
// sun's alone. Every number below is exported so main.ts's per-frame
// follow logic and this round's test read the SAME values the scene uses.

import {
  Scene, WebGLRenderer, Color, Fog, DirectionalLight, HemisphereLight,
  ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace,
} from 'three'

export interface Stage {
  scene: Scene
  renderer: WebGLRenderer
  sun: DirectionalLight
  fill: DirectionalLight
  resize(width: number, height: number): void
  dispose(): void
}

const SKY_COLOR = 0xd9b98a
const SUN_COLOR = 0xffe8c4
const FILL_COLOR = 0xffcf9e
const GROUND_BOUNCE = 0xa07845

/** I7 art-director delta: 400/3400 -> 200/1500. */
export const FOG_NEAR = 200
export const FOG_FAR = 1500

export const SUN_INTENSITY = 3.1
/** Restraint: a fraction of the sun, so it lifts the shade without adding a
 *  second, competing shadow direction (fill.castShadow stays false below). */
export const FILL_INTENSITY = 0.55

/** Offset from the machine's own position, applied every frame by main.ts —
 *  the sun/fill follow the machine so the shadow frustum always covers it.
 *  I7: height (y) 560 -> 300; the lateral (x, port-negative) and forward
 *  (z) offsets keep their original character unchanged. */
export const SUN_OFFSET = { x: -190, y: 300, z: 330 }
/** STARBOARD (+X, the opposite flank from the sun) and forward of amidships
 *  (-Z, toward the nose) so the fill also catches the cutter's backlit
 *  front, not just the flank. */
export const FILL_OFFSET = { x: 260, y: 160, z: -260 }

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

  const sun = new DirectionalLight(SUN_COLOR, SUN_INTENSITY)
  sun.position.set(-520, 340, 420)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 10
  sun.shadow.camera.far = 1800
  sun.shadow.camera.left = -260
  sun.shadow.camera.right = 260
  sun.shadow.camera.top = 260
  sun.shadow.camera.bottom = -260
  sun.shadow.bias = -0.0006
  scene.add(sun)
  scene.add(sun.target)

  // FILL — restraint, not a second sun: no shadow map, no shadow camera.
  const fill = new DirectionalLight(FILL_COLOR, FILL_INTENSITY)
  fill.position.set(260, 160, -100)
  fill.castShadow = false
  scene.add(fill)
  scene.add(fill.target)

  scene.add(new HemisphereLight(SKY_COLOR, GROUND_BOUNCE, 1.15))

  return {
    scene,
    renderer,
    sun,
    fill,
    resize(width, height) {
      renderer.setSize(width, height, false)
    },
    dispose() {
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
