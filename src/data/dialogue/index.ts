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
