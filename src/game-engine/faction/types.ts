// src/game-engine/faction/types.ts
// Faction simulation types — split out of src/types.ts to keep that file under
// the 200-line cap. Re-exported from src/types.ts so existing imports still work.
//
// NOTE: per docs/PRD/dune92/00-overview.md this layer is slated for quarantine.
// Cryo Dune has one authored antagonist and a hand-tuned escalation curve; the
// emergent multi-faction sim fights that curve. Kept compiling, not extended.

import type { FactionId, VillageId } from '../../types';

export type FactionType = 'fremen' | 'house' | 'empire' | 'smuggler';

export interface Resources {
  spice: number;
  solaris: number;
  troops: number;
  influence: number;
}

export interface StrategyProfile {
  aggression: number;    // 0–100
  diplomacy: number;     // 0–100
  expansion: number;     // 0–100
  greed: number;         // 0–100
  loyaltyFocus: number;  // 0–100
}

export interface Relation {
  trust: number;   // -100 to +100
  fear: number;    // 0 to 100
  trade: boolean;
  war: boolean;
}

export type GoalStatus = 'active' | 'completed' | 'failed';

export interface FactionGoal {
  id: string;
  type: string;
  status: GoalStatus;
}

export interface FactionProfile {
  id: FactionId;
  name: string;
  type: FactionType;
  resources: Resources;
  strategy: StrategyProfile;
  relations: Record<string, Relation>;
  goals: FactionGoal[];
}

export type Goal =
  | { type: 'control_spice'; target: VillageId }
  | { type: 'ally'; target: FactionId }
  | { type: 'destroy'; target: FactionId }
  | { type: 'expand'; target: number };  // target = minimum village count threshold
