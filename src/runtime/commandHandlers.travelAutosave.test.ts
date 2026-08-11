// src/runtime/commandHandlers.travelAutosave.test.ts
// Recovery row (f)'s travel half (03-opening-experience.md) — split into its
// own file rather than added to CommandWiring.test.ts (174/200, no room) or
// commandHandlers.ts itself. Tests onTravel directly, the same shape
// CommandWiring.test.ts already uses for onSettle's opening-complete
// autosave: TravelSystem and persistence are mocked, world is real.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../game-engine/TravelSystem', () => ({ startTravel: vi.fn() }))
vi.mock('../game-engine/persistence', () => ({
  saveGame: vi.fn(() => Promise.resolve()),
}))

import { startTravel } from '../game-engine/TravelSystem'
import { saveGame } from '../game-engine/persistence'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { onTravel } from './commandHandlers'

describe('onTravel autosave (recovery row (f), travel half)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setWorld(createInitialState())
  })

  it('autosaves once when travel actually starts (idle -> traveling)', () => {
    vi.mocked(startTravel).mockImplementationOnce(() => {
      world.player.state = 'traveling' // the real startTravel's own success mutation
    })

    onTravel({ targetVillageId: 'hagg' })

    expect(startTravel).toHaveBeenCalledWith('hagg')
    expect(saveGame).toHaveBeenCalledTimes(1)
    expect(saveGame).toHaveBeenCalledWith(world)
  })

  it('does not autosave when travel is refused and the player stays idle', () => {
    // Default mock: a no-op, mirroring TravelSystem's own silent refusal for
    // "ordinary fumbling" (same-location/already-traveling — TravelSystem.ts's
    // own comment).
    onTravel({ targetVillageId: 'hagg' })

    expect(saveGame).not.toHaveBeenCalled()
  })

  it('does not autosave on a replayed dispatch while already traveling', () => {
    world.player.state = 'traveling'
    // startTravel's own already-traveling refusal is also a no-op; state
    // stays 'traveling' throughout, so `wasTraveling` was already true.

    onTravel({ targetVillageId: 'red_wall_sietch' })

    expect(saveGame).not.toHaveBeenCalled()
  })
})
