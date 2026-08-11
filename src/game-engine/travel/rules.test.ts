// src/game-engine/travel/rules.test.ts

import { describe, it, expect } from 'vitest'
import {
  travelDurationFor,
  regionsAdjacent,
  checkTravel,
  rejectionMessage,
} from './rules'
import type { TravelNode, TravelMode, TravelRejection } from './rules'

function node(overrides: Partial<TravelNode> = {}): TravelNode {
  return {
    id: 'a',
    position: { x: 0, y: 0 },
    regionId: 'r1',
    discovered: true,
    ...overrides,
  }
}

const ADJACENCY = {
  r1: ['r2'],
  r2: ['r1', 'r3'],
  r3: ['r2'],
  r4: [],
} as const

// ---------------------------------------------------------------------------
// travelDurationFor
// ---------------------------------------------------------------------------

describe('travelDurationFor', () => {
  const from = node({ position: { x: 0, y: 0 } })
  const far = node({ id: 'b', position: { x: 1500, y: 0 } })

  it('is faster by thopter than on foot', () => {
    expect(travelDurationFor(from, far, 'thopter'))
      .toBeLessThan(travelDurationFor(from, far, 'foot'))
  })

  it('enforces a minimum duration for very short hops', () => {
    const near = node({ id: 'b', position: { x: 5, y: 0 } })
    expect(travelDurationFor(from, near, 'thopter')).toBe(4)
  })

  it('scales with distance', () => {
    const mid = node({ id: 'b', position: { x: 750, y: 0 } })
    expect(travelDurationFor(from, mid, 'foot'))
      .toBeLessThan(travelDurationFor(from, far, 'foot'))
  })

  it('is symmetric', () => {
    expect(travelDurationFor(from, far, 'foot')).toBe(travelDurationFor(far, from, 'foot'))
  })

  it('treats the long-range thopter as the same speed as a thopter', () => {
    // The long-range model buys range, not speed.
    expect(travelDurationFor(from, far, 'lr_thopter'))
      .toBe(travelDurationFor(from, far, 'thopter'))
  })
})

// ---------------------------------------------------------------------------
// regionsAdjacent
// ---------------------------------------------------------------------------

describe('regionsAdjacent', () => {
  it('treats a region as adjacent to itself', () => {
    expect(regionsAdjacent('r1', 'r1', ADJACENCY)).toBe(true)
    expect(regionsAdjacent('r4', 'r4', ADJACENCY)).toBe(true)
  })

  it('honours declared adjacency', () => {
    expect(regionsAdjacent('r1', 'r2', ADJACENCY)).toBe(true)
    expect(regionsAdjacent('r2', 'r3', ADJACENCY)).toBe(true)
  })

  it('rejects non-adjacent regions', () => {
    expect(regionsAdjacent('r1', 'r3', ADJACENCY)).toBe(false)
  })

  it('rejects an unknown region without throwing', () => {
    expect(regionsAdjacent('r1', 'nowhere', ADJACENCY)).toBe(false)
    expect(regionsAdjacent('nowhere', 'r1', ADJACENCY)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkTravel
// ---------------------------------------------------------------------------

describe('checkTravel', () => {
  const from = node({ id: 'from', regionId: 'r1' })

  function check(
    to: TravelNode | undefined, mode: TravelMode = 'thopter', isTraveling = false,
    mandatoryDialogueOpen = false,
  ) {
    return checkTravel({ from, to, mode, isTraveling, adjacency: ADJACENCY, mandatoryDialogueOpen })
  }

  it('allows a discovered adjacent destination', () => {
    const result = check(node({ id: 'to', regionId: 'r2', position: { x: 600, y: 0 } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.durationSeconds).toBeGreaterThan(0)
  })

  it('rejects travel while already under way', () => {
    const result = check(node({ id: 'to', regionId: 'r2' }), 'thopter', true)
    expect(result).toEqual({ ok: false, reason: 'already-traveling' })
  })

  it('rejects a missing destination', () => {
    expect(check(undefined)).toEqual({ ok: false, reason: 'unknown-location' })
  })

  it('rejects travelling to where you already are', () => {
    expect(check(node({ id: 'from', regionId: 'r1' })))
      .toEqual({ ok: false, reason: 'same-location' })
  })

  it('rejects an undiscovered destination', () => {
    // The engine must refuse this, not merely the UI — a replayed bus event or
    // a stale panel would otherwise teleport the player somewhere unknown.
    const result = check(node({ id: 'to', regionId: 'r2', discovered: false }))
    expect(result).toEqual({ ok: false, reason: 'undiscovered' })
  })

  it('rejects a non-adjacent region without a long-range thopter', () => {
    expect(check(node({ id: 'to', regionId: 'r3' }), 'foot'))
      .toEqual({ ok: false, reason: 'out-of-range' })
    expect(check(node({ id: 'to', regionId: 'r3' }), 'thopter'))
      .toEqual({ ok: false, reason: 'out-of-range' })
  })

  it('allows any region with a long-range thopter', () => {
    const result = check(node({ id: 'to', regionId: 'r3', position: { x: 900, y: 0 } }), 'lr_thopter')
    expect(result.ok).toBe(true)
  })

  it('still refuses an undiscovered destination even with a long-range thopter', () => {
    // Range and knowledge are separate gates; buying the thopter must not
    // reveal the map.
    const result = check(
      node({ id: 'to', regionId: 'r3', discovered: false }),
      'lr_thopter',
    )
    expect(result).toEqual({ ok: false, reason: 'undiscovered' })
  })

  it('reports already-traveling ahead of other problems', () => {
    const result = checkTravel({
      from,
      to: undefined,
      mode: 'foot',
      isTraveling: true,
      adjacency: ADJACENCY,
    })
    expect(result).toEqual({ ok: false, reason: 'already-traveling' })
  })

  // W3i remediation: the blind-play re-check's softlock repro was travel
  // starting while a mandatory beat (DialogueSystem.ts's canCloseDialogue)
  // was still open. The engine, not just the UI, must refuse this.
  it('refuses travel while a mandatory dialogue is open, ahead of an otherwise-legal destination', () => {
    const to = node({ id: 'to', regionId: 'r2', position: { x: 600, y: 0 } })
    expect(check(to, 'thopter', false, true)).toEqual({ ok: false, reason: 'finish-the-conversation' })
  })

  it('allows travel once the mandatory dialogue is no longer open', () => {
    const to = node({ id: 'to', regionId: 'r2', position: { x: 600, y: 0 } })
    expect(check(to, 'thopter', false, false).ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// rejectionMessage
// ---------------------------------------------------------------------------

describe('rejectionMessage', () => {
  it('gives a distinct non-empty message for every reason', () => {
    const reasons: TravelRejection[] = [
      'same-location',
      'already-traveling',
      'unknown-location',
      'undiscovered',
      'out-of-range',
      'finish-the-conversation',
    ]
    const messages = reasons.map(rejectionMessage)
    expect(new Set(messages).size).toBe(reasons.length)
    for (const m of messages) expect(m.length).toBeGreaterThan(0)
  })
})
