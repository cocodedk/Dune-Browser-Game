// src/data/dialogueStates.ts
// Which version of each character's conversation is offered, keyed by flags.
//
// Declaration order is priority: the most specific, most recent story state
// comes first, and the last entry for each character is the unconditional
// fallback. A data test enforces both rules over the whole roster.

import type { DialogueStateDef } from '../game-engine/dialogue/types'

export const INITIAL_DIALOGUE_STATES: DialogueStateDef[] = [
  // --- Duke Armand -------------------------------------------------------
  {
    id: 'duke.after_revelation',
    characterId: 'duke_armand',
    condition: { op: 'eq', key: 'beat.duke_revelation', value: true },
    rootNodeId: 'duke_after_revelation_root',
  },
  {
    id: 'duke.first_quota_due',
    characterId: 'duke_armand',
    condition: { op: 'gte', key: 'quota.cycle', value: 1 },
    rootNodeId: 'duke_first_quota_root',
  },
  {
    id: 'duke.briefing',
    characterId: 'duke_armand',
    condition: null,
    rootNodeId: 'duke_briefing_root',
  },

  // --- Ottone Vell, the ledger ------------------------------------------
  {
    id: 'vell.in_arrears',
    characterId: 'vell',
    condition: { op: 'gte', key: 'quota.arrears', value: 1 },
    rootNodeId: 'vell_arrears_root',
  },
  {
    id: 'vell.ledger',
    characterId: 'vell',
    condition: null,
    rootNodeId: 'vell_ledger_root',
  },

  // --- Legate Corvin, the Emperor's patience ----------------------------
  {
    id: 'corvin.final_warning',
    characterId: 'corvin',
    condition: { op: 'lte', key: 'quota.patience', value: 1 },
    rootNodeId: 'corvin_final_warning_root',
  },
  {
    id: 'corvin.displeased',
    characterId: 'corvin',
    condition: { op: 'lte', key: 'quota.patience', value: 2 },
    rootNodeId: 'corvin_displeased_root',
  },
  {
    id: 'corvin.formal',
    characterId: 'corvin',
    condition: null,
    rootNodeId: 'corvin_formal_root',
  },

  // --- Naib Shadir, the first pledge ------------------------------------
  {
    id: 'shadir.pledged',
    characterId: 'shadir',
    condition: { op: 'eq', key: 'pledged.red_wall_sietch', value: true },
    rootNodeId: 'shadir_pledged_root',
  },
  {
    id: 'shadir.considering',
    characterId: 'shadir',
    condition: { op: 'gte', key: 'loyalty.red_wall_sietch', value: 40 },
    rootNodeId: 'shadir_considering_root',
  },
  {
    id: 'shadir.wary',
    characterId: 'shadir',
    condition: null,
    rootNodeId: 'shadir_wary_root',
  },

  // --- Ysane, the scout --------------------------------------------------
  {
    id: 'ysane.recruited',
    characterId: 'ysane',
    condition: { op: 'eq', key: 'recruited.ysane', value: true },
    rootNodeId: 'ysane_recruited_root',
  },
  {
    id: 'ysane.first_meeting',
    characterId: 'ysane',
    condition: null,
    rootNodeId: 'ysane_first_meeting_root',
  },

  // --- Mother Sova, the rituals -----------------------------------------
  {
    id: 'sova.ritual_available',
    characterId: 'sova',
    condition: {
      op: 'and',
      terms: [
        { op: 'gte', key: 'pledged.count', value: 1 },
        { op: 'lte', key: 'ritual.count', value: 2 },
      ],
    },
    rootNodeId: 'sova_ritual_root',
  },
  {
    id: 'sova.greeting',
    characterId: 'sova',
    condition: null,
    rootNodeId: 'sova_greeting_root',
  },

  // --- Pell, prospecting tutor ------------------------------------------
  {
    id: 'pell.taught',
    characterId: 'pell',
    condition: { op: 'eq', key: 'taught.prospecting', value: true },
    rootNodeId: 'pell_taught_root',
  },
  {
    id: 'pell.offer',
    characterId: 'pell',
    condition: null,
    rootNodeId: 'pell_offer_root',
  },

  // --- Captain Voss, training -------------------------------------------
  {
    id: 'voss.drilling',
    characterId: 'voss',
    condition: { op: 'gte', key: 'raids.repelled', value: 1 },
    rootNodeId: 'voss_drilling_root',
  },
  {
    id: 'voss.arrival',
    characterId: 'voss',
    condition: null,
    rootNodeId: 'voss_arrival_root',
  },

  // --- Dr. Vast, ecology -------------------------------------------------
  {
    id: 'vast.planting',
    characterId: 'vast',
    condition: { op: 'eq', key: 'taught.ecology', value: true },
    rootNodeId: 'vast_planting_root',
  },
  {
    id: 'vast.proposal',
    characterId: 'vast',
    condition: null,
    rootNodeId: 'vast_proposal_root',
  },

  // --- Lady Maren --------------------------------------------------------
  {
    id: 'maren.alone',
    characterId: 'maren',
    condition: { op: 'eq', key: 'beat.duke_departed', value: true },
    rootNodeId: 'maren_alone_root',
  },
  {
    id: 'maren.counsel',
    characterId: 'maren',
    condition: null,
    rootNodeId: 'maren_counsel_root',
  },

  // --- Rhaz Meko, the market --------------------------------------------
  {
    id: 'meko.regular',
    characterId: 'meko',
    condition: { op: 'gte', key: 'smuggler.standing', value: 1 },
    rootNodeId: 'meko_regular_root',
  },
  {
    id: 'meko.first',
    characterId: 'meko',
    condition: null,
    rootNodeId: 'meko_first_root',
  },
]
