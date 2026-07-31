// src/game-engine/dialogue/flagCoverage.test.ts
//
// Generalised guard for the bug class this task closes: pledged.count was
// read by a gate (sova.ritual_available) and written by nothing, and no test
// noticed until a player did. This walks every condition in the live roster
// and checks each flag key it reads is written somewhere — either by a
// dialogue effect's setFlags/addFlags, or by the engine (see
// ENGINE_WRITTEN_FLAGS, which names the writer so it stays honest).

import { describe, it, expect } from 'vitest'
import { collectConditionKeys } from './conditions'
import { ENGINE_WRITTEN_FLAGS } from './engineFlags'
import { INITIAL_DIALOGUE_STATES } from '../../data/dialogueStates'
import { STORY_NODES } from '../../data/dialogue'

/**
 * Flag keys read by a live gate that are, right now, written nowhere at all
 * — separate, pre-existing content bugs surfaced while building this guard,
 * each closing off a written conversation the exact way pledged.count did
 * for Ramallo. Fixing them is outside this task's scope (prescience/ritual
 * only), so they are named here rather than silently passing: removing an
 * entry has to happen alongside actually wiring up its write path, not by
 * accident.
 *
 *   - 'act' (corvin.final_demand): compares to the number 4; nothing writes
 *     a numeric 'act' flag — world.act is the string 'act1'..'act4'.
 *   - 'pledged.red_wall_sietch' / 'loyalty.red_wall_sietch'
 *     (shadir.pledged, shadir.considering): no per-sietch pledge or loyalty
 *     flag is ever written; only the aggregate pledged.count is (this fix).
 *   - 'recruited.ysane' (ysane.recruited): no Chani dialogue choice sets it.
 *   - 'beat.duke_departed' (maren.alone): nothing sets this beat flag.
 *   - 'beat.duke_revelation' (duke.after_revelation): nothing sets this beat
 *     flag either, despite types.ts citing it as the example dotted key.
 */
const PRE_EXISTING_UNREACHABLE_GATES = new Set<string>([
  'act',
  'pledged.red_wall_sietch',
  'loyalty.red_wall_sietch',
  'recruited.ysane',
  'beat.duke_departed',
  'beat.duke_revelation',
])

/** Every flag key any authored choice's setFlags/addFlags actually writes. */
function authoredFlagKeys(): Set<string> {
  const keys = new Set<string>()
  for (const node of STORY_NODES) {
    for (const choice of node.choices) {
      const effect = choice.effect
      if (!effect) continue
      for (const key of Object.keys(effect.setFlags ?? {})) keys.add(key)
      for (const key of Object.keys(effect.addFlags ?? {})) keys.add(key)
    }
  }
  return keys
}

describe('dialogue flag coverage', () => {
  it('writes every flag key a live gate reads', () => {
    const written = new Set([...authoredFlagKeys(), ...Object.keys(ENGINE_WRITTEN_FLAGS)])

    const unwritten = new Set<string>()
    for (const state of INITIAL_DIALOGUE_STATES) {
      if (!state.condition) continue
      for (const key of collectConditionKeys(state.condition)) {
        if (!written.has(key) && !PRE_EXISTING_UNREACHABLE_GATES.has(key)) {
          unwritten.add(key)
        }
      }
    }

    // This catches a gate added against a flag nobody writes — the shape the
    // pledged.count bug arrived in. It does NOT catch deleting an existing
    // engine write: the key would still be listed in ENGINE_WRITTEN_FLAGS and
    // still count as written. Measured, not assumed — commenting out the
    // pledged.count assignment in SietchSystem leaves this test green. The
    // allowlist is checked against the source separately, below.
    expect([...unwritten]).toEqual([])
  })

  it('does not let the pledged.count fix hide on the pre-existing-gaps list', () => {
    expect(PRE_EXISTING_UNREACHABLE_GATES.has('pledged.count')).toBe(false)
    expect(PRE_EXISTING_UNREACHABLE_GATES.has('ritual.count')).toBe(false)
  })
})

/**
 * Every non-test source file under the engine, as text.
 *
 * Reading source in a test is unusual and deliberate here: ENGINE_WRITTEN_FLAGS
 * is an assertion about code that lives somewhere else, and an allowlist whose
 * claims are never checked is indistinguishable from one that silences the
 * guard above.
 */
function engineSources(): string {
  // import.meta.glob rather than node:fs — this is a browser project whose
  // tsconfig carries no node types, so `node:fs` type-checks as a missing
  // module even though vitest runs it happily. Vite resolves this at transform
  // time and it stays inside the toolchain the rest of the repo uses.
  const files = import.meta.glob('../**/*.ts', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>

  return Object.entries(files)
    .filter(([path]) => !path.endsWith('.test.ts'))
    .map(([, text]) => text)
    .join('\n')
    // Comments stripped, or a write that has merely been commented out still
    // reads as present and the check below passes on dead code. Measured: the
    // first version of this test, matching raw text, stayed green with both
    // pledged.count assignments commented out.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('engine flag allowlist', () => {
  // Closes the gap named above. Every key claiming an engine writer must have
  // a real assignment to it; delete the write and the claim fails here, which
  // is what the first test cannot see.
  it('every allowlisted flag is actually assigned somewhere in the engine', () => {
    const source = engineSources()
    const unbacked = Object.keys(ENGINE_WRITTEN_FLAGS).filter(key => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // `= ` but not `==`, so a `typeof world.flags['k'] === 'number'` read
      // does not read as a write.
      return !new RegExp(`flags\\[\\s*['"]${escaped}['"]\\s*\\]\\s*=(?!=)`).test(source)
    })
    expect(unbacked, 'allowlisted as engine-written, but never assigned').toEqual([])
  })
})
