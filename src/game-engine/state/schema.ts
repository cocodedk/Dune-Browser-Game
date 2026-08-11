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
 * v4: added `lastProcessedDay` day-boundary bookkeeping and wired this
 *     module into the production save path (persistence.ts) — see
 *     saveMigration.ts's migrateV3ToV4. The bump is required, not
 *     cosmetic: without it, an old raw-world save already self-reporting
 *     `version: 3` would bypass migration entirely and never gain the new
 *     field (baseline/wp01-critic-verdict.md PROBE A's reload defect).
 * v5: drops the retired aggregate player economy (`troops`/`influence`),
 *     faction-AI timer content, and legacy sietch task progress
 *     (`currentTask`/`outputProgress`) from a migrated save — see
 *     saveMigration.v5.ts's migrateV4ToV5. Backfills at most one crew per
 *     pledged legacy sietch when none exists yet, reusing W2b's
 *     deterministic `group_<villageId>` scheme. Also stops serializing
 *     `factionProfiles`: it is excluded from `CanonicalCampaignState` below
 *     and reseeded fresh from static data on every load instead (see
 *     data/factionProfiles.ts) — the quarantined faction sandbox (02
 *     "Current conflicts to retire") has no live campaign writer, so its
 *     persisted content could never diverge from the seed. `goalType` is
 *     not re-mentioned here: it left the `WorldState` type entirely this
 *     same chunk (was already dropped from saves at v3).
 */
export const SCHEMA_VERSION = 5

/** A save envelope already migrated to the current schema. */
export interface CanonicalSaveEnvelope {
  version: typeof SCHEMA_VERSION
  savedAt: number
  state: CanonicalCampaignState
}

/**
 * The canonical campaign state a save/hash is built from.
 *
 * `goalAchieved` is a derived runtime value that must never be serialized
 * independently (02 "Campaign status"); `factionProfiles` is static,
 * quarantined-sandbox content reseeded fresh on every load rather than
 * persisted (see data/factionProfiles.ts and the v5 schema note above).
 * Both are excluded here at the type level so a future field added to
 * `WorldState` is canonical by default, and only these two stay opted out.
 * (`goalType` needs no entry here — it is not a `WorldState` field at all
 * any more, not merely a canonical-state exclusion.)
 */
export type CanonicalCampaignState = Omit<WorldState, 'goalAchieved' | 'factionProfiles'>
