// src/runtime/CommandWiring.ts
// Renderer-agnostic wiring: every EventBus command a UI panel (or the
// renderer's own view) can issue is translated here into an engine call.
// This is the one place allowed to write world.speed / world.difficulty —
// no file under src/game-render/ may assign to `world`.

import { world } from '../game-engine/GameState'
import { startTravel } from '../game-engine/TravelSystem'
import { chooseDialogue, startDialogue } from '../game-engine/DialogueSystem'
import { pushEvent } from '../game-engine/EventSystem'
import { decideVisit, decideSpeakTo } from './VisitPolicy'
import { runPledgeCommand } from '../game-engine/commands/pledgeCommand'
import { pledgeChainRefusalMessage } from '../game-engine/sietch/pledgeRefusal'
import { runSettleCommand } from '../game-engine/commands/settleCommand'
import { settleRefusalMessage } from '../game-engine/quota/settlementRefusal'
import { runSetAutoShipCommand } from '../game-engine/commands/autoShipCommand'
import { giftPlayerSietch } from '../game-engine/SietchVisitSystem'
import { giftRefusalMessage } from '../game-engine/sietch/giftRefusal'
import { autoShipRefusalMessage } from '../game-engine/quota/autoShipRefusal'
import { buyEquipment } from '../game-engine/EconomySystem'
import { runAssignCrewCommand } from '../game-engine/commands/assignCrewCommand'
import { assignCrewRefusalMessage } from '../game-engine/troops/assignCrewRefusal'
import { runIssueEquipmentCommand } from '../game-engine/commands/issueEquipmentCommand'
import { issueRefusalMessage } from '../game-engine/troops/equipmentRefusal'
import { runAssaultCommand } from '../game-engine/commands/assaultCommand'
import { assaultCommandRefusalMessage } from '../game-engine/acts/assaultCommandRefusal'
import { OPENING_COMPLETE_FLAG } from '../game-engine/acts/openingObjectives'
import { saveGame } from '../game-engine/persistence'
import { EventBus } from '../EventBus'
import type { BusEvents } from '../types'

/**
 * Registers every EventBus command handler that drives the engine.
 * Returns an unsubscribe function that removes all of them.
 */
export function wireCommands(): () => void {
  /**
   * Speak to whoever is here.
   *
   * Reuses the same decision the map click uses, so standing in a sietch and
   * clicking "Speak" opens exactly the conversation that clicking the sietch
   * from the map would.
   */
  const onTalk = (): void => {
    const action = decideVisit(world, world.player.location)
    if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId, action.nodeId)
    else if (action.kind === 'event') pushEvent('village_selected', action.message)
  }

  /**
   * Speak to one named resident, picked from the PeopleHere list instead of
   * accepting decideVisit's first-resident default. Same dispatch as onTalk
   * — only the decision function differs — because a resident's own tree
   * opening any other way than startDialogue would leave dialogue:started
   * unfired and the UI stuck.
   */
  const onSpeakTo = ({ characterId }: BusEvents['player:speak_to']): void => {
    const action = decideSpeakTo(world, characterId)
    if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId, action.nodeId)
    else if (action.kind === 'event') pushEvent('village_selected', action.message)
  }

  const onTravel = ({ targetVillageId }: BusEvents['player:travel']): void => {
    startTravel(targetVillageId)
  }
  const onChoose = ({ choiceId }: BusEvents['player:choose']): void => {
    chooseDialogue(choiceId)
  }
  const onSpeed = ({ speed }: BusEvents['game:speed']): void => {
    world.speed = speed
    EventBus.emit('world:updated', { state: world })
  }
  const onDifficulty = ({ difficulty }: BusEvents['game:difficulty']): void => {
    world.difficulty = difficulty
    EventBus.emit('world:updated', { state: world })
  }
  /**
   * The CommandOutcome dispatch seam (chunk W2a; chain rewritten W2b) —
   * see commands/pledgeCommand.ts. Success already publishes its own event
   * from inside pledgePlayerSietch; a refusal publishes nothing on its own
   * (checkPledgeChain is read-only), so this is the one place a refusal
   * becomes a player-visible message — the minimal centre-screen mapping
   * the event policy layer (toastPolicy.ts) already displays. Full pledge
   * UI (disabling the button, showing WHY before the click) is WP03.
   */
  const onPledge = ({ villageId }: BusEvents['player:pledge_sietch']): void => {
    const outcome = runPledgeCommand(villageId)
    if (!outcome.ok) pushEvent('sietch_pledged', pledgeChainRefusalMessage(outcome.reason))
  }
  /**
   * Same refusal-mapping shape as onPledge (chunk W2g — closes C3-FAIL,
   * finding 3b): giftPlayerSietch already returns a CommandOutcome; success
   * has already pushed its own event from inside it, so a refusal is the one
   * place this becomes player-visible text instead of a silent no-op.
   */
  const onGift = ({ villageId }: BusEvents['player:gift_sietch']): void => {
    const outcome = giftPlayerSietch(villageId)
    if (!outcome.ok) pushEvent('sietch_pledged', giftRefusalMessage(outcome.reason))
  }
  /**
   * Crew assignment (commands/assignCrewCommand.ts) and issue-equipment
   * (commands/issueEquipmentCommand.ts) follow the same refusal-mapping
   * shape as onPledge/onSettle: a success has already pushed its own event
   * from inside the command, so a refusal is the one place this becomes
   * player-visible text.
   */
  const onAssignCrew = ({ groupId, task, targetId }: BusEvents['player:assign_crew']): void => {
    const outcome = runAssignCrewCommand(groupId, task, targetId)
    if (!outcome.ok) pushEvent('sietch_task_assigned', assignCrewRefusalMessage(outcome.reason))
  }
  const onBuy = ({ kind }: BusEvents['player:buy_equipment']): void => {
    buyEquipment(kind)
  }
  const onIssue = ({ equipmentId, groupId }: BusEvents['player:issue_equipment']): void => {
    const outcome = runIssueEquipmentCommand(equipmentId, groupId)
    if (!outcome.ok) pushEvent('sietch_task_assigned', issueRefusalMessage(outcome.reason))
  }
  const onAssault = ({ fortId }: BusEvents['player:assault_fort']): void => {
    const outcome = runAssaultCommand(fortId)
    if (!outcome.ok) pushEvent('attack', assaultCommandRefusalMessage(outcome.reason))
  }
  /**
   * Settle the pending tribute decision (chunk W2c; see commands/
   * settleCommand.ts). Same refusal-mapping shape as onPledge: success
   * already published its own event from inside applySettlement, so a
   * refusal is the one place this becomes player-visible text.
   */
  const onSettle = ({ amount }: BusEvents['player:settle_tribute']): void => {
    const openingAlreadyComplete = world.flags[OPENING_COMPLETE_FLAG] === true
    const outcome = runSettleCommand(amount)
    if (!outcome.ok) {
      pushEvent('tribute_refused', settleRefusalMessage(outcome.reason))
      return
    }
    // 03 "Beat 7": "Q1 completion sets opening.complete, autosaves...".
    // Detected by edge (flag false -> true across this exact call) rather
    // than the command's own return code, so SettleCommandCode stays
    // untouched and every existing 'settled' fixture keeps passing.
    // Fire-and-forget: saveGame is async IndexedDB I/O this wiring layer
    // must not block a frame on; `.catch` mirrors main.tsx's own load.
    if (!openingAlreadyComplete && world.flags[OPENING_COMPLETE_FLAG] === true) {
      void saveGame(world).catch(() => {})
    }
  }
  /**
   * Same refusal-mapping shape as onSettle (chunk W2g — finding 3c, minor:
   * QuotaLedger.tsx only renders the control once unlocked, but the wiring
   * must not trust that and discard the outcome unchecked).
   */
  const onAutoShip = ({ enabled, amount }: BusEvents['player:set_auto_ship']): void => {
    const outcome = runSetAutoShipCommand(enabled, amount)
    if (!outcome.ok) pushEvent('tribute_refused', autoShipRefusalMessage(outcome.reason))
  }
  const onPause = ({ paused }: BusEvents['game:pause']): void => {
    world.paused = paused
    EventBus.emit('world:updated', { state: world })
  }

  EventBus.on('player:talk', onTalk)
  EventBus.on('player:speak_to', onSpeakTo)
  EventBus.on('player:travel', onTravel)
  EventBus.on('player:choose', onChoose)
  EventBus.on('game:speed', onSpeed)
  EventBus.on('game:difficulty', onDifficulty)
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
    EventBus.off('game:difficulty', onDifficulty)
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
