// src/runtime/commandHandlers.ts
// Handler bodies for every EventBus command CommandWiring.ts registers.
//
// Split out of CommandWiring.ts (chunk W3b): that file was at 192/200 lines
// before this split, and the title/new-campaign wiring this chunk still
// needed would have pushed it over even after removing the retired
// game:difficulty handler (see types.bus.ts). CommandWiring.ts now stays a
// thin registration table; every handler's actual logic — and the doc
// comments explaining each one's refusal-mapping shape — lives here.

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
 * Speak to whoever is here.
 *
 * Reuses the same decision the map click uses, so standing in a sietch and
 * clicking "Speak" opens exactly the conversation that clicking the sietch
 * from the map would.
 */
export const onTalk = (): void => {
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
export const onSpeakTo = ({ characterId }: BusEvents['player:speak_to']): void => {
  const action = decideSpeakTo(world, characterId)
  if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId, action.nodeId)
  else if (action.kind === 'event') pushEvent('village_selected', action.message)
}

/**
 * Recovery row (f)'s travel half (03-opening-experience.md: "Closes during
 * travel or settlement | Autosave restores the same travel or pending-
 * decision state without duplication"). Same edge-detected, fire-and-forget
 * shape as onSettle's own opening-complete autosave below: startTravel is a
 * pure engine mutation with no save call of its own (TravelSystem.ts stays
 * IO-free), so this wiring layer is the one place that decides WHEN to
 * persist — checked by state transition (idle/other -> traveling across
 * this exact call), not a live re-check of travelCheckTo, so a refused
 * dispatch (already traveling, unreachable target, same location) saves
 * nothing.
 */
export const onTravel = ({ targetVillageId }: BusEvents['player:travel']): void => {
  const wasTraveling = world.player.state === 'traveling'
  startTravel(targetVillageId)
  if (!wasTraveling && world.player.state === 'traveling') {
    void saveGame(world).catch(() => {})
  }
}
export const onChoose = ({ choiceId }: BusEvents['player:choose']): void => {
  chooseDialogue(choiceId)
}
export const onSpeed = ({ speed }: BusEvents['game:speed']): void => {
  world.speed = speed
  // Choosing a speed IS choosing to run: clear the manual pause so 0× and a
  // speed button can never both read as active at once (the blind delta
  // re-check's control-desync finding — 0× [pressed] beside 5× [active]
  // with nothing moving).
  world.paused = false
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
export const onPledge = ({ villageId }: BusEvents['player:pledge_sietch']): void => {
  const outcome = runPledgeCommand(villageId)
  if (!outcome.ok) pushEvent('sietch_pledged', pledgeChainRefusalMessage(outcome.reason))
}
/**
 * Same refusal-mapping shape as onPledge (chunk W2g — closes C3-FAIL,
 * finding 3b): giftPlayerSietch already returns a CommandOutcome; success
 * has already pushed its own event from inside it, so a refusal is the one
 * place this becomes player-visible text instead of a silent no-op.
 */
export const onGift = ({ villageId }: BusEvents['player:gift_sietch']): void => {
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
export const onAssignCrew = ({ groupId, task, targetId }: BusEvents['player:assign_crew']): void => {
  const outcome = runAssignCrewCommand(groupId, task, targetId)
  if (!outcome.ok) pushEvent('sietch_task_assigned', assignCrewRefusalMessage(outcome.reason))
}
export const onBuy = ({ kind }: BusEvents['player:buy_equipment']): void => {
  buyEquipment(kind)
}
export const onIssue = ({ equipmentId, groupId }: BusEvents['player:issue_equipment']): void => {
  const outcome = runIssueEquipmentCommand(equipmentId, groupId)
  if (!outcome.ok) pushEvent('sietch_task_assigned', issueRefusalMessage(outcome.reason))
}
export const onAssault = ({ fortId }: BusEvents['player:assault_fort']): void => {
  const outcome = runAssaultCommand(fortId)
  if (!outcome.ok) pushEvent('attack', assaultCommandRefusalMessage(outcome.reason))
}
/**
 * Settle the pending tribute decision (chunk W2c; see commands/
 * settleCommand.ts). Same refusal-mapping shape as onPledge: success
 * already published its own event from inside applySettlement, so a
 * refusal is the one place this becomes player-visible text.
 */
export const onSettle = ({ amount }: BusEvents['player:settle_tribute']): void => {
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
export const onAutoShip = ({ enabled, amount }: BusEvents['player:set_auto_ship']): void => {
  const outcome = runSetAutoShipCommand(enabled, amount)
  if (!outcome.ok) pushEvent('tribute_refused', autoShipRefusalMessage(outcome.reason))
}
export const onPause = ({ paused }: BusEvents['game:pause']): void => {
  world.paused = paused
  EventBus.emit('world:updated', { state: world })
}
