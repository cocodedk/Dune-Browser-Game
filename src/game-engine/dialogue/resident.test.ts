// src/game-engine/dialogue/resident.test.ts

import { describe, it, expect } from 'vitest'
import { displaySpeaker, isGenericSpeaker } from './resident'
import { INITIAL_CHARACTERS } from '../../data/characters'

describe('isGenericSpeaker', () => {
  it('recognises the location-agnostic placeholders', () => {
    expect(isGenericSpeaker('Village Elder')).toBe(true)
    expect(isGenericSpeaker('Harkonnen Overseer')).toBe(true)
  })

  it('does not treat a real character as a placeholder', () => {
    // If any of the cast were ever mistaken for a placeholder, their lines
    // would be re-attributed to whoever happened to live there.
    for (const character of INITIAL_CHARACTERS) {
      expect(isGenericSpeaker(character.name)).toBe(false)
    }
  })

  it('ignores surrounding whitespace', () => {
    expect(isGenericSpeaker('  Village Elder ')).toBe(true)
  })
})

describe('displaySpeaker', () => {
  it('names the resident when the line is generic', () => {
    expect(displaySpeaker('Village Elder', 'Overseer Krail')).toBe('Overseer Krail')
  })

  it('keeps a scripted speaker even when someone else lives there', () => {
    // Legate Corvin speaks at Arrakeen, where Duke Armand is the resident.
    // Putting the Duke's name on the Legate's lines would be a worse bug than
    // the one this fixes.
    expect(displaySpeaker('Legate Corvin', 'Duke Armand')).toBe('Legate Corvin')
  })

  it('falls back to the node speaker when nobody lives there', () => {
    expect(displaySpeaker('Village Elder', undefined)).toBe('Village Elder')
  })
})
