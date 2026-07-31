// src/game-engine/prescience/prescienceCallers.test.ts
//
// The guard for this bug class: prescience.ts documents a three-rung
// capability ladder, but canSenseHidden and canSeeDensity had zero callers —
// the game already granted their powers to everyone for free, so reaching
// the level changed nothing. A predicate nobody consults is exactly as inert
// as a flag nobody writes (see flagCoverage.test.ts, the model this follows).
// This asserts every exported capability predicate has at least one real,
// non-test call site somewhere in src/.

import { describe, it, expect } from 'vitest'

const CAPABILITY_PREDICATES = [
  'canSenseHidden',
  'canOrderRemotely',
  'raidWarningDays',
  'canSeeDensity',
] as const

/** Every non-test source file in the project, as text. */
function nonTestSources(): string {
  // import.meta.glob rather than node:fs — see flagCoverage.test.ts for why.
  // Widened to .tsx as well as .ts: canSeeDensity's one real caller lives in
  // CrewPanel.tsx, a React component, so a .ts-only glob would never see it
  // and the guard would report a false failure right after the fix.
  const files = import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>

  return Object.entries(files)
    .filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
    // Excludes the definitions themselves: `export function canSenseHidden(`
    // contains the same "name(" shape a real call does, so leaving this file
    // in would make the guard pass even with zero callers anywhere else —
    // the exact failure mode it exists to catch.
    .filter(([path]) => !path.endsWith('/prescience/prescience.ts'))
    .map(([, text]) => text)
    .join('\n')
    // Comments stripped, or a doc comment merely naming a predicate (as this
    // file's own header does, and as prescience.ts's doc comments do) would
    // read as a call and silence the guard on dead code.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('prescience capability predicates', () => {
  it('every exported capability predicate has a non-test caller', () => {
    const source = nonTestSources()
    const uncalled = CAPABILITY_PREDICATES.filter(name => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // A name directly followed by "(" is an invocation; a bare import or
      // a mention in prose is not.
      return !new RegExp(`\\b${escaped}\\s*\\(`).test(source)
    })
    expect(uncalled, 'documented capability with no real caller').toEqual([])
  })
})
