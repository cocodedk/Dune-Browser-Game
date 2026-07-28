// src/runtime/CommandWiring.ts
// Renderer-agnostic wiring: every EventBus command a UI panel (or the
// renderer's own view) can issue is translated here into an engine call.
// This is the one place allowed to write world.speed / world.difficulty —
// no file under src/game-render/ may assign to `world`.

import { world } from '../game-engine/GameState'
import { startTravel } from '../game-engine/TravelSystem'
import { chooseDialogue, startDialogue } from '../game-engine/DialogueSystem'
import { pushEvent } from '../game-engine/EventSystem'
import { decideVisit } from './VisitPolicy'
import { pledgePlayerSietch, assignPlayerSietchTask, stopPlayerSietchTask } from '../game-engine/SietchSystem'
import { attackVillage, scoutVillage } from '../game-engine/CombatSystem'
import {
  assignCrew, buyEquipment, issueEquipment, assaultFort,
} from '../game-engine/EconomySystem'
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
    if (action.kind === 'dialogue') startDialogue(action.treeId, action.villageId)
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
  const onPledge = ({ villageId }: BusEvents['player:pledge_sietch']): void => {
    pledgePlayerSietch(villageId)
  }
  const onAssignTask = ({ villageId, task }: BusEvents['player:assign_sietch_task']): void => {
    assignPlayerSietchTask(villageId, task)
  }
  const onStopTask = ({ villageId }: BusEvents['player:stop_sietch_task']): void => {
    stopPlayerSietchTask(villageId)
  }
  const onAttack = ({ targetVillageId, troopsCommitted }: BusEvents['player:attack_village']): void => {
    attackVillage(targetVillageId, troopsCommitted)
  }
  const onScout = ({ targetVillageId }: BusEvents['player:scout_village']): void => {
    scoutVillage(targetVillageId)
  }
  const onAssignCrew = ({ groupId, task, targetId }: BusEvents['player:assign_crew']): void => {
    assignCrew(groupId, task, targetId)
  }
  const onBuy = ({ kind }: BusEvents['player:buy_equipment']): void => {
    buyEquipment(kind)
  }
  const onIssue = ({ equipmentId, groupId }: BusEvents['player:issue_equipment']): void => {
    issueEquipment(equipmentId, groupId)
  }
  const onAssault = ({ fortId }: BusEvents['player:assault_fort']): void => {
    assaultFort(fortId)
  }
  const onPause = ({ paused }: BusEvents['game:pause']): void => {
    world.paused = paused
    EventBus.emit('world:updated', { state: world })
  }

  EventBus.on('player:talk', onTalk)
  EventBus.on('player:travel', onTravel)
  EventBus.on('player:choose', onChoose)
  EventBus.on('game:speed', onSpeed)
  EventBus.on('game:difficulty', onDifficulty)
  EventBus.on('player:pledge_sietch', onPledge)
  EventBus.on('player:assign_sietch_task', onAssignTask)
  EventBus.on('player:stop_sietch_task', onStopTask)
  EventBus.on('player:attack_village', onAttack)
  EventBus.on('player:scout_village', onScout)
  EventBus.on('player:assign_crew', onAssignCrew)
  EventBus.on('player:buy_equipment', onBuy)
  EventBus.on('player:issue_equipment', onIssue)
  EventBus.on('player:assault_fort', onAssault)
  EventBus.on('game:pause', onPause)

  return () => {
    EventBus.off('player:travel', onTravel)
    EventBus.off('player:choose', onChoose)
    EventBus.off('game:speed', onSpeed)
    EventBus.off('game:difficulty', onDifficulty)
    EventBus.off('player:pledge_sietch', onPledge)
    EventBus.off('player:assign_sietch_task', onAssignTask)
    EventBus.off('player:stop_sietch_task', onStopTask)
    EventBus.off('player:attack_village', onAttack)
    EventBus.off('player:scout_village', onScout)
    EventBus.off('player:assign_crew', onAssignCrew)
    EventBus.off('player:buy_equipment', onBuy)
    EventBus.off('player:issue_equipment', onIssue)
    EventBus.off('player:assault_fort', onAssault)
    EventBus.off('game:pause', onPause)
  }
}
