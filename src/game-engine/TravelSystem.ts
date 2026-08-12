import { world } from './GameState';
import { EventBus } from '../EventBus';
import { pushEvent } from './EventSystem';
import { visitVillage } from './VillageSystem';
import { visitPlayerSietch } from './SietchVisitSystem';
import type { VillageId, WorldState } from '../types';
import { checkTravel, rejectionMessage } from './travel/rules';
import type { TravelMode } from './travel/rules';
import { REGION_ADJACENCY } from '../data/regionAdjacency';
import { TRAVEL_RED_WALL_FLAG, REDWALL_TRUST_ACKNOWLEDGED_FLAG } from './acts/openingObjectives';
import { startDialogue, dialogueIsCloseable } from './DialogueSystem';
import { REDWALL_TRUST_TREE_ID, TABR_DILEMMA_TREE_ID } from '../data/dialogue';

/** Beat 6's own guard flag (data/dialogue/opening-tabr-dilemma.ts) — set at
 * OPEN time, not by a dialogue effect. See maybeOpenTabrDilemma's doc. */
export const TABR_DILEMMA_SHOWN_FLAG = 'tabr.dilemma.shown';

export function travelDuration(fromId: VillageId, toId: VillageId): number {
  const from = world.villages.find(v => v.id === fromId);
  const to = world.villages.find(v => v.id === toId);
  if (!from || !to) return 10;
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(4, Math.round(dist / 50));
}

/**
 * 0..1 progress of the player's current trip, or 0 when not traveling.
 * Derives the trip duration from the same distance formula as
 * travelDuration, so the marker lerps correctly for trips of any length
 * (previously hardcoded to a 10-second trip regardless of actual distance).
 */
export function currentTravelProgress(w: WorldState): number {
  const { player } = w;
  if (player.state !== 'traveling' || player.travelTarget === null) return 0;

  const duration = travelDuration(player.location, player.travelTarget);
  const elapsed = duration - (player.arrivalTime - w.time);
  return Math.min(1, Math.max(0, elapsed / duration));
}

/** Travel mode currently available to the player. */
export function currentTravelMode(): TravelMode {
  // Read from what the player actually owns.
  //
  // This returned the constant 'foot' with a note saying ornithopters would
  // arrive later. They had: the market sells them, worms check for them, and
  // prospecting range uses them. Only travel still always walked, so buying
  // one changed nothing about where you could go — and the far side of the
  // planet, which is deliberately reachable only by long-range thopter, was
  // visible and permanently unreachable.
  const kinds = new Set(world.equipment.map(e => e.kind));
  if (kinds.has('lr_thopter')) return 'lr_thopter';
  if (kinds.has('thopter')) return 'thopter';
  return 'foot';
}

/**
 * Can the player travel there right now, and if not, why?
 *
 * Exposed so the interface can answer that question *before* the click. At
 * game start exactly one of the eight destinations is legal — the rest are
 * either undiscovered or out of range on foot — and offering an identical
 * enabled button for all eight means seven of them do nothing visible.
 */
export function travelCheckTo(targetId: VillageId) {
  const { player } = world;
  return checkTravel({
    from: world.villages.find(v => v.id === player.location),
    to: world.villages.find(v => v.id === targetId),
    mode: currentTravelMode(),
    isTraveling: player.state === 'traveling',
    adjacency: REGION_ADJACENCY,
    // W3i: refuses travel outright while a mandatory beat (Beat 1/2's
    // briefing/ledger, Beat 4's Red Wall trust) is open — see rules.ts's own
    // doc on checkTravel for why this is engine-side, not UI-only.
    mandatoryDialogueOpen: !dialogueIsCloseable(world),
  });
}

export function startTravel(targetId: VillageId): void {
  const { player } = world;

  const check = travelCheckTo(targetId);

  if (!check.ok) {
    // Silent on the two cases ordinary fumbling produces; the rest explain
    // themselves, because "nothing happened" is the worst possible feedback.
    if (check.reason !== 'same-location' && check.reason !== 'already-traveling') {
      pushEvent('village_selected', rejectionMessage(check.reason));
    }
    return;
  }

  const time = check.durationSeconds;
  player.state = 'traveling';
  player.travelTarget = targetId;
  player.arrivalTime = world.time + time;

  const target = world.villages.find(v => v.id === targetId);
  pushEvent('travel_start', `\ud83d\udc2a Traveling to ${target?.name ?? targetId}...`);
}

export function checkTravelArrival(): void {
  const { player } = world;
  if (player.state !== 'traveling' || player.travelTarget === null) return;
  if (world.time < player.arrivalTime) return;

  // Arrived
  const arrivedAt = player.travelTarget;
  player.location = arrivedAt;
  player.state = 'idle';
  player.travelTarget = null;

  const village = world.villages.find(v => v.id === arrivedAt);
  pushEvent('travel_complete', `\u2705 Arrived at ${village?.name ?? arrivedAt}.`);

  // W3h (acceptance-4 failure at Hagg): mirrors 'dialogue:started''s own
  // selection write (DialogueSystem.ts) for every arrival, not only the
  // two that happen to auto-open a tree here \u2014 the stale panel was never a
  // Hagg-specific bug, just the one waypoint with no auto-dialogue to piggy-
  // back a selection update off of.
  EventBus.emit('village:selected', { villageId: arrivedAt });

  // Sietch-kind arrivals: SietchState is the sole loyalty authority (02
  // "Sietches and loyalty"). Its authored visit rule (loyalty.ts's
  // onArrival) does NOT grant a flat loyalty bump \u2014 visitVillage's legacy
  // +5 is superseded here, not moved, because the authored rule only resets
  // the neglect clock and the per-visit gift budget; loyalty itself moves
  // through gifts and dialogue. Every other kind keeps the legacy path,
  // since Village.loyalty is still that kind's authority.
  if (village?.kind === 'sietch') {
    visitPlayerSietch(arrivedAt);
  } else {
    visitVillage(arrivedAt);
  }

  // Opening objective seam (acts/openingObjectives.ts): arrival at Red Wall
  // completes act1.travel_red_wall. A dedicated flag rather than a read of
  // sietch.lastVisitedDay — every sietch seeds lastVisitedDay: 0
  // (data/sietches.ts), indistinguishable from "visited on day 0".
  if (arrivedAt === 'red_wall_sietch' && world.flags[TRAVEL_RED_WALL_FLAG] !== true) {
    world.flags[TRAVEL_RED_WALL_FLAG] = true;
  }

  maybeOpenRedWallTrustDialogue(arrivedAt);
  maybeOpenTabrDilemma(arrivedAt);
}

/**
 * Beat 4's auto-open trigger (03-opening-experience.md "Teaching sequence"
 * Beat 4; chunk W3d — "extend openingBriefing.ts's pattern: auto-open once,
 * condition on arrival + flag"). Deliberately placed HERE rather than in
 * runtime/openingBriefing.ts: that module lives in runtime/ specifically
 * because its own trigger fires from ThreeContainer's one-time mount effect
 * (a React/renderer timing concern — see its own doc). Beat 4's trigger
 * fires on arrival instead, which this function (game-engine, not runtime)
 * already detects every frame with no renderer race to avoid — game-engine
 * importing from runtime/ would also invert this codebase's established
 * dependency direction (checked: nothing under src/game-engine/ does today).
 * startDialogue is itself a game-engine function, so this stays a same-layer
 * call.
 *
 * Guarded on `world.dialogue === null` (idempotent across a re-arrival
 * mid-frame) and the tree's own completion flag — once acknowledged,
 * DialogueSystem.ts's canCloseDialogue never lets it close unfinished, so
 * "not yet acknowledged and nothing else open" can only ever be true once
 * per campaign: either the tree is still open (blocking everything else,
 * including a second arrival), or it is closed and acknowledged.
 */
function maybeOpenRedWallTrustDialogue(arrivedAt: VillageId): void {
  if (arrivedAt !== 'red_wall_sietch') return;
  if (world.dialogue !== null) return;
  if (world.flags[REDWALL_TRUST_ACKNOWLEDGED_FLAG] === true) return;

  startDialogue(REDWALL_TRUST_TREE_ID, arrivedAt);
}

/**
 * Beat 6's auto-open trigger (03-opening-experience.md Beat 6 — "must not
 * script the decision"). Same arrival-hook shape as Beat 4's trigger above,
 * with one deliberate difference: story/tabr_dilemma is NOT in
 * canCloseDialogue's mandatory set, so the player may Escape/× out before a
 * terminal choice. A completion-flag guard (Beat 4's shape) would therefore
 * reopen this tree on every later arrival for anyone who closed it early —
 * not "auto-opens ONCE". TABR_DILEMMA_SHOWN_FLAG is set here, at open time,
 * so exactly one auto-open ever happens regardless of how the player leaves it.
 */
function maybeOpenTabrDilemma(arrivedAt: VillageId): void {
  if (arrivedAt !== 'sietch_tabr') return;
  if (world.dialogue !== null) return;
  if (world.flags[TABR_DILEMMA_SHOWN_FLAG] === true) return;

  world.flags[TABR_DILEMMA_SHOWN_FLAG] = true;
  startDialogue(TABR_DILEMMA_TREE_ID, arrivedAt);
}
