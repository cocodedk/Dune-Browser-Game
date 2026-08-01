// vehicle-shop/ornihopter/src/flight/state.ts
// reset() defaults: the craft starts already airborne and cruising rather
// than parked, since there is no runway/takeoff modelled here. Level, nose
// along -Z, half throttle, comfortably clear of the tallest dune.

import type { FlightState } from '../contracts'
import { noseDirection } from '../contracts'
import { heightAt } from '../stage/terrain'
import { IDENTITY_QUAT } from './quatMath'
import { scale } from './vecMath'
import { nextBeat } from './wingBeat'
import { CRUISE_ALTITUDE, CRUISE_THROTTLE, CRUISE_SPEED } from './constants'

export function createInitialState(): FlightState {
  const position = { x: 0, y: heightAt(0, 0) + CRUISE_ALTITUDE, z: 0 }
  const orientation = IDENTITY_QUAT
  const velocity = scale(noseDirection(orientation), CRUISE_SPEED)
  const beat = nextBeat(0, CRUISE_THROTTLE, 0)

  return {
    position,
    velocity,
    orientation,
    throttle: CRUISE_THROTTLE,
    speed: CRUISE_SPEED,
    altitude: CRUISE_ALTITUDE,
    beatPhase: beat.beatPhase,
    beatHz: beat.beatHz,
  }
}
