// src/game-engine/dialogue/speakerCharacter.ts
// Which INITIAL_CHARACTERS entry a dialogue node's speaker actually is.
//
// DialoguePanel needs this for the portrait (name is already handled
// correctly — see resident.ts's displaySpeaker). Location-based "the first
// resident here" is wrong the instant two named characters share a
// location: INITIAL_CHARACTERS lists Duke Leto first at Arrakeen, so
// Thufir Hawat's own ledger conversation (speaker is always a real name
// here, never a generic placeholder) would otherwise show the Duke's
// portrait under Thufir's name. Pre-existing for the old vell_ledger_root
// path too — this closes it for both, and for any future Arrakeen content.

import type { Character } from './types'

/**
 * Matches by name first — a scripted node names a specific character on
 * purpose. Falls back to the first character at `locationId` only when no
 * name match exists, which is the correct behavior for a generic tree's
 * placeholder speaker ("Village Elder", "Harkonnen Overseer", ...): those
 * have no roster entry of that name, and the old "whoever lives here"
 * resolution is exactly right for them.
 */
export function speakerCharacter(
  characters: readonly Character[],
  speakerName: string,
  locationId: string,
): Character | undefined {
  return characters.find(c => c.name === speakerName) ?? characters.find(c => c.locationId === locationId)
}
