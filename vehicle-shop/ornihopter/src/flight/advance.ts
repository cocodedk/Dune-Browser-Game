// vehicle-shop/ornihopter/src/flight/advance.ts
// The pure per-step orchestration: demand -> orientation -> kinematics ->
// ground clamp -> wing beat -> a brand new FlightState. Kept pure and
// separate from flightModel.ts's mutable wrapper so the whole step function
// can be unit-tested as an ordinary function of (state, input, dt).

import type { FlightState, FlightInput } from '../contracts'
import { nextOrientation } from './rotation'
import { nextKinematics } from './kinematics'
import { groundPhase } from './landing'
import { nextBeat } from './wingBeat'
import { clamp, clamp01, clampSigned } from './scalarMath'
import { MAX_DT } from './constants'

function sanitiseInput(input: FlightInput): FlightInput {
  return {
    pitch: clampSigned(input.pitch),
    roll: clampSigned(input.roll),
    yaw: clampSigned(input.yaw),
    throttle: clamp01(input.throttle),
    autoLevel: input.autoLevel === true,
  }
}

export function advance(state: Readonly<FlightState>, rawInput: FlightInput, rawDt: number): FlightState {
  const dt = clamp(rawDt, 0, MAX_DT)
  const input = sanitiseInput(rawInput)

  const orientation = nextOrientation(state.orientation, input, dt)
  const kinematics = nextKinematics(state.position, state.speed, input.throttle, orientation, dt)
  // Ground contact owns the attitude as well as the position now: a craft
  // resting on six legs settles onto them, so the landing phase may return an
  // orientation the stick did not ask for. See flight/landing.ts.
  const grounded = groundPhase(state, orientation, kinematics, input.throttle, dt)
  const beat = nextBeat(state.beatPhase, input.throttle, dt, grounded.beatAmplitude)

  return {
    position: grounded.position,
    velocity: grounded.velocity,
    orientation: grounded.orientation,
    throttle: input.throttle,
    speed: grounded.speed,
    altitude: grounded.altitude,
    beatPhase: beat.beatPhase,
    beatHz: beat.beatHz,
    autoLevel: input.autoLevel,
    landed: grounded.landed,
    beatAmplitude: grounded.beatAmplitude,
  }
}
