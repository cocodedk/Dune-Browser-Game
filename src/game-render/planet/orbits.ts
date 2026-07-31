// src/game-render/planet/orbits.ts
// PURE orbital placement for the moons of Arrakis. No three.js.
//
// Arrakis has two moons. Frank Herbert names them only "first moon" and
// "second moon" in the novel; the Fremen call the smaller one Muad'Dib, after
// the kangaroo mouse whose shape they read in it, and Paul takes his desert
// name from it. The proper names Krelln and Arvon, and the figures below, come
// from the Dune Encyclopedia (1984), which the Herbert estate later disavowed
// — so they are treated here as flavour, not as canon.
//
//   Krelln  first moon,  956 km across, 25.5 day orbit, the outer one.
//           Bears the mark the Fremen read as a human fist; the recent films
//           call it the Hand of God.
//   Arvon   second moon, 402 km across,  5.7 day orbit, the inner one.
//           Bears the kangaroo mouse. Ice-rich, and therefore pale.

export interface MoonOrbit {
  /** Radius of the orbit, in planet radii. */
  distance: number
  /** Orbital period, in game days. */
  periodDays: number
  /** Tilt of the orbital plane, in radians. */
  inclination: number
  /** Where in its orbit the moon starts, in turns (0..1). */
  phase: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Position of a moon at a moment.
 *
 * @param time       Engine time in seconds.
 * @param daySeconds Seconds per game day.
 * @param radius     Planet radius in world units.
 *
 * Circular orbits. The real ones are not, but an eccentricity nobody can see
 * from a strategic camera is complexity with no payoff.
 */
export function moonPosition(
  orbit: MoonOrbit,
  time: number,
  daySeconds: number,
  radius: number,
): Vec3 {
  const periodSeconds = orbit.periodDays * daySeconds
  const turns = periodSeconds === 0 ? 0 : time / periodSeconds
  const angle = (turns + orbit.phase) * Math.PI * 2

  const r = orbit.distance * radius
  const flat = { x: Math.sin(angle) * r, y: 0, z: Math.cos(angle) * r }

  // Tilt about the X axis, so the two orbital planes cross and the moons are
  // not permanently stacked in the same line of sight.
  const cos = Math.cos(orbit.inclination)
  const sin = Math.sin(orbit.inclination)
  return {
    x: flat.x,
    y: flat.z * sin,
    z: flat.z * cos,
  }
}

/**
 * The two moons.
 *
 * Distances and sizes are compressed, and the comment matters more than the
 * numbers: a real moon sits tens of planet radii out and would render as a
 * speck of two or three pixels. These sit close enough to read as moons and
 * to show their markings, while keeping the true ordering — Arvon inner and
 * fast, Krelln outer and slow — and the true 4.47:1 ratio of their periods.
 *
 * Both orbits must also fit inside the camera's furthest zoom, which is 4.2
 * planet radii. Krelln first sat at 4.6 and spent much of its orbit behind the
 * viewer, measured off the left edge of the screen at x = -3310.
 */
export const KRELLN: MoonOrbit = {
  distance: 3.45,
  periodDays: 25.5,
  inclination: 0.22,
  phase: 0.13,
}

export const ARVON: MoonOrbit = {
  distance: 2.15,
  periodDays: 5.7,
  inclination: -0.34,
  phase: 0.61,
}

/** Moon radius as a fraction of the planet's, likewise compressed. */
export const KRELLN_RADIUS = 0.21
export const ARVON_RADIUS = 0.088
