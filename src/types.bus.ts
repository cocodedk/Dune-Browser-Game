// src/types.bus.ts
// The EventBus contract: every message the renderer and React exchange.
//
// Split from types.ts, which had grown past the repository's file limit. This
// is the renderer/React boundary in one place, which is a better home for it
// than the middle of the world-state types anyway.

import type {
  VillageId, SceneModeId, WorldState, GameEvent, RegionId,
} from './types'
import type { EquipmentKind, TroopTask } from './game-engine/troops/types'

export interface BusEvents {
  /** Speak to whoever is at the player's location. Sent from a location hotspot. */
  'player:talk': Record<string, never>;
  /** Speak to one named resident, chosen from the PeopleHere list rather than the village default. */
  'player:speak_to': { characterId: string };
  'village:selected': { villageId: VillageId };
  'world:updated': { state: WorldState };
  'dialogue:started': { nodeId: string; villageId: VillageId };
  'dialogue:ended': void;
  'event:fired': { event: GameEvent };
  'audio:changed': { isPlaying: boolean; isMuted: boolean; volume: number };
  'player:travel': { targetVillageId: VillageId };
  /** The visible flight Skip control (FlightSkipButton.tsx). Render-only —
   * ui/sceneInput.ts applies the same first-three-seconds gate Escape does
   * (runtime/travelSkipGate.ts) and never mutates engine state itself. */
  'player:skip_travel': Record<string, never>;
  'player:choose': { choiceId: string };
  'game:speed': { speed: number };
  // No 'game:difficulty' here — 03-opening-experience.md "Title and run
  // setup": difficulty is written once, at createInitialState() (the New
  // Campaign setup panel's one call site), and is immutable for the run.
  // Removing the bus entry (not just its handler) makes an in-game mutation
  // seam impossible to add back without this comment moving with it.
  'territory:selected': { regionId: RegionId };
  'audio:mute': void;
  'player:pledge_sietch': { villageId: VillageId };
  'player:gift_sietch': { villageId: VillageId };
  'game:pause': { paused: boolean };
  'player:assign_crew': { groupId: string; task: TroopTask; targetId: string | null };
  'player:assault_fort': { fortId: string };
  'player:buy_equipment': { kind: EquipmentKind };
  /** `groupId: null` means no explicit crew selected — the issue-equipment
   * command refuses `'no-target'` rather than guessing (02 "Equipment"). */
  'player:issue_equipment': { equipmentId: string; groupId: string | null };
  'player:settle_tribute': { amount: number };
  'player:set_auto_ship': { enabled: boolean; amount?: number };
  // Render -> React only. No engine command may be added here.
  'scene:mode': { mode: SceneModeId };
  'assets:progress': { loaded: number; total: number };
}
