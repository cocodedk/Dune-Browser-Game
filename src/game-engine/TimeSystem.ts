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
 * The very first call after a reset (fresh campaign OR a loaded save sitting
 * on day 40) fires exactly once for whatever day `world.time` is already on
 * — it does not backfill every day since day 0. A `null` sentinel (rather
 * than `-1`) is what makes that true: with `-1`, loading a day-40 save and
 * calling this once would compute `[0..40]` and replay 41 days of
 * harvest/payouts/raids against an already-day-40 state on every reload.
 * Only calls AFTER that first one iterate monotonically day-by-day.
 */
let lastDay: number | null = null;
export function crossedDays(): number[] {
  const day = currentDay();
  if (lastDay === null) {
    lastDay = day;
    return [day];
  }
  if (day <= lastDay) return [];
  const days: number[] = [];
  for (let d = lastDay + 1; d <= day; d++) days.push(d);
  lastDay = day;
  return days;
}

export function resetTime(): void {
  lastDay = null;
}
