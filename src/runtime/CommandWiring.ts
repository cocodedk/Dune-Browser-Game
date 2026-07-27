// src/runtime/CommandWiring.ts
// Renderer-agnostic wiring: every EventBus command a UI panel (or the
// renderer's own view) can issue is translated here into an engine call.
// This is the one place allowed to write world.speed / world.difficulty —
// no file under src/game-render/ may assign to `world`.

import { world } from '../game-engine/GameState'
import { startTravel } from '../game-engine/TravelSystem'
import { chooseDialogue } from '../game-engine/DialogueSystem'
import { pledgePlayerSietch, assignPlayerSietchTask, stopPlayerSietchTask } from '../game-engine/SietchSystem'
import { attackVillage, scoutVillage } from '../game-engine/CombatSystem'
import { EventBus } from '../EventBus'
import type { BusEvents } from '../types'

/**
 * Registers every EventBus command handler that drives the engine.
 * Returns an unsubscribe function that removes all of them.
 */
export function wireCommands(): () => void {
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
  const onPause = ({ paused }: BusEvents['game:pause']): void => {
    world.paused = paused
    EventBus.emit('world:updated', { state: world })
  }

  EventBus.on('player:travel', onTravel)
  EventBus.on('player:choose', onChoose)
  EventBus.on('game:speed', onSpeed)
  EventBus.on('game:difficulty', onDifficulty)
  EventBus.on('player:pledge_sietch', onPledge)
  EventBus.on('player:assign_sietch_task', onAssignTask)
  EventBus.on('player:stop_sietch_task', onStopTask)
  EventBus.on('player:attack_village', onAttack)
  EventBus.on('player:scout_village', onScout)
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
    EventBus.off('game:pause', onPause)
  }
}
