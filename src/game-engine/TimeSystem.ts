import { world } from './GameState';

export const DAY_SECONDS = 60; // 1 game-day = 60 game-seconds

export function tick(delta: number): void {
  world.time += delta;
}

export function currentDay(): number {
  return Math.floor(world.time / DAY_SECONDS);
}

/**
 * Days crossed since the last call, oldest first, empty when still on the
 * same day. Consumed by dayRunner.ts's processDayBoundary() — see
 * docs/PRD/game-completion/02-runtime-consolidation.md "Day-boundary order":
 * "If a frame, restored tab, or test advances across several days, the
 * engine repeats all ten steps for each day. It may not process only the
 * final day."
 *
 * Bookkeeping lives on `world.lastProcessedDay` (types.ts), not a module
 * variable here — see baseline/wp01-critic-verdict.md's "biggest gap". A
 * module-global survives neither `setWorld()` (Load, New) nor serialization
 * (reload), so every production session-boundary path either replayed every
 * intervening day, went permanently inert, or re-ran the day a save was
 * taken on. Putting the value on WorldState means `setWorld(loaded)` —
 * which store.ts's Load and New paths already call, with no extra wiring —
 * carries the RIGHT bookkeeping across by construction.
 *
 * Semantics:
 * - `null` (fresh campaign, or a genuinely new one started mid-session):
 *   process whatever day `world.time` is already on, exactly once, with no
 *   backfill from day 0.
 * - `day < lastProcessedDay` (a loaded world's own day is BEHIND its own
 *   bookkeeping — e.g. a corrupted or hand-built fixture): resync down the
 *   same way `null` does — process the current day once, no backfill, no
 *   iterating backward.
 * - `day === lastProcessedDay`: already processed; nothing crossed.
 * - `day > lastProcessedDay`: the normal case — every day in between, in
 *   order.
 */
export function crossedDays(): number[] {
  const day = currentDay();
  const last = world.lastProcessedDay;
  if (last === null || day < last) {
    world.lastProcessedDay = day;
    return [day];
  }
  if (day === last) return [];
  const days: number[] = [];
  for (let d = last + 1; d <= day; d++) days.push(d);
  world.lastProcessedDay = day;
  return days;
}
