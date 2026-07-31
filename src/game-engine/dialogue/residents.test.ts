// src/game-engine/dialogue/residents.test.ts

import { describe, it, expect } from 'vitest'
import { residentsAt } from './residents'
import type { Character } from './types'

const CHARACTERS: Character[] = [
  { id: 'ysane', name: 'Chani', role: 'Scout', locationId: 'sietch_tabr', recruited: false },
  { id: 'sova', name: 'Reverend Mother Ramallo', role: 'Keeper', locationId: 'sietch_tabr', recruited: false },
  { id: 'shadir', name: 'Stilgar', role: 'Naib', locationId: 'red_wall_sietch', recruited: false },
]

describe('residentsAt', () => {
  it('returns everyone at a location, in declaration order', () => {
    // Chani is declared before Sova for sietch_tabr — the order this returns
    // them in is also the order VisitPolicy's "first resident" default reads
    // from, so a reordering here silently changes who greets you on a click.
    expect(residentsAt(CHARACTERS, 'sietch_tabr').map(c => c.id)).toEqual(['ysane', 'sova'])
  })

  it('returns an empty array for a location with nobody written', () => {
    expect(residentsAt(CHARACTERS, 'habbanya_ridge')).toEqual([])
  })

  it('does not pull in a resident of a different location', () => {
    expect(residentsAt(CHARACTERS, 'red_wall_sietch').map(c => c.id)).toEqual(['shadir'])
  })
})
