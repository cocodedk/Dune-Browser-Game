// landscape-shop/cliff/src/model/socketRings.ts
// The ring vocabulary the carved gate is built out of, split out of
// model/socket.ts once that file reached the 200-line rule and R2.1 needed
// the lip to grow rings of its own (model/gateLip.ts).
//
// Every ring is sampled at the SAME angles, which is what lets consecutive
// rings weld into quad strips with no fan and no pole.

import type { GridPoint } from './grid'
import { socketRadius, SOCKET } from './gateWall'

export type Ring = GridPoint[]

const SAMPLES = 48

/** The mouth's outer flare, lying on the prow's own surface, and the inner
 *  rim standing a fixed step in front of it. */
export const LIP_OUTER = { halfW: 33, halfH: 19, centreY: 18, proud: 0.2 }
export const LIP_INNER = { halfW: 20, halfH: 12, centreY: 13 }

// LIP_OUTER's wobble can shrink it below gateWall.ts's punched SOCKET hole
// at some angles — a raw, unlipped hole-edge sliver. Pushed outside first.
const SOCKET_CLEARANCE = 1.08

/** Irregular, and deliberately not symmetric about any axis. */
export function wobble(angle: number): number {
  return 1 + 0.13 * Math.sin(3 * angle + 1.1) + 0.08 * Math.sin(5 * angle + 2.3)
    + 0.05 * Math.sin(7 * angle + 0.4)
}

export function ovalPoint(
  shape: { halfW: number; halfH: number; centreY: number }, angle: number,
): [number, number] {
  const k = wobble(angle)
  return [shape.halfW * k * Math.cos(angle), shape.centreY + shape.halfH * k * Math.sin(angle)]
}

/** The rectangular aperture, sampled at the SAME angles as the oval rings so
 *  the chamfer strips stay quad-to-quad all the way in. */
export function rectPoint(
  shape: { halfW: number; halfH: number; centreY: number }, angle: number,
): [number, number] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const k = 1 / Math.max(Math.abs(c) / shape.halfW, Math.abs(s) / shape.halfH)
  return [k * c, shape.centreY + k * s]
}

/** Radially pushes (x, y) out until it clears gateWall.ts's punched hole by
 *  SOCKET_CLEARANCE, leaving clear points untouched. */
export function pushOutsideSocket(x: number, y: number): [number, number] {
  const r = socketRadius(x, y)
  if (r >= SOCKET_CLEARANCE) return [x, y]
  const scale = SOCKET_CLEARANCE / Math.max(r, 0.01)
  return [x * scale, SOCKET.centreYM + (y - SOCKET.centreYM) * scale]
}

export function ring(at: (angle: number) => GridPoint): Ring {
  const points: Ring = []
  // SAMPLES + 1 points: the last repeats the first, which closes the loop.
  for (let i = 0; i <= SAMPLES; i++) points.push(at((2 * Math.PI * i) / SAMPLES))
  return points
}
