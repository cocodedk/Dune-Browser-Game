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
  /**
   * Ground height at the destination, if the craft should actually land.
   *
   * Omit and the arc is a flyover: it ends at `to.y`, still at cruise altitude.
   * That was the original behaviour and it is why the cinematic looked like it
   * was cut off — `from.y` and `to.y` are both 90, and the apex term
   * `4p(1-p)` returns to zero at p=1, so the craft finished the trip in level
   * flight at 90 units and the mode switched under it. There was no landing to
   * be interrupted.
   */
  touchdownY?: number
}

/**
 * Share of the trip spent descending.
 *
 * Long enough to read as an approach rather than a drop, short enough that most
 * of the cinematic is still the cruise it exists to show.
 */
export const LANDING_FRACTION = 0.24

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

  const cruiseY = lerp(arc.from.y, arc.to.y, eased) + climb

  return {
    x: lerp(arc.from.x, arc.to.x, eased),
    y: arc.touchdownY === undefined ? cruiseY : descendTo(cruiseY, arc.touchdownY, p),
    z: lerp(arc.from.z, arc.to.z, eased),
  }
}

/**
 * Blend the cruise altitude down to the ground over the last stretch.
 *
 * Smoothstepped rather than linear so the craft eases out of level flight and
 * settles, instead of hinging onto a straight ramp at a visible corner.
 */
function descendTo(cruiseY: number, touchdownY: number, p: number): number {
  const start = 1 - LANDING_FRACTION
  if (p <= start) return cruiseY
  const k = (p - start) / LANDING_FRACTION
  return lerp(cruiseY, touchdownY, k * k * (3 - 2 * k))
}

/**
 * Nose attitude at progress `t`, in radians. Positive is nose-up.
 *
 * Level for the cruise, nose-down through the approach, then a flare at the
 * end — an aircraft that arrives flat reads as sinking rather than landing.
 * Deliberately small: this is added to the craft's existing yaw and bank, and a
 * large pitch would fight the nose-first orientation guard.
 */
export function pitchAt(t: number, hasLanding = true): number {
  if (!hasLanding) return 0
  const p = clamp01(t)
  const start = 1 - LANDING_FRACTION
  if (p <= start) return 0

  const k = (p - start) / LANDING_FRACTION
  // Down for the first three-quarters of the approach, then flare up.
  return k < 0.75
    ? -DESCENT_PITCH * (k / 0.75)
    : lerp(-DESCENT_PITCH, FLARE_PITCH, (k - 0.75) / 0.25)
}

const DESCENT_PITCH = 0.10
const FLARE_PITCH = 0.06

/** Unit heading along the ground, from origin to destination. */
export function headingOf(arc: FlightArc): { x: number; z: number } {
  const dx = arc.to.x - arc.from.x
  const dz = arc.to.z - arc.from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  if (length === 0) return { x: 0, z: 1 }
  return { x: dx / length, z: dz / length }
}

/**
 * Yaw in radians, for pointing the craft along its path.
 *
 * The fuselage is built nose-forward along local -Z (see
 * fuselageGeometry.ts's HULL_PROFILE: the nose tip sits at the most
 * negative z). Rotating an object by angle `y` about the Y axis sends
 * local -Z to world (-sin y, 0, -cos y) — so to make the nose point along
 * `heading`, this must solve sin y = -heading.x, cos y = -heading.z, i.e.
 * atan2(-heading.x, -heading.z). The previous `atan2(heading.x, heading.z)`
 * solved the equation for local +Z instead — the TAIL end of the mesh —
 * which flew the craft backward. Fixed here, at the pure-maths end rather
 * than by re-authoring the geometry, because -Z-is-forward is three.js's
 * own convention (Object3D.lookAt, cameras) and every part of this craft
 * (WingRig.ts, fuselageGeometry.ts, wingConfig.ts's attachment z values)
 * already agrees with it — only this one formula did not.
 */
export function yawOf(arc: FlightArc): number {
  const heading = headingOf(arc)
  return Math.atan2(-heading.x, -heading.z)
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
