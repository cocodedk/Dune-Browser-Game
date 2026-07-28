// src/data/dialogueStates.later.ts
// Conversation states for the Act 2 and later cast. Split from
// dialogueStates.ts, which had reached the repository's file limit.
//
// Same rule as the main file: declaration order is priority, and the last
// entry for each character is the unconditional fallback.

import type { DialogueStateDef } from '../game-engine/dialogue/types'

export const LATER_ACT_STATES: DialogueStateDef[] = [
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

  // --- Lady Jessica --------------------------------------------------------
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

  // --- Glossu Rabban, the field commander ----------------------------------
  {
    id: 'varn.losing',
    characterId: 'varn',
    condition: { op: 'gte', key: 'forts.destroyed', value: 1 },
    rootNodeId: 'varn_losing_root',
  },
  {
    id: 'varn.confident',
    characterId: 'varn',
    condition: null,
    rootNodeId: 'varn_confident_root',
  },

  // --- The Baron ---------------------------------------------------------
  {
    id: 'baron.cornered',
    characterId: 'baron',
    condition: { op: 'gte', key: 'forts.destroyed', value: 2 },
    rootNodeId: 'baron_cornered_root',
  },
  {
    id: 'baron.truce',
    characterId: 'baron',
    condition: null,
    rootNodeId: 'baron_truce_root',
  },

  // --- Esmar Tuek, the market --------------------------------------------
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
  }
]
