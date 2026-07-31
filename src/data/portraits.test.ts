// src/data/portraits.test.ts
// Regression test for "Stilgar is at every sietch I visit" — the bug was
// visual, not data (names were always correct), so this asserts the visual
// identity axes themselves, not just that the module parses.

import { describe, it, expect } from 'vitest'
import { portraitFor, portraitCount, DEFAULT } from './portraits'
import { INITIAL_CHARACTERS } from './characters'

const FREMEN_IDS = new Set(['shadir', 'ysane', 'sova', 'pell', 'sabiha', 'orrin'])

function identityTuple(id: string): string {
  const def = portraitFor(id)
  return [
    def.headgear, def.beard, def.hairStyle, def.skinTone, def.hairTone,
    def.age, def.jaw, def.eyeTilt, def.mark, def.build,
  ].join('|')
}

describe('portraitFor', () => {
  it('covers every character in the Act 1 roster', () => {
    expect(portraitCount()).toBe(INITIAL_CHARACTERS.length)
  })

  it('never falls through to the default portrait', () => {
    for (const character of INITIAL_CHARACTERS) {
      expect(portraitFor(character.id)).not.toBe(DEFAULT)
    }
  })

  it('gives all twenty characters a visually distinct identity', () => {
    const tuples = INITIAL_CHARACTERS.map((c) => identityTuple(c.id))
    expect(new Set(tuples).size).toBe(INITIAL_CHARACTERS.length)
    expect(INITIAL_CHARACTERS.length).toBe(20)
  })

  it('keeps the eyes of Ibad exclusive to the Fremen cast', () => {
    for (const character of INITIAL_CHARACTERS) {
      const isFremen = FREMEN_IDS.has(character.id)
      expect(portraitFor(character.id).dress === 'fremen').toBe(isFremen)
    }
  })

  it('draws a Duke bare-headed in his own hall, not hooded', () => {
    expect(portraitFor('duke_armand').headgear).toBe('bare')
  })

  it('gives Fremen in the deep desert a hood, never a bare head', () => {
    for (const id of FREMEN_IDS) {
      expect(portraitFor(id).headgear).not.toBe('bare')
    }
  })

  it('does not let Ramallo and Chani share a face', () => {
    const ramallo = portraitFor('sova')
    const chani = portraitFor('ysane')
    expect(ramallo.age).not.toBe(chani.age)
    expect(ramallo.jaw).not.toBe(chani.jaw)
  })

  it('gives the Baron and Rabban a Harkonnen insignia', () => {
    expect(portraitFor('baron').mark).toBe('insignia')
    expect(portraitFor('varn').mark).toBe('insignia')
  })

  it('scars Gurney Halleck', () => {
    expect(portraitFor('voss').mark).toBe('scar')
  })

  it('falls back to the default def for an unknown id', () => {
    expect(portraitFor('nobody-in-the-roster')).toBe(DEFAULT)
  })
})
