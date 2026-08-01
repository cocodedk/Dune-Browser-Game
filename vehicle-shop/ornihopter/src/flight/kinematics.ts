// vehicle-shop/ornihopter/src/flight/kinematics.ts
// Speed and position integration. Velocity is defined as speed * nose
// direction — the craft never slips sideways or drifts off its own
// heading — which is what makes "nose leads" true by construction rather
// than by delicate tuning, and is why there is no separate free-vector
// velocity state to spin out of control.
//
// The speed-rate equation is a point mass sliding along the nose direction:
// thrust forward, quadratic drag opposing motion, and gravity's component
// along the nose (positive when diving, negative when climbing). That last
// term is the whole of "trades speed for altitude": pitching the nose up
// does not just change facing, it directly costs speed in this equation.

import type { Vec3, Quat } from '../contracts'
import { noseDirection } from '../contracts'
import { clamp } from './scalarMath'
import { scale, add } from './vecMath'
import { THRUST_MAX, DRAG_K, GRAVITY, MAX_SPEED } from './constants'

export interface Kinematics {
  speed: number
  velocity: Vec3
  position: Vec3
}

export function nextKinematics(
  position: Vec3,
  speed: number,
  throttle: number,
  orientation: Quat,
  dt: number
): Kinematics {
  const nose = noseDirection(orientation)

  const thrustAccel = THRUST_MAX * throttle
  const dragAccel = DRAG_K * speed * speed
  const gravityAlongNose = GRAVITY * nose.y

  const speedRate = thrustAccel - dragAccel - gravityAlongNose
  const nextSpeed = clamp(speed + speedRate * dt, 0, MAX_SPEED)

  const velocity = scale(nose, nextSpeed)
  const nextPosition = add(position, scale(velocity, dt))

  return { speed: nextSpeed, velocity, position: nextPosition }
}
