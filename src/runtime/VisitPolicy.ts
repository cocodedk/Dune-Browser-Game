// src/runtime/VisitPolicy.ts
// PURE decision logic for clicking a village marker. No side effects, no
// EventBus, no engine mutation — the caller (render layer) dispatches the
// returned action.

import type { FactionId, VillageId, WorldState } from '../types'

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

export type VisitAction =
  | { kind: 'none' } // traveling or in dialogue — click is ignored
  | { kind: 'travel'; targetId: VillageId }
  | { kind: 'dialogue'; treeId: string; villageId: VillageId }
  | { kind: 'event'; message: string } // own territory

/**
 * Decide what a click on `locationId` should do, given the current world.
 *
 * Blocked while traveling or mid-dialogue. At the player's own location:
 * owner === 'player' fires the "your territory" event, and every other faction
 * opens the conversation {@link treeForOwner} routes it to. Anywhere else, the
 * click starts travel.
 */
export function decideVisit(world: WorldState, locationId: VillageId): VisitAction {
  if (world.player.state === 'traveling') return { kind: 'none' }
  if (world.dialogue !== null) return { kind: 'none' }

  const village = world.villages.find(v => v.id === locationId)
  if (!village) return { kind: 'none' }

  if (world.player.location !== locationId) {
    return { kind: 'travel', targetId: locationId }
  }

  if (village.owner === 'player') {
    return { kind: 'event', message: `You are at ${village.name} — your territory.` }
  }
  return {
    kind: 'dialogue',
    treeId: treeForOwner(village.owner),
    villageId: village.id,
  }
}
