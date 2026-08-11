import { world } from './GameState';
import { tick } from './TimeSystem';
import { resetEvents } from './EventSystem';
import { checkTravelArrival } from './TravelSystem';
import { shouldPause, effectiveDelta } from './pause';
import { processDayBoundary } from './dayRunner';

export function update(delta: number): void {
  // Dialogue, an explicit player pause, and a finished run each freeze the
  // clock independently — see game-engine/pause.ts for why that matters.
  const paused = shouldPause({
    manual: world.paused,
    inDialogue: world.dialogue !== null,
    // world.ending is the freeze authority (02 "Campaign status").
    ended: world.ending !== null,
    // A pending tribute decision pauses too — 02 "Tribute".
    settlementPending: world.pendingSettlement !== null,
  });
  if (paused) return;

  const gameDelta = effectiveDelta(delta, world.speed, false);
  tick(gameDelta);

  // Every crossed day is processed in full, in order — see dayRunner.ts.
  // Faction simulation, faction AI, PoC goal checks, and the Harkonnen
  // village-attack timer (AISystem.updateAI) are not called on this path:
  // docs/PRD/game-completion/00-index.md — "The emergent faction simulation
  // is not active in campaign mode"; act/endgame state is the only victory
  // authority. See baseline/legacy-authority-inventory.md category 1.
  processDayBoundary();

  // Check travel arrival every frame.
  checkTravelArrival();
}

export function initLoop(): void {
  // Day-boundary bookkeeping (world.lastProcessedDay) is NOT reset here —
  // it must survive a mount that follows a Load/reload, or the first frame
  // re-runs the day the save was taken on (baseline/wp01-critic-verdict.md
  // PROBE A). TimeSystem.ts's crossedDays() derives everything it needs
  // from world state now, so there is nothing left for initLoop to reset
  // besides the event-id counter.
  resetEvents();
}
