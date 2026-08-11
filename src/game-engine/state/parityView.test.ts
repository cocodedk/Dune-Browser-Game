// src/game-engine/state/parityView.test.ts
// WP04 chunk W4b: parityView.ts's own required unit proof (progress.md
// Round 16's brief) — two worlds differing only in the excluded fields hash
// equal; a real content difference still hashes different.

import { describe, it, expect } from 'vitest'
import { parityView, parityHash } from './parityView'
import { hashState } from './hash'
import { createInitialState } from '../GameState'

describe('parityHash', () => {
  it('is equal for two worlds differing only in events', () => {
    const a = createInitialState(5)
    const b = createInitialState(5)
    b.events = [{ id: 'evt-1', type: 'attack', message: 'A maker takes the crew.', timestamp: 12.5 }]

    expect(parityHash(a)).toBe(parityHash(b))
    // Sanity: the SAME two states do NOT hash equal under the full save
    // hash — proves this is a real exclusion, not a vacuously-equal pair.
    expect(hashState(a)).not.toBe(hashState(b))
  })

  it('is equal for two worlds differing only in wormSightings', () => {
    const a = createInitialState(5)
    const b = createInitialState(5)
    b.wormSightings = [{ fieldId: 'field_red_wall_pan', atTime: 723.041 }]

    expect(parityHash(a)).toBe(parityHash(b))
    expect(hashState(a)).not.toBe(hashState(b))
  })

  it('is equal when both events and wormSightings differ at once', () => {
    const a = createInitialState(5)
    const b = createInitialState(5)
    b.events = [{ id: 'evt-9', type: 'attack', message: 'Harkonnen raiders sighted.', timestamp: 60 }]
    b.wormSightings = [{ fieldId: 'field_tabr_shallows', atTime: 61.2 }]

    expect(parityHash(a)).toBe(parityHash(b))
  })

  it('differs when spice differs (a real content change is never hidden)', () => {
    const a = createInitialState(5)
    const b = createInitialState(5)
    b.player.spice += 1

    expect(parityHash(a)).not.toBe(parityHash(b))
  })

  it('differs when rng step differs, even with everything else equal', () => {
    const a = createInitialState(5)
    const b = createInitialState(5)
    b.rng = { ...b.rng, step: b.rng.step + 1 }

    expect(parityHash(a)).not.toBe(parityHash(b))
  })

  it('is equal for two independently-built but equal states (not vacuously true)', () => {
    const a = createInitialState(9)
    const b = createInitialState(9)
    expect(parityHash(a)).toBe(parityHash(b))
  })

  it('omits events/wormSightings from the view but keeps time, rng, and flags', () => {
    const world = createInitialState(3)
    world.time = 723
    const view = parityView(world) as Record<string, unknown>
    expect(view).not.toHaveProperty('events')
    expect(view).not.toHaveProperty('wormSightings')
    expect(view.time).toBe(723)
    expect(view.rng).toEqual({ seed: 3, step: 0 })
    expect(view).toHaveProperty('flags')
    // Inherited from toCanonicalState — still excluded here too.
    expect(view).not.toHaveProperty('goalAchieved')
    expect(view).not.toHaveProperty('factionProfiles')
    expect(view).not.toHaveProperty('paused')
  })
})
