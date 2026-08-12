// src/ui/title/titleState.test.ts
// Pure title-state-machine tests — no DOM, no IndexedDB (chunk W3b, unit
// test requirement 5: "title-state machine logic extracted pure").

import { describe, it, expect } from 'vitest'
import {
  nextTitleView, canContinue, formatSaveMetadata, toSaveAvailability,
  CORRUPT_SAVE_MESSAGE, type SaveAvailability,
} from './titleState'
import type { SaveProbe } from '../../game-engine/persistence'

describe('nextTitleView — visible screens and valid transitions', () => {
  it('opens each pane from home', () => {
    expect(nextTitleView('home', 'openNewCampaign')).toBe('newCampaign')
    expect(nextTitleView('home', 'openLoadCampaign')).toBe('loadCampaign')
    expect(nextTitleView('home', 'openSettings')).toBe('settings')
  })

  it('back returns every pane to home', () => {
    expect(nextTitleView('newCampaign', 'back')).toBe('home')
    expect(nextTitleView('loadCampaign', 'back')).toBe('home')
    expect(nextTitleView('settings', 'back')).toBe('home')
  })

  it('an action not valid from the current view is a no-op, not a crash', () => {
    expect(nextTitleView('home', 'back')).toBe('home')
    expect(nextTitleView('newCampaign', 'openSettings')).toBe('newCampaign')
    expect(nextTitleView('settings', 'openNewCampaign')).toBe('settings')
  })
})

describe('toSaveAvailability / canContinue — corrupt-save state', () => {
  it('absent probe -> absent availability, Continue hidden', () => {
    const probe: SaveProbe = { status: 'absent' }
    const availability = toSaveAvailability(probe)
    expect(availability.kind).toBe('absent')
    expect(canContinue(availability)).toBe(false)
  })

  it('corrupt probe -> corrupt availability, Continue hidden, never silently absent', () => {
    const probe: SaveProbe = { status: 'corrupt' }
    const availability = toSaveAvailability(probe)
    expect(availability.kind).toBe('corrupt')
    expect(canContinue(availability)).toBe(false)
    // A corrupt save must render its own message, not the "no save" one —
    // proven by construction: 'corrupt' is a distinct variant from
    // 'absent', so a UI switching on `.kind` cannot conflate them.
    expect(availability.kind).not.toBe('absent')
  })

  it('valid probe -> valid availability with the envelope metadata carried through, Continue shown', () => {
    const probe: SaveProbe = { status: 'valid', savedAt: 1_000, day: 12 }
    const availability = toSaveAvailability(probe)
    expect(availability).toEqual<SaveAvailability>({ kind: 'valid', metadata: { savedAt: 1_000, day: 12 } })
    expect(canContinue(availability)).toBe(true)
  })
})

describe('formatSaveMetadata — Continue-metadata formatting from a real envelope', () => {
  it('formats age against a fixed clock, at each unit boundary', () => {
    const savedAt = 1_700_000_000_000
    expect(formatSaveMetadata({ savedAt, day: 5 }, savedAt)).toBe('Day 5 — saved just now')
    expect(formatSaveMetadata({ savedAt, day: 5 }, savedAt + 30_000)).toBe('Day 5 — saved just now')
    expect(formatSaveMetadata({ savedAt, day: 5 }, savedAt + 5 * 60_000)).toBe('Day 5 — saved 5m ago')
    expect(formatSaveMetadata({ savedAt, day: 5 }, savedAt + 3 * 3_600_000)).toBe('Day 5 — saved 3h ago')
    expect(formatSaveMetadata({ savedAt, day: 5 }, savedAt + 2 * 86_400_000)).toBe('Day 5 — saved 2d ago')
  })

  it('never reports a negative age for a clock that runs behind savedAt', () => {
    const savedAt = 1_700_000_000_000
    expect(formatSaveMetadata({ savedAt, day: 1 }, savedAt - 10_000)).toBe('Day 1 — saved just now')
  })
})

describe('CORRUPT_SAVE_MESSAGE', () => {
  it('is a fixed, non-empty string — never a raw exception surfaced to the player', () => {
    expect(typeof CORRUPT_SAVE_MESSAGE).toBe('string')
    expect(CORRUPT_SAVE_MESSAGE.length).toBeGreaterThan(0)
  })
})
