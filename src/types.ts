// src/types.ts — All shared types for the Dune Browser Game PoC
import type { SietchState, SietchTask } from './game-engine/sietch/types'

export type Difficulty = 'easy' | 'normal' | 'hard';
export type VillageId = string;
export type FactionId = 'player' | 'harkonnen' | 'neutral' | 'fremen' | 'atreides' | 'smugglers' | 'emperor';

export interface Village {
  id: VillageId;
  name: string;
  position: { x: number; y: number };  // Phaser canvas coordinates
  population: number;
  spice: number;
  loyalty: number;        // 0–100; <30 = rebelling risk
  owner: FactionId;
  status: 'neutral' | 'friendly' | 'rebelling';
  productionRate: number; // spice per game-second
}

export interface Player {
  location: VillageId;
  state: 'idle' | 'traveling';
  travelTarget: VillageId | null;
  arrivalTime: number;    // game-time (seconds) when travel completes
  influence: number;      // 0–100
  spice: number;
  troops: number;
}

export interface AITimer {
  nextDecisionAt: number;
  lastDecision: AIDecision | null;
}

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
  goalType: 'control_all_villages' | 'survive_20_min';
  factionProfiles: FactionProfile[];
  regions: Region[];
  sietches: SietchState[];
  difficulty: Difficulty;
  scoutedDefense: Record<VillageId, number>;
}

export interface AIDecision {
  action: 'attack' | 'ally' | 'ignore';
  targetVillageId: VillageId;
  reason: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  temperature: number;
}

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

export interface BusEvents {
  'village:selected': { villageId: VillageId };
  'world:updated': { state: WorldState };
  'dialogue:started': { nodeId: string; villageId: VillageId };
  'dialogue:ended': void;
  'event:fired': { event: GameEvent };
  'audio:changed': { isPlaying: boolean; isMuted: boolean; volume: number };
  'player:travel': { targetVillageId: VillageId };
  'player:choose': { choiceId: string };
  'game:speed': { speed: number };
  'game:difficulty': { difficulty: Difficulty };
  'territory:selected': { regionId: RegionId };
  'audio:mute': void;
  'player:pledge_sietch': { villageId: VillageId };
  'player:assign_sietch_task': { villageId: VillageId; task: SietchTask };
  'player:attack_village': { targetVillageId: VillageId; troopsCommitted: number };
  'player:scout_village': { targetVillageId: VillageId };
  'player:stop_sietch_task': { villageId: VillageId };
}
