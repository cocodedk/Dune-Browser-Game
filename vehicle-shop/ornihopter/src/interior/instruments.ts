// vehicle-shop/ornihopter/src/interior/instruments.ts
// What is ON the dash, and in what proportion. Round 9b: an AH-64E-style glass
// cockpit — two large MFDs in keyed bezels, an up-front display and keypad
// between them, the round-6b analog gauges consolidated into a small STANDBY
// cluster, annunciators kept — all carried on a DARK plate laid over the olive
// structure. The parts themselves are mfdUnit.ts, upFrontDisplay.ts and
// panelParts.ts; this file decides only where each one goes and how much of the
// panel it is allowed to own.
//
// WHY THE SHARE CHANGED. Round 6b's dash was thirteen round dials, a globe, two
// tapes and two annunciator blocks, which answered the round-6 critique ("4
// identical pastel slabs... no dials, no gauges, no needles") and read as a
// 1960s flight engineer's board. docs/apache-gauntlet.md's bar is a MODERN
// attack helicopter: there the dials are backup instruments tucked outboard and
// the two colour displays ARE the panel. The gauges were the strongest element
// of the old dash, so none was deleted for being bad — four became the standby
// cluster and the rest moved to the copilot's side.
//
// EVERY POSITION IS (x, u), never an absolute y: panelMount.ts converts a
// station along the panel's own slope into craft coordinates and lays the part
// flush on it. apachePanel.test.ts is the measured guard over all of it.

import { Group, type Texture } from 'three'
import { CONSOLE, seatX } from './layout'
import { box, disposeGroup } from './sceneUtils'
import { onPanel } from './panelMount'
import { panelCarrierMaterial } from './materials'
import { movingMapTexture, systemsPageTexture, ufdStripTexture } from './mfdFaces'
import { buildMfdUnit } from './mfdUnit'
import { buildUpFrontDisplay } from './upFrontDisplay'
import { gauge, navGlobe, annunciators, tape, guardedToggles } from './panelParts'

/** The instrument bay's own centre station on the panel, shared by both MFD
 *  bezels and the UFD column so the three line up by construction. */
const BAY_U = 0.5
/** Half the pitch between the two MFD bezels: half a bezel plus half the UFD
 *  column between them (mfdUnit.ts's BEZEL_W 0.52, upFrontDisplay.ts's
 *  COLUMN_W 0.30), so the three sit edge to edge with no authored gap. */
const MFD_PITCH = 0.41

/**
 * The dark carrier. 3.2m wide because that is inside the panel's NARROWEST
 * station (consoleShell.ts sweeps 3.28m across at the top edge and 4.00m at the
 * break), so one plate lands on structure at every station instead of poking
 * through the side liner at the top. 0.48m deep covers the rake from the break
 * to just under the glareshield's own shadow line.
 */
function carrier(group: Group): void {
  const plate = box(3.2, 0.02, 0.48, panelCarrierMaterial(), { x: 0, y: 0, z: 0 })
  plate.name = 'panel-carrier'
  group.add(onPanel(plate, 0, BAY_U, 0.008))
}

/**
 * The standby cluster: four of round 6b's dials in a 2 x 2 block outboard of
 * the pilot's left display, on their own dark sub-plate. Backup instruments
 * sitting together and small is exactly what makes the glass read as primary.
 */
function standbyCluster(textures: Texture[], x: number): Group {
  const group = new Group()
  group.name = 'standby-cluster'
  group.add(onPanel(box(0.42, 0.018, 0.42, panelCarrierMaterial(), { x: 0, y: 0, z: 0 }), x, BAY_U, 0.014))
  gauge(group, textures, x - 0.085, BAY_U + 0.17, 0.15, { needleDeg: -55, dangerFromDeg: 95 })
  gauge(group, textures, x + 0.085, BAY_U + 0.17, 0.15, { needleDeg: 30 })
  gauge(group, textures, x - 0.085, BAY_U - 0.17, 0.15, { needleDeg: -20, dangerFromDeg: 105 })
  gauge(group, textures, x + 0.085, BAY_U - 0.17, 0.15, { needleDeg: 75 })
  return group
}

/** The copilot's side of the dash: what did not become standby instruments.
 *  Named as its own group because interior/frustum.test.ts checks it
 *  independently of the rest of the panel. */
function copilotCluster(textures: Texture[]): Group {
  const group = new Group()
  group.name = 'console-copilot-cluster'
  navGlobe(group, textures, 1.05, 0.7)
  annunciators(group, 1.35, 0.72)
  gauge(group, textures, 1.05, 0.25, 0.16, { needleDeg: 40, dangerFromDeg: 100 })
  gauge(group, textures, 1.32, 0.25, 0.16, { needleDeg: -70 })
  return group
}

export interface Instruments {
  group: Group
  dispose(): void
}

export function buildInstruments(): Instruments {
  const group = new Group()
  group.name = 'instruments'
  const textures: Texture[] = []

  carrier(group)

  // THE INSTRUMENT BAY, laid out from the pilot's OWN x rather than from
  // absolute numbers, so it stays in front of the eye if the seat moves again
  // (it moved twice in round 6b while the window was being measured).
  const p = seatX(-1)
  const map = movingMapTexture()
  const systems = systemsPageTexture()
  const strip = ufdStripTexture()
  textures.push(map, systems, strip)
  group.add(
    buildMfdUnit(p - MFD_PITCH, BAY_U, map),
    buildUpFrontDisplay(p, BAY_U, strip),
    buildMfdUnit(p + MFD_PITCH, BAY_U, systems),
    standbyCluster(textures, p - 0.9)
  )

  // Outboard of the pilot's right display: the annunciator block, with the two
  // tape instruments stacked in the same column under it.
  annunciators(group, 0.55, 0.72)
  tape(group, textures, 0.47, 0.28, 0.62)
  tape(group, textures, 0.63, 0.28, 0.38)

  guardedToggles(group, [p - 0.5, p - 0.32, p - 0.14], CONSOLE.nearZ - 0.18)
  group.add(copilotCluster(textures))

  return {
    group,
    dispose() {
      disposeGroup(group)
      for (const t of textures) t.dispose()
    },
  }
}
