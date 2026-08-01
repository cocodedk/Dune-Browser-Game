// vehicle-shop/ornihopter/src/main.ts
// Boot and frame loop for the standalone ornithopter test area.

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

let last = performance.now()
let elapsed = 0
let fps = 60

function frame(now: number): void {
  requestAnimationFrame(frame)

  // Clamped so a background tab that stalls for two seconds does not resume by
  // integrating one enormous step and flinging the craft out of the area.
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  elapsed += dt
  fps += ((dt > 0 ? 1 / dt : 60) - fps) * 0.08

  if (controls.takeCameraCycle()) rig.cycle()
  if (controls.takeReset()) flight.reset()

  flight.step(controls.read(), dt)
  const state = flight.state

  craft.root.position.set(state.position.x, state.position.y, state.position.z)
  craft.root.quaternion.set(
    state.orientation.x,
    state.orientation.y,
    state.orientation.z,
    state.orientation.w
  )
  craft.update(state)
  cockpit.update(state)
  rig.update(state, elapsed)

  // Keep the sun's shadow frustum over the craft; it is a 220m box around the
  // light target, and the test area is 4km across.
  stage.sun.target.position.set(state.position.x, state.position.y, state.position.z)
  stage.sun.position.set(state.position.x - 520, state.position.y + 340, state.position.z + 420)

  hud.update(state, rig.mode, fps)
  stage.renderer.render(stage.scene, rig.camera)
}

installDebugHandle({ flight, rig, craft, stage })
requestAnimationFrame(frame)
