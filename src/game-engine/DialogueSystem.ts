import { world } from './GameState';
import { applyEffect } from './dialogue/applyEffect';
import { pushEvent } from './EventSystem';
import { EventBus } from '../EventBus';
import type { VillageId, DialogueNode, WorldState } from '../types';
import { DIALOGUES } from '../data/dialogues';
import {
  STORY_NODES, STORY_TREE_ID, BRIEFING_NODES, BRIEFING_TREE_ID, LEDGER_NODES, LEDGER_TREE_ID,
  REDWALL_TRUST_NODES, REDWALL_TRUST_TREE_ID, TABR_DILEMMA_NODES, TABR_DILEMMA_TREE_ID,
  Q1_DEBRIEF_NODES, Q1_DEBRIEF_TREE_ID,
} from '../data/dialogue';
import { Q1_DEBRIEF_ROOT_IDS } from '../data/dialogue/opening-q1-debrief';
import {
  BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG, REDWALL_TRUST_ACKNOWLEDGED_FLAG,
} from './acts/openingObjectives';

/**
 * Runtime tree lookup, local to this module.
 *
 * STORY_TREE_ID is deliberately absent from the exported `DIALOGUES` record
 * in data/dialogues.ts: VisitPolicy.test.ts's `leaves no authored tree
 * unreachable` diffs that record against the faction-routed trees, and
 * merging story content into it would break that invariant even though the
 * story tree is fully playable through this lookup. BRIEFING_TREE_ID and
 * LEDGER_TREE_ID are absent for the same reason, and are never routed to by
 * VisitPolicy at all — only startDialogue's own callers below (the auto-open
 * chain, runtime/openingBriefing.ts) ever open them.
 */
const TREES: Record<string, DialogueNode[]> = {
  ...DIALOGUES,
  [STORY_TREE_ID]: STORY_NODES,
  [BRIEFING_TREE_ID]: BRIEFING_NODES,
  [LEDGER_TREE_ID]: LEDGER_NODES,
  [REDWALL_TRUST_TREE_ID]: REDWALL_TRUST_NODES,
  [TABR_DILEMMA_TREE_ID]: TABR_DILEMMA_NODES,
  [Q1_DEBRIEF_TREE_ID]: Q1_DEBRIEF_NODES,
};

/**
 * @param nodeId Node to open on, for a conversation gated to a specific story
 *   state (see VisitPolicy). Omitted, this opens on tree[0] as before.
 */
export function startDialogue(treeId: string, villageId: VillageId, nodeId?: string): void {
  const tree = TREES[treeId];
  if (!tree) return;
  const firstNode = nodeId ? tree.find(n => n.id === nodeId) : tree[0];
  if (!firstNode) return;
  world.dialogue = { treeId, currentNodeId: firstNode.id, villageId };
  pushEvent('dialogue_start', `💬 Speaking with ${firstNode.speaker}...`);
  EventBus.emit('dialogue:started', { nodeId: firstNode.id, villageId });
}

export function currentNode() {
  if (!world.dialogue) return null;
  const tree = TREES[world.dialogue.treeId];
  return tree?.find(n => n.id === world.dialogue!.currentNodeId) ?? null;
}

/**
 * Whether the currently open dialogue may be closed early (Escape, the
 * panel's own × button) rather than walked to a real end.
 *
 * True for every ordinary conversation. False only for the opening's two
 * mandatory beats (BRIEFING_TREE_ID/LEDGER_TREE_ID) before their own closing
 * choice has set the flag that completes them. Without this, removing the
 * W3a stand-in (see endDialogue's own doc) opens a real softlock: Escape on
 * the auto-opened Duke conversation would leave `world.dialogue` null with
 * `briefing.complete` still false, freezing the whole campaign clock
 * (pause.ts's briefingPending) with no click-path back to this specific
 * tree — VisitPolicy still routes an Arrakeen click to the ongoing 'story'
 * tree's own, unrelated Duke content, not this one. Exported so
 * DialoguePanel.tsx can also hide the × affordance instead of leaving a
 * dead button on screen.
 *
 * REDWALL_TRUST_TREE_ID joins the mandatory set in chunk W3d, for the same
 * reason: an early Escape would leave Beat 4 open with neither reply chosen,
 * so loyalty never reaches PLEDGE_THRESHOLD and the pledge stays refused
 * with no click-path back to this specific tree (TravelSystem.ts's trigger
 * only fires once, on arrival — see its own doc).
 *
 * Q1_DEBRIEF_TREE_ID joins in remediation W3h, but only AT its four root
 * nodes (Q1_DEBRIEF_ROOT_IDS) — Fenring's line reads as terminal on its own,
 * so leaving × and Escape live there let a player close the whole debrief
 * believing it was over, skipping Thufir's summary (opening-q1-debrief.ts's
 * own header has the full account). Node-keyed rather than flag-keyed like
 * the three trees above: this tree carries no effects or flags of its own
 * to gate on, so the gate reads `currentNodeId` directly instead.
 */
export function canCloseDialogue(): boolean {
  return dialogueIsCloseable(world);
}

/**
 * Pure form of canCloseDialogue, for callers that hold a WorldState instance
 * rather than reaching into this module's GameState singleton — chunk W3f's
 * ViewHint.tsx, which needs the same mandatory-beat rule to pick its
 * conversation-mode copy honestly (it must not offer "press Esc" during a
 * beat Escape cannot actually close). Mirrors canCloseDialogue's rule
 * exactly; see that function's own doc for why each tree is mandatory.
 */
export function dialogueIsCloseable(state: WorldState): boolean {
  if (!state.dialogue) return true;
  const { treeId } = state.dialogue;
  if (treeId === BRIEFING_TREE_ID) return state.flags[BRIEFING_COMPLETE_FLAG] === true;
  if (treeId === LEDGER_TREE_ID) return state.flags[LEDGER_READ_FLAG] === true;
  if (treeId === REDWALL_TRUST_TREE_ID) return state.flags[REDWALL_TRUST_ACKNOWLEDGED_FLAG] === true;
  if (treeId === Q1_DEBRIEF_TREE_ID) return !Q1_DEBRIEF_ROOT_IDS.includes(state.dialogue.currentNodeId);
  return true;
}

export function endDialogue(): void {
  if (!world.dialogue) return;
  if (!canCloseDialogue()) return;
  const closingTreeId = world.dialogue.treeId;
  const location = world.player.location;
  world.dialogue = null;
  pushEvent('dialogue_end', '💬 Conversation ended.');
  EventBus.emit('dialogue:ended');

  // Beat 2 opens the instant Beat 1 closes (03-opening-experience.md
  // "Starting contract": "Day 0, morning presentation" — both beats are one
  // paused morning sitting at Arrakeen, Duke then Thufir). canCloseDialogue's
  // guard above means this only ever runs once briefing.complete is already
  // true, so there is no risk of chaining off an early/forced close.
  if (closingTreeId === BRIEFING_TREE_ID && world.flags[LEDGER_READ_FLAG] !== true) {
    startDialogue(LEDGER_TREE_ID, location as VillageId);
  }
}

export function chooseDialogue(choiceId: string): void {
  const node = currentNode();
  if (!node) return;
  const choice = node.choices.find(c => c.id === choiceId);
  if (!choice) return;

  if (choice.effect) {
    applyEffect(choice.effect, world.dialogue!.villageId, world.dialogue!.treeId, node.id);
  }

  if (choice.nextId === null) {
    // One choke point for "a dialogue just ended" (see endDialogue's own
    // logic) rather than duplicating its body here.
    endDialogue();
  } else {
    world.dialogue!.currentNodeId = choice.nextId;
  }
}
