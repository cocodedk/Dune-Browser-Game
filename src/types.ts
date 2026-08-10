// src/types.ts — All shared types for the Dune Browser Game PoC
import type { DesertSite } from './game-engine/desert/sites';
import type { SietchState } from './game-engine/sietch/types'
import type { FactionProfile } from './game-engine/faction/types'
import type { QuotaState } from './game-engine/quota/quota'
import type { ActId, EndingId } from './game-engine/acts/transitions'
import type { RegionEcology } from './game-engine/ecology/ecology'
import type { FortState } from './game-engine/acts/endgame'
import type { PrescienceLevel } from './game-engine/prescience/prescience'
import type { TroopGroup, SpiceField, Equipment } from './game-engine/troops/types'
import type { RngState } from './game-engine/rng/rng'

export type Difficulty = 'easy' | 'normal' | 'hard';
export type VillageId = string;
export type FactionId = 'player' | 'harkonnen' | 'neutral' | 'fremen' | 'atreides' | 'smugglers' | 'emperor';

export type LocationKind =
  | 'palace' | 'sietch' | 'smuggler_den' | 'fort' | 'field_camp' | 'station';

export interface Village {
  id: VillageId;
  name: string;
  position: { x: number; y: number };  // canvas-space coordinates (see markerLayout)
  population: number;
  spice: number;
  loyalty: number;        // 0–100; <30 = rebelling risk
  owner: FactionId;
  status: 'neutral' | 'friendly' | 'rebelling';
  productionRate: number; // spice per game-second
  kind: LocationKind;
  /** Undiscovered places cannot be travelled to — enforced in the engine. */
  discovered: boolean;
  regionId: RegionId;
}

/** Name the model is migrating toward; `Village` is the legacy alias. */
export type Location = Village;
export type LocationId = VillageId;

// Conversation types live in their own module but are re-exported here, so
// every existing import of them keeps working.
export type {
  DialogueNode, DialogueChoice, PlayerAction, DialogueEffect,
} from './types.dialogue';

export interface Player {
  location: VillageId;
  state: 'idle' | 'traveling';
  travelTarget: VillageId | null;
  arrivalTime: number;    // game-time (seconds) when travel completes
  influence: number;      // 0–100
  spice: number;
  troops: number;
  /** 0 none, 1 awareness, 2 farspeech, 3 foresight. */
  prescience: PrescienceLevel;
}

export interface AITimer {
  nextDecisionAt: number;
  lastDecision: AIDecision | null;
}

export type GameEventType =
  | 'alliance_offer' | 'betrayal' | 'attack' | 'dialogue_start' | 'dialogue_end'
  | 'village_selected' | 'travel_start' | 'travel_complete'
  | 'faction_decision' | 'tribute_refused' | 'poc_goal_achieved'
  | 'sietch_pledged' | 'sietch_task_assigned' | 'spice_shipment_received' | 'fedaykin_ready';

export interface GameEvent {
  id: string;
  type: GameEventType;
  message: string;
  timestamp: number;      // game-time when fired
}

export interface DialogueState {
  treeId: string;
  currentNodeId: string;
  villageId: VillageId;
}

export interface WorldState {
  time: number;           // game-seconds elapsed (real seconds × speed)
  speed: number;          // time multiplier (1 = normal, 5 = fast)
  villages: Village[];
  player: Player;
  aiTimers: Record<string, AITimer>;
  dialogue: DialogueState | null;
  events: GameEvent[];    // ring buffer — keep last 20
  goalAchieved: boolean;
  /**
   * Optional: retired campaign-completion authority (docs/PRD/game-completion/
   * 02-runtime-consolidation.md "Campaign status"). Never set on a canonical
   * new campaign's save and dropped by save migration; kept optional, not
   * removed, so already-loaded legacy state and the untouched GameLoop win
   * check that still reads it continue to type-check.
   */
  goalType?: 'control_all_villages' | 'survive_20_min';
  factionProfiles: FactionProfile[];
  regions: Region[];
  sietches: SietchState[];
  difficulty: Difficulty;
  scoutedDefense: Record<VillageId, number>;
  /** Explicit player pause. Dialogue and run-end pause independently. */
  paused: boolean;
  /**
   * Flat, dotted-key story state: `act`, `met.shadir`, `beat.duke_revelation`,
   * `quota.cycle`. Gates which version of a conversation a character offers.
   */
  flags: Record<string, boolean | number>;
  quota: QuotaState;
  troopGroups: TroopGroup[];
  spiceFields: SpiceField[];
  equipment: Equipment[];
  /** 20 at the start; gates how many sietches the player may hold. */
  charisma: number;
  /** First-class narrative state — not a story flag, so it stays typed. */
  act: ActId;
  ending: EndingId | null;
  ecology: RegionEcology[];
  forts: FortState[];
  /**
   * Where and when a worm has recently taken or scattered a crew.
   *
   * Kept in world state rather than as a render-side effect so that a worm
   * attack is a fact about Arrakis: the map can show it, a save can carry it,
   * and the Fremen can be asked about it.
   */
  wormSightings: WormSighting[];
  /** Deep-desert sites, generated once per game and revealed by prospecting. */
  desertSites: DesertSite[];
  /**
   * The campaign's single seeded RNG state — see game-engine/rng/rng.ts and
   * 02-runtime-consolidation.md "Randomness". Canonical and serialized.
   */
  rng: RngState;
}

export type { DesertSite, SiteKind } from './game-engine/desert/sites';

export interface WormSighting {
  fieldId: string;
  /** Engine time in seconds. */
  atTime: number;
}

export interface AIDecision {
  action: 'attack' | 'ally' | 'ignore';
  targetVillageId: VillageId;
  reason: string;
}

// Faction simulation types live in game-engine/faction/types.ts (200-line cap).
export type {
  FactionType, Resources, StrategyProfile, Relation,
  GoalStatus, FactionGoal, FactionProfile, Goal,
} from './game-engine/faction/types';

// The EventBus contract lives in its own module, re-exported so every
// existing import keeps working.
export type { BusEvents } from './types.bus';

export type RegionId = string;

export interface Region {
  id: RegionId;
  name: string;
  owner: FactionId | null;  // null = unclaimed / contested
  spice: number;            // base extraction yield per cycle (0–100)
  unrest: number;           // 0–100; at 100, defection triggers
}

export type TerritoryEvent =
  | { type: 'region_captured'; regionId: RegionId; newOwner: FactionId; prevOwner: FactionId | null }
  | { type: 'region_defected'; regionId: RegionId; fromOwner: FactionId }
  | { type: 'unrest_high'; regionId: RegionId; unrest: number };


/** Which 3D scene assembly is on screen. Shared contract: render + React + E2E. */
export type SceneModeId =
  | 'strategic'      // orbit: the whole planet
  | 'surface'        // descended: the dune field underfoot
  | 'flight' | 'location' | 'conversation';
