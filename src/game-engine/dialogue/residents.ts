// src/game-engine/dialogue/residents.ts
// PURE lookup: who is standing at a location right now.
//
// Split out of VisitPolicy because both the click-a-village default (first
// resident) and the click-a-person UI (every resident) need the same
// definition of "who's here" — one wrong or drifting copy of this filter was
// the root of the defect where nine locations hid 11 of their 20 characters
// behind whoever INITIAL_CHARACTERS happened to list first.

import type { Character } from './types'

/**
 * Everyone at `locationId`, in INITIAL_CHARACTERS declaration order.
 *
 * Declaration order matters beyond display: decideVisit's "click the village"
 * default is defined as "the first of what this function returns", so the
 * order here IS the order that default follows. Changing this function's
 * order changes who greets you when you click the map, not just the list.
 */
export function residentsAt(characters: readonly Character[], locationId: string): Character[] {
  return characters.filter(c => c.locationId === locationId)
}
