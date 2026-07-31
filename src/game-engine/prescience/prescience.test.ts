// src/game-engine/prescience/prescience.test.ts

import { describe, it, expect } from 'vitest'
import {
  checkGrant,
  grantRefusalMessage,
  canSenseHidden,
  canOrderRemotely,
  raidWarningDays,
  canSeeDensity,
  levelDescription,
  AWARENESS,
  FARSPEECH,
  FORESIGHT,
  FARSPEECH_CHARISMA,
  FORESIGHT_FORTS,
} from './prescience'
import type { PrescienceView, PrescienceLevel, GrantRefusal } from './prescience'

function view(overrides: Partial<PrescienceView> = {}): PrescienceView {
  return {
    level: 0, charisma: 20, ritualsUsed: 0,
    fortsDestroyed: 0, act: 'act1', ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Granting
// ---------------------------------------------------------------------------

describe('checkGrant: awareness', () => {
  it('is available in act 1', () => {
    expect(checkGrant(view())).toEqual({ ok: true, level: AWARENESS })
  })

  it('is refused once the story has moved past it', () => {
    expect(checkGrant(view({ act: 'act3' }))).toEqual({ ok: false, reason: 'wrong-act' })
  })
})

describe('checkGrant: farspeech', () => {
  it('is refused in act 1 whatever the charisma', () => {
    expect(checkGrant(view({ level: 1, act: 'act1', charisma: 99 })))
      .toEqual({ ok: false, reason: 'wrong-act' })
  })

  it('needs the charisma threshold', () => {
    expect(checkGrant(view({ level: 1, act: 'act2', charisma: FARSPEECH_CHARISMA - 1 })))
      .toEqual({ ok: false, reason: 'charisma' })
    expect(checkGrant(view({ level: 1, act: 'act2', charisma: FARSPEECH_CHARISMA })))
      .toEqual({ ok: true, level: FARSPEECH })
  })
})

describe('checkGrant: foresight', () => {
  it('is refused before act 3', () => {
    expect(checkGrant(view({ level: 2, act: 'act2', fortsDestroyed: 9 })))
      .toEqual({ ok: false, reason: 'wrong-act' })
  })

  it('needs two forts destroyed', () => {
    expect(checkGrant(view({ level: 2, act: 'act3', fortsDestroyed: FORESIGHT_FORTS - 1 })))
      .toEqual({ ok: false, reason: 'forts' })
    expect(checkGrant(view({ level: 2, act: 'act3', fortsDestroyed: FORESIGHT_FORTS })))
      .toEqual({ ok: true, level: FORESIGHT })
  })
})

describe('checkGrant: ceiling', () => {
  it('refuses once the ladder is complete', () => {
    expect(checkGrant(view({ level: 3, act: 'act4' })))
      .toEqual({ ok: false, reason: 'already-held' })
  })

  it('gives a distinct message per refusal so the seer can say what is missing', () => {
    const reasons: GrantRefusal[] = ['already-held', 'wrong-act', 'charisma', 'forts']
    const messages = reasons.map(grantRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
    for (const m of messages) expect(m.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

describe('capabilities', () => {
  it('unlocks sensing hidden places at awareness', () => {
    expect(canSenseHidden(0)).toBe(false)
    expect(canSenseHidden(1)).toBe(true)
  })

  it('unlocks remote orders only at farspeech', () => {
    // The single biggest reduction in busywork in the game, hence the gate.
    expect(canOrderRemotely(1)).toBe(false)
    expect(canOrderRemotely(2)).toBe(true)
  })

  it('warns of raids only at foresight', () => {
    expect(raidWarningDays(2)).toBe(0)
    expect(raidWarningDays(3)).toBeGreaterThan(0)
  })

  it('shows density only in already-discovered regions', () => {
    // Otherwise foresight would make prospecting pointless — it should reveal
    // how good KNOWN sand is, not where unknown sand lies.
    expect(canSeeDensity(3, false)).toBe(false)
    expect(canSeeDensity(3, true)).toBe(true)
    expect(canSeeDensity(2, true)).toBe(false)
  })

  it('grants each level everything the ones below it grant', () => {
    for (const level of [1, 2, 3] as PrescienceLevel[]) {
      if (level >= 1) expect(canSenseHidden(level)).toBe(true)
      if (level >= 2) expect(canOrderRemotely(level)).toBe(true)
    }
  })
})

describe('levelDescription', () => {
  it('describes every level distinctly', () => {
    const all = ([0, 1, 2, 3] as PrescienceLevel[]).map(levelDescription)
    expect(new Set(all).size).toBe(4)
    for (const d of all) expect(d.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// The ladder as a whole
// ---------------------------------------------------------------------------

describe('the ladder', () => {
  it('cannot be skipped — each grant advances exactly one step', () => {
    const first = checkGrant(view({ level: 0, act: 'act1' }))
    expect(first).toEqual({ ok: true, level: 1 })

    const second = checkGrant(view({ level: 1, act: 'act2', charisma: 60 }))
    expect(second).toEqual({ ok: true, level: 2 })

    const third = checkGrant(view({ level: 2, act: 'act3', fortsDestroyed: 3 }))
    expect(third).toEqual({ ok: true, level: 3 })
  })

  it('refuses a level whose act has not arrived even at full charisma', () => {
    expect(checkGrant(view({ level: 1, act: 'act1', charisma: 100 })).ok).toBe(false)
  })
})
