import type { DialogueNode } from '../types';
import { villageLeader, harkonnenStronghold } from './dialogues-core';
import { fremenSietch } from './dialogues-fremen';
import { atreidesEmbassy } from './dialogues-atreides';
import { smugglerOutpost } from './dialogues-smuggler';
import { emperorDelegation } from './dialogues-emperor';
import { neutralSettlement } from './dialogues-neutral';

export const DIALOGUES: Record<string, DialogueNode[]> = {
  village_leader: villageLeader,
  harkonnen_stronghold: harkonnenStronghold,
  fremen_sietch: fremenSietch,
  atreides_embassy: atreidesEmbassy,
  smuggler_outpost: smugglerOutpost,
  emperor_delegation: emperorDelegation,
  neutral_settlement: neutralSettlement,
};