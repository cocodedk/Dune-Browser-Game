// Regression: event ids must stay unique across a page reload. A restored
// save carries evt-N ids from the previous session while the module counter
// restarts at zero; without resync, new events collide with restored ones
// and the EventLog renders duplicate React keys (found live in the WP02
// browser trace).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pushEvent, resetEvents } from './EventSystem'
import { world, setWorld, createInitialState } from './GameState'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

beforeEach(() => {
  resetEvents()
})

describe('event ids after a restored save', () => {
  it('never reissues an id already present in the restored log', () => {
    const state = createInitialState()
    state.events = [
      { id: 'evt-6', type: 'village_selected', message: 'restored', timestamp: 5 },
      { id: 'evt-5', type: 'village_selected', message: 'restored', timestamp: 4 },
    ]
    setWorld(state)

    const fresh = pushEvent('village_selected', 'new after reload')
    expect(fresh.id).toBe('evt-7')

    const ids = world.events.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('still counts from one on a genuinely fresh campaign', () => {
    setWorld(createInitialState())
    expect(pushEvent('village_selected', 'first').id).toBe('evt-1')
    expect(pushEvent('village_selected', 'second').id).toBe('evt-2')
  })
})
