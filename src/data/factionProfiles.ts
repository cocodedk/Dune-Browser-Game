// src/data/factionProfiles.ts
// Static faction roster, deep-copied fresh on every read.
//
// docs/PRD/game-completion/02-runtime-consolidation.md's "Current conflicts
// to retire" quarantines the emergent faction simulation "behind a
// non-shipping sandbox seam" — baseline/legacy-authority-inventory.md
// category 1 confirms nothing on the campaign path calls it (AISystem.ts has
// no production caller; FactionPanel.tsx is never mounted;
// DialogueSystem.ts's reputationAction write is accepted-but-ignored). With
// no live campaign writer, `world.factionProfiles` never diverges from this
// data — so as of WP02f it is excluded from `CanonicalCampaignState`
// (state/schema.ts) and reseeded fresh here on every load
// (persistence.ts's fromEnvelope), the same way GameState.ts already
// reseeds it fresh on every `createInitialState()` call. The campaign does
// not depend on its persisted content either way.

import type { FactionProfile } from '../game-engine/faction/types'
import factionsData from './factions.json'

/**
 * Deep copy, not a shared reference: relations/goals are per-run mutable
 * state for the (quarantined) faction sandbox, so two callers of this
 * function — New Game, a reset, a reload — must never alias one another's
 * nested objects.
 */
export function seedFactionProfiles(): FactionProfile[] {
  return (factionsData as unknown as FactionProfile[]).map(f => ({
    ...f,
    relations: { ...f.relations },
    goals: [...f.goals],
  }))
}
