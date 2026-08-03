// vehicle-shop/ornihopter/src/ui/hud.ts
// Numeric readout. This is a measuring instrument as much as a HUD: several
// bar questions are answered by reading these numbers off a captured frame,
// so it prints the quantities the bar names rather than a pretty airspeed tape.

import { noseDirection, normalise, dot } from '../contracts'
import type { FlightState } from '../contracts'
import type { CameraMode } from '../camera/cameraRig'
import { GEAR_HEIGHT } from '../flight/constants'
import { foldAllowed } from '../flight/wingFold'

export interface Hud {
  update(state: Readonly<FlightState>, mode: CameraMode, fps: number): void
}

/** One line of stow state. Deliberately a WORD and not a bar: this readout is
 *  a measuring instrument, and "why did the throttle do nothing" needs an
 *  answer in the frame, not a gauge to interpret. */
function foldLine(state: Readonly<FlightState>, refusedFor: number): string {
  const progress = state.foldProgress ?? 0
  if (refusedFor > 0) return 'wings      REFUSED - land and let the beat stop'
  if (progress <= 0) return foldAllowed(state) ? 'wings      spread   (F to fold)' : 'wings      spread'
  if (progress >= 1) return 'wings      STOWED   (F to unfold - throttle refused)'
  return `wings      ${(state.foldTarget ?? 0) > 0 ? 'folding' : 'spreading'} ${(progress * 100).toFixed(0)}%`
}

/** How long a refusal stays on screen. FlightState.foldRefused is true for the
 *  ONE step that dropped the demand — right, for a pure model, and invisible
 *  at 60fps — so the readout, which is allowed to have a clock, holds it. */
const REFUSAL_SECONDS = 2.5

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
      'F        fold / unfold wings  (landed, beat 0)',
      'M        mute / unmute sound   (any key starts audio)',
    ].join('\n')
  }

  let refusedFor = 0
  let lastFrame = performance.now()

  return {
    update(state, mode, fps) {
      const now = performance.now()
      refusedFor = state.foldRefused === true
        ? REFUSAL_SECONDS
        : Math.max(0, refusedFor - (now - lastFrame) / 1000)
      lastFrame = now
      if (modeEl) modeEl.textContent = `camera: ${mode}\n${fps.toFixed(0)} fps`
      if (!readout) return

      // The nose-leads check from the bar, shown live. In steady flight this
      // must sit at +1.00. A value near -1.00 means the craft is flying
      // tail-first, which is exactly the defect that survived four rounds and
      // three blind critics on the previous ornithopter.
      const speed = state.speed
      const nose = noseDirection(state.orientation)
      const along = speed > 0.5 ? dot(nose, normalise(state.velocity)) : Number.NaN

      // GEAR-relative, not origin-relative: 0 on the ground, matching the
      // cockpit HUD's ALT box (hud/reading.ts). The raw ORIGIN height is
      // what a resting craft's state.altitude actually holds (GEAR_HEIGHT,
      // 4.3m) — shown unsubtracted here it reads as still airborne, which is
      // the user's "frozen at 4.3m" finding.
      readout.textContent = [
        `speed      ${speed.toFixed(1)} m/s`,
        `altitude   ${(state.altitude - GEAR_HEIGHT).toFixed(1)} m`,
        `throttle   ${(state.throttle * 100).toFixed(0)}%`,
        `beat       ${state.beatHz.toFixed(2)} Hz`,
        `pos        ${state.position.x.toFixed(0)}, ${state.position.y.toFixed(0)}, ${state.position.z.toFixed(0)}`,
        `nose-leads ${Number.isNaN(along) ? '  --' : along.toFixed(3)}`,
        foldLine(state, refusedFor),
      ].join('\n')
    },
  }
}
