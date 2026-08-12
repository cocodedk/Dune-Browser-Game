// src/ui/store.selection.test.ts
// 02 "Crew lifecycle": "A destroyed crew cannot remain selectable." Proven
// at the UI store, not just the engine command — a dissolved/merged crew
// (troops/casualty.ts) must fall out of `selectedGroupId` the moment
// `world:updated` fires, the same way `selectedVillage`/`selectedRegion`
// already re-resolve against the freshly loaded world.

import { describe, it, expect } from 'vitest'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { createInitialState } from '../game-engine/GameState'
import type { TroopGroup } from '../game-engine/troops/types'

function crew(id: string): TroopGroup {
  return {
    id, homeSietchId: 'sietch_a', locationId: 'sietch_a', size: 30,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 }, morale: 60,
    task: 'idle', taskTargetId: null, changeoverDaysLeft: 0,
  }
}

describe('selectedGroupId: dropped when the world no longer has the crew', () => {
  it('clears the selection on world:updated once the crew is gone', () => {
    const withCrew = createInitialState()
    withCrew.troopGroups = [crew('g1')]
    EventBus.emit('world:updated', { state: withCrew })
    useGameStore.getState().selectGroup('g1')
    expect(useGameStore.getState().selectedGroupId).toBe('g1')

    const withoutCrew = createInitialState()
    withoutCrew.troopGroups = [] // dissolved
    EventBus.emit('world:updated', { state: withoutCrew })

    expect(useGameStore.getState().selectedGroupId).toBeNull()
  })

  it('keeps the selection when the crew survives an unrelated world update', () => {
    const withCrew = createInitialState()
    withCrew.troopGroups = [crew('g1'), crew('g2')]
    EventBus.emit('world:updated', { state: withCrew })
    useGameStore.getState().selectGroup('g1')

    const stillHasIt = { ...withCrew, time: withCrew.time + 60 }
    EventBus.emit('world:updated', { state: stillHasIt })

    expect(useGameStore.getState().selectedGroupId).toBe('g1')
  })
})
