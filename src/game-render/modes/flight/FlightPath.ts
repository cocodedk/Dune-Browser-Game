// src/game-render/modes/flight/FlightPath.ts
// PURE flight path maths. No three.js — so the trajectory, banking and camera
// framing are all testable without a GL context.
//
// The engine remains the clock: progress comes from the world's travel state,
// never from a local timer. A cinematic that drifts from the simulation would
// either land early or strand the player mid-air.

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface FlightArc {
  from: Vec3
  to: Vec3
  /** Peak height above the straight line, in world units. */
  apex: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

/**
 * Ease that starts and ends gently.
 *
 * A thopter that snaps to full speed reads as a teleport with animation on
 * top; the takeoff and landing are what sell it as flight.
 */
export function easeInOut(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/**
 * Position along the arc at progress t.
 *
 * Height follows a parabola so the craft climbs, cruises and descends rather
 * than sliding along the ground.
 */
export function positionAt(arc: FlightArc, t: number): Vec3 {
  const p = clamp01(t)
  const eased = easeInOut(p)

  // 4 * p * (1 - p) peaks at exactly 1 when p = 0.5.
  const climb = 4 * p * (1 - p) * arc.apex

  return {
    x: lerp(arc.from.x, arc.to.x, eased),
    y: lerp(arc.from.y, arc.to.y, eased) + climb,
    z: lerp(arc.from.z, arc.to.z, eased),
  }
}

/** Unit heading along the ground, from origin to destination. */
export function headingOf(arc: FlightArc): { x: number; z: number } {
  const dx = arc.to.x - arc.from.x
  const dz = arc.to.z - arc.from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  if (length === 0) return { x: 0, z: 1 }
  return { x: dx / length, z: dz / length }
}

/** Yaw in radians, for pointing the craft along its path. */
export function yawOf(arc: FlightArc): number {
  const heading = headingOf(arc)
  return Math.atan2(heading.x, heading.z)
}

/**
 * Roll angle at progress t.
 *
 * Banks into the turn on the way up and levels out for landing. Purely
 * cosmetic, but a craft that never banks looks like a sprite on a rail.
 */
export function bankAt(t: number, maxBank = 0.35): number {
  const p = clamp01(t)
  // One smooth cycle: bank in, hold, bank out.
  return Math.sin(p * Math.PI) * maxBank * Math.cos(p * Math.PI * 2)
}

/**
 * Chase-camera position: behind and above the craft, looking along its path.
 */
export function chaseCameraAt(
  arc: FlightArc,
  t: number,
  distance = 90,
  height = 38,
): { position: Vec3; lookAt: Vec3 } {
  const craft = positionAt(arc, t)
  const heading = headingOf(arc)
  return {
    position: {
      x: craft.x - heading.x * distance,
      y: craft.y + height,
      z: craft.z - heading.z * distance,
    },
    lookAt: craft,
  }
}
