import { world } from './GameState';
import { pushEvent } from './EventSystem';
import { visitVillage } from './VillageSystem';
import type { VillageId } from '../types';

function travelTime(fromId: VillageId, toId: VillageId): number {
  const from = world.villages.find(v => v.id === fromId);
  const to = world.villages.find(v => v.id === toId);
  if (!from || !to) return 10;
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(4, Math.round(dist / 50));
}

export function startTravel(targetId: VillageId): void {
  const { player } = world;
  if (player.state === 'traveling') return;
  if (player.location === targetId) return;

  const time = travelTime(player.location, targetId);
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
