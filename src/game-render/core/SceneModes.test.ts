// src/game-render/core/SceneModes.test.ts

import { describe, it, expect } from 'vitest'
import type { SceneModeId } from '../../types'
import { nextMode } from './SceneModes'
import type { EngineSignal } from './SceneModes'

const ALL_MODES: SceneModeId[] = ['strategic', 'flight', 'location', 'conversation']
const ALL_SIGNALS: EngineSignal[] = [
  { kind: 'travel_start' },
  { kind: 'travel_complete' },
  { kind: 'dialogue_start' },
  { kind: 'dialogue_end' },
]

// ---------------------------------------------------------------------------
// travel_start
// ---------------------------------------------------------------------------

describe('nextMode: travel_start', () => {
  it('enters flight from strategic', () => {
    expect(nextMode('strategic', { kind: 'travel_start' })).toBe('flight')
  })

  it('enters flight from location', () => {
    expect(nextMode('location', { kind: 'travel_start' })).toBe('flight')
  })

  it('does not interrupt a conversation', () => {
    expect(nextMode('conversation', { kind: 'travel_start' })).toBe('conversation')
  })
})

// ---------------------------------------------------------------------------
// travel_complete
// ---------------------------------------------------------------------------

describe('nextMode: travel_complete', () => {
  it('lands in location from flight', () => {
    expect(nextMode('flight', { kind: 'travel_complete' })).toBe('location')
  })

  it('is a no-op when not flying', () => {
    expect(nextMode('strategic', { kind: 'travel_complete' })).toBe('strategic')
    expect(nextMode('location', { kind: 'travel_complete' })).toBe('location')
    expect(nextMode('conversation', { kind: 'travel_complete' })).toBe('conversation')
  })
})

// ---------------------------------------------------------------------------
// dialogue_start
// ---------------------------------------------------------------------------

describe('nextMode: dialogue_start', () => {
  it('enters conversation from any mode', () => {
    for (const mode of ALL_MODES) {
      expect(nextMode(mode, { kind: 'dialogue_start' })).toBe('conversation')
    }
  })
})

// ---------------------------------------------------------------------------
// dialogue_end
// ---------------------------------------------------------------------------

describe('nextMode: dialogue_end', () => {
  it('returns to the previous mode', () => {
    expect(nextMode('conversation', { kind: 'dialogue_end' }, 'location')).toBe('location')
    expect(nextMode('conversation', { kind: 'dialogue_end' }, 'strategic')).toBe('strategic')
  })

  it('defaults to strategic when no previous mode is supplied', () => {
    expect(nextMode('conversation', { kind: 'dialogue_end' })).toBe('strategic')
  })

  it('falls back to strategic rather than resuming a conversation', () => {
    expect(nextMode('conversation', { kind: 'dialogue_end' }, 'conversation')).toBe('strategic')
  })

  it('falls back to strategic rather than resuming a finished flight', () => {
    // Flight is a timed cinematic driven by the engine clock; by the time a
    // conversation ends the trip has moved on, so resuming it would desync.
    expect(nextMode('conversation', { kind: 'dialogue_end' }, 'flight')).toBe('strategic')
  })

  it('is a no-op when not in a conversation', () => {
    expect(nextMode('strategic', { kind: 'dialogue_end' }, 'location')).toBe('strategic')
    expect(nextMode('flight', { kind: 'dialogue_end' }, 'location')).toBe('flight')
  })
})

// ---------------------------------------------------------------------------
// Total function guarantee
// ---------------------------------------------------------------------------

describe('nextMode: never throws and always returns a valid mode', () => {
  it('handles every mode/signal/previous combination', () => {
    for (const mode of ALL_MODES) {
      for (const signal of ALL_SIGNALS) {
        for (const previous of ALL_MODES) {
          const result = nextMode(mode, signal, previous)
          expect(ALL_MODES).toContain(result)
        }
      }
    }
  })

  it('is idempotent for repeated dialogue_start', () => {
    const once = nextMode('strategic', { kind: 'dialogue_start' })
    expect(nextMode(once, { kind: 'dialogue_start' })).toBe(once)
  })
})
