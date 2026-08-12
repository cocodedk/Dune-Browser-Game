// src/game-engine/saveMigration.v5.ts
// v4 -> v5: the consolidated-campaign migration step. Split out of
// saveMigration.ts to keep that file under the 200-line cap — the split
// mirrors saveMigration.v3.test.ts's precedent of splitting by version
// range, just on the implementation side instead of the test side.
//
// docs/PRD/game-completion/02-runtime-consolidation.md ("Save migration",
// steps 2-5) plus WP02's own chunk brief. Each step below is cited against
// its exact source line.

import type { WorldState, Player } from '../types'
import type { SietchState } from './sietch/types'
import { groupsForPledgedSietch } from '../data/troopGroups'

/** A pre-v5 Player may still carry the retired aggregate-economy fields. */
type LegacyPlayer = Player & { troops?: number; influence?: number }

/** A pre-v5 SietchState may still carry the retired threshold-task fields. */
type LegacySietchState = SietchState & { currentTask?: unknown; outputProgress?: number }

/**
 * v4 -> v5: strip the retired dual economy, backfill at most one crew per
 * already-pledged legacy sietch, and reset dead faction-AI timer content.
 *
 * Step 4 (drop): `player.troops`/`player.influence` (02's "Current conflicts
 * to retire": both superseded by `TroopGroup`/`world.charisma`+loyalty),
 * every sietch's `currentTask`/`outputProgress` (superseded by crew tasks —
 * sietch/types.ts's doc), and `aiTimers` content (the quarantined faction-AI
 * sandbox — 02 "Preserve behind a non-shipping sandbox seam only" — has no
 * live campaign writer or reader on this path; AISystem.ts:30 reading
 * `world.aiTimers.harkonnen` as `undefined` on a migrated save is an
 * accepted, harmless consequence of that quarantine, not a gap: that read
 * is unreachable from GameLoop.ts in campaign mode, see legacy-authority
 * -inventory.md category 1). `goalType` needs no line here — migrateSave's
 * chain already ran migrateV2ToV3 (which drops it) on any save older than
 * v5 before this step ever runs.
 *
 * `factionProfiles` is deliberately NOT touched here: it is excluded from
 * `CanonicalCampaignState` (state/schema.ts) and reseeded fresh in
 * persistence.ts's `fromEnvelope` instead — a canonical-layer decision, the
 * same layer that already owns dropping `goalAchieved`, not a per-step
 * migration concern.
 *
 * Step 5 (map influence-gated content): a documented NO-OP.
 * baseline/legacy-authority-inventory.md category 4's "Gate search result"
 * found `player.influence` write-only — nothing engine-reachable ever
 * gated content on it, so there is no meaningful content to remap to a flag
 * or to charisma. DialogueSystem.ts's `influenceDelta` handling already
 * cites the same finding for why accepting-and-ignoring the field is
 * correct rather than a partial migration.
 *
 * Step 2 (crew backfill): a legacy sietch with `pledgedToPlayer: true` and
 * no matching `group_<villageId>` crew gets exactly one, sized from its own
 * `fremenWorkers` — the identical scheme SietchSystem.ts's live pledge
 * chain uses (`groupsForPledgedSietch`), so a migrated crew is
 * indistinguishable from one a live pledge would have created. A crew that
 * already exists (the save is being re-migrated, or was taken after the
 * crew system already existed) is left alone and merely re-attached to
 * `crewIds` if not already there — never duplicated.
 *
 * Step 3 (no back-pay): this function never reads or writes
 * `state.player.spice` — the crew backfill above creates a crew, not
 * income; saveMigration.v5.test.ts asserts spice is byte-identical
 * before/after.
 *
 * Idempotent (step 7): re-running against this function's own output is a
 * no-op at every step — the legacy fields are already absent (destructuring
 * an absent optional property is harmless), every pledged sietch already
 * has its crew and already lists it in `crewIds`, and `aiTimers` resets to
 * the same `{}` again.
 */
export function migrateV4ToV5(state: WorldState): WorldState {
  const { troops: _troops, influence: _influence, ...restPlayer } =
    state.player as LegacyPlayer
  void _troops
  void _influence

  let troopGroups = state.troopGroups
  const sietches = (state.sietches as LegacySietchState[]).map((raw) => {
    const { currentTask: _currentTask, outputProgress: _outputProgress, ...rest } = raw
    void _currentTask
    void _outputProgress
    const sietch = rest as SietchState
    if (!sietch.pledgedToPlayer) return sietch

    const crewId = `group_${sietch.villageId}`
    const existingCrew = troopGroups.find(g => g.id === crewId)
    if (!existingCrew) {
      troopGroups = [...troopGroups, groupsForPledgedSietch(sietch.villageId, sietch.fremenWorkers)]
    }
    if (sietch.crewIds?.includes(crewId)) return sietch
    return { ...sietch, crewIds: [...new Set([...(sietch.crewIds ?? []), crewId])] }
  })

  return {
    ...state,
    player: restPlayer as Player,
    sietches,
    troopGroups,
    aiTimers: {},
  }
}
