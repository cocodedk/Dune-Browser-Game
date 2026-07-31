// src/game-engine/worms/wormsign.ts
// PURE rules for how long a worm sighting stays on the map.
//
// A worm attack that produces one line in a scrolling event log is an attack
// the player misses. Wormsign lingers: the sand where a maker took a crew
// stays marked for days afterwards, so the map carries the memory of what
// happened there and the player can decide whether to go back.

/** Days a sighting remains visible after the attack. */
export const WORMSIGN_DAYS = 6

export interface Sighting {
  fieldId: string
  /** Engine time in seconds. */
  atTime: number
}

/**
 * How strongly a sighting should show, 0 (gone) to 1 (just happened).
 *
 * Fades rather than vanishing on a boundary: sand does not forget on a
 * schedule, and a marker that pops out of existence reads as a bug.
 */
export function sightingStrength(
  sighting: Sighting,
  now: number,
  daySeconds: number,
): number {
  const age = (now - sighting.atTime) / daySeconds
  if (age < 0) return 1
  if (age >= WORMSIGN_DAYS) return 0
  const remaining = 1 - age / WORMSIGN_DAYS
  // Squared so a fresh sighting stays bold for a while, then goes quickly.
  return remaining * remaining
}

/** Live sightings, freshest first, with the faded ones dropped. */
export function activeSightings(
  sightings: readonly Sighting[],
  now: number,
  daySeconds: number,
): { fieldId: string; strength: number }[] {
  return sightings
    .map(s => ({ fieldId: s.fieldId, strength: sightingStrength(s, now, daySeconds) }))
    .filter(s => s.strength > 0)
    .sort((a, b) => b.strength - a.strength)
}

/**
 * Drop sightings that have faded out entirely.
 *
 * Called at the day boundary. Without it a long game accumulates a sighting
 * per worm attack forever, and the list is saved with the game.
 */
export function pruneSightings(
  sightings: readonly Sighting[],
  now: number,
  daySeconds: number,
): Sighting[] {
  return sightings.filter(s => sightingStrength(s, now, daySeconds) > 0)
}

/**
 * Whether a field is currently too dangerous to work.
 *
 * One recent sighting is a warning; the Fremen rule is that a maker that has
 * taken a crew comes back to the same sand.
 */
export function fieldIsDangerous(
  sightings: readonly Sighting[],
  fieldId: string,
  now: number,
  daySeconds: number,
): boolean {
  return activeSightings(sightings, now, daySeconds)
    .some(s => s.fieldId === fieldId && s.strength > 0.4)
}
