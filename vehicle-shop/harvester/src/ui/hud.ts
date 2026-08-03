// vehicle-shop/harvester/src/ui/hud.ts
// Numeric readout — a measuring instrument as much as a HUD, so it prints
// the quantities the bar names: speed, heading, and the two track speeds
// whose difference IS the steering.

import { bearingDeg } from '../contracts'
import type { CrawlerState } from '../contracts'
import type { CameraMode } from '../camera/rig'

export interface Hud {
  update(state: Readonly<CrawlerState>, mode: CameraMode, fps: number): void
}

export function createHud(): Hud {
  const readout = document.getElementById('readout')
  const modeEl = document.getElementById('mode')
  const keys = document.getElementById('keys')

  if (keys) {
    keys.textContent = [
      'W / S    forward / reverse',
      'A / D    steer (A = left)',
      'C        cycle camera     R     reset',
    ].join('\n')
  }

  return {
    update(state, mode, fps) {
      if (modeEl) modeEl.textContent = `camera: ${mode}\n${fps.toFixed(0)} fps`
      if (!readout) return

      readout.textContent = [
        `speed      ${state.speed.toFixed(1)} m/s`,
        `heading    ${bearingDeg(state).toFixed(0)} deg`,
        `pitch/roll ${(state.pitch * 57.3).toFixed(1)} / ${(state.roll * 57.3).toFixed(1)} deg`,
        `tracks     L ${state.trackLeft.toFixed(1)}  R ${state.trackRight.toFixed(1)} m/s`,
        `pos        ${state.position.x.toFixed(0)}, ${state.position.y.toFixed(0)}, ${state.position.z.toFixed(0)}`,
      ].join('\n')
    },
  }
}
