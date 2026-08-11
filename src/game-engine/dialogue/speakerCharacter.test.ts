import { describe, it, expect } from 'vitest'
import { speakerCharacter } from './speakerCharacter'
import { INITIAL_CHARACTERS } from '../../data/characters'

describe('speakerCharacter', () => {
  it('matches Thufir by name at Arrakeen, not the Duke (first resident by location)', () => {
    // The regression this closes: Arrakeen lists duke_armand first in
    // INITIAL_CHARACTERS, so a location-only lookup always returns him,
    // even for Thufir's own conversation.
    const result = speakerCharacter(INITIAL_CHARACTERS, 'Thufir Hawat', 'arrakeen')
    expect(result?.id).toBe('vell')
  })

  it('matches the Duke by name at the same location', () => {
    expect(speakerCharacter(INITIAL_CHARACTERS, 'Duke Leto Atreides', 'arrakeen')?.id).toBe('duke_armand')
  })

  it('falls back to the first character at the location for a generic placeholder speaker', () => {
    expect(speakerCharacter(INITIAL_CHARACTERS, 'Village Elder', 'arrakeen')?.id).toBe('duke_armand')
  })

  it('returns undefined for an unknown speaker at a location with nobody at all', () => {
    expect(speakerCharacter(INITIAL_CHARACTERS, 'A Voice', 'nowhere')).toBeUndefined()
  })

  it('resolves Stilgar correctly at Red Wall, where he is the only resident', () => {
    expect(speakerCharacter(INITIAL_CHARACTERS, 'Stilgar', 'red_wall_sietch')?.id).toBe('shadir')
  })
})
