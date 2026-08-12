// src/game-engine/economy/prospectRun.test.ts
//
// Focused on the sietch-find outcome and prescience's Awareness gate: before
// this fix, canSenseHidden had zero callers and every sietch roll revealed a
// hidden village regardless of level. runProspectDay now takes an injected
// RngService (docs/PRD/game-completion/02-runtime-consolidation.md
// "Randomness") instead of calling Math.random() directly, so rolls are
// rigged with a fake service that returns a fixed queue of values rather
// than a Math.random spy.

import { describe, it, expect, beforeEach } from 'vitest'
import { runProspectDay } from './prospectRun'
import { world, setWorld, createInitialState } from '../GameState'
import { AWARENESS } from '../prescience/prescience'
import type { RngService } from '../rng/rng'

/** A fake RngService that returns a fixed queue of next() values in order. */
function queuedRng(values: number[]): RngService {
  const queue = [...values]
  return {
    next: () => queue.shift() ?? 0,
    int: (max: number) => Math.floor((queue.shift() ?? 0) * max),
    pick: <T>(items: readonly T[]): T => items[0],
    state: () => ({ seed: 0, step: values.length - queue.length }),
  }
}

/**
 * Rig one prospecting crew and queue the three rolls runProspectDay draws:
 * one for revealDesertSite's deep-desert check (set above DEEP_DESERT_CHANCE
 * so it exits before drawing further), then findRoll and tableRoll for the
 * crew's own roll. tableRoll >= 0.95 lands on the 'sietch' outcome.
 */
let rng: RngService

function riggedSietchRoll(): void {
  setWorld(createInitialState())
  // The canonical opening starts with no operational crew (00-index.md
  // "Opening state"; 02-runtime-consolidation.md "Crew lifecycle") — a new
  // campaign has none before the first pledge. This is a prospecting-mechanics
  // fixture, not an opening-state one, so it stands up its own crew rather
  // than relying on the old default starting crew.
  world.troopGroups = [{
    id: 'group_tabr_1', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
    size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60, task: 'idle', taskTargetId: null, changeoverDaysLeft: 0,
  }]
  const crew = world.troopGroups.find(g => g.id === 'group_tabr_1')!
  crew.task = 'prospect'
  crew.taskTargetId = null // regionId falls back to crew.locationId: 'sietch_tabr'
  crew.changeoverDaysLeft = 0

  rng = queuedRng([
    0.99, // revealDesertSite: above DEEP_DESERT_CHANCE, no-op
    0.0, // findRoll: comfortably under any positive chance
    0.99, // tableRoll: >= 0.95 -> 'sietch'
  ])
}

describe('runProspectDay: sietch outcome gated on Awareness', () => {
  beforeEach(riggedSietchRoll)

  it('without Awareness, reveals nothing, counts no find, and stays silent', () => {
    world.player.prescience = 0
    const undiscoveredBefore = world.villages.filter(v => !v.discovered).map(v => v.id)
    expect(undiscoveredBefore.length).toBeGreaterThan(0) // sanity: there is something to find

    runProspectDay(rng)

    const undiscoveredAfter = world.villages.filter(v => !v.discovered).map(v => v.id)
    expect(undiscoveredAfter).toEqual(undiscoveredBefore)
    expect(world.flags['finds.sietch_tabr']).toBeUndefined()
    expect(world.events).toHaveLength(0)
  })

  it('at Awareness or above, reveals an undiscovered village and counts the find', () => {
    world.player.prescience = AWARENESS
    const firstHidden = world.villages.find(v => !v.discovered)
    expect(firstHidden).toBeDefined()

    runProspectDay(rng)

    expect(firstHidden!.discovered).toBe(true)
    expect(world.flags['finds.sietch_tabr']).toBe(1)
    expect(world.events).toHaveLength(1)
    expect(world.events[0].message).toContain('sietch')
  })
})
