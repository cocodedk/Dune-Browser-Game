// src/game-engine/crews/placement.test.ts

import { describe, it, expect } from 'vitest'
import { placeCrews, scatterOffset, isWorking } from './placement'
import type { CrewInput } from './placement'

const FIELDS = ['field_tabr_shallows', 'field_red_wall_pan']

const crew = (over: Partial<CrewInput> = {}): CrewInput => ({
  id: 'g1',
  locationId: 'sietch_tabr',
  size: 30,
  task: 'idle',
  taskTargetId: null,
  changeoverDaysLeft: 0,
  ...over,
})

describe('placeCrews', () => {
  it('puts a harvesting crew on its field', () => {
    const [p] = placeCrews(
      [crew({ task: 'harvest', taskTargetId: 'field_tabr_shallows' })],
      FIELDS, new Set(),
    )
    expect(p.atField).toBe(true)
    expect(p.anchorId).toBe('field_tabr_shallows')
    expect(p.activity).toBe('harvesting')
  })

  it('keeps everyone else at their settlement', () => {
    for (const task of ['prospect', 'ecology', 'train', 'idle']) {
      const [p] = placeCrews([crew({ task })], FIELDS, new Set())
      expect(p.atField).toBe(false)
      expect(p.anchorId).toBe('sietch_tabr')
    }
  })

  it('falls back to the settlement when the field does not exist', () => {
    // A crew assigned to a field that has since been removed must still be
    // drawn somewhere, not dropped off the map.
    const [p] = placeCrews(
      [crew({ task: 'harvest', taskTargetId: 'field_gone' })],
      FIELDS, new Set(),
    )
    expect(p.atField).toBe(false)
    expect(p.anchorId).toBe('sietch_tabr')
  })

  it('reports a harvester only for the crews that have one', () => {
    const crews = [crew({ id: 'a' }), crew({ id: 'b' })]
    const placed = placeCrews(crews, FIELDS, new Set(['a']))
    expect(placed.find(p => p.groupId === 'a')?.hasHarvester).toBe(true)
    expect(placed.find(p => p.groupId === 'b')?.hasHarvester).toBe(false)
  })

  it('flags a crew still in changeover', () => {
    const [p] = placeCrews([crew({ task: 'harvest', changeoverDaysLeft: 2 })], FIELDS, new Set())
    expect(p.idleThisDay).toBe(true)
  })

  it('names an activity for every task, including unknown ones', () => {
    for (const task of ['harvest', 'prospect', 'ecology', 'train', 'garrison', 'idle', 'sleep']) {
      expect(placeCrews([crew({ task })], FIELDS, new Set())[0].activity).toBeTruthy()
    }
  })

  it('places every crew it is given', () => {
    const crews = Array.from({ length: 9 }, (_, i) => crew({ id: `g${i}` }))
    expect(placeCrews(crews, FIELDS, new Set())).toHaveLength(9)
  })
})

describe('scatterOffset', () => {
  it('is stable for the same crew', () => {
    expect(scatterOffset('g1', 0)).toEqual(scatterOffset('g1', 0))
  })

  it('separates different crews', () => {
    expect(scatterOffset('g1', 0)).not.toEqual(scatterOffset('g2', 0))
  })

  it('separates the same crew at different slots', () => {
    expect(scatterOffset('g1', 0)).not.toEqual(scatterOffset('g1', 1))
  })

  it('stays within a sane radius', () => {
    for (const id of ['a', 'bb', 'sietch_tabr_crew_3', '']) {
      for (let i = 0; i < 5; i++) {
        const o = scatterOffset(id, i)
        expect(Math.hypot(o.x, o.y)).toBeLessThanOrEqual(1.01)
      }
    }
  })
})

describe('isWorking', () => {
  it('counts a producing crew as working', () => {
    const [p] = placeCrews([crew({ task: 'harvest', taskTargetId: FIELDS[0] })], FIELDS, new Set())
    expect(isWorking(p)).toBe(true)
  })

  it('does not count a resting or changing-over crew', () => {
    const [idle] = placeCrews([crew({ task: 'idle' })], FIELDS, new Set())
    expect(isWorking(idle)).toBe(false)

    const [changing] = placeCrews(
      [crew({ task: 'prospect', changeoverDaysLeft: 1 })], FIELDS, new Set(),
    )
    expect(isWorking(changing)).toBe(false)
  })
})
