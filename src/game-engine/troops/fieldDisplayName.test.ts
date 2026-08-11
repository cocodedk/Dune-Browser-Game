// src/game-engine/troops/fieldDisplayName.test.ts
import { describe, it, expect } from 'vitest'
import { fieldDisplayName } from './fieldDisplayName'

describe('fieldDisplayName', () => {
  it('drops the leading field_ token and title-cases the rest', () => {
    expect(fieldDisplayName('field_red_wall_pan')).toBe('Red Wall Pan')
    expect(fieldDisplayName('field_tabr_shallows')).toBe('Tabr Shallows')
  })

  it('formats an id with no leading field_ token sensibly too', () => {
    expect(fieldDisplayName('sihaya_ridge')).toBe('Sihaya Ridge')
  })

  it('handles a single-word id', () => {
    expect(fieldDisplayName('field_erg')).toBe('Erg')
  })
})
