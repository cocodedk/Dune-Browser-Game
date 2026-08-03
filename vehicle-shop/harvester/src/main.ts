// vehicle-shop/harvester/src/main.ts
// Boot and frame loop for the standalone harvester test area.

import type { Object3D } from 'three'
import { createStage, SUN_OFFSET, FILL_OFFSET } from './stage/scene'
import { createTerrain } from './stage/terrain'
import { createCrawler } from './crawler/crawler'
import { createHarvester } from './model/Harvester'
import { createCameraRig } from './camera/rig'
import { createHud } from './ui/hud'
import { createControls } from './input/keyboard'
import { installDebugHandle } from './debug'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const stage = createStage(container)
const terrain = createTerrain()
stage.scene.add(terrain.root)

const crawler = createCrawler()
const machine = createHarvester()
stage.scene.add(machine.root as never)

// Opt the machine into the shadow map. stage/scene.ts enables shadowMap but
// three.js still requires every mesh to opt in — the ornithopter round that
// paid for this, without it nothing casts and the map is computed and thrown
// away. Done here so it belongs to whoever owns the scene, not the parts.
;(machine.root as unknown as Object3D).traverse((child: Object3D) => {
  const mesh = child as Object3D & { isMesh?: boolean }
  if (!mesh.isMesh) return
  mesh.castShadow = true
  mesh.receiveShadow = true
})

const rig = createCameraRig(machine.root as never)
const hud = createHud()
const controls = createControls()

const resize = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  stage.resize(width, height)
  rig.resize(width, height)
}
window.addEventListener('resize', resize)
resize()

const debug = installDebugHandle({ crawler, rig, machine })

let last = performance.now()
let elapsed = 0
let fps = 60

function frame(now: number): void {
  requestAnimationFrame(frame)

  // Clamped so a background tab that stalls for two seconds does not resume
  // by integrating one enormous step and flinging the machine.
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  fps += ((dt > 0 ? 1 / dt : 60) - fps) * 0.08

  if (controls.takeCameraCycle()) rig.cycle()
  if (controls.takeReset()) crawler.reset()

  const frozen = debug.isPaused()
  if (!frozen) {
    elapsed += dt
    crawler.step(controls.read(), dt)
  }
  const state = crawler.state

  if (!frozen) {
    machine.root.position.set(state.position.x, state.position.y, state.position.z)
    machine.root.rotation.order = 'YXZ'
    machine.root.rotation.y = state.yaw
    machine.root.rotation.x = state.pitch
    machine.root.rotation.z = state.roll
    machine.update(state, dt)
  }
  rig.update(state, elapsed)

  // Keep the sun's shadow frustum over the machine; it is a 520m box around
  // the light target and the test area is 4km across. The fill light has no
  // shadow to keep in frame, but it follows the machine for the same reason
  // the sun does: a fixed-in-world light would drift out of a useful angle
  // as soon as the machine drives away from the origin.
  stage.sun.target.position.set(state.position.x, state.position.y, state.position.z)
  stage.sun.position.set(
    state.position.x + SUN_OFFSET.x, state.position.y + SUN_OFFSET.y, state.position.z + SUN_OFFSET.z,
  )
  stage.fill.target.position.set(state.position.x, state.position.y, state.position.z)
  stage.fill.position.set(
    state.position.x + FILL_OFFSET.x, state.position.y + FILL_OFFSET.y, state.position.z + FILL_OFFSET.z,
  )

  hud.update(state, rig.mode, fps)
  stage.renderer.render(stage.scene, rig.camera)
}

requestAnimationFrame(frame)
