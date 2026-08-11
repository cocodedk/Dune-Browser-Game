// src/runtime/CommandWiring.test.ts
// Every bus command must reach its engine call, and unsubscribe must stop
// all of them. Uses the real EventBus (not mocked) to exercise the actual
// on/off wiring; only the engine modules are mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../game-engine/TravelSystem', () => ({ startTravel: vi.fn() }))
vi.mock('../game-engine/DialogueSystem', () => ({ chooseDialogue: vi.fn() }))
vi.mock('../game-engine/SietchSystem', () => ({
  assignPlayerSietchTask: vi.fn(),
  stopPlayerSietchTask: vi.fn(),
}))
vi.mock('../game-engine/commands/pledgeCommand', () => ({
  runPledgeCommand: vi.fn(() => ({ ok: true, code: 'pledged' })),
}))
vi.mock('../game-engine/SietchVisitSystem', () => ({
  giftPlayerSietch: vi.fn(() => ({ ok: true, code: 'gifted' })),
}))
vi.mock('../game-engine/CombatSystem', () => ({
  attackVillage: vi.fn(),
  scoutVillage: vi.fn(),
}))

import { startTravel } from '../game-engine/TravelSystem'
import { chooseDialogue } from '../game-engine/DialogueSystem'
import { assignPlayerSietchTask, stopPlayerSietchTask } from '../game-engine/SietchSystem'
import { runPledgeCommand } from '../game-engine/commands/pledgeCommand'
import { giftPlayerSietch } from '../game-engine/SietchVisitSystem'
import { attackVillage, scoutVillage } from '../game-engine/CombatSystem'
import { EventBus } from '../EventBus'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { wireCommands } from './CommandWiring'

describe('wireCommands', () => {
  let unwire: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    setWorld(createInitialState())
    unwire = wireCommands()
  })

  afterEach(() => {
    unwire()
  })

  it('routes player:travel to startTravel', () => {
    EventBus.emit('player:travel', { targetVillageId: 'arrakeen' })
    expect(startTravel).toHaveBeenCalledWith('arrakeen')
  })

  it('routes player:choose to chooseDialogue', () => {
    EventBus.emit('player:choose', { choiceId: 'offer_help' })
    expect(chooseDialogue).toHaveBeenCalledWith('offer_help')
  })

  it('routes player:pledge_sietch through the runPledgeCommand dispatch seam', () => {
    EventBus.emit('player:pledge_sietch', { villageId: 'sietch_tabr' })
    expect(runPledgeCommand).toHaveBeenCalledWith('sietch_tabr')
  })

  it('publishes a refusal toast when runPledgeCommand refuses, and nothing on success', () => {
    vi.mocked(runPledgeCommand).mockReturnValueOnce({ ok: false, reason: 'not-loyal-enough' })
    const before = world.events.length

    EventBus.emit('player:pledge_sietch', { villageId: 'sietch_tabr' })
    expect(world.events.length).toBe(before + 1)
    expect(world.events[0].message).toBe('They do not trust you enough yet.')

    EventBus.emit('player:pledge_sietch', { villageId: 'sietch_tabr' }) // default mock: success
    expect(world.events.length).toBe(before + 1) // no second event from this seam
  })

  it('routes player:gift_sietch to giftPlayerSietch', () => {
    EventBus.emit('player:gift_sietch', { villageId: 'sietch_tabr' })
    expect(giftPlayerSietch).toHaveBeenCalledWith('sietch_tabr')
  })

  it('routes player:assign_sietch_task to assignPlayerSietchTask', () => {
    EventBus.emit('player:assign_sietch_task', { villageId: 'sietch_tabr', task: 'harvest_spice' })
    expect(assignPlayerSietchTask).toHaveBeenCalledWith('sietch_tabr', 'harvest_spice')
  })

  it('routes player:stop_sietch_task to stopPlayerSietchTask', () => {
    EventBus.emit('player:stop_sietch_task', { villageId: 'sietch_tabr' })
    expect(stopPlayerSietchTask).toHaveBeenCalledWith('sietch_tabr')
  })

  it('routes player:attack_village to attackVillage', () => {
    EventBus.emit('player:attack_village', { targetVillageId: 'arrakeen', troopsCommitted: 5 })
    expect(attackVillage).toHaveBeenCalledWith('arrakeen', 5)
  })

  it('routes player:scout_village to scoutVillage', () => {
    EventBus.emit('player:scout_village', { targetVillageId: 'arrakeen' })
    expect(scoutVillage).toHaveBeenCalledWith('arrakeen')
  })

  it('game:speed sets world.speed and re-broadcasts world:updated', () => {
    let seen: number | null = null
    const onUpdated = ({ state }: { state: typeof world }): void => { seen = state.speed }
    EventBus.on('world:updated', onUpdated)

    EventBus.emit('game:speed', { speed: 5 })

    expect(world.speed).toBe(5)
    expect(seen).toBe(5)
    EventBus.off('world:updated', onUpdated)
  })

  it('game:difficulty sets world.difficulty and re-broadcasts world:updated', () => {
    let seen: string | null = null
    const onUpdated = ({ state }: { state: typeof world }): void => { seen = state.difficulty }
    EventBus.on('world:updated', onUpdated)

    EventBus.emit('game:difficulty', { difficulty: 'hard' })

    expect(world.difficulty).toBe('hard')
    expect(seen).toBe('hard')
    EventBus.off('world:updated', onUpdated)
  })

  it('unsubscribe stops routing further commands', () => {
    unwire()
    EventBus.emit('player:travel', { targetVillageId: 'arrakeen' })
    expect(startTravel).not.toHaveBeenCalled()
  })
})
