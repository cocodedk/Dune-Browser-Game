import { world } from './GameState';
import { applyFlagEffects } from './dialogue/conditions';
import { pushEvent } from './EventSystem';
import { EventBus } from '../EventBus';
import type { VillageId, DialogueEffect, DialogueNode } from '../types';
import { DIALOGUES } from '../data/dialogues';
import { STORY_NODES, STORY_TREE_ID } from '../data/dialogue';
import { checkOwnershipTransition } from './VillageSystem';
import { adjustLoyalty } from './sietch/loyalty';
import { readLoyaltyState, writeLoyaltyState } from './sietch/loyaltyState';
import { applyPlayerAction } from './faction/reputation';
import { toReputationWorld } from './faction/adapter';
// Imported straight from endgameOps rather than the EconomySystem facade —
// EconomySystem re-exports dozens of day-runners this module has no use for,
// and pulling in the whole facade for one function is the kind of import
// that turns into a cycle the first time EconomySystem needs a dialogue hook.
import { attemptRitual } from './economy/endgameOps';

/**
 * Runtime tree lookup, local to this module.
 *
 * STORY_TREE_ID is deliberately absent from the exported `DIALOGUES` record
 * in data/dialogues.ts: VisitPolicy.test.ts's `leaves no authored tree
 * unreachable` diffs that record against the faction-routed trees, and
 * merging story content into it would break that invariant even though the
 * story tree is fully playable through this lookup.
 */
const TREES: Record<string, DialogueNode[]> = {
  ...DIALOGUES,
  [STORY_TREE_ID]: STORY_NODES,
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
  pushEvent('dialogue_start', `\ud83d\udcac Speaking with ${firstNode.speaker}...`);
  EventBus.emit('dialogue:started', { nodeId: firstNode.id, villageId });
}

export function currentNode() {
  if (!world.dialogue) return null;
  const tree = TREES[world.dialogue.treeId];
  return tree?.find(n => n.id === world.dialogue!.currentNodeId) ?? null;
}

export function endDialogue(): void {
  if (!world.dialogue) return;
  world.dialogue = null;
  pushEvent('dialogue_end', '\ud83d\udcac Conversation ended.');
  EventBus.emit('dialogue:ended');
}

export function chooseDialogue(choiceId: string): void {
  const node = currentNode();
  if (!node) return;
  const choice = node.choices.find(c => c.id === choiceId);
  if (!choice) return;

  if (choice.effect) applyEffect(choice.effect, world.dialogue!.villageId);

  if (choice.nextId === null) {
    world.dialogue = null;
    pushEvent('dialogue_end', '\ud83d\udcac Conversation ended.');
    EventBus.emit('dialogue:ended');
  } else {
    world.dialogue!.currentNodeId = choice.nextId;
  }
}

function applyEffect(effect: DialogueEffect, villageId: VillageId): void {
  const village = world.villages.find(v => v.id === villageId);
  if (village && effect.loyaltyDelta) {
    // SietchState is the sole loyalty authority for sietch-kind locations
    // (docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
    // loyalty"); every other kind still owns Village.loyalty, unchanged.
    if (village.kind === 'sietch') {
      const delta = effect.loyaltyDelta;
      world.sietches = world.sietches.map(s =>
        s.villageId === villageId ? writeLoyaltyState(s, adjustLoyalty(readLoyaltyState(s), delta)) : s,
      );
    } else {
      village.loyalty = Math.max(0, Math.min(100, village.loyalty + effect.loyaltyDelta));
      checkOwnershipTransition(village);
    }
  }
  if (effect.influenceDelta) {
    world.player.influence = Math.max(0, Math.min(100, world.player.influence + effect.influenceDelta));
  }
  if (effect.spiceDelta) {
    world.player.spice = Math.max(0, world.player.spice + effect.spiceDelta);
  }
  // Story flags and renown. These were declared on the effect type, authored
  // throughout the dialogue data, and silently dropped here — so every
  // `taught.*`, `recruited.*` and `beat.*` flag in the game was permanently
  // unset, and with them every conversation state that depended on one.
  if (effect.setFlags || effect.addFlags) {
    world.flags = applyFlagEffects(world.flags, effect.setFlags, effect.addFlags);
  }
  if (effect.charismaDelta) {
    world.charisma = Math.max(0, world.charisma + effect.charismaDelta);
  }
  if (effect.reputationAction) {
    const repWorld = toReputationWorld(world);
    const updated = applyPlayerAction(effect.reputationAction, repWorld);
    world.factionProfiles = updated.factions;
  }
  // attemptRitual re-checks its own gate (act, charisma, forts, uses-left)
  // and refuses silently-to-the-caller (it pushes its own event) rather than
  // trusting the choice was only offered when eligible — the same defence
  // every other engine entry point takes against a stale UI.
  if (effect.ritual) {
    attemptRitual();
  }
}