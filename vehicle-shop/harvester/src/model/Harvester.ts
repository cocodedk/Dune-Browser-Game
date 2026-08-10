// vehicle-shop/harvester/src/model/Harvester.ts
// ASSEMBLY — the only file that knows all five components. It adds them in a
// fixed order, drives the wheels from the crawler state, and disposes
// everything. Each component is a pure builder ({ group, dispose }) reading
// spec.ts, so this file has nothing to get wrong beyond wiring — and the
// component test suite verifies each part's bounding invariants independently.
//
// Round I6 moved the palette out to ./materials: the five bare hex constants
// that used to live here became a set with authored weathering maps, a sixth
// `trim` tone (spec.TRIM_COLOR) and per-link belt wear, which is more than an
// assembly file should own. Every component below takes its extra material
// roles as OPTIONAL trailing parameters defaulting to the old ones, so the
// bounding tests still construct each part with four throwaway materials and
// measure exactly the geometry they measured before.

import { Group } from 'three'
import type { HarvesterModel, CrawlerState } from '../contracts'
import { createHarvesterMaterials } from './materials'
import { buildHull } from './hull'
import { buildTracks } from './tracks'
import { buildCutter } from './cutter'
import { buildCab } from './cab'
import { buildMachinery } from './machinery'
import { buildDustPlumes } from './dust'

export function createHarvester(): HarvesterModel {
  const root = new Group()
  root.name = 'harvester'

  const m = createHarvesterMaterials()

  const hull = buildHull(m.body, m.dark, m.trim, m.bodyLow)
  const tracks = buildTracks(m.dark, m.wheel, m.accent, m.belt, m.tire)
  const cutter = buildCutter(m.dark, m.accent, m.trim, m.wheel)
  const cab = buildCab(m.body, m.dark, m.accent, m.trim)
  const machinery = buildMachinery(m.dark, m.accent, m.trim)
  // I7 (immediate-improvements §7 dust): two plumes behind the rear
  // sprockets, parented here so they inherit the machine's own pose exactly
  // like every other component — see ./dust.ts for why they are
  // deterministic and exactly zero while parked.
  const dust = buildDustPlumes()

  root.add(hull.group)
  root.add(tracks.group)
  root.add(cutter.group)
  root.add(cab.group)
  root.add(machinery.group)
  root.add(dust.group)

  return {
    root,
    update(state: Readonly<CrawlerState>, dt: number): void {
      tracks.update(state.trackLeft, state.trackRight, dt)
      // The cutter drum feeds off the same two track speeds (I3): their mean
      // is the forward speed, and it is what the paused debug handle's
      // drive() actually sets — see forwardSpeedOf() in cutterDetail.ts.
      cutter.update(state.trackLeft, state.trackRight, dt)
      // I7: the antenna's sway (cab) and the dust plumes (stage) read the
      // same two signed track speeds through this one update path, so the
      // I0 harness's drive()/tick() drives them exactly like the belt scroll.
      cab.update(state.trackLeft, state.trackRight, dt)
      dust.update(state.trackLeft, state.trackRight, dt)
    },
    dispose(): void {
      hull.dispose()
      tracks.dispose()
      cutter.dispose()
      cab.dispose()
      machinery.dispose()
      dust.dispose()
      m.dispose()
      root.clear()
    },
  }
}
