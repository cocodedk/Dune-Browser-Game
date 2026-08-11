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

  if (choice.effect) {
    applyEffect(choice.effect, world.dialogue!.villageId, world.dialogue!.treeId, node.id);
  }

  if (choice.nextId === null) {
    world.dialogue = null;
    pushEvent('dialogue_end', '\ud83d\udcac Conversation ended.');
    EventBus.emit('dialogue:ended');
  } else {
    world.dialogue!.currentNodeId = choice.nextId;
  }
}

/**
 * The once-only reward guard (docs/PRD/game-completion/
 * baseline/wp02-critic-verdict.md \u00a75: "unbounded repeatable dialogue spice
 * income" \u2014 seven locations paid 10-25 spice per conversation, with no cap,
 * cooldown, or flag). Keyed on `treeId` + `node.id`: those are the two
 * identifiers a dialogue node actually carries in this runtime \u2014 `treeId` is
 * the key TREES is built from (data/dialogues.ts's DIALOGUES record plus
 * STORY_TREE_ID), `node.id` is the addressable unit chooseDialogue already
 * navigates by. Choice ids are not part of the key: two choices at the same
 * node (e.g. smug_deal's accept-terms vs negotiate) are alternate takes on
 * one narrative beat, and the beat pays once however it is resolved, not
 * once per wording.
 *
 * Recorded in `world.flags` \u2014 already part of CanonicalCampaignState
 * (state/canonical.ts), so this survives serialize/deserialize with no
 * migration step and no schema bump.
 */
function rewardKey(treeId: string, nodeId: string): string {
  return `reward.${treeId}.${nodeId}`;
}

function applyEffect(effect: DialogueEffect, villageId: VillageId, treeId: string, nodeId: string): void {
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
  // effect.influenceDelta is accepted-but-ignored (WP02e —
  // legacy-authority-inventory.md category 4): player.influence is removed
  // from WorldState. The field stays on DialogueEffect and every authored
  // influenceDelta stays in src/data/ untouched — that is the smaller diff
  // than stripping ~68 authored effect literals, and category 4's own
  // "Gate search result" already proved no engine-reachable code gates
  // content on influence, so dropping the write changes no reachable
  // behavior (02 migration step 5 is a documented no-op for this reason).
  // A positive spiceDelta/charismaDelta is a reward for reaching this node —
  // gated to fire once per (treeId, node.id) ever, see rewardKey above. A
  // NEGATIVE spiceDelta (a cost — e.g. sova_ritual_root's Water-of-Life
  // attempt) is not a reward and is never gated: DialogueSystem.test.ts's
  // ritual suite depends on that cost re-applying on every repeat attempt,
  // independent of whether attemptRitual's own gate accepts or refuses it.
  const key = rewardKey(treeId, nodeId);
  const isReward = (effect.spiceDelta ?? 0) > 0 || (effect.charismaDelta ?? 0) > 0;
  const rewardAlreadyPaid = isReward && world.flags[key] === true;

  if (effect.spiceDelta && !(effect.spiceDelta > 0 && rewardAlreadyPaid)) {
    world.player.spice = Math.max(0, world.player.spice + effect.spiceDelta);
    // Typed and logged distinct from harvest income (02 "Crew lifecycle":
    // "Story effects, trade, and one-time rewards are individually typed
    // and logged") — 'spice_shipment_received' stays reserved for crew
    // harvest/market/upkeep events; dialogue rewards get their own type.
    pushEvent(
      'story_reward',
      effect.spiceDelta > 0
        ? `You receive ${effect.spiceDelta} spice.`
        : `You give up ${Math.abs(effect.spiceDelta)} spice.`,
    );
  }
  // Story flags and renown. These were declared on the effect type, authored
  // throughout the dialogue data, and silently dropped here — so every
  // `taught.*`, `recruited.*` and `beat.*` flag in the game was permanently
  // unset, and with them every conversation state that depended on one.
  if (effect.setFlags || effect.addFlags) {
    world.flags = applyFlagEffects(world.flags, effect.setFlags, effect.addFlags);
  }
  if (effect.charismaDelta && !(effect.charismaDelta > 0 && rewardAlreadyPaid)) {
    world.charisma = Math.max(0, world.charisma + effect.charismaDelta);
  }
  if (isReward && !rewardAlreadyPaid) {
    world.flags[key] = true;
  }
  // effect.reputationAction is accepted-but-ignored (WP02e): the faction
  // reputation write (WP01-audit residue) dies with the quarantined faction
  // simulation it fed (legacy-authority-inventory.md category 1 — "Do not
  // call in campaign"; 02's "Current conflicts to retire"). The field stays
  // on DialogueEffect and every authored reputationAction stays in
  // src/data/ untouched, for the same smaller-diff reason as influenceDelta
  // above — nothing reachable reads world.factionProfiles once FactionPanel
  // is unmounted (category 1's own panel-removal row).
  // attemptRitual re-checks its own gate (act, charisma, forts, uses-left)
  // and refuses silently-to-the-caller (it pushes its own event) rather than
  // trusting the choice was only offered when eligible — the same defence
  // every other engine entry point takes against a stale UI.
  if (effect.ritual) {
    attemptRitual();
  }
}