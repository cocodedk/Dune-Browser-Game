// src/game-engine/dialogue/applyEffect.ts
// What a chosen dialogue choice actually does to world state.
//
// Split out of DialogueSystem.ts (chunk W3c) to keep that file under the
// 200-line cap once it also carries the opening's two dedicated trees, the
// auto-open chain and the close guard — this module's own logic (the
// once-only reward gate and its rich citation trail) is unchanged in
// substance from WP02g, only extended and relocated.

import { world } from '../GameState';
import { applyFlagEffects } from './conditions';
import { pushEvent } from '../EventSystem';
import type { VillageId, DialogueEffect } from '../../types';
import { checkOwnershipTransition } from '../VillageSystem';
import { adjustLoyalty } from '../sietch/loyalty';
import { readLoyaltyState, writeLoyaltyState } from '../sietch/loyaltyState';
import { attemptRitual } from '../economy/endgameOps';

/**
 * The once-only reward guard (docs/PRD/game-completion/
 * baseline/wp02-critic-verdict.md §5: "unbounded repeatable dialogue spice
 * income"). Keyed on `treeId` + `node.id`: those are the two identifiers a
 * dialogue node actually carries in this runtime — `treeId` is the key
 * TREES is built from (DialogueSystem.ts), `node.id` is the addressable unit
 * chooseDialogue already navigates by. Choice ids are not part of the key:
 * two choices at the same node are alternate takes on one narrative beat,
 * and the beat pays once however it is resolved, not once per wording.
 *
 * Recorded in `world.flags` — already part of CanonicalCampaignState
 * (state/canonical.ts), so this survives serialize/deserialize with no
 * migration step and no schema bump.
 */
export function rewardKey(treeId: string, nodeId: string): string {
  return `reward.${treeId}.${nodeId}`;
}

export function applyEffect(effect: DialogueEffect, villageId: VillageId, treeId: string, nodeId: string): void {
  const village = world.villages.find(v => v.id === villageId);

  // The reward gate, extended in chunk W3c to positive loyaltyDelta
  // (docs/PRD/game-completion/progress.md Round 11: "the loyalty-pump gate
  // extended to positive loyaltyDelta here"). Computed before any effect is
  // applied, because the loyalty write below now needs to consult it too —
  // a NEGATIVE loyaltyDelta (a rebuke, a refusal, decay) is a cost, never
  // gated, exactly like a negative spiceDelta already wasn't.
  const key = rewardKey(treeId, nodeId);
  const isReward =
    (effect.spiceDelta ?? 0) > 0 || (effect.charismaDelta ?? 0) > 0 || (effect.loyaltyDelta ?? 0) > 0;
  const rewardAlreadyPaid = isReward && world.flags[key] === true;

  if (village && effect.loyaltyDelta && !(effect.loyaltyDelta > 0 && rewardAlreadyPaid)) {
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
  // A positive spiceDelta/charismaDelta/loyaltyDelta is a reward for
  // reaching this node — gated to fire once per (treeId, node.id) ever, see
  // rewardKey above. A NEGATIVE spiceDelta (a cost — e.g. sova_ritual_root's
  // Water-of-Life attempt) is not a reward and is never gated:
  // DialogueSystem.test.ts's ritual suite depends on that cost re-applying
  // on every repeat attempt, independent of whether attemptRitual's own gate
  // accepts or refuses it.
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
