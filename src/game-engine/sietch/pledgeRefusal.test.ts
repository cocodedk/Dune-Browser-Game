// src/game-engine/sietch/pledgeRefusal.test.ts

import { describe, it, expect } from 'vitest'
import { pledgeChainRefusalMessage } from './pledgeRefusal'
import type { PledgeRefusal } from '../SietchSystem'

describe('pledgeChainRefusalMessage', () => {
  it('gives a distinct message per refusal code', () => {
    const reasons: PledgeRefusal[] = [
      'not-present', 'no-sietch', 'not-fremen',
      'already-pledged', 'not-loyal-enough', 'charisma-cap',
    ]
    const messages = reasons.map(pledgeChainRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
  })

  it('delegates the three loyalty-owned codes to loyalty.ts wording', () => {
    expect(pledgeChainRefusalMessage('not-loyal-enough')).toBe('They do not trust you enough yet.')
    expect(pledgeChainRefusalMessage('charisma-cap'))
      .toBe('Your name does not carry far enough to hold another sietch.')
    expect(pledgeChainRefusalMessage('already-pledged')).toBe('They have already pledged to you.')
  })
})
