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
import { REDWALL_TRUST_NODES } from './opening-redwall-trust'
import { TABR_DILEMMA_NODES } from './opening-tabr-dilemma'
import { Q1_DEBRIEF_NODES, q1DebriefRootId } from './opening-q1-debrief'
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

export { BRIEFING_NODES, LEDGER_NODES, REDWALL_TRUST_NODES, TABR_DILEMMA_NODES, Q1_DEBRIEF_NODES, q1DebriefRootId }
/**
 * The opening's dedicated beat trees (chunks W3c-e — 03-opening-
 * experience.md "Teaching sequence" Beats 1-2, 4, 6, and 7). Each is its own
 * tree, NOT folded into STORY_NODES/STORY_TREE_ID — see opening-briefing.ts's
 * header for why. Opened only by DialogueSystem.ts's own auto-open/
 * auto-chain logic, TravelSystem.ts's arrival triggers (Beats 4 and 6 — see
 * checkTravelArrival's own doc), runtime/openingBriefing.ts's trigger
 * (Beats 1-2), and runtime/q1Debrief.ts's trigger (Beat 7), never by
 * VisitPolicy routing, so none needs an entry in routedTrees()/DIALOGUES.
 */
export const BRIEFING_TREE_ID = 'story/briefing'
export const LEDGER_TREE_ID = 'story/ledger'
export const REDWALL_TRUST_TREE_ID = 'story/redwall_trust'
export const TABR_DILEMMA_TREE_ID = 'story/tabr_dilemma'
export const Q1_DEBRIEF_TREE_ID = 'story/q1_debrief'
