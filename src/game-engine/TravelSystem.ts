import { world } from './GameState';
import { pushEvent } from './EventSystem';
import { visitVillage } from './VillageSystem';
import type { VillageId, WorldState } from '../types';
import { checkTravel, rejectionMessage } from './travel/rules';
import type { TravelMode } from './travel/rules';
import { REGION_ADJACENCY } from '../data/regionAdjacency';

export function travelDuration(fromId: VillageId, toId: VillageId): number {
  const from = world.villages.find(v => v.id === fromId);
  const to = world.villages.find(v => v.id === toId);
  if (!from || !to) return 10;
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(4, Math.round(dist / 50));
}

/**
 * 0..1 progress of the player's current trip, or 0 when not traveling.
 * Derives the trip duration from the same distance formula as
 * travelDuration, so the marker lerps correctly for trips of any length
 * (previously hardcoded to a 10-second trip regardless of actual distance).
 */
export function currentTravelProgress(w: WorldState): number {
  const { player } = w;
  if (player.state !== 'traveling' || player.travelTarget === null) return 0;

  const duration = travelDuration(player.location, player.travelTarget);
  const elapsed = duration - (player.arrivalTime - w.time);
  return Math.min(1, Math.max(0, elapsed / duration));
}

/** Travel mode currently available to the player. */
export function currentTravelMode(): TravelMode {
  // Ornithopters arrive with the smuggler market (Stage 11); until then the
  // player walks. Modelled here so range gating is already in force.
  return 'foot';
}

export function startTravel(targetId: VillageId): void {
  const { player } = world;

  const check = checkTravel({
    from: world.villages.find(v => v.id === player.location),
    to: world.villages.find(v => v.id === targetId),
    mode: currentTravelMode(),
    isTraveling: player.state === 'traveling',
    adjacency: REGION_ADJACENCY,
  });

  if (!check.ok) {
    // Silent on the two cases ordinary fumbling produces; the rest explain
    // themselves, because "nothing happened" is the worst possible feedback.
    if (check.reason !== 'same-location' && check.reason !== 'already-traveling') {
      pushEvent('village_selected', rejectionMessage(check.reason));
    }
    return;
  }

  const time = check.durationSeconds;
  player.state = 'traveling';
  player.travelTarget = targetId;
  player.arrivalTime = world.time + time;

  const target = world.villages.find(v => v.id === targetId);
  pushEvent('travel_start', `\ud83d\udc2a Traveling to ${target?.name ?? targetId}...`);
}

export function checkTravelArrival(): void {
  const { player } = world;
  if (player.state !== 'traveling' || player.travelTarget === null) return;
  if (world.time < player.arrivalTime) return;

  // Arrived
  const arrivedAt = player.travelTarget;
  player.location = arrivedAt;
  player.state = 'idle';
  player.travelTarget = null;

  const village = world.villages.find(v => v.id === arrivedAt);
  pushEvent('travel_complete', `\u2705 Arrived at ${village?.name ?? arrivedAt}.`);
  visitVillage(arrivedAt);
}
