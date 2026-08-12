// src/data/userPortrait.test.ts
// Pure resolution logic only — no DOM, no <img>, per CLAUDE.md's rule that
// unit tests stay clear of anything touching document/canvas.

import { describe, it, expect } from 'vitest'
import { userPortraitUrl } from './userPortrait'

describe('userPortraitUrl', () => {
  it('builds the relative path from a characterId', () => {
    expect(userPortraitUrl('duke_armand')).toBe('assets/portraits/duke_armand.png')
  })

  it('does the same for every other characterId, with no allowlist/validation', () => {
    expect(userPortraitUrl('vell')).toBe('assets/portraits/vell.png')
    expect(userPortraitUrl('shadir')).toBe('assets/portraits/shadir.png')
  })

  it('has no leading slash, matching AudioManager.ts\'s relative ASSET_BASE convention', () => {
    expect(userPortraitUrl('vell').startsWith('/')).toBe(false)
  })
})
