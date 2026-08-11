// src/game-engine/sim/runner.ts
// The runtime-faithful headless campaign runner (docs/PRD/game-completion/
// 07-balance-playtest-and-release.md "Runtime-faithful simulator"; WP04
// chunk W4a). Creates a campaign via the production createInitialState(),
// issues every command by calling the REAL runtime/commandHandlers.ts
// functions (imported below — never reimplemented), advances time only
// through runtimeTick.ts (the exact sequence GameDriver.tick() runs,
// including the runtime auto-open hooks), and walks dialogue only through
// the production chooseDialogue (DialogueSystem.ts, via commandHandlers'
// onChoose). Every command dispatch is recorded as a `[eventName, payload]`
// trace tuple (trace.ts) alongside a hashState() snapshot (state/hash.ts),
// so a run is both replayable and comparable step by step — the seam W4b's
// parity protocol builds on.
//
// The world singleton (game-engine/GameState.ts) is what every production
// command already operates on — SietchSystem, TravelSystem, DialogueSystem,
// none of it takes a WorldState parameter. A runner "instance" is therefore
// a thin handle around installing and re-installing that one singleton via
// setWorld(), the same seam every engine-level fixture in this codebase
// already uses (commands/openingLineFixtures.test.ts's own setWorld() call
// is the precedent) — not a second, parallel world-mutation path.
//
// One consequence of the shared singleton: only the MOST RECENTLY created
// (or reloaded) CampaignRunner's live queries — visibleState(), hashNow(),
// isBlocked(), and every command method — are valid to call. Creating a
// second campaign via createCampaignRunner() re-points the one `world`
// singleton at the new campaign, so an earlier runner's live methods would
// silently read the WRONG state, not throw. Its `trace` and `hashLog`
// arrays stay correct (captured by closure as plain data, not re-derived),
// so a caller comparing two runs — the determinism guard — reads what it
// needs from a finished runner's `trace`/`hashLog`/one final `hashNow()`
// call BEFORE creating the next one, never after.

import { world, createInitialState, setWorld } from '../GameState'
import { initLoop as engineInitLoop } from '../GameLoop'
import { hashState } from '../state/hash'
import { parityHash } from '../state/parityView'
import { serializeWorld, deserializeWorld } from '../persistence'
import type { Difficulty, VillageId, BusEvents } from '../../types'
import type { TroopTask, EquipmentKind } from '../troops/types'
import {
  onTalk, onSpeakTo, onTravel, onChoose, onSpeed, onPledge, onGift,
  onAssignCrew, onBuy, onIssue, onAssault, onSettle, onAutoShip, onPause,
} from '../../runtime/commandHandlers'
import { advanceSeconds, advanceUntilArrival, advanceToDay, isBlocked } from './advance'
import { visibleState, type VisibleState } from './visibleState'
import type { RunnerCommandName, TraceEntry, HashStep } from './trace'

export type { VisibleState, TraceEntry, HashStep, RunnerCommandName }

export interface CampaignRunner {
  readonly seed: number
  readonly difficulty: Difficulty
  /** Every issued command, in order — see trace.ts's own doc. */
  readonly trace: TraceEntry[]
  /** hashState() after every dispatched command and every processed day. */
  readonly hashLog: HashStep[]

  visibleState(): VisibleState
  hashNow(): string
  isBlocked(): boolean

  talk(): void
  speakTo(characterId: string): void
  travel(targetVillageId: VillageId): void
  choose(choiceId: string): void
  setSpeed(speed: number): void
  setPaused(paused: boolean): void
  pledge(villageId: VillageId): void
  gift(villageId: VillageId): void
  assignCrew(groupId: string, task: TroopTask, targetId: string | null): void
  buyEquipment(kind: EquipmentKind): void
  issueEquipment(equipmentId: string, groupId: string | null): void
  assaultFort(fortId: string): void
  settleTribute(amount: number): void
  setAutoShip(enabled: boolean, amount?: number): void

  /** Advance until the current trip arrives, or no-op if idle. */
  advanceTravel(): void
  /** Advance day by day up to and including `day` — stops early on a
   * dialogue, a pending settlement, or an ending (see advance.ts). */
  advanceToDay(day: number): void
  /** Tick the engine forward by exactly `seconds` — the raw primitive
   * advanceTravel/advanceToDay are both built on, exposed for a caller that
   * needs one runtime auto-open hook to fire (e.g. Beat 7's debrief, which
   * opens on the next frame after settleTribute() rather than synchronously
   * inside it — see runtime/q1Debrief.ts's own doc) without jumping a whole
   * day quantum. */
  tick(seconds: number): void

  /** serializeWorld(world) — the reload checkpoint seam. */
  save(): string
  /** deserializeWorld(json) then installs it as the live singleton — the
   * runner keeps issuing commands against the reloaded state afterward. */
  reload(json: string): void
}

/**
 * Create a fresh headless campaign and install it as the live `world`
 * singleton. Calls GameLoop.initLoop() (resets the event-id counter — see
 * EventSystem.ts's nextEventId doc) exactly once, the same one-time reset a
 * real "New Campaign" mount performs, then one zero-delta runtimeTick so the
 * opening's own auto-open hook (runtime/openingBriefing.ts) fires — the
 * identical first frame ThreeContainer's own mount produces. Never repeated
 * on {@link CampaignRunner.reload}, which is a continuation, not a new
 * campaign — see reload's own doc.
 */
export function createCampaignRunner(seed: number, difficulty: Difficulty = 'normal'): CampaignRunner {
  setWorld(createInitialState(seed, difficulty))
  engineInitLoop()

  const trace: TraceEntry[] = []
  const hashLog: HashStep[] = []

  /**
   * Record the dispatch as a replayable trace tuple, call the REAL handler
   * (never a fork — 07's may-not list), then snapshot hashState() — one
   * choke point every command method below routes through, so the
   * trace/hashLog pairing can never drift out of step.
   */
  function dispatch<K extends RunnerCommandName>(name: K, payload: BusEvents[K], run: () => void): void {
    trace.push([name, payload] as TraceEntry)
    run()
    hashLog.push({
      kind: 'command', ref: trace.length - 1, hash: hashState(world), parityHash: parityHash(world),
    })
  }

  advanceSeconds(0) // the opening auto-open's own first-frame trigger

  return {
    seed,
    difficulty,
    trace,
    hashLog,

    visibleState,
    hashNow: () => hashState(world),
    isBlocked,

    talk: () => dispatch('player:talk', {}, onTalk),
    speakTo: characterId => dispatch('player:speak_to', { characterId }, () => onSpeakTo({ characterId })),
    travel: targetVillageId =>
      dispatch('player:travel', { targetVillageId }, () => onTravel({ targetVillageId })),
    choose: choiceId => dispatch('player:choose', { choiceId }, () => onChoose({ choiceId })),
    setSpeed: speed => dispatch('game:speed', { speed }, () => onSpeed({ speed })),
    setPaused: paused => dispatch('game:pause', { paused }, () => onPause({ paused })),
    pledge: villageId => dispatch('player:pledge_sietch', { villageId }, () => onPledge({ villageId })),
    gift: villageId => dispatch('player:gift_sietch', { villageId }, () => onGift({ villageId })),
    assignCrew: (groupId, task, targetId) =>
      dispatch('player:assign_crew', { groupId, task, targetId }, () => onAssignCrew({ groupId, task, targetId })),
    buyEquipment: kind => dispatch('player:buy_equipment', { kind }, () => onBuy({ kind })),
    issueEquipment: (equipmentId, groupId) =>
      dispatch('player:issue_equipment', { equipmentId, groupId }, () => onIssue({ equipmentId, groupId })),
    assaultFort: fortId => dispatch('player:assault_fort', { fortId }, () => onAssault({ fortId })),
    settleTribute: amount => dispatch('player:settle_tribute', { amount }, () => onSettle({ amount })),
    setAutoShip: (enabled, amount) =>
      dispatch('player:set_auto_ship', { enabled, amount }, () => onAutoShip({ enabled, amount })),

    advanceTravel: () => advanceUntilArrival(hashLog),
    advanceToDay: day => advanceToDay(day, hashLog),
    // WP04 chunk W4b: records a 'tick' HashStep too (trace.ts's own doc) —
    // walkQ1Debrief's one-frame nudge for the debrief auto-open hook is a
    // real world-advancing step a parity script must replay, not a no-op.
    tick: seconds => {
      advanceSeconds(seconds)
      hashLog.push({
        kind: 'tick', ref: world.time, hash: hashState(world), parityHash: parityHash(world),
      })
    },

    save: () => serializeWorld(world),
    reload: json => setWorld(deserializeWorld(json)),
  }
}
