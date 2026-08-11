// src/runtime/CommandWiring.ts
// Renderer-agnostic wiring: every EventBus command a UI panel (or the
// renderer's own view) can issue is translated here into an engine call.
// This is the one place allowed to write world.speed — no file under
// src/game-render/ may assign to `world`.
//
// A thin registration table (chunk W3b split it from a 192-line file that
// mixed wiring with handler logic) — every handler's actual body, and the
// doc comments explaining its refusal-mapping shape, lives in
// commandHandlers.ts. No `game:difficulty` entry here or in BusEvents
// (types.bus.ts): difficulty is written once at campaign creation and has
// no in-game mutation seam at all — see commandHandlers.ts's header.

import { EventBus } from '../EventBus'
import {
  onTalk, onSpeakTo, onTravel, onChoose, onSpeed,
  onPledge, onGift, onAssignCrew, onBuy, onIssue, onAssault,
  onSettle, onAutoShip, onPause,
} from './commandHandlers'

/**
 * Registers every EventBus command handler that drives the engine.
 * Returns an unsubscribe function that removes all of them.
 */
export function wireCommands(): () => void {
  EventBus.on('player:talk', onTalk)
  EventBus.on('player:speak_to', onSpeakTo)
  EventBus.on('player:travel', onTravel)
  EventBus.on('player:choose', onChoose)
  EventBus.on('game:speed', onSpeed)
  EventBus.on('player:pledge_sietch', onPledge)
  EventBus.on('player:gift_sietch', onGift)
  EventBus.on('player:assign_crew', onAssignCrew)
  EventBus.on('player:buy_equipment', onBuy)
  EventBus.on('player:issue_equipment', onIssue)
  EventBus.on('player:assault_fort', onAssault)
  EventBus.on('game:pause', onPause)
  EventBus.on('player:settle_tribute', onSettle)
  EventBus.on('player:set_auto_ship', onAutoShip)

  return () => {
    EventBus.off('player:talk', onTalk)
    EventBus.off('player:speak_to', onSpeakTo)
    EventBus.off('player:travel', onTravel)
    EventBus.off('player:choose', onChoose)
    EventBus.off('game:speed', onSpeed)
    EventBus.off('player:pledge_sietch', onPledge)
    EventBus.off('player:gift_sietch', onGift)
    EventBus.off('player:assign_crew', onAssignCrew)
    EventBus.off('player:buy_equipment', onBuy)
    EventBus.off('player:issue_equipment', onIssue)
    EventBus.off('player:assault_fort', onAssault)
    EventBus.off('game:pause', onPause)
    EventBus.off('player:settle_tribute', onSettle)
    EventBus.off('player:set_auto_ship', onAutoShip)
  }
}
