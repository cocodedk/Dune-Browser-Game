// src/game-engine/dialogue/select.ts
// PURE selection of which written conversation a character currently offers.
//
// A character can own several DialogueStateDef entries (see
// data/dialogueStates.ts) — one per story beat — and only one applies at a
// time. This is the one place that turns "who is standing here" plus "what
// has happened" into "which node do they open on", so callers never have to
// re-derive that logic against the world state themselves.

import type { DialogueStateDef } from './types'
import type { FlagStore } from './conditions'
import { selectFirstMatch } from './conditions'

/**
 * The root node id for `characterId`'s current conversation, or null if the
 * character has no authored states at all.
 *
 * Null is a content bug, not a normal outcome — every character in
 * INITIAL_CHARACTERS is expected to own an unconditional fallback state
 * (enforced by roster.test.ts), so this only returns null for a character
 * that was never given one.
 */
export function rootNodeForCharacter(
  characterId: string,
  states: readonly DialogueStateDef[],
  flags: FlagStore,
): string | null {
  const forCharacter = states.filter(s => s.characterId === characterId)
  const match = selectFirstMatch(forCharacter, flags)
  return match ? match.rootNodeId : null
}
