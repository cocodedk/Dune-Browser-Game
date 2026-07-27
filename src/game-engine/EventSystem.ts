import type { GameEvent, GameEventType } from '../types';
import { world } from './GameState';
import { EventBus } from '../EventBus';

let eventCounter = 0;
const MAX_EVENTS = 20;

export function pushEvent(type: GameEventType, message: string): GameEvent {
  const event: GameEvent = {
    id: `evt-${++eventCounter}`,
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
