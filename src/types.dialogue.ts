// src/types.dialogue.ts
// Conversation types: nodes, choices, and everything a choice can do.
//
// Split from types.ts, which had grown past the repository's file limit.
// Conversations are the interface to every other system in the game, so this
// is the largest single cluster of types and the natural seam.

import type { FactionId, VillageId } from './types'

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextId: string | null;  // null = end dialogue
  effect?: DialogueEffect;
}

export type PlayerAction =
  | { type: 'help_village'; factionAffinity: FactionId }
  | { type: 'hoard_spice'; amount: number }
  | { type: 'ignore_attack'; victimFaction: FactionId }
  | { type: 'attack_faction'; target: FactionId }
  | { type: 'honor_agreement'; partner: FactionId }
  | { type: 'break_agreement'; partner: FactionId }
  | { type: 'trade_with_faction'; target: FactionId; amount: number };

export interface DialogueEffect {
  loyaltyDelta?: number;
  influenceDelta?: number;
  spiceDelta?: number;
  reputationAction?: PlayerAction;
  /** Story flags written when this choice is taken. */
  setFlags?: Record<string, boolean | number>;
  /** Numeric flag increments, applied after setFlags. */
  addFlags?: Record<string, number>;
  charismaDelta?: number;
  revealLocation?: VillageId;
  recruitCharacter?: string;
  /** Attempt the Water of Life ritual — see attemptRitual() in endgameOps.ts. */
  ritual?: boolean;
}

