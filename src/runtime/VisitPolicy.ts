// src/runtime/VisitPolicy.ts
// PURE decision logic for clicking a village marker. No side effects, no
// EventBus, no engine mutation — the caller (render layer) dispatches the
// returned action.

import type { FactionId, Village, VillageId, WorldState } from '../types'
import { INITIAL_CHARACTERS } from '../data/characters'
import { INITIAL_DIALOGUE_STATES } from '../data/dialogueStates'
import { STORY_TREE_ID } from '../data/dialogue'
import { rootNodeForCharacter } from '../game-engine/dialogue/select'
import { residentsAt } from '../game-engine/dialogue/residents'
import type { Character } from '../game-engine/dialogue/types'
import type { FlagStore } from '../game-engine/dialogue/conditions'

/**
 * Which conversation each faction opens when you stand in its territory.
 *
 * This map is the whole point of the module. Before it, decideVisit named two
 * tree ids inline — harkonnen_stronghold and village_leader — and there was no
 * third branch, so five of the seven authored trees had zero runtime references
 * anywhere in the codebase: fremen_sietch, atreides_embassy, smuggler_outpost,
 * emperor_delegation and neutral_settlement. That is 78 authored dialogue nodes
 * out of 105 that no player could reach by any route.
 *
 * It went unnoticed because the dialogue tests check that each tree is
 * internally well-formed — every choice resolves, every node terminates — and a
 * tree nothing ever opens passes all of that perfectly. `everyTreeIsReachable`
 * in the test beside this file is the guard that closes it: it fails if a tree
 * is authored and never routed to.
 *
 * 'player' is absent on purpose. Your own territory fires an event instead of a
 * conversation, and that branch is taken before this map is consulted.
 */
const TREE_BY_OWNER: Partial<Record<FactionId, string>> = {
  harkonnen: 'harkonnen_stronghold',
  fremen: 'fremen_sietch',
  atreides: 'atreides_embassy',
  smugglers: 'smuggler_outpost',
  emperor: 'emperor_delegation',
  neutral: 'neutral_settlement',
}

/**
 * The generic tree, for an owner with nothing more specific written for it.
 *
 * Every faction currently owns somewhere, so this is unreachable in the shipped
 * data — but a new faction added without a tree should get a conversation
 * rather than silence.
 */
export const FALLBACK_TREE = 'village_leader'

/** The conversation opened by standing in a faction's territory. */
export function treeForOwner(owner: FactionId): string {
  return TREE_BY_OWNER[owner] ?? FALLBACK_TREE
}

/** Every tree this policy can open. The reachability test reads this. */
export function routedTrees(): string[] {
  return [...new Set([...Object.values(TREE_BY_OWNER), FALLBACK_TREE])]
}

/**
 * Why a click resolved to nothing.
 *
 * `none` used to carry no reason at all, which is how the PEOPLE HERE list
 * came to swallow clicks in silence: the dialogue overlay stops short of the
 * command column (DialoguePanel.styles.ts), so every resident button stays
 * visible and clickable through the opening's own auto-opened briefing, and
 * `in-dialogue` refusals had nothing to say. Travel already learned this
 * lesson (travel/rules.ts's 'finish-the-conversation'); speaking had not.
 */
export type VisitRefusal =
  | 'traveling'
  | 'in-dialogue'
  | 'unknown-person'
  | 'not-here'
  | 'unknown-place'

export type VisitAction =
  | { kind: 'none'; reason: VisitRefusal }
  | { kind: 'travel'; targetId: VillageId }
  | { kind: 'dialogue'; treeId: string; villageId: VillageId; nodeId?: string }
  | { kind: 'event'; message: string } // own territory

/**
 * The conversation a given resident (or no resident at all) opens at
 * `village`: the resident's own written state if {@link rootNodeForCharacter}
 * finds one, otherwise the generic tree {@link treeForOwner} routes to.
 *
 * Both decideVisit (first resident, or none) and decideSpeakTo (one named
 * resident, always present) reduce to this one branch, so the two entry
 * points cannot answer differently for the same person — the whole defect
 * this module fixes was two divergent ideas of "who can I talk to here".
 */
function dialogueForResident(
  resident: Character | undefined,
  village: Village,
  flags: FlagStore,
): VisitAction {
  if (resident) {
    const nodeId = rootNodeForCharacter(resident.id, INITIAL_DIALOGUE_STATES, flags)
    if (nodeId) {
      return { kind: 'dialogue', treeId: STORY_TREE_ID, villageId: village.id, nodeId }
    }
  }

  return {
    kind: 'dialogue',
    treeId: treeForOwner(village.owner),
    villageId: village.id,
  }
}

/**
 * Decide what a click on `locationId` should do, given the current world.
 *
 * Blocked while traveling or mid-dialogue. At the player's own location:
 * owner === 'player' fires the "your territory" event; otherwise, whoever
 * {@link residentsAt} lists first here gets first say — this is the "click
 * the village" default, not the only way to reach anyone at that address; a
 * player who wants someone else uses {@link decideSpeakTo} instead. Anywhere
 * else, the click starts travel.
 */
export function decideVisit(world: WorldState, locationId: VillageId): VisitAction {
  if (world.player.state === 'traveling') return { kind: 'none', reason: 'traveling' }
  if (world.dialogue !== null) return { kind: 'none', reason: 'in-dialogue' }

  const village = world.villages.find(v => v.id === locationId)
  if (!village) return { kind: 'none', reason: 'unknown-place' }

  if (world.player.location !== locationId) {
    return { kind: 'travel', targetId: locationId }
  }

  if (village.owner === 'player') {
    return { kind: 'event', message: `You are at ${village.name} — your territory.` }
  }

  const [resident] = residentsAt(INITIAL_CHARACTERS, locationId)
  return dialogueForResident(resident, village, world.flags)
}

/**
 * Decide what happens when the player picks a specific person to speak to,
 * by id, rather than accepting the village's default resident.
 *
 * `none` while traveling or mid-dialogue (same guards as decideVisit), for
 * an id that doesn't match anyone in INITIAL_CHARACTERS, or for someone real
 * but not at `world.player.location` — you cannot address a person standing
 * on the other side of the planet just because you know their name. Once
 * those pass, the character is by definition a resident of where the player
 * is standing, so {@link dialogueForResident} is handed a village that must
 * exist; the guard still checks, since a corrupt save is a `none`, not a
 * crash.
 */
export function decideSpeakTo(world: WorldState, characterId: string): VisitAction {
  if (world.player.state === 'traveling') return { kind: 'none', reason: 'traveling' }
  if (world.dialogue !== null) return { kind: 'none', reason: 'in-dialogue' }

  const character = INITIAL_CHARACTERS.find(c => c.id === characterId)
  if (!character) return { kind: 'none', reason: 'unknown-person' }
  if (character.locationId !== world.player.location) return { kind: 'none', reason: 'not-here' }

  const village = world.villages.find(v => v.id === world.player.location)
  if (!village) return { kind: 'none', reason: 'unknown-place' }

  return dialogueForResident(character, village, world.flags)
}
