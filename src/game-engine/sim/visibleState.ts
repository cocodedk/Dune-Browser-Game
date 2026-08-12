// src/game-engine/sim/visibleState.ts
// The runner's player-visible read surface (07-balance-playtest-and-release
// .md "Runtime-faithful simulator": the runner "may... Read the same
// projections exposed to the player" and "may not... Read hidden future
// random outcomes when selecting a command").
//
// Every field here is something a real UI panel already renders or a real
// player already sees — see each field's own citation below — never a raw
// `world` read. `world.rng` is deliberately absent: the seed is config, not
// policy input, and no panel shows the RNG cursor. A caller that genuinely
// needs to instrument `world` directly (this module's own test suite, the
// determinism guard) imports GameState itself, the same way every other
// engine-level test in this codebase already does — visibleState() is the
// boundary for a *policy*, not a ban on `world` for test code.

import { world } from '../GameState'
import { currentDay } from '../TimeSystem'
import { totalDue, daysRemaining, type PendingSettlement } from '../quota/quota'
import { projectIncome, type Projection } from '../quota/projection'
import { travelCheckTo } from '../TravelSystem'
import type { TravelCheck } from '../travel/rules'
import { currentNode } from '../DialogueSystem'
import { activeOpeningObjective, type ObjectiveRecord } from '../acts/openingObjectives'
import { recommendedField } from '../troops/harvestRecommendation'
import type { TroopTask } from '../troops/types'
import type { VillageId, FactionId } from '../../types'

/** DialoguePanel.tsx's own render fields (speaker, text, and the choice
 * buttons it maps `currentDialogueNode.choices` into) — the same shape
 * currentNode() (DialogueSystem.ts) already returns. */
export interface VisibleDialogue {
  treeId: string
  speaker: string
  text: string
  choices: { id: string; text: string }[]
}

/** CrewCard.tsx's own field set (src/ui/CrewCard.tsx). */
export interface VisibleCrew {
  id: string
  homeSietchId: VillageId
  locationId: VillageId
  size: number
  task: TroopTask
  taskTargetId: string | null
  morale: number
  changeoverDaysLeft: number
}

/** The pledge/loyalty fields DestinationList.tsx and the sietch panels show. */
export interface VisibleSietch {
  villageId: VillageId
  /** PledgePanel.tsx's own `villageOwner !== 'fremen'` gate (only a Fremen
   * sietch shows a pledge/gift panel at all) — WP04 chunk W4c: without this
   * a policy can only tell "not pledged" from "will never be pledgeable"
   * (Harkonnen/Atreides/neutral-owned villages, which world.sietches has an
   * entry for too) by attempting and being refused, forever. */
  owner: FactionId
  pledgedToPlayer: boolean
  loyalty: number
  /** giftButtonVisibility.ts's own cap gate — GiftPanel.tsx hides its
   * button once `giftedThisVisit >= GIFT_PER_VISIT_CAP`. WP04 chunk W4c: a
   * policy needs this to tell "gift is legal now" from "come back later"
   * without spending a wasted action on a refusal. */
  giftedThisVisit: number
}

export interface VisibleState {
  /** QuotaLedger.tsx's own currentDay() read. */
  day: number
  player: {
    location: VillageId
    state: 'idle' | 'traveling'
    spice: number
    prescience: number
    /** PledgePanel.tsx's own "Pledges N/cap" row (`maxPledged(world
     * .charisma)`) and its charisma-cap refusal text — WP04 chunk W4c: a
     * policy needs this to know a pledge attempt is capped before trying,
     * the same number the panel already shows the player. */
    charisma: number
  }
  /** ObjectivePanel.tsx's current-step read (acts/openingObjectives.ts). */
  activeObjective: ObjectiveRecord | null
  /** null outside a due deadline — same shape QuotaLedger/SettleModal render. */
  pendingSettlement: PendingSettlement | null
  /** QuotaLedger.tsx's own projectIncome() call, same inputs. */
  projection: Projection
  /** QuotaLedger.tsx's own always-on read (not gated on a pending decision,
   * unlike `pendingSettlement` above) — patience pips, the arrears row, and
   * the due/days headline are on screen every day the ledger panel is
   * mounted. WP04 chunk W4c: `reactive`'s "patience loss" warning and
   * `recovery`'s "starts from patience 1" precondition both need a live
   * patience/arrears read that does not wait for a deadline to exist. */
  quota: {
    patience: number
    arrears: number
    amountDue: number
    daysRemaining: number
  }
  /** CrewCard.tsx's per-crew fields, one row per world.troopGroups entry. */
  crews: VisibleCrew[]
  /** DestinationList.tsx's per-sietch pledge/loyalty fields. */
  sietches: VisibleSietch[]
  /** null when no conversation is open — otherwise DialoguePanel.tsx's own
   * render fields, via the same currentNode() the panel reads. */
  dialogue: VisibleDialogue | null
  /** DestinationList.tsx's own per-row check — call with a candidate id. */
  travelCheck: (targetId: VillageId) => TravelCheck
  /** DestinationList.tsx's own `world.villages.filter(v => v.discovered)`
   * read — the exact set that panel lists as reachable destinations at
   * all. WP04 chunk W4c: a multi-hop route (e.g. Arrakeen -> Red Wall,
   * two regions apart per data/regionAdjacency.ts) must route only through
   * villages the player could actually see on the map; several regions
   * that are graph-adjacent start undiscovered (data/villages.ts), so a
   * policy computing its own route needs this set to avoid proposing a
   * hop `travelCheck` would refuse 'undiscovered'. */
  discoveredVillageIds: VillageId[]
  /** CrewCard.tsx's own `recommendedField(current?.position, spiceFields)`
   * call, mirrored as a callback (the same shape `travelCheck` already
   * uses) rather than exposing raw field positions — the UI never renders
   * a position number either, only the ★-marked recommendation it derives
   * from one. WP04 chunk W4c: `novice`/`capacity`/`recovery` all pick a
   * field the same way the crew panel's own star does, never a forecast of
   * their own. Null when the village is unknown or nothing qualifies (see
   * harvestRecommendation.ts's own doc). */
  recommendedFieldId: (locationId: VillageId) => string | null
}

/** The player-visible view of the live singleton `world` — see module header. */
export function visibleState(): VisibleState {
  const due = totalDue(world.quota)
  const day = currentDay()

  return {
    day,
    player: {
      location: world.player.location,
      state: world.player.state,
      spice: world.player.spice,
      prescience: world.player.prescience,
      charisma: world.charisma,
    },
    activeObjective: activeOpeningObjective(world),
    pendingSettlement: world.pendingSettlement,
    projection: projectIncome({
      groups: world.troopGroups,
      fields: world.spiceFields,
      equipment: world.equipment,
      daysRemaining: daysRemaining(world.quota, day),
      currentStock: world.player.spice,
      amountDue: due,
    }),
    quota: {
      patience: world.quota.patience,
      arrears: world.quota.arrears,
      amountDue: due,
      daysRemaining: daysRemaining(world.quota, day),
    },
    crews: world.troopGroups.map(g => ({
      id: g.id,
      homeSietchId: g.homeSietchId,
      locationId: g.locationId,
      size: g.size,
      task: g.task,
      taskTargetId: g.taskTargetId,
      morale: g.morale,
      changeoverDaysLeft: g.changeoverDaysLeft,
    })),
    sietches: world.sietches.map(s => ({
      villageId: s.villageId,
      owner: world.villages.find(v => v.id === s.villageId)?.owner ?? 'neutral',
      pledgedToPlayer: s.pledgedToPlayer,
      // sietch/loyaltyState.ts's own default for an unmigrated/fixture
      // SietchState with no loyalty field yet.
      loyalty: s.loyalty ?? 0,
      giftedThisVisit: s.giftedThisVisit ?? 0,
    })),
    dialogue: visibleDialogue(),
    travelCheck: travelCheckTo,
    discoveredVillageIds: world.villages.filter(v => v.discovered).map(v => v.id),
    recommendedFieldId: locationId => {
      const village = world.villages.find(v => v.id === locationId)
      if (!village) return null
      return recommendedField(village.position, world.spiceFields)?.id ?? null
    },
  }
}

function visibleDialogue(): VisibleDialogue | null {
  if (!world.dialogue) return null
  const node = currentNode()
  if (!node) return null
  return {
    treeId: world.dialogue.treeId,
    speaker: node.speaker,
    text: node.text,
    choices: node.choices.map(c => ({ id: c.id, text: c.text })),
  }
}
