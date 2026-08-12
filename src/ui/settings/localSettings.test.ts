// src/ui/settings/localSettings.test.ts
// No DOM in vitest's `node` environment — the injected KeyValueStore
// exercises the real read/write logic; the no-argument calls exercise the
// no-`window` guard branch the same way a server-rendered/test context does.

import { describe, it, expect } from 'vitest'
import {
  getGuidanceEnabled, setGuidanceEnabled, isMarkDismissed, dismissMark, type KeyValueStore,
} from './localSettings'

function fakeStore(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
  }
}

describe('getGuidanceEnabled', () => {
  it('defaults true with no prior write (03: "Guidance callouts default on")', () => {
    expect(getGuidanceEnabled(fakeStore())).toBe(true)
  })

  it('defaults true with no store at all (vitest\'s node environment has no window)', () => {
    expect(getGuidanceEnabled(null)).toBe(true)
    expect(getGuidanceEnabled()).toBe(true) // exercises the real defaultStore() guard
  })

  it('reflects a previously written value', () => {
    const store = fakeStore()
    setGuidanceEnabled(false, store)
    expect(getGuidanceEnabled(store)).toBe(false)
    setGuidanceEnabled(true, store)
    expect(getGuidanceEnabled(store)).toBe(true)
  })
})

describe('setGuidanceEnabled', () => {
  it('with no store, is a silent no-op rather than throwing', () => {
    expect(() => setGuidanceEnabled(false, null)).not.toThrow()
    expect(() => setGuidanceEnabled(true)).not.toThrow() // real defaultStore() guard
  })
})

describe('isMarkDismissed / dismissMark', () => {
  it('is false for a mark never dismissed, with no store, and with malformed storage', () => {
    const store = fakeStore()
    expect(isMarkDismissed('quota-ledger', store)).toBe(false)
    expect(isMarkDismissed('quota-ledger', null)).toBe(false)
    store.setItem('dune.settings.coachDismissed', '{not json')
    expect(isMarkDismissed('quota-ledger', store)).toBe(false)
  })

  it('reflects a dismissed mark without disturbing an unrelated one', () => {
    const store = fakeStore()
    dismissMark('quota-ledger', store)
    expect(isMarkDismissed('quota-ledger', store)).toBe(true)
    expect(isMarkDismissed('pledge-button', store)).toBe(false)
  })

  it('with no store, dismissMark is a silent no-op', () => {
    expect(() => dismissMark('quota-ledger', null)).not.toThrow()
  })
})

describe('setGuidanceEnabled(true): "resumes at the current unmet step"', () => {
  it('clears every dismissal on re-enable, but leaves them alone on disable', () => {
    const store = fakeStore()
    dismissMark('quota-ledger', store)
    dismissMark('pledge-button', store)

    setGuidanceEnabled(false, store)
    expect(isMarkDismissed('quota-ledger', store)).toBe(true) // disabling does not touch dismissals

    setGuidanceEnabled(true, store)
    expect(isMarkDismissed('quota-ledger', store)).toBe(false)
    expect(isMarkDismissed('pledge-button', store)).toBe(false)
  })
})
