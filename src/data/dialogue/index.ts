// src/data/dialogue/index.ts
// The story tree: every authored character conversation, concatenated into
// the single array the runtime actually loads.
//
// act1.test.ts built this exact concatenation locally as `ALL`, to prove the
// corpus is internally sound — unique ids, every declared root present, every
// choice resolving, every conversation terminating — while nothing shipped it
// to a player. Exporting it here turns those checks into a guarantee about
// the game rather than about a private test fixture.

import { PALACE_NODES } from './act1-palace'
import { DESERT_NODES } from './act1-desert'
import { ACT2_NODES } from './act2'
import { ACT3_NODES } from './act3'
import { REACHES_DESERT_NODES } from './reaches-desert'
import { REACHES_BASIN_NODES } from './reaches-basin'
import { DUNCAN_NODES } from './duncan'
import { BRIEFING_NODES } from './opening-briefing'
import { LEDGER_NODES } from './opening-ledger'
import type { DialogueNode } from '../../types'

export const STORY_NODES: DialogueNode[] = [
  ...PALACE_NODES, ...DESERT_NODES, ...ACT2_NODES, ...ACT3_NODES,
  ...REACHES_DESERT_NODES, ...REACHES_BASIN_NODES, ...DUNCAN_NODES,
]

/**
 * Tree id STORY_NODES is registered under in DialogueSystem's runtime lookup.
 *
 * Deliberately not added to the exported `DIALOGUES` record in
 * data/dialogues.ts: VisitPolicy.test.ts's `leaves no authored tree
 * unreachable` diffs that record against the faction-routed trees, and this
 * tree is routed a different way — by story flags and location residency,
 * not by faction ownership.
 */
export const STORY_TREE_ID = 'story'

export { BRIEFING_NODES, LEDGER_NODES }
/**
 * The opening's two dedicated beat trees (chunk W3c — 03-opening-
 * experience.md "Teaching sequence" Beats 1-2). Each is its own tree, NOT
 * folded into STORY_NODES/STORY_TREE_ID — see opening-briefing.ts's header
 * for why. Opened only by DialogueSystem.ts's own auto-open/auto-chain
 * logic and runtime/openingBriefing.ts's trigger, not by VisitPolicy
 * routing, so neither needs an entry in routedTrees()/DIALOGUES.
 */
export const BRIEFING_TREE_ID = 'story/briefing'
export const LEDGER_TREE_ID = 'story/ledger'
