// src/ui/centreGuidance.ts
// Which decision the centre of the screen should offer right now — PURE,
// so it is provable under vitest's `environment: 'node'` (no DOM, no React,
// no localStorage). ActionPrompt.tsx renders this answer and owns the
// guidance/dismissal gating; this module only decides what is LIVE.
//
// Why it exists: the owner played the M1 build and reported "I have no idea
// how to harvest or collect spice", having already said "my focus is on the
// center of the screen and I don't read the sidebar". Both verbs that
// produce spice income — pledge a sietch, put a crew on a field — existed
// only as command-column controls.
//
// Every rule here is REUSED, never re-derived:
//   - pledge legality is `checkPledgeChain` (game-engine/SietchSystem.ts),
//     the same read-only check PledgePanel.tsx and the command itself run;
//   - the field is `recommendedField` (troops/harvestRecommendation.ts),
//     the same helper behind CrewCard.tsx's ★, called with the SAME origin
//     (the crew's current village position) so the two can never disagree;
//   - "already assigned" is FIRST_HARVEST_FLAG, read from openingObjectives
//     .ts (that file sits at exactly 200/200 — imported, never edited).
//
// NOTE ON `checkPledgeChain`: it reads game-engine/GameState.ts's live
// `world` singleton rather than an argument. Callers must therefore pass
// THAT world — production always does (ui/store.ts holds the singleton, and
// GameDriver re-broadcasts the same mutable object), and tests do it with
// `setWorld`. Everything else here reads only the passed `world`.
//
// PROMPT REGISTRY, and how WP05 extends it: `PROMPT_REGISTRY` is an ordered
// table of objective id -> prompt kind -> detector. The objective id is
// EXTENSION METADATA, not a gate — the detector alone decides liveness, so
// a second pledge at Sietch Tabr (Beat 6, while `act1.prepare_q1` is the
// active objective) still gets its prompt. WP05 appends Act 2-4 rows here;
// nothing in the engine changes.

import type { WorldState } from '../types'
import { checkPledgeChain } from '../game-engine/SietchSystem'
import { recommendedField } from '../game-engine/troops/harvestRecommendation'
import { fieldDisplayName } from '../game-engine/troops/fieldDisplayName'
import { FIRST_HARVEST_FLAG, type ObjectiveId } from '../game-engine/acts/openingObjectives'

export type LivePrompt =
  | { kind: 'pledge'; villageId: string; name: string }
  | { kind: 'first-harvest'; groupId: string; fieldId: string; fieldName: string }

export type PromptKind = LivePrompt['kind']

interface PromptEntry {
  /** The opening objective this prompt serves. Documentation and the WP05
   * append point — never consulted as a precondition (see header). */
  objectiveId: ObjectiveId
  kind: PromptKind
  detect: (world: WorldState) => LivePrompt | null
}

/**
 * Standing at a Fremen sietch that has not sworn to the player yet, with
 * every step of the five-step pledge chain already satisfied — loyalty,
 * charisma capacity and pledge count included, because that is exactly what
 * `checkPledgeChain` answers. Presence is part of that chain's step 1, so
 * this is never offered remotely.
 */
function pledgePrompt(world: WorldState): LivePrompt | null {
  const villageId = world.player.location
  const village = world.villages.find(v => v.id === villageId)
  if (!village || village.owner !== 'fremen') return null
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch || sietch.pledgedToPlayer) return null
  if (!checkPledgeChain(villageId).ok) return null
  return { kind: 'pledge', villageId, name: village.name }
}

/**
 * A crew standing idle with somewhere worth sending it, before the opening's
 * first harvest order has ever been given. `changeoverDaysLeft === 0` keeps
 * the card away from a crew that is already moving to new orders — it reads
 * as idle in the data but the player has just given it a job.
 *
 * Retired for the whole campaign once FIRST_HARVEST_FLAG is set: this is a
 * teaching prompt for the one order a player has never given, not a standing
 * nag at every idle crew afterwards.
 */
function harvestPrompt(world: WorldState): LivePrompt | null {
  if (world.flags[FIRST_HARVEST_FLAG] === true) return null
  const crew = world.troopGroups.find(g => g.task === 'idle' && g.changeoverDaysLeft === 0)
  if (!crew) return null
  // CrewCard.tsx's own origin, character for character — the ★ and this
  // prompt must always name the same field.
  const from = world.villages.find(v => v.id === crew.locationId)?.position ?? { x: 0, y: 0 }
  const field = recommendedField(from, world.spiceFields)
  if (!field) return null
  return {
    kind: 'first-harvest',
    groupId: crew.id,
    fieldId: field.id,
    fieldName: fieldDisplayName(field.id),
  }
}

export const PROMPT_REGISTRY: readonly PromptEntry[] = [
  { objectiveId: 'act1.earn_trust', kind: 'pledge', detect: pledgePrompt },
  { objectiveId: 'act1.order_first_harvest', kind: 'first-harvest', detect: harvestPrompt },
]

/**
 * The one prompt the centre band should offer, or null.
 *
 * Two blanket suppressions come first, both because the surface in question
 * already owns the screen at that moment: an open conversation (DialoguePanel
 * sits at z-index 100, above this card's 90) and a pending tribute settlement
 * (SettlementModal, 150 — "one decision at a time", 02 "Tribute").
 */
export function livePrompt(world: WorldState): LivePrompt | null {
  if (world.dialogue !== null) return null
  if (world.pendingSettlement !== null) return null
  for (const entry of PROMPT_REGISTRY) {
    const prompt = entry.detect(world)
    if (prompt) return prompt
  }
  return null
}

/**
 * The dismissal key for one prompt, stored in the same localStorage map coach
 * marks use (settings/localSettings.ts) — so "Not yet" is forgotten the
 * moment guidance is re-enabled, free, via setGuidanceEnabled's existing
 * clear. Keyed per TARGET, not per kind: declining at one sietch must not
 * silently kill the teaching at the next one. Never rendered, so the
 * no-raw-ids-on-screen rule does not reach it.
 */
export function promptKey(prompt: LivePrompt): string {
  return prompt.kind === 'pledge'
    ? `prompt.pledge.${prompt.villageId}`
    : 'prompt.first-harvest'
}
