// src/game-engine/state/schema.ts
// Canonical campaign-state schema version and the envelope/derived types
// built around it.
//
// docs/PRD/game-completion/02-runtime-consolidation.md ("Save migration"):
// "Introduce one schema version for the consolidated campaign model."
// saveMigration.ts's CURRENT_SAVE_VERSION re-exports SCHEMA_VERSION, so
// there is exactly one number to bump when the on-disk shape changes —
// this module, not saveMigration.ts, is that source of truth.

import type { WorldState } from '../../types'

/**
 * The consolidated-campaign schema version.
 *
 * v1: pre-versioning saves (implicit; no `version` field on disk).
 * v2: added Location fields (kind/discovered/regionId) and the explicit
 *     pause flag — see saveMigration.ts's migrateV1ToV2.
 * v3: added the seeded `rng` field and stopped serializing `goalType` —
 *     see saveMigration.ts's migrateV2ToV3 and ./canonical.ts.
 */
export const SCHEMA_VERSION = 3

/** A save envelope already migrated to the current schema. */
export interface CanonicalSaveEnvelope {
  version: typeof SCHEMA_VERSION
  savedAt: number
  state: CanonicalCampaignState
}

/**
 * The canonical campaign state a save/hash is built from.
 *
 * `goalType` is retired (02 "Campaign status") and `goalAchieved` is a
 * derived runtime value that must never be serialized independently — both
 * are excluded here at the type level so a future field added to
 * `WorldState` is canonical by default, and only these two stay opted out.
 */
export type CanonicalCampaignState = Omit<WorldState, 'goalType' | 'goalAchieved'>
