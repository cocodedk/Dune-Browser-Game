// vehicle-shop/ornihopter/src/interior/pilotFigure.ts
// A simple blocky seated occupant for the copilot seat. Nothing anatomical —
// boxes and one sphere — but proportioned so a 1.8m person plausibly fills
// the seat, which is what actually sells scale to a critic. Placed in the
// copilot seat only: the pilot's own seat is implicitly occupied by the
// camera and is never modelled with a body.
//
// Like the seat itself, this sits at COCKPIT.seatZ and so is outside the
// fixed pilot camera's frustum (see layout.ts) — built for correctness, scale
// and other viewpoints, not for this round's one pilot-POV capture.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { PAN_Y, seatX } from './layout'
import { box, ball, disposeGroup } from './sceneUtils'
import { figureSuitMaterial, figureHelmetMaterial } from './materials'

const HIP_Y = PAN_Y + 0.15
const KNEE_Z_AHEAD = 0.45
const SHOULDER_HALF_SPAN = 0.23
const FLOOR_Y = COCKPIT.floorY
// FIXED, round 6b: these three were absolute y literals (-0.35, -0.17, -0.4)
// left over from a cabin floor at -1.80. With the flight deck raised they put
// the figure's torso, head and shoulders BELOW its own hips, inside the seat
// pan. Derived from PAN_Y now, which is where they should always have come
// from — seated anthropometry is measured from the cushion, not from the
// craft's origin.
const TORSO_TOP_Y = PAN_Y + 0.62
const HEAD_Y = PAN_Y + 0.78
const SHOULDER_Y = PAN_Y + 0.57

export function createPilotFigure(): { group: Group; dispose(): void } {
  const group = new Group()
  group.name = 'pilotFigure'
  const x = seatX(1) // copilot seat only
  const z = COCKPIT.seatZ
  const suit = figureSuitMaterial()
  const boot = figureHelmetMaterial()
  const helmet = figureHelmetMaterial()

  const pelvis = box(0.5, 0.3, 0.4, suit, { x, y: HIP_Y, z })
  const torso = box(0.46, TORSO_TOP_Y - (HIP_Y + 0.15), 0.32, suit, {
    x,
    y: (HIP_Y + 0.15 + TORSO_TOP_Y) / 2,
    z: z + 0.03,
  })
  const head = ball(0.13, helmet, { x, y: HEAD_Y, z: z + 0.05 })

  const parts = [pelvis, torso, head]

  const shoulderY = SHOULDER_Y
  const elbowY = PAN_Y + 0.2 // resting on the armrest, see seats.ts

  for (const side of [-1, 1] as const) {
    const shoulderX = x + side * SHOULDER_HALF_SPAN
    const kneeX = x + side * 0.13
    const upperArm = box(0.14, shoulderY - elbowY, 0.16, suit, {
      x: shoulderX,
      y: (shoulderY + elbowY) / 2,
      z: z + 0.03,
    })
    const forearm = box(0.13, 0.14, 0.32, suit, {
      x: shoulderX + side * 0.03,
      y: elbowY,
      z: z - 0.1,
    })
    const thigh = box(0.22, 0.2, KNEE_Z_AHEAD, suit, {
      x: kneeX,
      y: PAN_Y + 0.15,
      z: z - KNEE_Z_AHEAD / 2,
    })
    const shin = box(0.18, PAN_Y + 0.15 - FLOOR_Y, 0.18, suit, {
      x: kneeX,
      y: (PAN_Y + 0.15 + FLOOR_Y) / 2,
      z: z - KNEE_Z_AHEAD,
    })
    const foot = box(0.16, 0.1, 0.26, boot, {
      x: kneeX,
      y: FLOOR_Y + 0.05,
      z: z - KNEE_Z_AHEAD - 0.13,
    })
    parts.push(upperArm, forearm, thigh, shin, foot)
  }

  group.add(...parts)

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
