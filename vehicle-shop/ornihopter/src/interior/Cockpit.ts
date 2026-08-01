// vehicle-shop/ornihopter/src/interior/Cockpit.ts
// Assembles the cockpit interior: seats, a seated copilot figure, the
// console, twin control sticks (each now at its OWN seat's x — see
// layout.ts's STICK), the cabin shell and canopy liner that close the shell
// (cabinShell.ts's tapered walls + canopyLiner.ts's dash-to-sill fairing,
// both keyed to model/geometry/canopyGeometry.ts's canopySectionAt so they
// cannot land anywhere the canopy shell itself does not), cabin lighting,
// and the overhead panel — mounted to the canopy's own ridge beam, not
// hanging from a stalk into open air (overheadPanel.ts, layout.ts's
// OVERHEAD.mountTopY). Implements contracts.ts's CockpitModel; parented
// under the craft root by main.ts, not by this module.
//
// MEASURED, still true for the FIXED forward pilot camera (yaw 0, no
// head-look): PILOT_EYE.z sits only 0.15m forward of COCKPIT.seatZ (see
// layout.ts's header), so the entire z=seatZ plane — both seat pans and the
// copilot figure alike — has camera-space z > 0 at that exact pose and is
// behind it, full stop. That is exactly what keeps the pilot from seeing
// their own seatback, and interior/frustum.test.ts still asserts it holds.
// The console and both control sticks are placed to clear that fixed
// frustum regardless (bar Q3's "second station" mitigation); the overhead
// panel too.
//
// What has changed since this was a standing limitation: camera/cameraRig.ts
// now has lookAround (hold H, or right-drag) — the pilot's head turns up to
// 100 degrees either way, and turning right brings the copilot's own seat and
// figure into frame directly, lit by lighting.ts and framed by the
// shoulder-to-rear glazing bay, rather than relying on the console/stick
// mitigation alone. Checked by hand in the running app, not just reasoned
// about: see this round's report for what that frame actually looks like.

import { Group } from 'three'
import type { CockpitModel, FlightState } from '../contracts'
import { createSeats } from './seats'
import { createPilotFigure } from './pilotFigure'
import { createConsole } from './console'
import { createControlSticks } from './sticks'
import { createCabinShell } from './cabinShell'
import { createCanopyLiner } from './canopyLiner'
import { createOverheadPanel } from './overheadPanel'
import { createCabinLighting } from './lighting'

export function createCockpit(): CockpitModel {
  const root = new Group()
  root.name = 'cockpit'

  const seats = createSeats()
  const pilotFigure = createPilotFigure()
  const dash = createConsole()
  const sticks = createControlSticks()
  const cabinShell = createCabinShell()
  const canopyLiner = createCanopyLiner()
  const overheadPanel = createOverheadPanel()
  const cabinLighting = createCabinLighting()

  root.add(
    cabinShell.group,
    canopyLiner.group,
    seats.group,
    pilotFigure.group,
    dash.group,
    sticks.group,
    overheadPanel.group,
    cabinLighting.group
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
      canopyLiner.dispose()
      overheadPanel.dispose()
      cabinLighting.dispose()
    },
  }
}
