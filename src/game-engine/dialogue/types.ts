// src/game-engine/dialogue/types.ts
// Character and gated-conversation model.
//
// A "state" is one version of a character's conversation, selected by flags.
// Characters accumulate several as the story moves; declaration order is
// priority and the last entry is an unconditional fallback.

import type { LocationId } from '../../types'
import type { FlagCondition } from './conditions'

export type CharacterId = string

export interface Character {
  id: CharacterId
  name: string
  /** Short descriptor shown under the name — their job, not their biography. */
  role: string
  /** Where they can be found, or travelling with the player, or off-world. */
  locationId: LocationId | 'with_player' | 'offworld'
  recruited: boolean
}

export interface DialogueStateDef {
  id: string
  characterId: CharacterId
  /** null = unconditional fallback. Must be last for its character. */
  condition: FlagCondition | null
  rootNodeId: string
}

/**
 * Every character must own at least one unconditional state.
 *
 * A character with nothing to say is a dead end the player cannot recover
 * from — they walk to a sietch, click the naib, and the game silently does
 * nothing. Enforced by a data test over the whole roster rather than at
 * runtime, so it fails in CI instead of in front of a player.
 */
export function findCharactersWithoutFallback(
  characters: readonly Character[],
  states: readonly DialogueStateDef[],
): CharacterId[] {
  const withFallback = new Set(
    states.filter(s => s.condition === null).map(s => s.characterId),
  )
  return characters.filter(c => !withFallback.has(c.id)).map(c => c.id)
}

/** States whose fallback is not last — later entries would be unreachable. */
export function findMisorderedFallbacks(
  states: readonly DialogueStateDef[],
): CharacterId[] {
  const offenders: CharacterId[] = []
  const byCharacter = new Map<CharacterId, DialogueStateDef[]>()

  for (const state of states) {
    const list = byCharacter.get(state.characterId) ?? []
    list.push(state)
    byCharacter.set(state.characterId, list)
  }

  for (const [characterId, list] of byCharacter) {
    const fallbackIndex = list.findIndex(s => s.condition === null)
    if (fallbackIndex >= 0 && fallbackIndex !== list.length - 1) {
      offenders.push(characterId)
    }
  }
  return offenders
}

/** States referencing a character that does not exist. */
export function findOrphanStates(
  characters: readonly Character[],
  states: readonly DialogueStateDef[],
): string[] {
  const ids = new Set(characters.map(c => c.id))
  return states.filter(s => !ids.has(s.characterId)).map(s => s.id)
}
