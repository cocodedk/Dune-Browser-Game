// src/data/dialogueStates.reaches.ts
// Conversation states for the far reaches. Split from dialogueStates.ts, which
// had reached the repository's file limit.
//
// All unconditional for now: these six are the first person a player meets at
// their location, so they must always have something to say.

import type { DialogueStateDef } from '../game-engine/dialogue/types'

export const REACHES_STATES: DialogueStateDef[] = [
{
    id: 'sabiha.sign',
    characterId: 'sabiha',
    condition: null,
    rootNodeId: 'sabiha_root',
  },
  {
    id: 'orrin.makers',
    characterId: 'orrin',
    condition: null,
    rootNodeId: 'orrin_root',
  },
  {
    id: 'krail.basin',
    characterId: 'krail',
    condition: null,
    rootNodeId: 'krail_root',
  },
  {
    id: 'dessin.ledger',
    characterId: 'dessin',
    condition: null,
    rootNodeId: 'dessin_root',
  },
  {
    id: 'zurrah.water',
    characterId: 'zurrah',
    condition: null,
    rootNodeId: 'zurrah_root',
  },
  {
    id: 'hallock.tired',
    characterId: 'hallock',
    condition: null,
    rootNodeId: 'hallock_root',
  },
]
