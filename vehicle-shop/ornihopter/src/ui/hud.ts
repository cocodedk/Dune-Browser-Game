// vehicle-shop/ornihopter/src/ui/hud.ts
// Numeric readout. This is a measuring instrument as much as a HUD: several
// bar questions are answered by reading these numbers off a captured frame,
// so it prints the quantities the bar names rather than a pretty airspeed tape.

import { noseDirection, normalise, dot } from '../contracts'
import type { FlightState } from '../contracts'
import type { CameraMode } from '../camera/cameraRig'

export interface Hud {
  update(state: Readonly<FlightState>, mode: CameraMode, fps: number): void
}

export function createHud(): Hud {
  const readout = document.getElementById('readout')
  const modeEl = document.getElementById('mode')
  const keys = document.getElementById('keys')

  if (keys) {
    keys.textContent = [
      'W / S    pitch (W = nose down)',
      'A / D    roll',
      'Q / E    yaw',
      'Shift    throttle up      Ctrl  throttle down',
      'H + mouse / right-drag   look around',
      'C        cycle camera     R     reset',
      'Space    hold to auto-level (roll/pitch)',
    ].join('\n')
  }

  return {
    update(state, mode, fps) {
      if (modeEl) modeEl.textContent = `camera: ${mode}\n${fps.toFixed(0)} fps`
      if (!readout) return

      // The nose-leads check from the bar, shown live. In steady flight this
      // must sit at +1.00. A value near -1.00 means the craft is flying
      // tail-first, which is exactly the defect that survived four rounds and
      // three blind critics on the previous ornithopter.
      const speed = state.speed
      const nose = noseDirection(state.orientation)
      const along = speed > 0.5 ? dot(nose, normalise(state.velocity)) : Number.NaN

      readout.textContent = [
        `speed      ${speed.toFixed(1)} m/s`,
        `altitude   ${state.altitude.toFixed(1)} m`,
        `throttle   ${(state.throttle * 100).toFixed(0)}%`,
        `beat       ${state.beatHz.toFixed(2)} Hz`,
        `pos        ${state.position.x.toFixed(0)}, ${state.position.y.toFixed(0)}, ${state.position.z.toFixed(0)}`,
        `nose-leads ${Number.isNaN(along) ? '  --' : along.toFixed(3)}`,
      ].join('\n')
    },
  }
}
