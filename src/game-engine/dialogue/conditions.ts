// src/game-engine/dialogue/conditions.ts
// PURE flag-condition evaluation. No world access, no side effects.
//
// Conversations are the interface to every other system in this game, so which
// version of a conversation a character offers has to be exactly predictable.
// Keeping the evaluator pure means every gate is testable in isolation.

export type FlagValue = boolean | number

export type FlagStore = Readonly<Record<string, FlagValue | undefined>>

export type FlagCondition =
  | { op: 'eq'; key: string; value: FlagValue }
  | { op: 'gte'; key: string; value: number }
  | { op: 'lte'; key: string; value: number }
  | { op: 'and'; terms: readonly FlagCondition[] }
  | { op: 'or'; terms: readonly FlagCondition[] }
  | { op: 'not'; term: FlagCondition }

/**
 * Numeric reading of a flag.
 *
 * Booleans count as 1 and 0 so `gte`/`lte` still behave sensibly against a
 * flag that was set as a boolean — content authors mix the two constantly and
 * a silent NaN comparison would fail closed with no explanation.
 */
function asNumber(value: FlagValue | undefined): number {
  if (value === undefined) return 0
  if (typeof value === 'boolean') return value ? 1 : 0
  return Number.isFinite(value) ? value : 0
}

/**
 * Evaluate a condition against the flag store.
 *
 * Missing flags are falsy — 0 numerically, false for equality. That makes the
 * common case (a beat that has not fired yet) work without content having to
 * declare every flag up front.
 */
export function evaluateCondition(condition: FlagCondition, flags: FlagStore): boolean {
  switch (condition.op) {
    case 'eq': {
      const actual = flags[condition.key]
      if (typeof condition.value === 'boolean') {
        // An unset flag equals false, which is what "has not happened" means.
        return (actual ?? false) === condition.value ||
          (actual === undefined && condition.value === false)
      }
      return asNumber(actual) === condition.value
    }

    case 'gte':
      return asNumber(flags[condition.key]) >= condition.value

    case 'lte':
      return asNumber(flags[condition.key]) <= condition.value

    case 'and':
      // An empty AND is vacuously true — it constrains nothing.
      return condition.terms.every(term => evaluateCondition(term, flags))

    case 'or':
      // An empty OR is false; there is no satisfying term.
      return condition.terms.some(term => evaluateCondition(term, flags))

    case 'not':
      return !evaluateCondition(condition.term, flags)
  }
}

/**
 * Pick the first entry whose condition passes.
 *
 * Declaration order is the priority order, and an entry with a null condition
 * is an unconditional fallback. Returns null only when nothing matches, which
 * callers must treat as a content bug rather than a normal state.
 */
export function selectFirstMatch<T extends { condition: FlagCondition | null }>(
  entries: readonly T[],
  flags: FlagStore,
): T | null {
  for (const entry of entries) {
    if (entry.condition === null) return entry
    if (evaluateCondition(entry.condition, flags)) return entry
  }
  return null
}

/** Apply flag writes, with numeric increments applied after direct sets. */
export function applyFlagEffects(
  flags: Record<string, FlagValue>,
  setFlags?: Readonly<Record<string, FlagValue>>,
  addFlags?: Readonly<Record<string, number>>,
): Record<string, FlagValue> {
  const next: Record<string, FlagValue> = { ...flags }

  for (const [key, value] of Object.entries(setFlags ?? {})) {
    next[key] = value
  }
  // Increments run second so a single choice can set a baseline and then bump
  // it; the reverse order would discard the increment.
  for (const [key, delta] of Object.entries(addFlags ?? {})) {
    next[key] = asNumber(next[key]) + delta
  }
  return next
}

/**
 * Every flag key a condition tree reads, walking and/or/not to arbitrary
 * depth.
 *
 * Exists so a coverage test can ask "does anything ever write this?" for
 * every gate in the roster, rather than by eye — pledged.count was read here
 * and written nowhere, and nothing caught it until a player did.
 */
export function collectConditionKeys(condition: FlagCondition): string[] {
  switch (condition.op) {
    case 'eq':
    case 'gte':
    case 'lte':
      return [condition.key]
    case 'and':
    case 'or':
      return condition.terms.flatMap(collectConditionKeys)
    case 'not':
      return collectConditionKeys(condition.term)
  }
}
