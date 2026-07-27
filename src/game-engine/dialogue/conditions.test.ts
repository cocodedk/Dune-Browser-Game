// src/game-engine/dialogue/conditions.test.ts

import { describe, it, expect } from 'vitest'
import {
  evaluateCondition,
  selectFirstMatch,
  applyFlagEffects,
} from './conditions'
import type { FlagCondition, FlagStore } from './conditions'

const FLAGS: FlagStore = {
  'met.shadir': true,
  'beat.duke_revelation': false,
  'quota.cycle': 3,
  'pledged.count': 2,
  charisma: 30,
}

// ---------------------------------------------------------------------------
// eq
// ---------------------------------------------------------------------------

describe('evaluateCondition: eq', () => {
  it('matches a true boolean flag', () => {
    expect(evaluateCondition({ op: 'eq', key: 'met.shadir', value: true }, FLAGS)).toBe(true)
  })

  it('matches a false boolean flag', () => {
    expect(evaluateCondition({ op: 'eq', key: 'beat.duke_revelation', value: false }, FLAGS)).toBe(true)
  })

  it('treats an unset flag as false', () => {
    // Content should not have to declare every flag up front; "has not
    // happened yet" is the overwhelmingly common case.
    expect(evaluateCondition({ op: 'eq', key: 'never.set', value: false }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'eq', key: 'never.set', value: true }, FLAGS)).toBe(false)
  })

  it('matches numeric equality', () => {
    expect(evaluateCondition({ op: 'eq', key: 'quota.cycle', value: 3 }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'eq', key: 'quota.cycle', value: 4 }, FLAGS)).toBe(false)
  })

  it('treats an unset numeric flag as 0', () => {
    expect(evaluateCondition({ op: 'eq', key: 'never.set', value: 0 }, FLAGS)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// gte / lte
// ---------------------------------------------------------------------------

describe('evaluateCondition: gte and lte', () => {
  it('compares numbers inclusively', () => {
    expect(evaluateCondition({ op: 'gte', key: 'charisma', value: 30 }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'gte', key: 'charisma', value: 31 }, FLAGS)).toBe(false)
    expect(evaluateCondition({ op: 'lte', key: 'charisma', value: 30 }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'lte', key: 'charisma', value: 29 }, FLAGS)).toBe(false)
  })

  it('reads a boolean flag as 1 or 0', () => {
    // Authors mix booleans and numbers constantly; a silent NaN comparison
    // would fail closed with no explanation.
    expect(evaluateCondition({ op: 'gte', key: 'met.shadir', value: 1 }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'lte', key: 'beat.duke_revelation', value: 0 }, FLAGS)).toBe(true)
  })

  it('treats a missing flag as 0', () => {
    expect(evaluateCondition({ op: 'gte', key: 'absent', value: 1 }, FLAGS)).toBe(false)
    expect(evaluateCondition({ op: 'lte', key: 'absent', value: 0 }, FLAGS)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

describe('evaluateCondition: combinators', () => {
  const metShadir: FlagCondition = { op: 'eq', key: 'met.shadir', value: true }
  const highCharisma: FlagCondition = { op: 'gte', key: 'charisma', value: 50 }

  it('ands and ors correctly', () => {
    expect(evaluateCondition({ op: 'and', terms: [metShadir, highCharisma] }, FLAGS)).toBe(false)
    expect(evaluateCondition({ op: 'or', terms: [metShadir, highCharisma] }, FLAGS)).toBe(true)
  })

  it('negates', () => {
    expect(evaluateCondition({ op: 'not', term: highCharisma }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'not', term: metShadir }, FLAGS)).toBe(false)
  })

  it('treats an empty AND as true and an empty OR as false', () => {
    expect(evaluateCondition({ op: 'and', terms: [] }, FLAGS)).toBe(true)
    expect(evaluateCondition({ op: 'or', terms: [] }, FLAGS)).toBe(false)
  })

  it('nests to arbitrary depth', () => {
    const nested: FlagCondition = {
      op: 'and',
      terms: [
        metShadir,
        { op: 'not', term: { op: 'or', terms: [highCharisma, { op: 'gte', key: 'quota.cycle', value: 9 }] } },
      ],
    }
    expect(evaluateCondition(nested, FLAGS)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// selectFirstMatch
// ---------------------------------------------------------------------------

describe('selectFirstMatch', () => {
  it('honours declaration order as priority', () => {
    const entries = [
      { id: 'late', condition: { op: 'gte', key: 'quota.cycle', value: 5 } as FlagCondition },
      { id: 'mid', condition: { op: 'gte', key: 'quota.cycle', value: 2 } as FlagCondition },
      { id: 'fallback', condition: null },
    ]
    expect(selectFirstMatch(entries, FLAGS)?.id).toBe('mid')
  })

  it('falls through to an unconditional entry', () => {
    const entries = [
      { id: 'gated', condition: { op: 'gte', key: 'quota.cycle', value: 99 } as FlagCondition },
      { id: 'fallback', condition: null },
    ]
    expect(selectFirstMatch(entries, FLAGS)?.id).toBe('fallback')
  })

  it('returns null when nothing matches — a content bug, not a normal state', () => {
    const entries = [
      { id: 'gated', condition: { op: 'gte', key: 'quota.cycle', value: 99 } as FlagCondition },
    ]
    expect(selectFirstMatch(entries, FLAGS)).toBeNull()
  })

  it('returns null for an empty entry list', () => {
    expect(selectFirstMatch([], FLAGS)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// applyFlagEffects
// ---------------------------------------------------------------------------

describe('applyFlagEffects', () => {
  it('sets flags without mutating the original store', () => {
    const before = { a: 1 }
    const after = applyFlagEffects(before, { b: true })
    expect(after).toEqual({ a: 1, b: true })
    expect(before).toEqual({ a: 1 })
  })

  it('increments numeric flags', () => {
    expect(applyFlagEffects({ n: 2 }, undefined, { n: 3 })).toEqual({ n: 5 })
  })

  it('treats an increment on a missing flag as starting from 0', () => {
    expect(applyFlagEffects({}, undefined, { fresh: 2 })).toEqual({ fresh: 2 })
  })

  it('applies sets before increments so one choice can baseline then bump', () => {
    // The reverse order would discard the increment entirely.
    expect(applyFlagEffects({ n: 99 }, { n: 0 }, { n: 1 })).toEqual({ n: 1 })
  })

  it('increments a boolean flag from its numeric reading', () => {
    expect(applyFlagEffects({ b: true }, undefined, { b: 1 })).toEqual({ b: 2 })
  })

  it('is a no-op when given no effects', () => {
    expect(applyFlagEffects({ a: 1 })).toEqual({ a: 1 })
  })
})
