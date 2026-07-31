import { world } from './GameState';

export const DAY_SECONDS = 60; // 1 game-day = 60 game-seconds

export function tick(delta: number): void {
  world.time += delta;
}

export function currentDay(): number {
  return Math.floor(world.time / DAY_SECONDS);
}

// True once per day (call once per update — returns true only the first call at new day)
let lastDay = -1;
export function isDayBoundary(): boolean {
  const day = currentDay();
  if (day !== lastDay) {
    lastDay = day;
    return true;
  }
  return false;
}

export function resetTime(): void {
  lastDay = -1;
}
