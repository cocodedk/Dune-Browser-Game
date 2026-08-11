// src/game-engine/commands/outcome.test.ts
// Pins the CommandOutcome shape every future command builds on
// (docs/PRD/game-completion/02-runtime-consolidation.md "Command outcome
// contract"): a success carries a code, a refusal carries a reason, and
// nothing else — no prose field, no extra payload.

import { describe, it, expect } from 'vitest'
import { ok, fail } from './outcome'

describe('ok', () => {
  it('builds a success outcome carrying only ok and code', () => {
    expect(ok('done')).toEqual({ ok: true, code: 'done' })
  })
})

describe('fail', () => {
  it('builds a refusal outcome carrying only ok and reason', () => {
    expect(fail('not-allowed')).toEqual({ ok: false, reason: 'not-allowed' })
  })
})
