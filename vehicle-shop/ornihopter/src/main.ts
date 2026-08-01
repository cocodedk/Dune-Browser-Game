// vehicle-shop/ornihopter/src/main.ts
// Boot and frame loop for the standalone ornithopter test area.

import type { Object3D } from 'three'
import { createStage } from './stage/scene'
import { createTerrain } from './stage/terrain'
import { createFlightModel } from './flight/flightModel'
import { createOrnithopter } from './model/Ornithopter'
import { createCockpit } from './interior/Cockpit'
import { createCameraRig } from './camera/cameraRig'
import { createHud } from './ui/hud'
import { createControls } from './input/keyboard'
import { installDebugHandle } from './debug'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const stage = createStage(container)
const terrain = createTerrain()
stage.scene.add(terrain.root)

const flight = createFlightModel()
const craft = createOrnithopter()
const cockpit = createCockpit()
craft.root.add(cockpit.root as never)
stage.scene.add(craft.root as never)

// Opt the craft into the shadow map. stage/scene.ts enables shadowMap and sets
// sun.castShadow, but three.js still requires every mesh to opt in — and none
// did, so a 2048px shadow map was being computed and thrown away every frame.
// A blind critic reported "no cast shadow from the craft in any frame, flat
// shadowless lighting scene-wide" and was exactly right. Done here rather than
// in the geometry modules because it applies to the whole craft and belongs to
// whoever owns the scene, not to whoever authored a given part.
;(craft.root as unknown as Object3D).traverse((child: Object3D) => {
  const mesh = child as Object3D & {
    isMesh?: boolean
    material?: { transparent?: boolean; opacity?: number } | Array<{ transparent?: boolean; opacity?: number }>
  }
  if (!mesh.isMesh) return

  // Transparent surfaces must NOT cast. three.js's shadow map ignores opacity,
  // so canopy glazing was casting a fully opaque shadow and sealing the cabin
  // in darkness — direct sun could not reach the cockpit at all, whatever the
  // material said. The cockpit builder hit this from the inside and had to add
  // fill lights to work around it. Opting everything in with one blunt
  // traverse was my shortcut, and this is what it cost.
  const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
  const seeThrough = materials.some((m) => m.transparent === true && (m.opacity ?? 1) < 0.95)

  mesh.castShadow = !seeThrough
  mesh.receiveShadow = true
})

const rig = createCameraRig(craft.root as never)
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

const debug = installDebugHandle({ flight, rig, craft })

let last = performance.now()
let elapsed = 0
let fps = 60

function frame(now: number): void {
  requestAnimationFrame(frame)

  // Clamped so a background tab that stalls for two seconds does not resume by
  // integrating one enormous step and flinging the craft out of the area.
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  fps += ((dt > 0 ? 1 / dt : 60) - fps) * 0.08

  if (controls.takeCameraCycle()) rig.cycle()
  if (controls.takeReset()) flight.reset()
  const aim = controls.head()
  rig.lookAround(aim.yaw, aim.pitch)

  // When the capture harness has paused us, the scene still renders — but the
  // sim, the clock and the craft transform are left exactly where pose() put
  // them, so two captures of the same pose are identical frames.
  const frozen = debug.isPaused()
  if (!frozen) {
    elapsed += dt
    flight.step(controls.read(), dt)
  }
  const state = flight.state

  if (!frozen) {
    craft.root.position.set(state.position.x, state.position.y, state.position.z)
    craft.root.quaternion.set(
      state.orientation.x,
      state.orientation.y,
      state.orientation.z,
      state.orientation.w
    )
    craft.update(state)
  }
  cockpit.update(state)
  rig.update(state, elapsed)

  // Keep the sun's shadow frustum over the craft; it is a 220m box around the
  // light target, and the test area is 4km across.
  stage.sun.target.position.set(state.position.x, state.position.y, state.position.z)
  stage.sun.position.set(state.position.x - 520, state.position.y + 340, state.position.z + 420)

  hud.update(state, rig.mode, fps)
  stage.renderer.render(stage.scene, rig.camera)
}

requestAnimationFrame(frame)
