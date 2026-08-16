// Regression: clicking a named resident must never be a silent no-op.
//
// The user's own report, 2026-08-16: at Arrakeen the five listed people did
// nothing when clicked. Measured cause — the PEOPLE HERE list stays visible
// and clickable beside an open dialogue (the overlay stops short of the
// command column), the opening's briefing auto-opens there and cannot be
// dismissed, and decideSpeakTo's `none` carried no reason for onSpeakTo to
// report. Travel had already been given this treatment (W3i's
// 'finish-the-conversation'); speaking had not.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { decideSpeakTo } from './VisitPolicy'
import { onSpeakTo } from './commandHandlers'
import { visitRefusalMessage } from './visitRefusal'
import { currentNode } from '../game-engine/DialogueSystem'
import { runtimeTick } from './runtimeTick'
import { world, setWorld, createInitialState } from '../game-engine/GameState'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

beforeEach(() => {
  setWorld(createInitialState())
})

describe('speaking to a named resident', () => {
  it('opens that person, not whoever the location lists first', () => {
    // vell is Thufir Hawat; duke_armand (Duke Leto) is listed before him at
    // Arrakeen, which is exactly the confusion this path exists to avoid.
    onSpeakTo({ characterId: 'vell' })
    expect(world.dialogue).not.toBeNull()
    expect(currentNode()?.speaker).toBe('Thufir Hawat')
  })

  it('refuses with a reason while a conversation is open, never in silence', () => {
    runtimeTick(0.016) // the real per-frame hook auto-opens the briefing
    expect(world.dialogue?.treeId).toBe('story/briefing')
    const openedOn = world.dialogue?.currentNodeId

    const decided = decideSpeakTo(world, 'vell')
    expect(decided).toEqual({ kind: 'none', reason: 'in-dialogue' })

    onSpeakTo({ characterId: 'vell' })
    // The briefing is untouched — and the player was told why.
    expect(world.dialogue?.currentNodeId).toBe(openedOn)
    expect(world.events[0]?.message).toBe(visitRefusalMessage('in-dialogue'))
  })

  it('refuses someone who is not at this location', () => {
    onSpeakTo({ characterId: 'shadir' }) // a resident of somewhere else
    expect(world.dialogue).toBeNull()
    expect(world.events[0]?.message).toBe(visitRefusalMessage('not-here'))
  })

  it('every refusal code has prose', () => {
    for (const reason of ['in-dialogue', 'traveling', 'not-here', 'unknown-person', 'unknown-place'] as const) {
      expect(visitRefusalMessage(reason).length).toBeGreaterThan(0)
    }
  })
})
