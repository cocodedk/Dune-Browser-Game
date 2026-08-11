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
import type { TroopTask } from '../troops/types'
import type { VillageId } from '../../types'

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
  pledgedToPlayer: boolean
  loyalty: number
}

export interface VisibleState {
  /** QuotaLedger.tsx's own currentDay() read. */
  day: number
  player: {
    location: VillageId
    state: 'idle' | 'traveling'
    spice: number
    prescience: number
  }
  /** ObjectivePanel.tsx's current-step read (acts/openingObjectives.ts). */
  activeObjective: ObjectiveRecord | null
  /** null outside a due deadline — same shape QuotaLedger/SettleModal render. */
  pendingSettlement: PendingSettlement | null
  /** QuotaLedger.tsx's own projectIncome() call, same inputs. */
  projection: Projection
  /** CrewCard.tsx's per-crew fields, one row per world.troopGroups entry. */
  crews: VisibleCrew[]
  /** DestinationList.tsx's per-sietch pledge/loyalty fields. */
  sietches: VisibleSietch[]
  /** null when no conversation is open — otherwise DialoguePanel.tsx's own
   * render fields, via the same currentNode() the panel reads. */
  dialogue: VisibleDialogue | null
  /** DestinationList.tsx's own per-row check — call with a candidate id. */
  travelCheck: (targetId: VillageId) => TravelCheck
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
      pledgedToPlayer: s.pledgedToPlayer,
      // sietch/loyaltyState.ts's own default for an unmigrated/fixture
      // SietchState with no loyalty field yet.
      loyalty: s.loyalty ?? 0,
    })),
    dialogue: visibleDialogue(),
    travelCheck: travelCheckTo,
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
