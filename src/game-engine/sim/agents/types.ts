// src/game-engine/sim/agents/types.ts
// The strategy-agent shapes (docs/PRD/game-completion/
// 07-balance-playtest-and-release.md "Strategy agents"; WP04 chunk W4c).
//
// An Agent is a PURE policy over VisibleState — the same player-visible
// read surface runner.ts's own visibleState() already exposes (07's
// runtime-faithful simulator may-not list: no world.rng peeking, no hidden-
// future reads). It never touches the runner or `world` directly; harness.ts
// is the one place a decided AgentAction becomes a real production command.

import type { VillageId } from '../../../types'
import type { TroopTask, EquipmentKind } from '../../troops/types'
import type { VisibleState } from '../visibleState'
import type { EndingId } from '../../acts/transitions'
import type { CommandTrace, HashStep } from '../trace'

/** Exactly one production command a decision point may issue — the "pick
 * ONE action" list from progress.md Round 16's own W4c reading. A 'travel'
 * action resolves all the way to arrival (see harness.ts's dispatchAction)
 * since nothing else is legal mid-trip; every other kind fires once. */
export type AgentAction =
  | { kind: 'travel'; targetId: VillageId }
  | { kind: 'pledge'; villageId: VillageId }
  | { kind: 'gift'; villageId: VillageId }
  | { kind: 'assign'; groupId: string; task: TroopTask; targetId: string | null }
  | { kind: 'settle'; amount: number }
  | { kind: 'buy'; equipmentKind: EquipmentKind }
  | { kind: 'issue'; equipmentId: string; groupId: string | null }

export interface Agent {
  readonly name: string
  /** One action for this decision point, or null for a pause-like no-op
   * (harness.ts then advances to the next decision point itself — an agent
   * never advances time on its own). MUST return a 'settle' action when
   * `view.pendingSettlement` is not null (07: "Every agent must settle
   * tribute explicitly") — the harness enforces this structurally, not by
   * convention. */
  decide(view: VisibleState): AgentAction | null
  /** Called only for an OPTIONAL dialogue (canCloseDialogue() already true —
   * a mandatory beat never reaches this hook, see dialoguePolicy.ts).
   * Return a choiceId to pick, or null/omit for the shared default:
   * decline/close immediately via CampaignRunner.close(). */
  onOptionalDialogue?(view: VisibleState): string | null
}

/** One resolved tribute decision, recorded from PendingSettlement's own
 * snapshotted fields (never a re-derived classify()) — see harness.ts's
 * recordSettlement for the band comparison and its own citation. */
export interface SettlementRecord {
  cycleIndex: number
  dueDay: number
  amountDue: number
  minPartialPayment: number
  stockBefore: number
  paid: number
  band: 'full' | 'partial' | 'short'
  patienceAfter: number
}

export interface AgentRunResult {
  agentName: string
  seed: number
  difficulty: 'easy' | 'normal' | 'hard'
  settlements: SettlementRecord[]
  ending: EndingId | null
  finalDay: number
  /** Count per AgentAction['kind'], for the smoke matrix's dominant-command
   * reporting (07 "Seed sweep": "Dominant command share and unused command
   * families"). */
  actionCounts: Record<string, number>
  trace: CommandTrace
  hashLog: HashStep[]
}
