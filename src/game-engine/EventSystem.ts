import type { GameEvent, GameEventType } from '../types';
import { world } from './GameState';
import { EventBus } from '../EventBus';

let eventCounter = 0;
const MAX_EVENTS = 20;

/**
 * Next unique event id, self-healing against restored saves: after a page
 * reload, `world.events` carries ids from the previous session while this
 * module's counter restarted at zero, so a plain `++counter` would reissue
 * ids that are still in the log — duplicating React keys in the EventLog
 * (measured live in the WP02 browser trace: hundreds of duplicate-key
 * errors per minute). Resyncing to the highest id currently in the world
 * makes the counter correct no matter when or how the world was installed.
 */
function nextEventId(): string {
  for (const e of world.events) {
    const n = Number(e.id.slice(4));
    if (Number.isFinite(n) && n > eventCounter) eventCounter = n;
  }
  return `evt-${++eventCounter}`;
}

export function pushEvent(type: GameEventType, message: string): GameEvent {
  const event: GameEvent = {
    id: nextEventId(),
    type,
    message,
    timestamp: world.time,
  };

  world.events.unshift(event);
  if (world.events.length > MAX_EVENTS) {
    world.events.length = MAX_EVENTS;
  }

  // Notify React immediately
  EventBus.emit('event:fired', { event });
  return event;
}

export function resetEvents(): void {
  eventCounter = 0;
}
