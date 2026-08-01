// vehicle-shop/ornihopter/src/interior/Cockpit.ts
// Assembles the cockpit interior: seats, a seated copilot figure, the
// console, twin control sticks, the cabin shell, and the overhead panel.
// Implements contracts.ts's CockpitModel; parented under the craft root by
// main.ts, not by this module.
//
// KNOWN LIMITATION, measured rather than guessed (see layout.ts's header):
// PILOT_EYE.z sits only 0.15m forward of COCKPIT.seatZ, so the entire
// z=seatZ plane — both seat pans and the copilot figure alike, mirrored in x
// or not — has camera-space z > 0 in the pilot camera (PerspectiveCamera(68,
// 1.6, 0.25, 6000) at PILOT_EYE, matching camera/cameraRig.ts and the
// 1600x1000 capture tools/shoot.mjs uses) and is behind it, full stop. That
// offset is exactly what keeps the pilot from seeing their own seatback
// (correct, and clearly intentional) but it symmetrically hides the
// copilot's seat and figure from that one fixed forward view, regardless of
// how they are modelled. The console, both control sticks and the overhead
// panel are all placed and verified to clear the frustum instead (see
// interior/frustum.test.ts), so the pilot-POV frame still carries a visible
// second station — a matching instrument cluster and a second stick — even
// though the second seat's cushion and the copilot figure themselves do not
// appear in that exact frame. Both are still built at their correct spec
// position for chase/orbit views and for overall interior correctness. A
// future round could resolve this at the source by widening the pilot
// camera's FOV (cockpit interior photography routinely uses a wider lens
// than 68 degrees for exactly this reason) or by revisiting how far PILOT_EYE
// sits forward of seatZ.

import { Group } from 'three'
import type { CockpitModel, FlightState } from '../contracts'
import { createSeats } from './seats'
import { createPilotFigure } from './pilotFigure'
import { createConsole } from './console'
import { createControlSticks } from './sticks'
import { createCabinShell } from './cabinShell'
import { createOverheadPanel } from './overheadPanel'

export function createCockpit(): CockpitModel {
  const root = new Group()
  root.name = 'cockpit'

  const seats = createSeats()
  const pilotFigure = createPilotFigure()
  const dash = createConsole()
  const sticks = createControlSticks()
  const cabinShell = createCabinShell()
  const overheadPanel = createOverheadPanel()

  root.add(
    cabinShell.group,
    seats.group,
    pilotFigure.group,
    dash.group,
    sticks.group,
    overheadPanel.group
  )

  return {
    root,
    update(state: Readonly<FlightState>) {
      dash.setThrottle(state.throttle)
    },
    dispose() {
      seats.dispose()
      pilotFigure.dispose()
      dash.dispose()
      sticks.dispose()
      cabinShell.dispose()
      overheadPanel.dispose()
    },
  }
}
